import type { PaymentProvider } from "./types";

/**
 * Pix com confirmação automática via Mercado Pago.
 * Requer MERCADOPAGO_ACCESS_TOKEN (token de produção da conta do motorista).
 * O status chega por duas vias: webhook (/api/payments/webhook) e a consulta
 * de polling abaixo — a que chegar primeiro libera os giros.
 */
const API = "https://api.mercadopago.com/v1/payments";

function token(): string {
  const value = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!value) {
    throw new Error(
      "MERCADOPAGO_ACCESS_TOKEN não configurado. Use PAYMENT_PROVIDER=demo para testar sem conta.",
    );
  }
  return value;
}

export const mercadoPagoProvider: PaymentProvider = {
  id: "mercadopago",
  manualConfirmation: false,

  async createCharge({ play, amountCents, description, expiresAt }) {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": "application/json",
        // Evita cobrança duplicada se o jogador clicar duas vezes.
        "X-Idempotency-Key": `${play.id}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: amountCents / 100,
        description,
        payment_method_id: "pix",
        date_of_expiration: expiresAt.toISOString(),
        notification_url: process.env.MERCADOPAGO_WEBHOOK_URL,
        payer: {
          email:
            process.env.MERCADOPAGO_PAYER_EMAIL || "jogador@girouganhou.app",
          first_name: play.name.split(" ")[0] ?? "Jogador",
        },
      }),
    });

    const data = (await response.json()) as {
      id?: number;
      point_of_interaction?: {
        transaction_data?: { qr_code?: string };
      };
      message?: string;
    };

    if (!response.ok || !data.point_of_interaction?.transaction_data?.qr_code) {
      throw new Error(
        `Mercado Pago recusou a cobrança: ${data.message ?? response.status}`,
      );
    }

    return {
      payload: data.point_of_interaction.transaction_data.qr_code,
      externalId: String(data.id),
    };
  },

  async checkStatus(payment) {
    if (!payment.externalId) return undefined;
    const response = await fetch(`${API}/${payment.externalId}`, {
      headers: { Authorization: `Bearer ${token()}` },
      cache: "no-store",
    });
    if (!response.ok) return undefined;

    const data = (await response.json()) as { status?: string };
    if (data.status === "approved") return "paid";
    if (data.status === "cancelled" || data.status === "rejected") {
      return "expired";
    }
    return "pending";
  },
};
