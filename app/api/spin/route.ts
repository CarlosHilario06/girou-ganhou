import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { loadPlay, toPublicPlay } from "@/lib/play-service";
import { drawPrize, PRIZES } from "@/lib/prizes";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getPlayId } from "@/lib/session";
import { getStore, newId, newPrizeCode } from "@/lib/store";

/**
 * Sorteio da roleta. O prêmio é decidido AQUI, no servidor: o navegador só
 * recebe o índice da fatia e anima a roda até ela. Assim ninguém ganha prêmio
 * mexendo no console.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "spin"), {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Calma aí! Aguarde um instante antes de girar de novo." },
      { status: 429 },
    );
  }

  const playId = await getPlayId();
  if (!playId) {
    return NextResponse.json(
      { error: "Sessão expirada. Faça seu cadastro de novo." },
      { status: 401 },
    );
  }

  const store = getStore();

  // Desconta o giro ANTES de sortear: se não havia saldo, nada acontece.
  // Dois cliques ao mesmo tempo disputam aqui, e só um leva.
  const hasSpin = await store.consumeSpin(playId);
  if (!hasSpin) {
    const exists = await store.getPlay(playId);
    return exists
      ? NextResponse.json(
          { error: "Você não tem giros disponíveis. Pague o Pix para liberar." },
          { status: 402 },
        )
      : NextResponse.json(
          { error: "Sessão expirada. Faça seu cadastro de novo." },
          { status: 401 },
        );
  }

  const prize = drawPrize();
  const spin = {
    id: newId("spin"),
    playId,
    prizeId: prize.id,
    // Fatia sem prêmio não gera código para o motorista validar.
    code: prize.win ? newPrizeCode() : undefined,
    createdAt: new Date().toISOString(),
  };

  await store.addSpin(spin);
  const play = await loadPlay(playId);

  return NextResponse.json({
    // Índice da fatia para o giro parar no lugar certo.
    prizeIndex: PRIZES.findIndex((p) => p.id === prize.id),
    prize: {
      id: prize.id,
      title: prize.title,
      description: prize.description,
      emoji: prize.emoji,
      win: prize.win,
    },
    code: spin.code,
    play: play
      ? toPublicPlay(play, getPaymentProvider().manualConfirmation)
      : undefined,
  });
}
