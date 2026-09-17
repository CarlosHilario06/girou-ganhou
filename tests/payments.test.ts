import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { mercadoPagoProvider } from "../lib/payments/mercadopago.ts";
import type { Payment, Play } from "../lib/store.ts";

/**
 * Teste do caminho do dinheiro sem gastar dinheiro: a API do Mercado Pago é
 * substituída por uma falsa, e o que se verifica é como o app reage a cada
 * resposta possível.
 */

const originalFetch = globalThis.fetch;
const originalToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

type Call = { url: string; init?: RequestInit };
let calls: Call[] = [];

function fakeApi(response: unknown, ok = true) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return {
      ok,
      status: ok ? 200 : 400,
      json: async () => response,
    } as Response;
  }) as typeof fetch;
}

beforeEach(() => {
  calls = [];
  process.env.MERCADOPAGO_ACCESS_TOKEN = "TESTE-token";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  else process.env.MERCADOPAGO_ACCESS_TOKEN = originalToken;
});

const play = { id: "play_abc", name: "Maria Teste" } as Play;

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay_1",
    provider: "mercadopago",
    externalId: "123456",
    amountCents: 300,
    status: "pending",
    payload: "000201...",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
    ...overrides,
  };
}

test("cobrança pede Pix de R$ 3,00 e devolve o copia e cola", async () => {
  fakeApi({
    id: 999,
    point_of_interaction: { transaction_data: { qr_code: "00020126PIX" } },
  });

  const result = await mercadoPagoProvider.createCharge({
    play,
    amountCents: 300,
    description: "Roleta",
    expiresAt: new Date(Date.now() + 900_000),
  });

  assert.equal(result.payload, "00020126PIX");
  assert.equal(result.externalId, "999");

  const body = JSON.parse(String(calls[0].init?.body));
  assert.equal(body.transaction_amount, 3, "valor vai em reais, não em centavos");
  assert.equal(body.payment_method_id, "pix");
  assert.ok(body.date_of_expiration, "cobrança tem de expirar");
  assert.ok(
    (calls[0].init?.headers as Record<string, string>)["X-Idempotency-Key"],
    "sem chave de idempotência, dois cliques viram duas cobranças",
  );
});

test("resposta sem QR code vira erro, não cobrança quebrada", async () => {
  fakeApi({ message: "invalid_token" }, false);
  await assert.rejects(
    () =>
      mercadoPagoProvider.createCharge({
        play,
        amountCents: 300,
        description: "Roleta",
        expiresAt: new Date(),
      }),
    /Mercado Pago recusou a cobrança/,
  );
});

test("sem token configurado, falha explicando o que fazer", async () => {
  delete process.env.MERCADOPAGO_ACCESS_TOKEN;
  await assert.rejects(
    () => mercadoPagoProvider.checkStatus(payment()),
    /MERCADOPAGO_ACCESS_TOKEN/,
  );
});

test("aprovado no Mercado Pago vira 'paid' aqui", async () => {
  fakeApi({ status: "approved" });
  assert.equal(await mercadoPagoProvider.checkStatus(payment()), "paid");
});

test("pendente continua pendente", async () => {
  fakeApi({ status: "pending" });
  assert.equal(await mercadoPagoProvider.checkStatus(payment()), "pending");
});

test("cancelado e recusado encerram a cobrança", async () => {
  fakeApi({ status: "cancelled" });
  assert.equal(await mercadoPagoProvider.checkStatus(payment()), "expired");

  fakeApi({ status: "rejected" });
  assert.equal(await mercadoPagoProvider.checkStatus(payment()), "expired");
});

test("status desconhecido não libera giro", async () => {
  fakeApi({ status: "in_process" });
  const resultado = await mercadoPagoProvider.checkStatus(payment());
  assert.notEqual(resultado, "paid");
});

test("API fora do ar não libera giro", async () => {
  fakeApi({}, false);
  assert.equal(await mercadoPagoProvider.checkStatus(payment()), undefined);
});

test("pagamento sem id externo não consulta nada", async () => {
  fakeApi({ status: "approved" });
  assert.equal(
    await mercadoPagoProvider.checkStatus(payment({ externalId: undefined })),
    undefined,
  );
  assert.equal(calls.length, 0, "não faz chamada sem id para consultar");
});
