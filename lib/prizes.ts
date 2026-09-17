/**
 * Os 4 prêmios da roleta — todos entregues na hora pelo motorista.
 * `weight` é o peso do sorteio (quanto maior, mais provável).
 * A soma não precisa dar 100: o sorteio normaliza sozinho.
 */
export type Prize = {
  id: string;
  /** Texto curto que cabe dentro da fatia da roleta. */
  label: string;
  /** Segunda linha da fatia (opcional). */
  sublabel?: string;
  /** Nome completo usado no comprovante. */
  title: string;
  /** Instrução de resgate mostrada ao ganhador. */
  description: string;
  emoji: string;
  /** Cores da fatia (claro/escuro usam a mesma base da identidade da festa). */
  fill: string;
  fillDark: string;
  ink: string;
  weight: number;
};

export const PRIZES: Prize[] = [
  {
    id: "corrida-gratis",
    label: "CORRIDA",
    sublabel: "GRÁTIS",
    title: "Corrida grátis até R$ 20",
    description:
      "Sua corrida até R$ 20 é por conta da casa. Mostre este código para o motorista antes de descer.",
    emoji: "🚗",
    fill: "#F4B324",
    fillDark: "#E0A312",
    ink: "#08142E",
    weight: 5,
  },
  {
    id: "meia-corrida",
    label: "50% OFF",
    sublabel: "NA CORRIDA",
    title: "50% de desconto na corrida",
    description:
      "Metade do valor desta corrida é desconto. Mostre este código para o motorista antes de descer.",
    emoji: "✂️",
    fill: "#1E63D8",
    fillDark: "#1750B4",
    ink: "#FFFFFF",
    weight: 20,
  },
  {
    id: "cinco-reais",
    label: "R$ 5 OFF",
    sublabel: "NA CORRIDA",
    title: "R$ 5,00 de desconto na corrida",
    description:
      "Abate R$ 5,00 do valor desta corrida. Mostre este código para o motorista antes de descer.",
    emoji: "💸",
    fill: "#16A64F",
    fillDark: "#12873F",
    ink: "#FFFFFF",
    weight: 35,
  },
  {
    id: "kit-refresco",
    label: "KIT",
    sublabel: "REFRESCO",
    title: "Água gelada + bala",
    description:
      "Água gelada e uma bala para a viagem. Peça agora mesmo ao motorista mostrando o código.",
    emoji: "💧",
    fill: "#0E7C8E",
    fillDark: "#0A6376",
    ink: "#FFFFFF",
    weight: 40,
  },
];

export function getPrize(id: string): Prize | undefined {
  return PRIZES.find((p) => p.id === id);
}

/** Sorteio ponderado. Roda SEMPRE no servidor — o cliente só anima o resultado. */
export function drawPrize(random: () => number = Math.random): Prize {
  const total = PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let ticket = random() * total;
  for (const prize of PRIZES) {
    ticket -= prize.weight;
    if (ticket <= 0) return prize;
  }
  return PRIZES[PRIZES.length - 1];
}
