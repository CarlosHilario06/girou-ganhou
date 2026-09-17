"use client";

import { useEffect, useState } from "react";
import { gameApi, type Winner } from "@/lib/game-client";
import { WINNING_PRIZES } from "@/lib/prizes";

/**
 * Letreiro que passa no topo da tela.
 *
 * Com ganhadores de verdade no banco, mostra quem já levou prêmio — e como a
 * faixa roda em laço, os mesmos nomes voltam a aparecer sozinhos.
 * Enquanto ninguém ganhou nada, mostra o que está em jogo, para a faixa nunca
 * ficar vazia nem inventar gente.
 */
export function WinnersTicker() {
  const [winners, setWinners] = useState<Winner[]>([]);

  useEffect(() => {
    let active = true;

    const load = () => {
      gameApi
        .winners()
        .then((lista) => active && setWinners(lista))
        .catch(() => {
          // Sem ganhadores agora: a faixa cai para os prêmios em jogo.
        });
    };

    load();
    // De tempos em tempos entra quem ganhou no meio da festa.
    const timer = setInterval(load, 45_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const itens =
    winners.length > 0
      ? winners.map((w) => (
          <>
            <span className="font-bold text-ink">{w.name}</span>
            <span className="text-ink-muted"> já ganhou </span>
            <span className="font-semibold text-ink">
              {w.emoji} {w.prize}
            </span>
          </>
        ))
      : WINNING_PRIZES.map((prize) => (
          <>
            <span aria-hidden="true">{prize.emoji}</span>
            <span className="font-semibold text-ink"> {prize.title}</span>
          </>
        ));

  // A faixa é duplicada para o laço emendar sem salto visível.
  const faixa = [...itens, ...itens];

  return (
    <div
      className="relative overflow-hidden border-y border-line bg-surface/70 py-2 backdrop-blur"
      aria-label={
        winners.length > 0 ? "Últimos ganhadores" : "Prêmios da roleta"
      }
    >
      {/* Desbotado nas pontas, para o texto não bater na borda da tela. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-bg to-transparent" />

      <div className="ticker flex w-max gap-8 whitespace-nowrap text-sm">
        {faixa.map((item, index) => (
          <span key={index} className="flex items-center gap-1.5">
            <span className="text-gold" aria-hidden="true">
              ★
            </span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
