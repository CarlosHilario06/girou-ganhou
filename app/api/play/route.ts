import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { loadPlay, toPublicPlay } from "@/lib/play-service";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { clearPlay, getPlayId, setPlayId } from "@/lib/session";
import { getStore } from "@/lib/store";

/** Aceita "(14) 99999-9999", "14999999999" etc. e devolve só os dígitos. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 11) return null;
  return digits;
}

function normalizeName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) return null;
  return name;
}

export async function GET() {
  const playId = await getPlayId();
  const play = playId ? await loadPlay(playId) : undefined;
  if (!play) return NextResponse.json({ play: null });
  return NextResponse.json({
    play: toPublicPlay(play, getPaymentProvider().manualConfirmation),
  });
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "play"), {
    limit: 10,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um instante e tente de novo." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    source?: string;
  };

  const name = normalizeName(body.name ?? "");
  const phone = normalizePhone(body.phone ?? "");

  if (!name) {
    return NextResponse.json(
      { error: "Digite seu nome completo." },
      { status: 400 },
    );
  }
  if (!phone) {
    return NextResponse.json(
      { error: "Digite um celular válido com DDD." },
      { status: 400 },
    );
  }

  const play = await getStore().createPlay({
    name,
    phone,
    source: body.source?.slice(0, 40),
  });
  await setPlayId(play.id);

  return NextResponse.json({
    play: toPublicPlay(play, getPaymentProvider().manualConfirmation),
  });
}

/** Encerra a sessão para o próximo passageiro jogar no mesmo aparelho. */
export async function DELETE() {
  await clearPlay();
  return NextResponse.json({ play: null });
}
