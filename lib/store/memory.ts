import { newId, normalizeCode } from "./ids";
import type { Payment, Play, SpinRecord, Store } from "./types";

/**
 * Armazenamento em memória, para desenvolvimento e testes.
 * Some quando o servidor reinicia — nunca use na festa.
 *
 * As operações "atômicas" aqui são naturalmente atômicas: JavaScript roda uma
 * coisa de cada vez, e nenhuma delas tem await no meio.
 */
export function createMemoryStore(): Store {
  const plays = new Map<string, Play>();

  const findPayment = (id: string): Payment | undefined => {
    for (const play of plays.values()) {
      const payment = play.payments.find((p) => p.id === id);
      if (payment) return payment;
    }
    return undefined;
  };

  const allSpins = (): Array<{ spin: SpinRecord; winner: string }> =>
    [...plays.values()].flatMap((play) =>
      play.spins.map((spin) => ({ spin, winner: play.name })),
    );

  return {
    async createPlay({ name, phone, source }) {
      const play: Play = {
        id: newId("play"),
        name,
        phone,
        source,
        createdAt: new Date().toISOString(),
        spinsAvailable: 0,
        payments: [],
        spins: [],
      };
      plays.set(play.id, play);
      return structuredClone(play);
    },

    async getPlay(id) {
      const play = plays.get(id);
      return play ? structuredClone(play) : undefined;
    },

    async addPayment(payment) {
      plays.get(payment.playId)?.payments.push(structuredClone(payment));
    },

    async getPayment(id) {
      const payment = findPayment(id);
      return payment ? structuredClone(payment) : undefined;
    },

    async findPaymentByExternalId(externalId) {
      for (const play of plays.values()) {
        const payment = play.payments.find((p) => p.externalId === externalId);
        if (payment) return structuredClone(payment);
      }
      return undefined;
    },

    async findPendingPayment(playId) {
      const now = Date.now();
      const payment = plays
        .get(playId)
        ?.payments.find(
          (p) => p.status === "pending" && Date.parse(p.expiresAt) > now,
        );
      return payment ? structuredClone(payment) : undefined;
    },

    async expireStalePayments(playId) {
      const now = Date.now();
      const alvo = playId ? [plays.get(playId)] : [...plays.values()];
      for (const play of alvo) {
        for (const payment of play?.payments ?? []) {
          if (payment.status === "pending" && Date.parse(payment.expiresAt) <= now) {
            payment.status = "expired";
          }
        }
      }
    },

    async markPaymentExpired(paymentId) {
      const payment = findPayment(paymentId);
      if (payment?.status === "pending") payment.status = "expired";
    },

    async creditPayment(paymentId, spins, confirmedBy) {
      const payment = findPayment(paymentId);
      if (!payment || payment.status !== "pending") return false;

      payment.status = "paid";
      payment.paidAt = new Date().toISOString();
      if (confirmedBy) payment.confirmedBy = confirmedBy;

      const play = plays.get(payment.playId);
      if (play) play.spinsAvailable += spins;
      return true;
    },

    async consumeSpin(playId) {
      const play = plays.get(playId);
      if (!play || play.spinsAvailable <= 0) return false;
      play.spinsAvailable -= 1;
      return true;
    },

    async addSpin(spin) {
      plays.get(spin.playId)?.spins.push(structuredClone(spin));
    },

    async findSpinByCode(code) {
      const normalized = normalizeCode(code);
      if (!normalized) return undefined;
      const found = allSpins().find(
        ({ spin }) => spin.code && normalizeCode(spin.code) === normalized,
      );
      return found
        ? { spin: structuredClone(found.spin), winner: found.winner }
        : undefined;
    },

    async redeemSpin(code) {
      const normalized = normalizeCode(code);
      if (!normalized) return false;
      const found = allSpins().find(
        ({ spin }) => spin.code && normalizeCode(spin.code) === normalized,
      );
      if (!found || found.spin.redeemedAt) return false;
      found.spin.redeemedAt = new Date().toISOString();
      return true;
    },

    async getStats() {
      const lista = [...plays.values()];
      const pagos = lista.flatMap((p) =>
        p.payments.filter((pay) => pay.status === "paid"),
      );
      const premios = lista.flatMap((p) => p.spins.filter((s) => s.code));

      return {
        players: lista.length,
        paidCount: pagos.length,
        revenueCents: pagos.reduce((soma, p) => soma + p.amountCents, 0),
        prizesGiven: premios.filter((s) => s.redeemedAt).length,
        prizesPending: premios.filter((s) => !s.redeemedAt).length,
      };
    },

    async listPendingPayments(limit = 50) {
      const now = Date.now();
      return [...plays.values()]
        .flatMap((play) =>
          play.payments
            .filter(
              (p) => p.status === "pending" && Date.parse(p.expiresAt) > now,
            )
            .map((p) => ({
              id: p.id,
              playName: play.name,
              playPhone: play.phone,
              amountCents: p.amountCents,
              createdAt: p.createdAt,
            })),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },

    async listRecentPrizes(limit = 30) {
      return allSpins()
        .filter(({ spin }) => spin.code)
        .map(({ spin, winner }) => ({
          code: spin.code as string,
          prizeId: spin.prizeId,
          winner,
          createdAt: spin.createdAt,
          redeemedAt: spin.redeemedAt,
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit);
    },
  };
}
