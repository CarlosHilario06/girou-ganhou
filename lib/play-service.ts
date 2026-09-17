import { SPINS_PER_PAYMENT } from "@/lib/config";
import { getPrize, type Prize } from "@/lib/prizes";
import {
  expireStalePayments,
  savePlay,
  type Payment,
  type Play,
} from "@/lib/store";

/** Formato da jogada que o navegador pode ver (sem nada sensível). */
export type PublicPlay = {
  id: string;
  name: string;
  spinsAvailable: number;
  results: Array<{
    prizeId: string;
    title: string;
    description: string;
    emoji: string;
    code: string;
    createdAt: string;
    redeemedAt?: string;
  }>;
  pendingPayment?: {
    id: string;
    expiresAt: string;
    manualConfirmation: boolean;
  };
};

export function toPublicPlay(
  play: Play,
  manualConfirmation: boolean,
): PublicPlay {
  const fresh = expireStalePayments(play);
  const pending = fresh.payments.find((p) => p.status === "pending");

  return {
    id: fresh.id,
    name: fresh.name,
    spinsAvailable: fresh.spinsAvailable,
    results: fresh.spins.map((spin) => {
      const prize = getPrize(spin.prizeId);
      return {
        prizeId: spin.prizeId,
        title: prize?.title ?? "Prêmio",
        description: prize?.description ?? "",
        emoji: prize?.emoji ?? "🎁",
        code: spin.code,
        createdAt: spin.createdAt,
        redeemedAt: spin.redeemedAt,
      };
    }),
    pendingPayment: pending
      ? {
          id: pending.id,
          expiresAt: pending.expiresAt,
          manualConfirmation,
        }
      : undefined,
  };
}

/**
 * Credita os giros de um pagamento aprovado.
 * Idempotente de propósito: webhook, polling e confirmação manual podem
 * chegar todos no mesmo pagamento, e só o primeiro credita.
 */
export function creditPayment(
  play: Play,
  payment: Payment,
  confirmedBy?: string,
): boolean {
  if (payment.status === "paid") return false;

  payment.status = "paid";
  payment.paidAt = new Date().toISOString();
  if (confirmedBy) payment.confirmedBy = confirmedBy;
  play.spinsAvailable += SPINS_PER_PAYMENT;
  savePlay(play);
  return true;
}

export function prizeIndex(prize: Prize, prizes: Prize[]): number {
  return prizes.findIndex((p) => p.id === prize.id);
}
