import assert from "node:assert/strict";
import test from "node:test";
import { creditPayment, toPublicPlay } from "../lib/play-service.ts";
import { createPlay, getPlay, type Payment } from "../lib/store.ts";

/**
 * A regra mais cara do app: um pagamento libera dois giros, e só uma vez.
 * Webhook, consulta de status e confirmação manual podem chegar todos no mesmo
 * pagamento — se cada um creditasse, R$ 3,00 viraria giro infinito.
 */

function novoPagamento(): Payment {
  return {
    id: "pay_teste",
    provider: "mercadopago",
    externalId: "123",
    amountCents: 300,
    status: "pending",
    payload: "000201",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
  };
}

test("pagamento aprovado libera os giros uma única vez", () => {
  const play = createPlay({ name: "Maria", phone: "14999990000" });
  const pagamento = novoPagamento();
  play.payments.push(pagamento);

  assert.equal(play.spinsAvailable, 0);

  assert.equal(creditPayment(play, pagamento), true, "primeiro crédito vale");
  assert.equal(play.spinsAvailable, 2);
  assert.equal(pagamento.status, "paid");
  assert.ok(pagamento.paidAt, "guarda quando o dinheiro entrou");

  // Webhook e polling chegando depois, no mesmo pagamento.
  assert.equal(creditPayment(play, pagamento), false, "segundo crédito é ignorado");
  assert.equal(creditPayment(play, pagamento, "motorista"), false);
  assert.equal(play.spinsAvailable, 2, "continua com os mesmos 2 giros");
});

test("dois pagamentos diferentes creditam separado", () => {
  const play = createPlay({ name: "João", phone: "14988887777" });
  const primeiro = { ...novoPagamento(), id: "pay_1" };
  const segundo = { ...novoPagamento(), id: "pay_2" };
  play.payments.push(primeiro, segundo);

  creditPayment(play, primeiro);
  creditPayment(play, segundo);
  assert.equal(play.spinsAvailable, 4);
});

test("confirmação manual registra quem liberou", () => {
  const play = createPlay({ name: "Ana", phone: "14977776666" });
  const pagamento = novoPagamento();
  play.payments.push(pagamento);

  creditPayment(play, pagamento, "motorista");
  assert.equal(pagamento.confirmedBy, "motorista");
});

test("o crédito fica salvo, não só na variável local", () => {
  const play = createPlay({ name: "Carlos", phone: "14966665555" });
  const pagamento = novoPagamento();
  play.payments.push(pagamento);
  creditPayment(play, pagamento);

  assert.equal(getPlay(play.id)?.spinsAvailable, 2);
});

test("o que vai para o navegador não expõe telefone nem dados do pagamento", () => {
  const play = createPlay({ name: "Maria Silva", phone: "14999990000" });
  play.payments.push(novoPagamento());

  const publico = JSON.stringify(toPublicPlay(play, false));
  assert.ok(!publico.includes("14999990000"), "telefone não pode vazar");
  assert.ok(!publico.includes("000201"), "payload do Pix não vai junto");
  assert.ok(publico.includes("Maria Silva"), "o nome aparece, para dar as boas-vindas");
});
