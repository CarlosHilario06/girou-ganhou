import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * Persistência das jogadas.
 *
 * Dois modos, escolhidos por STORAGE_DRIVER:
 *  - "memory" (padrão): tudo em RAM. Ótimo para dev e demo; some ao reiniciar.
 *  - "file": grava em .data/plays.json. Serve para hospedagem Node com disco
 *    persistente (Railway, Render, VPS). NÃO use em serverless (Vercel).
 *
 * Para produção com volume alto, troque as funções `load`/`persist` por um
 * banco (Postgres, Supabase, Turso). O resto do app não precisa mudar.
 */

export type PaymentStatus = "pending" | "paid" | "expired" | "canceled";

export type Payment = {
  id: string;
  provider: string;
  /** Id da cobrança no provedor externo (Mercado Pago, etc). */
  externalId?: string;
  amountCents: number;
  status: PaymentStatus;
  /** Pix copia e cola. */
  payload: string;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  /** Quem confirmou manualmente (modo pix-static). */
  confirmedBy?: string;
};

export type SpinRecord = {
  id: string;
  prizeId: string;
  /** Código que o ganhador mostra para o motorista. Fatia sem prêmio não tem. */
  code?: string;
  createdAt: string;
  redeemedAt?: string;
};

export type Play = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  /** De onde veio o acesso: qr do encosto, link no WhatsApp, etc. */
  source?: string;
  spinsAvailable: number;
  payments: Payment[];
  spins: SpinRecord[];
};

type Database = { plays: Record<string, Play> };

const DRIVER = process.env.STORAGE_DRIVER === "file" ? "file" : "memory";
const DATA_FILE = path.join(process.cwd(), ".data", "plays.json");

const globalStore = globalThis as unknown as { __giroudb?: Database };

function load(): Database {
  if (globalStore.__giroudb) return globalStore.__giroudb;

  let db: Database = { plays: {} };
  if (DRIVER === "file" && fs.existsSync(DATA_FILE)) {
    try {
      db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as Database;
    } catch {
      // Arquivo corrompido: recomeça em branco em vez de derrubar o app.
      db = { plays: {} };
    }
  }
  globalStore.__giroudb = db;
  return db;
}

function persist(): void {
  if (DRIVER !== "file") return;
  const db = load();
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(9).toString("base64url")}`;
}

/** Código curto, sem caracteres ambíguos (0/O, 1/I), fácil de ditar em voz alta. */
export function newPrizeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

export function createPlay(data: {
  name: string;
  phone: string;
  source?: string;
}): Play {
  const db = load();
  const play: Play = {
    id: newId("play"),
    name: data.name,
    phone: data.phone,
    source: data.source,
    createdAt: new Date().toISOString(),
    spinsAvailable: 0,
    payments: [],
    spins: [],
  };
  db.plays[play.id] = play;
  persist();
  return play;
}

export function getPlay(id: string | undefined | null): Play | undefined {
  if (!id) return undefined;
  return load().plays[id];
}

export function savePlay(play: Play): void {
  const db = load();
  db.plays[play.id] = play;
  persist();
}

export function listPlays(): Play[] {
  return Object.values(load().plays).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function findPayment(
  predicate: (payment: Payment, play: Play) => boolean,
): { play: Play; payment: Payment } | undefined {
  for (const play of Object.values(load().plays)) {
    const payment = play.payments.find((p) => predicate(p, play));
    if (payment) return { play, payment };
  }
  return undefined;
}

export function findSpinByCode(
  code: string,
): { play: Play; spin: SpinRecord } | undefined {
  const normalized = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!normalized) return undefined;
  for (const play of Object.values(load().plays)) {
    const spin = play.spins.find(
      (s) => s.code && s.code.replace(/[^A-Z0-9]/g, "") === normalized,
    );
    if (spin) return { play, spin };
  }
  return undefined;
}

/** Marca como expirados os Pix que passaram da validade, liberando nova tentativa. */
export function expireStalePayments(play: Play): Play {
  const now = Date.now();
  let changed = false;
  for (const payment of play.payments) {
    if (payment.status === "pending" && Date.parse(payment.expiresAt) < now) {
      payment.status = "expired";
      changed = true;
    }
  }
  if (changed) savePlay(play);
  return play;
}
