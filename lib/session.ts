import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sessão do jogador em cookie assinado (HMAC). O cookie guarda só o id da
 * jogada — saldo de giros e prêmios ficam no servidor, então editar o cookie
 * no navegador não dá giro nem prêmio de graça.
 */

const COOKIE = "gg_play";
const DRIVER_COOKIE = "gg_driver";

function secret(): string {
  const value = process.env.APP_SECRET;
  if (value && value.length >= 16) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_SECRET ausente ou muito curto. Defina uma chave de 32+ caracteres.",
    );
  }
  return "dev-secret-nao-use-em-producao";
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function seal(value: string): string {
  return `${value}.${sign(value)}`;
}

function unseal(sealed: string | undefined): string | undefined {
  if (!sealed) return undefined;
  const index = sealed.lastIndexOf(".");
  if (index < 1) return undefined;
  const value = sealed.slice(0, index);
  const signature = sealed.slice(index + 1);
  const expected = sign(value);
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return undefined;
  }
  return value;
}

export async function getPlayId(): Promise<string | undefined> {
  const store = await cookies();
  return unseal(store.get(COOKIE)?.value);
}

export async function setPlayId(playId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, seal(playId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearPlay(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

/* ------------------------------ Área do motorista ------------------------ */

export async function isDriver(): Promise<boolean> {
  const store = await cookies();
  return unseal(store.get(DRIVER_COOKIE)?.value) === "driver";
}

export async function signInDriver(pin: string): Promise<boolean> {
  const expected = process.env.DRIVER_PIN || "1234";
  const a = Buffer.from(pin.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  const store = await cookies();
  store.set(DRIVER_COOKIE, seal("driver"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return true;
}

export async function signOutDriver(): Promise<void> {
  const store = await cookies();
  store.delete(DRIVER_COOKIE);
}
