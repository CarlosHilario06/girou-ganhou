import { NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { signInDriver, signOutDriver } from "@/lib/session";

export async function POST(request: Request) {
  // PIN curto pede limite apertado para não dar para adivinhar por tentativa.
  const limit = rateLimit(clientKey(request, "driver-login"), {
    limit: 8,
    windowMs: 10 * 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Tente novamente em alguns minutos." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { pin?: string };
  const ok = await signInDriver(body.pin ?? "");

  if (!ok) {
    return NextResponse.json({ error: "PIN incorreto." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await signOutDriver();
  return NextResponse.json({ ok: true });
}
