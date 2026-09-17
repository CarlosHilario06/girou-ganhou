import { asset } from "./asset";

/**
 * Configuração central do app "Girou, Ganhou!".
 * Tudo que o motorista costuma querer mudar (preço, textos, marca) fica aqui
 * ou em variáveis de ambiente — sem precisar mexer no resto do código.
 */

export const EVENT = {
  /** Nome do evento/festa exibido no topo. */
  name: process.env.NEXT_PUBLIC_EVENT_NAME || "EMAPA 56 Anos",
  edition: process.env.NEXT_PUBLIC_EVENT_EDITION || "2026",
  city: process.env.NEXT_PUBLIC_EVENT_CITY || "Avaré",
  /** Troque o arquivo em /public/brand/ para usar a logo oficial em alta. */
  logo: asset(process.env.NEXT_PUBLIC_EVENT_LOGO || "/brand/emapa.svg"),
} as const;

export const DRIVER = {
  name: process.env.NEXT_PUBLIC_DRIVER_NAME || "Motorista parceiro",
  whatsapp: process.env.NEXT_PUBLIC_DRIVER_WHATSAPP || "",
} as const;

/** Preço de uma jogada, em centavos. R$ 3,00 por padrão. */
export const PLAY_PRICE_CENTS = Number(process.env.PLAY_PRICE_CENTS || 300);

/** Quantos giros o pagamento libera. */
export const SPINS_PER_PAYMENT = Number(process.env.SPINS_PER_PAYMENT || 1);

/** Minutos de validade do QR Code Pix antes de expirar. */
export const PIX_EXPIRATION_MINUTES = Number(
  process.env.PIX_EXPIRATION_MINUTES || 15,
);

/** Dias de validade do prêmio para ser resgatado com o motorista. */
export const PRIZE_VALIDITY_DAYS = Number(process.env.PRIZE_VALIDITY_DAYS || 30);

/** "1 giro" / "2 giros" — para o texto não sair torto quando o número muda. */
export function spinsLabel(count: number): string {
  return `${count} ${count === 1 ? "giro" : "giros"}`;
}

/** "gira 1 vez" / "gira 2 vezes". */
export function timesLabel(count: number): string {
  return `${count} ${count === 1 ? "vez" : "vezes"}`;
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
