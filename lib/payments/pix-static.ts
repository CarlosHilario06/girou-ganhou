import { buildPixPayload } from "@/lib/pix";
import type { PaymentProvider } from "./types";

/**
 * Pix direto na chave do motorista, sem intermediário e sem taxa.
 * Não existe API para saber se caiu, então a confirmação é manual: o motorista
 * vê o Pix no app do banco e libera os giros em /motorista.
 */
export const pixStaticProvider: PaymentProvider = {
  id: "pix-static",
  manualConfirmation: true,

  async createCharge({ play, amountCents, description }) {
    const key = process.env.PIX_KEY;
    if (!key) {
      throw new Error(
        "PIX_KEY não configurada. Defina a chave Pix do motorista no .env.",
      );
    }
    return {
      payload: buildPixPayload({
        key,
        merchantName: process.env.PIX_MERCHANT_NAME || "GIROU GANHOU",
        merchantCity: process.env.PIX_MERCHANT_CITY || "AVARE",
        amountCents,
        txid: play.id.replace(/[^A-Za-z0-9]/g, "").slice(0, 25),
        description,
      }),
    };
  },

  async checkStatus() {
    // Quem muda o status é o endpoint de confirmação manual do motorista.
    return undefined;
  },
};
