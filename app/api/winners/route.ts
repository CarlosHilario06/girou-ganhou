import { NextResponse } from "next/server";
import { getPrize } from "@/lib/prizes";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getStore } from "@/lib/store";

/**
 * Últimos ganhadores, para o letreiro do topo.
 *
 * São ganhadores de verdade: só o primeiro nome vai para a tela, e só de quem
 * realmente levou prêmio. Nome inventado em promoção é o tipo de coisa que
 * vira reclamação no primeiro passageiro que perguntar "quem é essa Ana?".
 */
export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "winners"), {
    limit: 60,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json({ winners: [] }, { status: 429 });
  }

  try {
    const prizes = await getStore().listRecentPrizes(12);

    return NextResponse.json({
      winners: prizes.flatMap((row) => {
        const prize = getPrize(row.prizeId);
        if (!prize?.win) return [];
        return {
          // Só o primeiro nome: ninguém precisa do sobrenome do passageiro.
          name: row.winner.trim().split(/\s+/)[0],
          prize: prize.title,
          emoji: prize.emoji,
        };
      }),
    });
  } catch (error) {
    // O letreiro é enfeite: se o banco tossir, a roleta continua de pé.
    console.error("Falha ao listar ganhadores", error);
    return NextResponse.json({ winners: [] });
  }
}
