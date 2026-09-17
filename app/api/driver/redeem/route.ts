import { NextResponse } from "next/server";
import { PRIZE_VALIDITY_DAYS } from "@/lib/config";
import { getPrize } from "@/lib/prizes";
import { isDriver } from "@/lib/session";
import { findSpinByCode, savePlay } from "@/lib/store";

/**
 * Validação do código do prêmio.
 * `confirm: false` só consulta; `confirm: true` marca como entregue, para o
 * mesmo código não ser usado duas vezes.
 */
export async function POST(request: Request) {
  if (!(await isDriver())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    confirm?: boolean;
  };

  const found = findSpinByCode(body.code ?? "");
  if (!found) {
    return NextResponse.json(
      { status: "invalid", error: "Código não encontrado." },
      { status: 404 },
    );
  }

  const { play, spin } = found;
  const prize = getPrize(spin.prizeId);
  const expiresAt =
    Date.parse(spin.createdAt) + PRIZE_VALIDITY_DAYS * 24 * 60 * 60_000;

  const base = {
    code: spin.code,
    prize: prize?.title ?? "Prêmio",
    emoji: prize?.emoji ?? "🎁",
    winner: play.name,
    createdAt: spin.createdAt,
  };

  if (spin.redeemedAt) {
    return NextResponse.json({
      ...base,
      status: "used",
      redeemedAt: spin.redeemedAt,
    });
  }

  if (Date.now() > expiresAt) {
    return NextResponse.json({ ...base, status: "expired" });
  }

  if (body.confirm) {
    spin.redeemedAt = new Date().toISOString();
    savePlay(play);
    return NextResponse.json({
      ...base,
      status: "redeemed",
      redeemedAt: spin.redeemedAt,
    });
  }

  return NextResponse.json({ ...base, status: "valid" });
}
