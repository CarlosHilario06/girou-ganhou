"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Field } from "./ui";
import { ThemeToggle } from "./theme-toggle";

type PendingPayment = {
  id: string;
  playName: string;
  playPhone: string;
  amountCents: number;
  createdAt: string;
};

type PrizeRow = {
  code: string;
  title: string;
  emoji: string;
  winner: string;
  createdAt: string;
  redeemedAt?: string;
};

type RedeemResult = {
  status: "valid" | "used" | "expired" | "redeemed" | "invalid";
  code?: string;
  prize?: string;
  emoji?: string;
  winner?: string;
  error?: string;
};

type DriverPanelProps = {
  authorized: boolean;
  providerId?: string;
  manualConfirmation?: boolean;
  stats?: {
    players: number;
    paidCount: number;
    revenueCents: number;
    prizesGiven: number;
    prizesPending: number;
  };
  pendingPayments?: PendingPayment[];
  prizes?: PrizeRow[];
};

function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function time(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DriverPanel({
  authorized,
  providerId,
  manualConfirmation,
  stats,
  pendingPayments = [],
  prizes = [],
}: DriverPanelProps) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [redeem, setRedeem] = useState<RedeemResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setLoginError(null);
    setBusy(true);
    try {
      const response = await fetch("/api/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        const data = await response.json();
        setLoginError(data.error ?? "PIN incorreto.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function checkCode(confirm: boolean) {
    setBusy(true);
    try {
      const response = await fetch("/api/driver/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, confirm }),
      });
      const data = await response.json();
      setRedeem(data);
      if (confirm) {
        setCode("");
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmPayment(paymentId: string) {
    setBusy(true);
    try {
      await fetch("/api/driver/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!authorized) {
    return (
      <div className="aurora grid min-h-dvh place-items-center p-5">
        <Card className="w-full max-w-sm">
          <div className="mb-5 flex items-center justify-between">
            <h1 className="font-display text-xl text-ink">Área do motorista</h1>
            <ThemeToggle />
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Field
              id="pin"
              label="PIN de acesso"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="••••"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
            />
            {loginError ? (
              <p role="alert" className="text-sm font-medium text-red-500">
                {loginError}
              </p>
            ) : null}
            <Button type="submit" loading={busy} className="w-full">
              Entrar
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const redeemTone =
    redeem?.status === "valid" || redeem?.status === "redeemed"
      ? "border-festa-green/40 bg-festa-green/10"
      : "border-red-500/40 bg-red-500/10";

  return (
    <div className="aurora min-h-dvh">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-5 py-5">
        <div>
          <h1 className="font-display text-xl text-ink">Painel do motorista</h1>
          <p className="text-xs text-ink-muted">
            Pagamentos via <strong>{providerId}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            onClick={async () => {
              await fetch("/api/driver/login", { method: "DELETE" });
              router.refresh();
            }}
          >
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl space-y-6 px-5 pb-16">
        {/* Números do dia */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Jogadores", value: String(stats?.players ?? 0) },
            { label: "Pagamentos", value: String(stats?.paidCount ?? 0) },
            { label: "Arrecadado", value: brl(stats?.revenueCents ?? 0) },
            {
              label: "Prêmios a entregar",
              value: String(stats?.prizesPending ?? 0),
            },
          ].map((item) => (
            <Card key={item.label} className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                {item.label}
              </p>
              <p className="mt-1 font-display text-2xl text-ink">{item.value}</p>
            </Card>
          ))}
        </div>

        {/* Validação de prêmio */}
        <Card>
          <h2 className="font-display text-lg text-ink">Validar prêmio</h2>
          <p className="mb-4 mt-1 text-sm text-ink-muted">
            Digite o código que o passageiro mostrou na tela.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABC-123"
              aria-label="Código do prêmio"
              className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3.5 text-center font-mono text-xl font-black tracking-[0.25em] text-ink outline-none focus:border-accent"
            />
            <Button
              onClick={() => checkCode(false)}
              loading={busy}
              disabled={code.trim().length < 4}
              className="sm:w-40"
            >
              Consultar
            </Button>
          </div>

          {redeem ? (
            <div className={`mt-4 rounded-2xl border p-4 ${redeemTone}`}>
              {redeem.status === "invalid" ? (
                <p className="font-bold text-ink">❌ Código não encontrado.</p>
              ) : (
                <>
                  <p className="font-bold text-ink">
                    {redeem.emoji} {redeem.prize}
                  </p>
                  <p className="text-sm text-ink-muted">
                    Ganhador: {redeem.winner}
                  </p>
                  {redeem.status === "valid" ? (
                    <Button
                      variant="gold"
                      onClick={() => checkCode(true)}
                      loading={busy}
                      className="mt-3 w-full"
                    >
                      Confirmar entrega
                    </Button>
                  ) : null}
                  {redeem.status === "redeemed" ? (
                    <p className="mt-2 text-sm font-bold text-festa-green">
                      ✅ Entrega confirmada.
                    </p>
                  ) : null}
                  {redeem.status === "used" ? (
                    <p className="mt-2 text-sm font-bold text-red-500">
                      Este código já foi usado.
                    </p>
                  ) : null}
                  {redeem.status === "expired" ? (
                    <p className="mt-2 text-sm font-bold text-red-500">
                      Prêmio vencido.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          ) : null}
        </Card>

        {/* Pix aguardando confirmação manual */}
        {manualConfirmation ? (
          <Card>
            <h2 className="font-display text-lg text-ink">
              Pix aguardando confirmação
            </h2>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Confira no app do banco e libere os giros de quem já pagou.
            </p>
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-ink-muted">Nada pendente agora.</p>
            ) : (
              <ul className="space-y-2">
                {pendingPayments.map((payment) => (
                  <li
                    key={payment.id}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {payment.playName}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {brl(payment.amountCents)} · {time(payment.createdAt)}
                      </p>
                    </div>
                    <Button
                      onClick={() => confirmPayment(payment.id)}
                      loading={busy}
                    >
                      Liberar giros
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}

        {/* Histórico */}
        <Card>
          <h2 className="font-display text-lg text-ink">Últimos prêmios</h2>
          {prizes.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              Ninguém girou ainda. Cole o QR Code no encosto e boa sorte!
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {prizes.map((prize) => (
                <li
                  key={prize.code}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3"
                >
                  <span className="text-xl" aria-hidden="true">
                    {prize.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {prize.title}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {prize.winner} · {time(prize.createdAt)}
                    </p>
                  </div>
                  <span className="font-mono text-xs tracking-widest text-ink-muted">
                    {prize.code}
                  </span>
                  {prize.redeemedAt ? (
                    <Badge tone="green">Entregue</Badge>
                  ) : (
                    <Badge tone="gold">Pendente</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
