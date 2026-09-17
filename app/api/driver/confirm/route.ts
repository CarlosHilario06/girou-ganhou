import { NextResponse } from "next/server";
import { creditAndReload } from "@/lib/play-service";
import { isDriver } from "@/lib/session";
import { getStore } from "@/lib/store";

/**
 * Confirmação manual de um Pix (modo pix-static): o motorista viu o dinheiro
 * cair no app do banco e libera os giros do jogador.
 */
export async function POST(request: Request) {
  if (!(await isDriver())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    paymentId?: string;
  };
  if (!body.paymentId) {
    return NextResponse.json(
      { error: "Informe o pagamento." },
      { status: 400 },
    );
  }

  const payment = await getStore().getPayment(body.paymentId);
  if (!payment) {
    return NextResponse.json(
      { error: "Pagamento não encontrado." },
      { status: 404 },
    );
  }

  const { credited, play } = await creditAndReload(
    payment.id,
    payment.playId,
    "motorista",
  );

  return NextResponse.json({
    ok: true,
    credited,
    playName: play?.name,
  });
}
