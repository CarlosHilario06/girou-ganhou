import { NextResponse } from "next/server";
import { drawPrize, PRIZES } from "@/lib/prizes";
import { toPublicPlay } from "@/lib/play-service";
import { getPaymentProvider } from "@/lib/payments";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getPlayId } from "@/lib/session";
import { getPlay, newId, newPrizeCode, savePlay } from "@/lib/store";

/**
 * Sorteio da roleta. O prêmio é decidido AQUI, no servidor: o navegador só
 * recebe o índice da fatia e anima a roda até ela. Assim ninguém ganha corrida
 * grátis mexendo no console.
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

  const play = getPlay(await getPlayId());
  if (!play) {
    return NextResponse.json(
      { error: "Sessão expirada. Faça seu cadastro de novo." },
      { status: 401 },
    );
  }

  if (play.spinsAvailable <= 0) {
    return NextResponse.json(
      { error: "Você não tem giros disponíveis. Pague o Pix para liberar." },
      { status: 402 },
    );
  }

  const prize = drawPrize();
  const spin = {
    id: newId("spin"),
    prizeId: prize.id,
    code: newPrizeCode(),
    createdAt: new Date().toISOString(),
  };

  play.spinsAvailable -= 1;
  play.spins.push(spin);
  savePlay(play);

  return NextResponse.json({
    // Índice da fatia para o giro parar no lugar certo.
    prizeIndex: PRIZES.findIndex((p) => p.id === prize.id),
    prize: {
      id: prize.id,
      title: prize.title,
      description: prize.description,
      emoji: prize.emoji,
    },
    code: spin.code,
    play: toPublicPlay(play, getPaymentProvider().manualConfirmation),
  });
}
