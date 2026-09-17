import { NextResponse } from "next/server";
import { PRIZE_VALIDITY_DAYS } from "@/lib/config";
import { getPrize } from "@/lib/prizes";
import { isDriver } from "@/lib/session";
import { getStore } from "@/lib/store";

/**
 * Validação do código do prêmio.
 * `confirm: false` só consulta; `confirm: true` marca como entregue, e o
 * armazenamento garante que isso só funciona na primeira vez.
 */
export async function POST(request: Request) {
  if (!(await isDriver())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    confirm?: boolean;
  };

  const store = getStore();
  const found = await store.findSpinByCode(body.code ?? "");

  if (!found || !found.spin.code) {
    return NextResponse.json(
      { status: "invalid", error: "Código não encontrado." },
      { status: 404 },
    );
  }

  const { winner } = found;
  const spin = { ...found.spin, code: found.spin.code };
  const prize = getPrize(spin.prizeId);
  const expiresAt =
    Date.parse(spin.createdAt) + PRIZE_VALIDITY_DAYS * 24 * 60 * 60_000;

  const code = found.spin.code;
  const base = {
    code,
    prize: prize?.title ?? "Prêmio",
    emoji: prize?.emoji ?? "🎁",
    winner,
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
    // Se dois aparelhos confirmarem o mesmo código ao mesmo tempo, só um vence.
    const redeemed = await store.redeemSpin(code);
    if (!redeemed) {
      return NextResponse.json({ ...base, status: "used" });
    }
    return NextResponse.json({
      ...base,
      status: "redeemed",
      redeemedAt: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ...base, status: "valid" });
}
