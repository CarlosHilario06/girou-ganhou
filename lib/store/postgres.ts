import { newId, normalizeCode } from "./ids";
import type {
  PendingPaymentRow,
  Payment,
  Play,
  PrizeRow,
  SpinRecord,
  Stats,
  Store,
} from "./types";

/**
 * Armazenamento em Postgres — serve em Neon, Supabase, Railway, Render ou
 * Vercel, todos com a mesma DATABASE_URL.
 *
 * O driver conversa com o banco por esta interface mínima, e não pela API de
 * uma biblioteca específica. É o que permite rodar os testes contra um
 * Postgres de verdade (PGlite, em WASM) sem subir servidor nenhum.
 */
export type SqlRunner = {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
  transaction<T>(fn: (tx: SqlRunner) => Promise<T>): Promise<T>;
};

export const SCHEMA = `
create table if not exists plays (
  id text primary key,
  name text not null,
  phone text not null,
  source text,
  spins_available integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id text primary key,
  play_id text not null references plays(id) on delete cascade,
  provider text not null,
  external_id text,
  amount_cents integer not null,
  status text not null,
  payload text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  paid_at timestamptz,
  confirmed_by text
);

create index if not exists payments_external_id_idx on payments (external_id);
create index if not exists payments_play_idx on payments (play_id, status);

create table if not exists spins (
  id text primary key,
  play_id text not null references plays(id) on delete cascade,
  prize_id text not null,
  code text unique,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz
);

create index if not exists spins_play_idx on spins (play_id);
`;

/* ----------------------------- conversões ------------------------------- */

function iso(value: unknown): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(String(value)).toISOString();
}

function optionalIso(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : iso(value);
}

type PaymentRow = {
  id: string;
  play_id: string;
  provider: string;
  external_id: string | null;
  amount_cents: number;
  status: string;
  payload: string;
  created_at: unknown;
  expires_at: unknown;
  paid_at: unknown;
  confirmed_by: string | null;
};

function toPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    playId: row.play_id,
    provider: row.provider,
    externalId: row.external_id ?? undefined,
    amountCents: Number(row.amount_cents),
    status: row.status as Payment["status"],
    payload: row.payload,
    createdAt: iso(row.created_at),
    expiresAt: iso(row.expires_at),
    paidAt: optionalIso(row.paid_at),
    confirmedBy: row.confirmed_by ?? undefined,
  };
}

type SpinRow = {
  id: string;
  play_id: string;
  prize_id: string;
  code: string | null;
  created_at: unknown;
  redeemed_at: unknown;
};

function toSpin(row: SpinRow): SpinRecord {
  return {
    id: row.id,
    playId: row.play_id,
    prizeId: row.prize_id,
    code: row.code ?? undefined,
    createdAt: iso(row.created_at),
    redeemedAt: optionalIso(row.redeemed_at),
  };
}

/* ------------------------------- o store -------------------------------- */

export function createPostgresStore(sql: SqlRunner): Store & {
  migrate(): Promise<void>;
} {
  return {
    async migrate() {
      // Uma instrução por vez: nem todo driver aceita várias de uma vez.
      for (const statement of SCHEMA.split(";")) {
        const trimmed = statement.trim();
        if (trimmed) await sql.query(trimmed);
      }
    },

    async createPlay({ name, phone, source }) {
      const [row] = await sql.query<{ id: string; created_at: unknown }>(
        `insert into plays (id, name, phone, source)
         values ($1, $2, $3, $4)
         returning id, created_at`,
        [newId("play"), name, phone, source ?? null],
      );

      return {
        id: row.id,
        name,
        phone,
        source,
        createdAt: iso(row.created_at),
        spinsAvailable: 0,
        payments: [],
        spins: [],
      };
    },

    async getPlay(id) {
      const [play] = await sql.query<{
        id: string;
        name: string;
        phone: string;
        source: string | null;
        spins_available: number;
        created_at: unknown;
      }>(
        `select id, name, phone, source, spins_available, created_at
         from plays where id = $1`,
        [id],
      );
      if (!play) return undefined;

      const [payments, spins] = await Promise.all([
        sql.query<PaymentRow>(
          `select * from payments where play_id = $1 order by created_at`,
          [id],
        ),
        sql.query<SpinRow>(
          `select * from spins where play_id = $1 order by created_at`,
          [id],
        ),
      ]);

      return {
        id: play.id,
        name: play.name,
        phone: play.phone,
        source: play.source ?? undefined,
        spinsAvailable: Number(play.spins_available),
        createdAt: iso(play.created_at),
        payments: payments.map(toPayment),
        spins: spins.map(toSpin),
      } satisfies Play;
    },

    async addPayment(payment) {
      await sql.query(
        `insert into payments
           (id, play_id, provider, external_id, amount_cents, status, payload, created_at, expires_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          payment.id,
          payment.playId,
          payment.provider,
          payment.externalId ?? null,
          payment.amountCents,
          payment.status,
          payment.payload,
          payment.createdAt,
          payment.expiresAt,
        ],
      );
    },

    async getPayment(id) {
      const [row] = await sql.query<PaymentRow>(
        `select * from payments where id = $1`,
        [id],
      );
      return row ? toPayment(row) : undefined;
    },

    async findPaymentByExternalId(externalId) {
      const [row] = await sql.query<PaymentRow>(
        `select * from payments where external_id = $1 order by created_at desc limit 1`,
        [externalId],
      );
      return row ? toPayment(row) : undefined;
    },

    async findPendingPayment(playId) {
      const [row] = await sql.query<PaymentRow>(
        `select * from payments
         where play_id = $1 and status = 'pending' and expires_at > now()
         order by created_at desc limit 1`,
        [playId],
      );
      return row ? toPayment(row) : undefined;
    },

    async expireStalePayments(playId) {
      await sql.query(
        `update payments set status = 'expired'
         where status = 'pending' and expires_at <= now()
           and ($1::text is null or play_id = $1)`,
        [playId ?? null],
      );
    },

    async markPaymentExpired(paymentId) {
      await sql.query(
        `update payments set status = 'expired'
         where id = $1 and status = 'pending'`,
        [paymentId],
      );
    },

    async creditPayment(paymentId, spins, confirmedBy) {
      // Só a transição pending -> paid credita. Webhook, consulta de status e
      // confirmação manual podem chegar juntos: o primeiro pega a linha,
      // os outros não encontram mais nada em 'pending' e saem de mãos vazias.
      return sql.transaction(async (tx) => {
        const rows = await tx.query<{ play_id: string }>(
          `update payments
           set status = 'paid', paid_at = now(), confirmed_by = $2
           where id = $1 and status = 'pending'
           returning play_id`,
          [paymentId, confirmedBy ?? null],
        );
        if (rows.length === 0) return false;

        await tx.query(
          `update plays set spins_available = spins_available + $2 where id = $1`,
          [rows[0].play_id, spins],
        );
        return true;
      });
    },

    async consumeSpin(playId) {
      // O desconto é a própria condição: sem saldo, nenhuma linha é afetada.
      const rows = await sql.query(
        `update plays set spins_available = spins_available - 1
         where id = $1 and spins_available > 0
         returning id`,
        [playId],
      );
      return rows.length > 0;
    },

    async addSpin(spin) {
      await sql.query(
        `insert into spins (id, play_id, prize_id, code, created_at)
         values ($1, $2, $3, $4, $5)`,
        [spin.id, spin.playId, spin.prizeId, spin.code ?? null, spin.createdAt],
      );
    },

    async findSpinByCode(code) {
      const normalized = normalizeCode(code);
      if (!normalized) return undefined;

      const [row] = await sql.query<SpinRow & { winner: string }>(
        `select s.*, p.name as winner
         from spins s join plays p on p.id = s.play_id
         where replace(s.code, '-', '') = $1`,
        [normalized],
      );
      return row ? { spin: toSpin(row), winner: row.winner } : undefined;
    },

    async redeemSpin(code) {
      const normalized = normalizeCode(code);
      if (!normalized) return false;

      const rows = await sql.query(
        `update spins set redeemed_at = now()
         where replace(code, '-', '') = $1 and redeemed_at is null
         returning id`,
        [normalized],
      );
      return rows.length > 0;
    },

    async getStats() {
      const [row] = await sql.query<Record<string, string>>(
        `select
           (select count(*) from plays) as players,
           (select count(*) from payments where status = 'paid') as paid_count,
           (select coalesce(sum(amount_cents), 0) from payments where status = 'paid') as revenue_cents,
           (select count(*) from spins where code is not null and redeemed_at is not null) as prizes_given,
           (select count(*) from spins where code is not null and redeemed_at is null) as prizes_pending`,
      );

      return {
        players: Number(row.players),
        paidCount: Number(row.paid_count),
        revenueCents: Number(row.revenue_cents),
        prizesGiven: Number(row.prizes_given),
        prizesPending: Number(row.prizes_pending),
      } satisfies Stats;
    },

    async listPendingPayments(limit = 50) {
      const rows = await sql.query<{
        id: string;
        name: string;
        phone: string;
        amount_cents: number;
        created_at: unknown;
      }>(
        `select pa.id, pl.name, pl.phone, pa.amount_cents, pa.created_at
         from payments pa join plays pl on pl.id = pa.play_id
         where pa.status = 'pending' and pa.expires_at > now()
         order by pa.created_at desc limit $1`,
        [limit],
      );

      return rows.map((row) => ({
        id: row.id,
        playName: row.name,
        playPhone: row.phone,
        amountCents: Number(row.amount_cents),
        createdAt: iso(row.created_at),
      })) satisfies PendingPaymentRow[];
    },

    async listRecentPrizes(limit = 30) {
      const rows = await sql.query<{
        code: string;
        prize_id: string;
        winner: string;
        created_at: unknown;
        redeemed_at: unknown;
      }>(
        `select s.code, s.prize_id, pl.name as winner, s.created_at, s.redeemed_at
         from spins s join plays pl on pl.id = s.play_id
         where s.code is not null
         order by s.created_at desc limit $1`,
        [limit],
      );

      return rows.map((row) => ({
        code: row.code,
        prizeId: row.prize_id,
        winner: row.winner,
        createdAt: iso(row.created_at),
        redeemedAt: optionalIso(row.redeemed_at),
      })) satisfies PrizeRow[];
    },
  };
}
