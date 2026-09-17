"use client";

import confetti from "canvas-confetti";
import { useEffect } from "react";
import { Button } from "./ui";

export type SpinResult = {
  title: string;
  description: string;
  emoji: string;
  code: string;
};

/** Chuva de confete nas cores da festa. */
function celebrate() {
  const colors = ["#f4b324", "#1e63d8", "#16a64f", "#ffffff"];
  const shoot = (originX: number) =>
    confetti({
      particleCount: 55,
      spread: 70,
      startVelocity: 42,
      origin: { x: originX, y: 0.7 },
      colors,
      disableForReducedMotion: true,
    });

  shoot(0.25);
  shoot(0.75);
  setTimeout(() => shoot(0.5), 220);
}

export function PrizeResult({
  result,
  spinsLeft,
  onSpinAgain,
  onClose,
}: {
  result: SpinResult;
  spinsLeft: number;
  onSpinAgain: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    celebrate();
  }, [result.code]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-950/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prize-title"
    >
      <div className="animate-pop-in w-full max-w-md rounded-t-3xl border border-gold/40 bg-surface p-6 text-center shadow-2xl sm:rounded-3xl">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-gold">
          Girou, ganhou!
        </p>

        <div className="my-4 text-6xl" aria-hidden="true">
          {result.emoji}
        </div>

        <h2 id="prize-title" className="font-display text-3xl leading-tight text-ink">
          {result.title}
        </h2>
        <p className="mx-auto mt-3 max-w-xs text-sm text-ink-muted">
          {result.description}
        </p>

        <div className="my-6 rounded-2xl border-2 border-dashed border-gold/60 bg-gold/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Código do prêmio
          </p>
          <p className="font-mono text-3xl font-black tracking-[0.2em] text-ink">
            {result.code}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Mostre esta tela para o motorista para receber na hora.
          </p>
        </div>

        {spinsLeft > 0 ? (
          <Button variant="gold" size="lg" onClick={onSpinAgain} className="w-full">
            Girar de novo ({spinsLeft} {spinsLeft === 1 ? "giro" : "giros"})
          </Button>
        ) : null}

        <Button variant="ghost" onClick={onClose} className="mt-2 w-full">
          {spinsLeft > 0 ? "Depois" : "Fechar"}
        </Button>
      </div>
    </div>
  );
}
