"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicPlay } from "@/lib/play-service";
import { Button } from "./ui";

type Charge = {
  id: string;
  payload: string;
  qrCode: string;
  amountCents: number;
  expiresAt: string;
  manualConfirmation: boolean;
};

type PaymentModalProps = {
  spins: number;
  priceLabel: string;
  onClose: () => void;
  onPaid: (play: PublicPlay) => void;
};

function useCountdown(expiresAt?: string): string {
  const [left, setLeft] = useState("--:--");

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = Date.parse(expiresAt) - Date.now();
      if (ms <= 0) {
        setLeft("00:00");
        return;
      }
      const minutes = Math.floor(ms / 60_000);
      const seconds = Math.floor((ms % 60_000) / 1000);
      setLeft(
        `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
      );
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return left;
}

export function PaymentModal({
  spins,
  priceLabel,
  onClose,
  onPaid,
}: PaymentModalProps) {
  const [charge, setCharge] = useState<Charge | null>(null);
  const [status, setStatus] = useState<"loading" | "waiting" | "paid" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [paidPlay, setPaidPlay] = useState<PublicPlay | null>(null);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const countdown = useCountdown(charge?.expiresAt);

  // Cria (ou reaproveita) a cobrança assim que o popup abre.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await fetch("/api/payments", { method: "POST" });
        const data = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(data.error ?? "Falha ao gerar o Pix.");
        setCharge(data.payment);
        setStatus("waiting");
      } catch (createError) {
        if (!active) return;
        setError(
          createError instanceof Error
            ? createError.message
            : "Falha ao gerar o Pix.",
        );
        setStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Enquanto o popup está aberto, pergunta ao servidor se o Pix caiu.
  useEffect(() => {
    if (status !== "waiting" || !charge) return;
    let active = true;

    const check = async () => {
      try {
        const response = await fetch(`/api/payments/${charge.id}`, {
          cache: "no-store",
        });
        if (!response.ok || !active) return;
        const data = await response.json();
        if (data.status === "paid") {
          setPaidPlay(data.play);
          setStatus("paid");
        } else if (data.status === "expired") {
          setError("O Pix expirou. Feche e gere um novo código.");
          setStatus("error");
        }
      } catch {
        // Falha de rede momentânea: a próxima tentativa resolve.
      }
    };

    const timer = setInterval(check, 3000);
    void check();
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [status, charge]);

  // Segura o "pagamento confirmado" por um instante antes de voltar à roleta,
  // para o jogador ver que deu certo.
  useEffect(() => {
    if (status !== "paid" || !paidPlay) return;
    const timer = setTimeout(() => onPaid(paidPlay), 1400);
    return () => clearTimeout(timer);
  }, [status, paidPlay, onPaid]);

  // Fecha no Esc e prende o foco dentro do popup.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && status !== "paid") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, status]);

  const copyPayload = useCallback(async () => {
    if (!charge) return;
    try {
      await navigator.clipboard.writeText(charge.payload);
    } catch {
      // Navegador sem permissão de área de transferência: seleciona o texto.
      const field = document.getElementById("pix-payload") as HTMLTextAreaElement | null;
      field?.select();
      document.execCommand?.("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [charge]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pix-title"
      onClick={(event) => {
        if (event.target === event.currentTarget && status !== "paid") onClose();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="animate-pop-in max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-2xl outline-none sm:rounded-3xl"
      >
        {status === "paid" ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-festa-green/15 text-4xl">
              ✅
            </div>
            <h2 id="pix-title" className="font-display text-2xl text-ink">
              Pagamento confirmado!
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Liberamos <strong className="text-ink">{spins} giros</strong> na sua
              roleta. Boa sorte!
            </p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-accent">
                  Pagamento via Pix
                </p>
                <h2 id="pix-title" className="font-display text-2xl text-ink">
                  {priceLabel} por {spins} giros
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-ink-muted transition-colors hover:border-accent hover:text-accent"
              >
                ✕
              </button>
            </div>

            {status === "loading" ? (
              <div className="grid h-64 place-items-center">
                <span
                  className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent"
                  aria-label="Gerando código Pix"
                />
              </div>
            ) : null}

            {status === "error" ? (
              <div className="space-y-4 py-6 text-center">
                <p className="text-4xl">😕</p>
                <p className="text-sm font-medium text-ink">{error}</p>
                <Button variant="outline" onClick={onClose} className="w-full">
                  Fechar
                </Button>
              </div>
            ) : null}

            {status === "waiting" && charge ? (
              <div className="space-y-4">
                <div className="mx-auto w-fit rounded-2xl border border-line bg-white p-3 shadow-inner">
                  <Image
                    src={charge.qrCode}
                    alt="QR Code do Pix"
                    width={220}
                    height={220}
                    unoptimized
                    className="h-[220px] w-[220px]"
                  />
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-ink-muted">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                  </span>
                  {charge.manualConfirmation
                    ? "Aguardando o motorista confirmar o recebimento"
                    : "Aguardando o pagamento cair"}
                  <span className="font-mono font-bold text-ink">{countdown}</span>
                </div>

                <div>
                  <label
                    htmlFor="pix-payload"
                    className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink-muted"
                  >
                    Pix copia e cola
                  </label>
                  <textarea
                    id="pix-payload"
                    readOnly
                    value={charge.payload}
                    rows={2}
                    onFocus={(event) => event.currentTarget.select()}
                    className="w-full resize-none rounded-2xl border border-line bg-surface-2 p-3 font-mono text-[11px] leading-relaxed text-ink-muted"
                  />
                </div>

                <Button
                  variant={copied ? "outline" : "primary"}
                  onClick={copyPayload}
                  className="w-full"
                >
                  {copied ? "Código copiado ✓" : "Copiar código Pix"}
                </Button>

                <ol className="space-y-1.5 rounded-2xl bg-surface-2 p-4 text-xs text-ink-muted">
                  <li>1. Abra o app do seu banco e escolha Pix.</li>
                  <li>2. Aponte para o QR Code ou cole o código.</li>
                  <li>3. Confirme — seus giros liberam sozinhos nesta tela.</li>
                </ol>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
