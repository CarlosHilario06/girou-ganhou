import { SPINS_PER_PAYMENT } from "@/lib/config";
import { getPrize } from "@/lib/prizes";
import { getStore, type Play } from "@/lib/store";

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
  const pending = play.payments.find((p) => p.status === "pending");

  return {
    id: play.id,
    name: play.name,
    spinsAvailable: play.spinsAvailable,
    // A lista "Seus prêmios" mostra só o que dá para resgatar: as fatias
    // sem prêmio ficam de fora.
    results: play.spins.flatMap((spin) => {
      const prize = getPrize(spin.prizeId);
      if (!prize?.win || !spin.code) return [];
      return {
        prizeId: spin.prizeId,
        title: prize.title,
        description: prize.description,
        emoji: prize.emoji,
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

/** Lê a jogada já com os Pix vencidos marcados como expirados. */
export async function loadPlay(id: string): Promise<Play | undefined> {
  const store = getStore();
  await store.expireStalePayments(id);
  return store.getPlay(id);
}

/**
 * Credita os giros de um pagamento aprovado e devolve a jogada atualizada.
 * O crédito em si é atômico no armazenamento: webhook, consulta de status e
 * confirmação manual podem chegar juntos que só o primeiro credita.
 */
export async function creditAndReload(
  paymentId: string,
  playId: string,
  confirmedBy?: string,
): Promise<{ credited: boolean; play: Play | undefined }> {
  const store = getStore();
  const credited = await store.creditPayment(
    paymentId,
    SPINS_PER_PAYMENT,
    confirmedBy,
  );
  return { credited, play: await store.getPlay(playId) };
}
