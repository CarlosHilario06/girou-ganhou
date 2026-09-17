import {
  DISCOUNT_EVERY_SPINS,
  DISCOUNT_STEP_PERCENT,
  MAX_DISCOUNT_PERCENT,
  MAX_SPINS_PER_PURCHASE,
  PLAY_PRICE_CENTS,
} from "./config";

/**
 * Preço de um pacote de giros.
 *
 * A promoção é simples de explicar no banco de trás do carro: cada giro custa
 * o preço cheio, e a cada 3 giros o desconto sobe 5% — até um teto, para não
 * chegar num ponto em que girar sai de graça.
 *
 *   1–2 giros ... preço cheio
 *   3–5 giros ... 5% off
 *   6–8 giros ... 10% off
 *   9+  giros ... 15% off
 */
export type Quote = {
  spins: number;
  /** Quanto custaria sem desconto. */
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  totalCents: number;
  /** Preço de cada giro já com o desconto, para comparar pacotes. */
  unitCents: number;
  /** Quantos giros faltam para o próximo degrau (undefined se já no teto). */
  spinsToNextTier?: number;
  nextTierPercent?: number;
};

/** Desconto de um pacote, em pontos percentuais. */
export function discountPercentFor(spins: number): number {
  const steps = Math.floor(spins / DISCOUNT_EVERY_SPINS);
  return Math.min(steps * DISCOUNT_STEP_PERCENT, MAX_DISCOUNT_PERCENT);
}

/** Garante que a quantidade pedida cabe na régua, mesmo vinda de fora. */
export function clampSpins(spins: number): number {
  if (!Number.isFinite(spins)) return 1;
  return Math.min(Math.max(Math.trunc(spins), 1), MAX_SPINS_PER_PURCHASE);
}

export function quoteFor(spins: number): Quote {
  const count = clampSpins(spins);
  const subtotalCents = count * PLAY_PRICE_CENTS;
  const discountPercent = discountPercentFor(count);

  // Arredonda o total, não o desconto: assim o que o cliente paga nunca fica
  // um centavo diferente da conta que aparece na tela.
  const totalCents = Math.round((subtotalCents * (100 - discountPercent)) / 100);
  const discountCents = subtotalCents - totalCents;

  const atCeiling = discountPercent >= MAX_DISCOUNT_PERCENT;
  const nextTierAt =
    (Math.floor(count / DISCOUNT_EVERY_SPINS) + 1) * DISCOUNT_EVERY_SPINS;
  const reachable = !atCeiling && nextTierAt <= MAX_SPINS_PER_PURCHASE;

  return {
    spins: count,
    subtotalCents,
    discountPercent,
    discountCents,
    totalCents,
    unitCents: Math.round(totalCents / count),
    spinsToNextTier: reachable ? nextTierAt - count : undefined,
    nextTierPercent: reachable ? discountPercentFor(nextTierAt) : undefined,
  };
}
