import { buildPixPayload } from "@/lib/pix";
import type { PaymentProvider } from "./types";

/**
 * Provedor de demonstração: gera um Pix copia e cola de verdade (com a chave
 * de teste) e aprova sozinho depois de alguns segundos. Serve para mostrar o
 * fluxo completo sem nenhuma integração bancária.
 */
const AUTO_APPROVE_SECONDS = Number(process.env.DEMO_AUTO_APPROVE_SECONDS || 6);

export const demoProvider: PaymentProvider = {
  id: "demo",
  manualConfirmation: false,

  async createCharge({ play, amountCents, description }) {
    return {
      payload: buildPixPayload({
        key: process.env.PIX_KEY || "demo@girouganhou.app",
        merchantName: process.env.PIX_MERCHANT_NAME || "GIROU GANHOU",
        merchantCity: process.env.PIX_MERCHANT_CITY || "AVARE",
        amountCents,
        txid: play.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 25),
        description,
      }),
    };
  },

  async checkStatus(payment) {
    const elapsed = (Date.now() - Date.parse(payment.createdAt)) / 1000;
    return elapsed >= AUTO_APPROVE_SECONDS ? "paid" : "pending";
  },
};
