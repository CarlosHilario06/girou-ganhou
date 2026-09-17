import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { PIX_EXPIRATION_MINUTES, EVENT } from "@/lib/config";
import { quoteFor, type Quote } from "@/lib/pricing";
import { getPaymentProvider } from "@/lib/payments";
import { loadPlay, toPublicPlay } from "@/lib/play-service";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { getPlayId } from "@/lib/session";
import { getStore, newId } from "@/lib/store";

/** Gera a cobrança Pix de uma jogada e devolve o QR pronto para exibir. */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "pay"), {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Muitas cobranças seguidas. Aguarde um instante." },
      { status: 429 },
    );
  }

  const playId = await getPlayId();
  // Quantos giros o jogador escolheu na régua. O preço é calculado AQUI:
  // o navegador não manda valor, só quantidade.
  const body = (await request.json().catch(() => ({}))) as { spins?: number };
  const quote = quoteFor(Number(body.spins ?? 1));

  const play = playId ? await loadPlay(playId) : undefined;
  if (!play) {
    return NextResponse.json(
      { error: "Sessão expirada. Faça seu cadastro de novo." },
      { status: 401 },
    );
  }

  const store = getStore();
  const provider = getPaymentProvider();

  // Se já existe um Pix válido para o mesmo pacote, reaproveita em vez de
  // gerar outro. Se o jogador mudou a régua, o antigo expira e vem um novo.
  const existing = await store.findPendingPayment(play.id);
  if (existing && existing.spins === quote.spins) {
    return NextResponse.json({
      payment: {
        id: existing.id,
        payload: existing.payload,
        qrCode: await QRCode.toDataURL(existing.payload, {
          margin: 1,
          width: 512,
        }),
        amountCents: existing.amountCents,
        spins: existing.spins,
        quote: quoteFor(existing.spins),
        expiresAt: existing.expiresAt,
        manualConfirmation: provider.manualConfirmation,
      },
      play: toPublicPlay(play, provider.manualConfirmation),
    });
  }

  if (existing) await store.markPaymentExpired(existing.id);

  const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60_000);

  try {
    const charge = await provider.createCharge({
      play,
      amountCents: quote.totalCents,
      description: `Roleta ${EVENT.name} · ${quote.spins}x`,
      expiresAt,
    });

    const payment = {
      id: newId("pay"),
      playId: play.id,
      provider: provider.id,
      externalId: charge.externalId,
      amountCents: quote.totalCents,
      spins: quote.spins,
      status: "pending" as const,
      payload: charge.payload,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await store.addPayment(payment);
    play.payments.push(payment);

    return NextResponse.json({
      payment: {
        id: payment.id,
        payload: payment.payload,
        qrCode: await QRCode.toDataURL(payment.payload, {
          margin: 1,
          width: 512,
        }),
        amountCents: payment.amountCents,
        spins: payment.spins,
        quote: quote satisfies Quote,
        expiresAt: payment.expiresAt,
        manualConfirmation: provider.manualConfirmation,
      },
      play: toPublicPlay(play, provider.manualConfirmation),
    });
  } catch (error) {
    console.error("Falha ao criar cobrança Pix", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o Pix agora. Tente novamente." },
      { status: 502 },
    );
  }
}
