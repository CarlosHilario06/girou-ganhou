"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { gameApi } from "@/lib/game-client";
import type { PublicPlay } from "@/lib/play-service";
import type { Prize } from "@/lib/prizes";
import { CheckoutForm } from "./checkout-form";
import { PaymentModal } from "./payment-modal";
import { PrizeResult, type SpinResult } from "./prize-result";
import { useTheme } from "./theme";
import { ThemeToggle } from "./theme-toggle";
import { Badge, Button, Card } from "./ui";
import { Wheel, type WheelHandle } from "./wheel";

type GameProps = {
  prizes: Prize[];
  /** Só os prêmios de verdade, para a vitrine abaixo da roleta. */
  winningPrizes: Prize[];
  event: { name: string; edition: string; city: string; logo: string };
  driver: { name: string; whatsapp: string };
  priceLabel: string;
  spinsPerPayment: number;
};

export function Game({
  prizes,
  winningPrizes,
  event,
  driver,
  priceLabel,
  spinsPerPayment,
}: GameProps) {
  const { theme } = useTheme();
  const [play, setPlay] = useState<PublicPlay | null>(null);
  const [ready, setReady] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wheelRef = useRef<WheelHandle>(null);

  // Retoma a sessão de quem já se cadastrou (ex.: recarregou a página).
  useEffect(() => {
    (async () => {
      try {
        setPlay(await gameApi.load());
      } catch {
        // Sem rede agora: o cadastro segue disponível.
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const register = useCallback(
    async (data: { name: string; phone: string }) => {
      setPlay(await gameApi.register(data));
      // Cadastro feito: a roleta volta a ser o centro das atenções.
      document
        .getElementById("roleta")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    },
    [],
  );

  const spin = useCallback(async () => {
    if (spinning) return;
    setError(null);

    // Quem aperta GIRAR no miolo da roleta sem ter se cadastrado vai para o
    // formulário, e não para um popup de Pix que ainda não faz sentido.
    if (!play) {
      document
        .getElementById("cadastro")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("name")?.focus({ preventScroll: true });
      return;
    }

    if (play.spinsAvailable <= 0) {
      setPaymentOpen(true);
      return;
    }

    setSpinning(true);
    setResult(null);

    try {
      const data = await gameApi.spin();

      await wheelRef.current?.spinTo(data.prizeIndex);
      setPlay(data.play);
      setResult({ ...data.prize, code: data.code });
    } catch (spinError) {
      setError(
        spinError instanceof Error ? spinError.message : "Falha ao girar.",
      );
    } finally {
      setSpinning(false);
    }
  }, [play, spinning]);

  // Identidades estáveis: o popup usa estes callbacks dentro de efeitos.
  const closePayment = useCallback(() => setPaymentOpen(false), []);

  const handlePaid = useCallback((updated: PublicPlay) => {
    setPlay(updated);
    setPaymentOpen(false);
  }, []);

  const spinsLeft = play?.spinsAvailable ?? 0;
  const hasAccount = Boolean(play);

  return (
    <div className="aurora min-h-dvh">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3">
          <Image
            src={event.logo}
            alt={`Logo ${event.name}`}
            width={52}
            height={52}
            priority
            className="h-12 w-12 drop-shadow-md"
          />
          <div className="leading-tight">
            <p className="font-display text-sm text-ink">{event.name}</p>
            <p className="text-xs text-ink-muted">
              {event.city} · {event.edition}
            </p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-8">
        <div className="mb-6 text-center animate-float-up sm:mb-8">
          <Badge tone="gold">🎡 Promoção do motorista</Badge>
          <h1 className="mt-4 font-display text-4xl leading-[1.05] text-ink sm:text-6xl">
            Girou,{" "}
            <span className="bg-gradient-to-r from-gold to-gold-soft bg-clip-text text-transparent">
              ganhou
            </span>
            .
          </h1>
          <p className="mx-auto mt-3 max-w-md text-balance text-sm text-ink-muted sm:text-base">
            {priceLabel} no Pix e você gira {spinsPerPayment} vezes. Deu prêmio,
            o motorista entrega na hora — aqui mesmo, dentro do carro.
          </p>
        </div>

        {gameApi.isStatic ? (
          <p className="mx-auto mb-6 max-w-md rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3 text-center text-xs text-ink-muted">
            <strong className="text-ink">Versão de demonstração.</strong> Aqui o
            sorteio roda no seu próprio navegador e ninguém confere o Pix — serve
            para conhecer o app, não para valer prêmio.
          </p>
        ) : null}

        <div className="grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          {/* ------------------------------ Roleta ------------------------------ */}
          <section id="roleta" className="order-1">
            <div className="relative">
              <Wheel
                ref={wheelRef}
                prizes={prizes}
                isDark={theme === "dark"}
                spinning={spinning}
              />

              {/* Botão no miolo da roleta */}
              <button
                type="button"
                onClick={spin}
                disabled={spinning || !ready}
                aria-label={
                  spinsLeft > 0 ? "Girar a roleta" : "Pagar e girar a roleta"
                }
                className={`absolute left-1/2 top-1/2 z-10 grid h-[22%] w-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-b from-gold-soft to-gold font-display text-[clamp(11px,2.6vw,15px)] text-brand-950 shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-80 ${
                  !spinning && ready ? "animate-pulse-ring" : ""
                }`}
              >
                {spinning ? "..." : "GIRAR"}
              </button>
            </div>

            <p className="mt-6 text-center text-xs font-bold uppercase tracking-wider text-ink-muted">
              O que dá para ganhar
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {winningPrizes.map((prize) => (
                <div
                  key={prize.id}
                  className="flex items-center gap-2.5 rounded-2xl border border-line bg-surface/70 p-3 backdrop-blur"
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg"
                    style={{
                      backgroundColor:
                        theme === "dark" ? prize.fillDark : prize.fill,
                      color: prize.ink,
                    }}
                    aria-hidden="true"
                  >
                    {prize.emoji}
                  </span>
                  <span className="text-xs font-semibold leading-tight text-ink">
                    {prize.title}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* ------------------------- Cadastro / painel ------------------------ */}
          <section id="cadastro" className="order-2 lg:sticky lg:top-6">
            <Card>
              {!ready ? (
                <div className="space-y-3" aria-hidden="true">
                  <div className="h-5 w-2/3 animate-pulse rounded-full bg-surface-3" />
                  <div className="h-14 animate-pulse rounded-2xl bg-surface-3" />
                  <div className="h-14 animate-pulse rounded-2xl bg-surface-3" />
                  <div className="h-14 animate-pulse rounded-2xl bg-surface-3" />
                </div>
              ) : !hasAccount ? (
                <>
                  <h2 className="font-display text-xl text-ink">
                    Passo 1 · Seus dados
                  </h2>
                  <p className="mb-5 mt-1 text-sm text-ink-muted">
                    Leva 10 segundos. Depois é só pagar {priceLabel} no Pix e
                    girar.
                  </p>
                  <CheckoutForm onSubmit={register} />
                </>
              ) : (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">
                      Boa, {play?.name.split(" ")[0]}!
                    </p>
                    <h2 className="font-display text-xl text-ink">
                      {spinsLeft > 0
                        ? `Você tem ${spinsLeft} ${spinsLeft === 1 ? "giro" : "giros"}`
                        : "Pague o Pix para girar"}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {Array.from({ length: Math.max(spinsPerPayment, spinsLeft) }).map(
                      (_, index) => (
                        <span
                          key={index}
                          className={`h-2.5 flex-1 rounded-full transition-colors duration-500 ${
                            index < spinsLeft ? "bg-gold" : "bg-surface-3"
                          }`}
                        />
                      ),
                    )}
                  </div>

                  <Button
                    variant="gold"
                    size="lg"
                    onClick={spin}
                    loading={spinning}
                    className="w-full"
                  >
                    {spinsLeft > 0
                      ? "Girar a roleta"
                      : `Pagar ${priceLabel} e girar`}
                  </Button>

                  {error ? (
                    <p
                      role="alert"
                      className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-300"
                    >
                      {error}
                    </p>
                  ) : null}

                  {play && play.results.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                        Seus prêmios
                      </p>
                      {play.results.map((prize) => (
                        <div
                          key={prize.code}
                          className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3"
                        >
                          <span className="text-2xl" aria-hidden="true">
                            {prize.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-ink">
                              {prize.title}
                            </p>
                            <p className="font-mono text-xs tracking-widest text-ink-muted">
                              {prize.code}
                            </p>
                          </div>
                          {prize.redeemedAt ? (
                            <Badge tone="green">Entregue</Badge>
                          ) : (
                            <Badge tone="gold">Mostrar</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </Card>

            <div className="mt-4 space-y-2 px-1 text-xs text-ink-muted">
              <p>
                🚗 Promoção oferecida por <strong>{driver.name}</strong> durante a{" "}
                {event.name}.
              </p>
              <p>
                💳 Pagamento de {priceLabel} via Pix. Prêmio entregue no momento
                da corrida, mediante apresentação do código.
              </p>
              {driver.whatsapp ? (
                <p>
                  Dúvidas?{" "}
                  <a
                    className="font-semibold text-accent underline underline-offset-2"
                    href={`https://wa.me/${driver.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Chamar no WhatsApp
                  </a>
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </main>

      {paymentOpen ? (
        <PaymentModal
          spins={spinsPerPayment}
          priceLabel={priceLabel}
          onClose={closePayment}
          onPaid={handlePaid}
        />
      ) : null}

      {result ? (
        <PrizeResult
          result={result}
          spinsLeft={spinsLeft}
          onSpinAgain={() => {
            setResult(null);
            void spin();
          }}
          onClose={() => setResult(null)}
        />
      ) : null}
    </div>
  );
}
