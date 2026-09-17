import assert from "node:assert/strict";
import test from "node:test";
import { clampSpins, discountPercentFor, quoteFor } from "../lib/pricing.ts";

test("um giro custa o preço cheio", () => {
  const q = quoteFor(1);
  assert.equal(q.totalCents, 300);
  assert.equal(q.discountPercent, 0);
  assert.equal(q.discountCents, 0);
});

test("o desconto sobe 5% a cada 3 giros", () => {
  assert.equal(discountPercentFor(1), 0);
  assert.equal(discountPercentFor(2), 0);
  assert.equal(discountPercentFor(3), 5);
  assert.equal(discountPercentFor(5), 5);
  assert.equal(discountPercentFor(6), 10);
  assert.equal(discountPercentFor(9), 15);
});

test("o desconto tem teto — a promoção não pode virar giro de graça", () => {
  // Mesmo pedindo muito mais que a régua permite.
  assert.ok(discountPercentFor(1000) <= 20);
  assert.ok(quoteFor(1000).totalCents > 0);
});

test("pagar mais giros nunca sai mais barato no total", () => {
  let anterior = 0;
  for (let n = 1; n <= 10; n++) {
    const total = quoteFor(n).totalCents;
    assert.ok(total > anterior, `${n} giros custa ${total}, menos que ${n - 1}`);
    anterior = total;
  }
});

test("comprar mais giros nunca piora o preço por giro", () => {
  let anterior = Infinity;
  for (let n = 1; n <= 10; n++) {
    const unit = quoteFor(n).unitCents;
    assert.ok(unit <= anterior, `${n} giros sai a ${unit} por giro, pior que ${n - 1}`);
    anterior = unit;
  }
});

test("a conta fecha: subtotal - desconto = total", () => {
  for (let n = 1; n <= 10; n++) {
    const q = quoteFor(n);
    assert.equal(q.subtotalCents - q.discountCents, q.totalCents);
    assert.equal(q.subtotalCents, n * 300);
  }
});

test("o preço sai sempre em centavos inteiros", () => {
  for (let n = 1; n <= 10; n++) {
    assert.equal(quoteFor(n).totalCents % 1, 0, `${n} giros deu centavo quebrado`);
  }
});

test("a dica do próximo degrau aponta para o desconto seguinte", () => {
  const dois = quoteFor(2);
  assert.equal(dois.spinsToNextTier, 1, "falta 1 giro para os 3");
  assert.equal(dois.nextTierPercent, 5);

  const tres = quoteFor(3);
  assert.equal(tres.spinsToNextTier, 3, "faltam 3 giros para os 6");
  assert.equal(tres.nextTierPercent, 10);
});

test("quantidade vinda de fora é contida na régua", () => {
  assert.equal(clampSpins(0), 1);
  assert.equal(clampSpins(-5), 1);
  assert.equal(clampSpins(999), 10);
  assert.equal(clampSpins(3.9), 3, "não existe meio giro");
  assert.equal(clampSpins(Number.NaN), 1);
  assert.equal(clampSpins(Number.POSITIVE_INFINITY), 1);
});

test("pedido absurdo não vira preço absurdo", () => {
  // Se alguém mandar 10 mil giros na requisição, paga por 10 e leva 10.
  assert.equal(quoteFor(10_000).spins, 10);
  assert.equal(quoteFor(10_000).totalCents, quoteFor(10).totalCents);
});
