import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { creditAndReload, loadPlay, toPublicPlay } from "@/lib/play-service";
import { getPlayId } from "@/lib/session";
import { getStore } from "@/lib/store";

/**
 * Consulta de status usada pelo popup enquanto o jogador paga.
 * É aqui que os giros são creditados quando o Pix cai.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/payments/[id]">,
) {
  const { id } = await context.params;
  const playId = await getPlayId();
  let play = playId ? await loadPlay(playId) : undefined;

  if (!play) {
    return NextResponse.json({ error: "Sessão expirada." }, { status: 401 });
  }

  const store = getStore();
  const payment = await store.getPayment(id);

  // O pagamento tem de ser desta jogada: id de outra pessoa não serve.
  if (!payment || payment.playId !== play.id) {
    return NextResponse.json(
      { error: "Cobrança não encontrada." },
      { status: 404 },
    );
  }

  const provider = getPaymentProvider();
  let status = payment.status;

  if (status === "pending") {
    try {
      const remote = await provider.checkStatus(payment);
      if (remote === "paid") {
        const result = await creditAndReload(payment.id, play.id);
        play = result.play ?? play;
        status = "paid";
      } else if (remote === "expired") {
        await store.markPaymentExpired(payment.id);
        status = "expired";
      }
    } catch (error) {
      // Provedor fora do ar não pode travar a tela: segue como pendente.
      console.error("Falha ao consultar status do pagamento", error);
    }
  }

  return NextResponse.json({
    status,
    play: toPublicPlay(play, provider.manualConfirmation),
  });
}
