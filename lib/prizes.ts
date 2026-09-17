/**
 * As 6 fatias da roleta.
 *
 * `weight` é o peso do sorteio. Os pesos somam 1000, então cada 10 pontos
 * valem 1% — fica fácil mexer sem calcular nada:
 *
 *   😅 Não foi dessa vez ....... 70%  (duas fatias, uma em cada lado da roda)
 *   🥜 1 paçoca ................ 25%
 *   💵 R$ 10,00 ................. 3%
 *   🎟️ 3 ingressos do parque .... 1%
 *   🚗 Não paga a corrida ........ 1%
 *
 * `win: false` marca a fatia que não dá prêmio: não gera código, não aparece
 * no painel do motorista e não entra no letreiro de ganhadores.
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
  /** false = a fatia do "não ganhou nada". */
  win: boolean;
};

export const PRIZES: Prize[] = [
  {
    id: "pacoca",
    label: "PAÇOCA",
    title: "1 paçoca",
    description:
      "Uma paçoca para a viagem. Mostre este código para o motorista antes de descer.",
    emoji: "🥜",
    fill: "#F4B324",
    fillDark: "#E0A312",
    ink: "#08142E",
    weight: 250,
    win: true,
  },
  {
    id: "nada-1",
    label: "NÃO FOI",
    sublabel: "DESSA VEZ",
    title: "Não foi dessa vez",
    description: "A sorte estava quase lá. Quem sabe no próximo giro!",
    emoji: "😅",
    fill: "#7A8AA6",
    fillDark: "#41537A",
    ink: "#FFFFFF",
    weight: 350,
    win: false,
  },
  {
    id: "ingresso-parque",
    label: "3 INGRESSOS",
    sublabel: "DO PARQUE",
    title: "3 ingressos do parque",
    description:
      "O prêmio grande! 3 ingressos para o parque. Mostre este código para o motorista antes de descer.",
    emoji: "🎟️",
    fill: "#16A64F",
    fillDark: "#12873F",
    ink: "#FFFFFF",
    weight: 10,
    win: true,
  },
  {
    id: "dez-reais",
    label: "R$ 10",
    sublabel: "NA MÃO",
    title: "R$ 10,00 em dinheiro",
    description:
      "Dez reais na mão, agora. Mostre este código para o motorista antes de descer.",
    emoji: "💵",
    fill: "#1E63D8",
    fillDark: "#1750B4",
    ink: "#FFFFFF",
    weight: 30,
    win: true,
  },
  {
    id: "nada-2",
    label: "NÃO FOI",
    sublabel: "DESSA VEZ",
    title: "Não foi dessa vez",
    description: "A sorte estava quase lá. Quem sabe no próximo giro!",
    emoji: "😅",
    fill: "#7A8AA6",
    fillDark: "#41537A",
    ink: "#FFFFFF",
    weight: 350,
    win: false,
  },
  {
    id: "corrida-gratis",
    label: "NÃO PAGA",
    sublabel: "A CORRIDA",
    title: "Não paga a corrida",
    description:
      "Esta corrida é por conta da casa! Mostre este código para o motorista antes de descer.",
    emoji: "🚗",
    fill: "#0E7C8E",
    fillDark: "#0A6376",
    ink: "#FFFFFF",
    weight: 10,
    win: true,
  },
];

/** Só os prêmios de verdade. */
export const WINNING_PRIZES = PRIZES.filter((prize) => prize.win);

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
