import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { creditPayment } from "@/lib/play-service";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { findPayment } from "@/lib/store";

/**
 * Webhook do provedor (Mercado Pago). Confirma o pagamento sem esperar o
 * polling — útil quando o jogador fecha a tela logo depois de pagar.
 *
 * Nunca confia no corpo da requisição: usa o id recebido só para perguntar ao
 * provedor qual é o status real.
 */
export async function POST(request: Request) {
  // Cada webhook vira uma consulta à API do provedor. Sem limite, qualquer um
  // poderia usar esta rota para queimar a cota da conta do motorista.
  const limit = rateLimit(clientKey(request, "webhook"), {
    limit: 120,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return NextResponse.json({ received: false }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    data?: { id?: string | number };
    id?: string | number;
    type?: string;
  };

  const externalId = String(body.data?.id ?? body.id ?? "");
  if (!externalId) return NextResponse.json({ received: true });

  const found = findPayment((payment) => payment.externalId === externalId);
  if (!found) return NextResponse.json({ received: true });

  try {
    const status = await getPaymentProvider().checkStatus(found.payment);
    if (status === "paid") creditPayment(found.play, found.payment);
  } catch (error) {
    console.error("Falha ao processar webhook de pagamento", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
