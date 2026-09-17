import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { creditPayment, toPublicPlay } from "@/lib/play-service";
import { getPlayId } from "@/lib/session";
import { expireStalePayments, getPlay, savePlay } from "@/lib/store";

/**
 * Consulta de status usada pelo popup enquanto o jogador paga.
 * É aqui que os giros são creditados quando o Pix cai.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/payments/[id]">,
) {
  const { id } = await context.params;
  const play = getPlay(await getPlayId());

  if (!play) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  expireStalePayments(play);
  const payment = play.payments.find((p) => p.id === id);
  if (!payment) {
    return NextResponse.json(
      { error: "Cobrança não encontrada." },
      { status: 404 },
    );
  }

  const provider = getPaymentProvider();

  if (payment.status === "pending") {
    try {
      const status = await provider.checkStatus(payment);
      if (status === "paid") {
        creditPayment(play, payment);
      } else if (status === "expired") {
        payment.status = "expired";
        savePlay(play);
      }
    } catch (error) {
      // Provedor fora do ar não pode travar a tela: segue como pendente.
      console.error("Falha ao consultar status do pagamento", error);
    }
  }

  return NextResponse.json({
    status: payment.status,
    play: toPublicPlay(play, provider.manualConfirmation),
  });
}
