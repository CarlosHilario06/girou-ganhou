"use client";

import QRCode from "qrcode";
import type { PublicPlay } from "@/lib/play-service";
import { buildPixPayload } from "@/lib/pix";
import { drawPrize, getPrize, PRIZES } from "@/lib/prizes";

/**
 * Tudo que a interface precisa pedir ao "servidor".
 *
 * Existem duas implementações:
 *  - `serverApi`: o app completo, com as rotas em /api. O sorteio e o saldo de
 *    giros ficam no servidor, fora do alcance do jogador.
 *  - `staticApi`: modo vitrine para hospedagem estática (GitHub Pages), onde
 *    não existe servidor. Sorteio e saldo ficam no navegador — ótimo para
 *    demonstrar, inseguro para valer dinheiro.
 */

export type Charge = {
  id: string;
  payload: string;
  qrCode: string;
  amountCents: number;
  expiresAt: string;
  manualConfirmation: boolean;
  /** true quando é o próprio jogador que declara ter pago (modo estático). */
  selfConfirm: boolean;
};

export type Winner = {
  name: string;
  prize: string;
  emoji: string;
};

export type SpinResponse = {
  prizeIndex: number;
  prize: {
    id: string;
    title: string;
    description: string;
    emoji: string;
    win: boolean;
  };
  code?: string;
  play: PublicPlay;
};

export type GameApi = {
  /** Modo sem servidor: o placar vale só neste navegador. */
  readonly isStatic: boolean;
  load(): Promise<PublicPlay | null>;
  reset(): Promise<void>;
  register(data: { name: string; phone: string }): Promise<PublicPlay>;
  createPayment(): Promise<Charge>;
  paymentStatus(id: string): Promise<{ status: string; play: PublicPlay }>;
  /** Só no modo estático: o jogador confirma que pagou. */
  confirmPayment(id: string): Promise<{ status: string; play: PublicPlay }>;
  spin(): Promise<SpinResponse>;
  /** Últimos ganhadores, para o letreiro do topo. */
  winners(): Promise<Winner[]>;
};

async function parse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error ?? "Não foi possível completar a ação.");
  }
  return data;
}

const serverApi: GameApi = {
  isStatic: false,

  async load() {
    const response = await fetch("/api/play", { cache: "no-store" });
    const data = await parse(response);
    return data.play;
  },

  async reset() {
    await fetch("/api/play", { method: "DELETE" });
  },

  async register(payload) {
    const source =
      new URLSearchParams(window.location.search).get("src")?.slice(0, 40) ??
      undefined;
    const response = await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, source }),
    });
    const data = await parse(response);
    return data.play;
  },

  async createPayment() {
    const response = await fetch("/api/payments", { method: "POST" });
    const data = await parse(response);
    return { ...data.payment, selfConfirm: false };
  },

  async paymentStatus(id) {
    const response = await fetch(`/api/payments/${id}`, { cache: "no-store" });
    return parse(response);
  },

  async confirmPayment() {
    throw new Error("Confirmação manual não existe neste modo.");
  },

  async spin() {
    const response = await fetch("/api/spin", { method: "POST" });
    return parse(response);
  },

  async winners() {
    const response = await fetch("/api/winners", { cache: "no-store" });
    if (!response.ok) return [];
    const data = await response.json();
    return data.winners ?? [];
  },
};

/* -------------------------------------------------------------------------- */
/*                        Modo estático (GitHub Pages)                        */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "girou-ganhou-demo";

type StaticState = {
  name: string;
  phone: string;
  spinsAvailable: number;
  results: PublicPlay["results"];
  pendingPaymentId?: string;
  pendingExpiresAt?: string;
};

const PRICE_CENTS = Number(process.env.NEXT_PUBLIC_PLAY_PRICE_CENTS || 300);
const SPINS = Number(process.env.NEXT_PUBLIC_SPINS_PER_PAYMENT || 1);

function readState(): StaticState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StaticState) : null;
  } catch {
    return null;
  }
}

function writeState(state: StaticState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Navegador sem armazenamento: a partida vale só até recarregar a página.
  }
}

function toPublic(state: StaticState): PublicPlay {
  return {
    id: "demo",
    name: state.name,
    spinsAvailable: state.spinsAvailable,
    results: state.results,
    pendingPayment: state.pendingPaymentId
      ? {
          id: state.pendingPaymentId,
          expiresAt: state.pendingExpiresAt ?? new Date().toISOString(),
          manualConfirmation: true,
        }
      : undefined,
  };
}

function requireState(): StaticState {
  const state = readState();
  if (!state) throw new Error("Faça seu cadastro para continuar.");
  return state;
}

/** Mesmo alfabeto dos códigos do servidor, sem 0/O e 1/I. */
function demoCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

const staticApi: GameApi = {
  isStatic: true,

  async load() {
    const state = readState();
    return state ? toPublic(state) : null;
  },

  async reset() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada a limpar.
    }
  },

  async register({ name, phone }) {
    const state: StaticState = {
      name,
      phone,
      spinsAvailable: 0,
      results: [],
    };
    writeState(state);
    return toPublic(state);
  },

  async createPayment() {
    const state = requireState();
    const id = `demo_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

    const payload = buildPixPayload({
      key: process.env.NEXT_PUBLIC_PIX_KEY || "demo@girouganhou.app",
      merchantName: process.env.NEXT_PUBLIC_PIX_MERCHANT_NAME || "GIROU GANHOU",
      merchantCity: process.env.NEXT_PUBLIC_PIX_MERCHANT_CITY || "AVARE",
      amountCents: PRICE_CENTS,
      description: "Roleta Girou Ganhou",
    });

    writeState({ ...state, pendingPaymentId: id, pendingExpiresAt: expiresAt });

    return {
      id,
      payload,
      qrCode: await QRCode.toDataURL(payload, { margin: 1, width: 512 }),
      amountCents: PRICE_CENTS,
      expiresAt,
      manualConfirmation: true,
      selfConfirm: true,
    };
  },

  async paymentStatus(id) {
    const state = requireState();
    // Sem servidor não há como saber se o Pix caiu: quem confirma é o jogador.
    return {
      status: state.pendingPaymentId === id ? "pending" : "paid",
      play: toPublic(state),
    };
  },

  async confirmPayment() {
    const state = requireState();
    const next: StaticState = {
      ...state,
      spinsAvailable: state.spinsAvailable + SPINS,
      pendingPaymentId: undefined,
      pendingExpiresAt: undefined,
    };
    writeState(next);
    return { status: "paid", play: toPublic(next) };
  },

  async spin() {
    const state = requireState();
    if (state.spinsAvailable <= 0) {
      throw new Error("Você não tem giros disponíveis. Pague o Pix para liberar.");
    }

    const prize = drawPrize();
    const code = prize.win ? demoCode() : undefined;

    const next: StaticState = {
      ...state,
      spinsAvailable: state.spinsAvailable - 1,
      results:
        prize.win && code
          ? [
              ...state.results,
              {
                prizeId: prize.id,
                title: prize.title,
                description: prize.description,
                emoji: prize.emoji,
                code,
                createdAt: new Date().toISOString(),
              },
            ]
          : state.results,
    };
    writeState(next);

    return {
      prizeIndex: PRIZES.findIndex((p) => p.id === prize.id),
      prize: {
        id: prize.id,
        title: prize.title,
        description: getPrize(prize.id)?.description ?? "",
        emoji: prize.emoji,
        win: prize.win,
      },
      code,
      play: toPublic(next),
    };
  },

  async winners() {
    // Sem servidor não há como saber quem ganhou nos outros celulares:
    // aparece só o que este navegador ganhou.
    const state = readState();
    return (state?.results ?? []).slice(-12).reverse().map((resultado) => ({
      name: (state?.name ?? "").trim().split(/\s+/)[0] || "Você",
      prize: resultado.title,
      emoji: resultado.emoji,
    }));
  },
};

export const IS_STATIC_BUILD = process.env.NEXT_PUBLIC_STATIC_MODE === "1";

export const gameApi: GameApi = IS_STATIC_BUILD ? staticApi : serverApi;
