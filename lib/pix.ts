/**
 * Gerador de "Pix Copia e Cola" (BR Code / EMV MPM) — padrão Banco Central.
 * Usado quando o app opera no modo `pix-static`, em que o dinheiro cai direto
 * na chave Pix do motorista, sem intermediário.
 */

type PixPayloadInput = {
  key: string;
  merchantName: string;
  merchantCity: string;
  amountCents?: number;
  /** Identificador da transação (máx. 25 caracteres, A-Z 0-9). */
  txid?: string;
  description?: string;
};

function field(id: string, value: string): string {
  const size = value.length.toString().padStart(2, "0");
  return `${id}${size}${value}`;
}

/** CRC16/CCITT-FALSE, exigido no campo 63 do BR Code. */
export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e caracteres não aceitos pelos bancos nos campos de texto. */
function sanitize(value: string, maxLength: number): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 $%*+\-./:]/g, "")
    .trim()
    .slice(0, maxLength)
    .toUpperCase();
}

export function sanitizeTxid(value: string): string {
  const clean = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 25);
  return clean.length > 0 ? clean : "GIROUGANHOU";
}

export function buildPixPayload({
  key,
  merchantName,
  merchantCity,
  amountCents,
  txid = "***",
  description,
}: PixPayloadInput): string {
  if (!key.trim()) {
    // Sem chave o banco recusa o QR, e o erro só apareceria na hora de pagar.
    throw new Error("Chave Pix vazia: configure PIX_KEY antes de gerar o QR.");
  }

  const merchantAccount =
    field("00", "br.gov.bcb.pix") +
    field("01", key) +
    (description ? field("02", sanitize(description, 40)) : "");

  let payload =
    field("00", "01") +
    field("26", merchantAccount) +
    field("52", "0000") +
    field("53", "986") +
    (amountCents && amountCents > 0
      ? field("54", (amountCents / 100).toFixed(2))
      : "") +
    field("58", "BR") +
    field("59", sanitize(merchantName, 25) || "RECEBEDOR") +
    field("60", sanitize(merchantCity, 15) || "SAO PAULO") +
    field("62", field("05", txid === "***" ? "***" : sanitizeTxid(txid)));

  payload += "6304";
  return payload + crc16(payload);
}
