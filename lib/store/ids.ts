import crypto from "node:crypto";

export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(9).toString("base64url")}`;
}

/** Código curto, sem caracteres ambíguos (0/O, 1/I), fácil de ditar em voz alta. */
export function newPrizeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[bytes[i] % alphabet.length];
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/** Normaliza o código digitado pelo motorista: sem hífen, espaço ou minúscula. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
