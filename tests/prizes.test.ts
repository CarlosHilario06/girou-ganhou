import assert from "node:assert/strict";
import test from "node:test";
import { drawPrize, getPrize, PRIZES } from "../lib/prizes.ts";

test("a roleta tem exatamente 4 prêmios, todos únicos", () => {
  assert.equal(PRIZES.length, 4);
  assert.equal(new Set(PRIZES.map((p) => p.id)).size, 4);
});

test("sorteio respeita os pesos configurados", () => {
  const total = PRIZES.reduce((sum, p) => sum + p.weight, 0);
  let cursor = 0;

  // Cada faixa do "bilhete" tem que cair no prêmio correspondente.
  for (const prize of PRIZES) {
    const middle = (cursor + prize.weight / 2) / total;
    assert.equal(drawPrize(() => middle).id, prize.id);
    cursor += prize.weight;
  }
});

test("sorteio nunca devolve indefinido, inclusive nos extremos", () => {
  assert.ok(drawPrize(() => 0));
  assert.ok(drawPrize(() => 0.999999));
  assert.ok(drawPrize(() => 1));
});

test("getPrize encontra por id e ignora id inexistente", () => {
  assert.equal(getPrize(PRIZES[0].id)?.id, PRIZES[0].id);
  assert.equal(getPrize("nao-existe"), undefined);
});
