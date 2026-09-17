import type { Payment, Play } from "@/lib/store";

export type CreateChargeInput = {
  play: Play;
  amountCents: number;
  description: string;
  expiresAt: Date;
};

export type CreateChargeResult = {
  /** Pix copia e cola exibido e transformado em QR Code. */
  payload: string;
  /** Id da cobrança no provedor externo, quando houver. */
  externalId?: string;
};

export type PaymentProvider = {
  id: string;
  /** true quando o motorista precisa confirmar o recebimento na mão. */
  manualConfirmation: boolean;
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>;
  /** Consulta o provedor. Retorna undefined quando não há nada novo. */
  checkStatus(payment: Payment): Promise<"pending" | "paid" | "expired" | undefined>;
};
