import assert from "node:assert/strict";
import test from "node:test";
import { drawPrize, getPrize, PRIZES, WINNING_PRIZES } from "../lib/prizes.ts";

test("a roleta tem 6 fatias, todas com id único", () => {
  assert.equal(PRIZES.length, 6);
  assert.equal(new Set(PRIZES.map((p) => p.id)).size, 6);
});

test("são 4 prêmios de verdade e 2 fatias sem prêmio", () => {
  assert.equal(WINNING_PRIZES.length, 4);
  assert.equal(PRIZES.filter((p) => !p.win).length, 2);
});

test("as duas fatias sem prêmio não ficam lado a lado", () => {
  const perdedores = PRIZES.map((p, i) => (p.win ? -1 : i)).filter((i) => i >= 0);
  const [a, b] = perdedores;
  const distancia = Math.min(b - a, PRIZES.length - (b - a));
  assert.ok(distancia > 1, "fatias vizinhas iguais viram um bloco só na roda");
});

test("a maioria dos giros cai no 'não foi dessa vez'", () => {
  const total = PRIZES.reduce((sum, p) => sum + p.weight, 0);
  const semPremio = PRIZES.filter((p) => !p.win).reduce((s, p) => s + p.weight, 0);
  assert.ok(
    semPremio / total > 0.5,
    `esperado mais de 50%, veio ${((semPremio / total) * 100).toFixed(1)}%`,
  );
});

test("as chances combinadas são as que o motorista pediu", () => {
  const total = PRIZES.reduce((sum, p) => sum + p.weight, 0);
  const chance = (id: string) =>
    ((PRIZES.find((p) => p.id === id)?.weight ?? 0) / total) * 100;

  assert.equal(chance("corrida-gratis"), 1, "não paga a corrida: 1%");
  assert.ok(chance("ingresso-parque") < 1, "ingresso do parque é mais raro que 1%");
  assert.ok(chance("trinta-reais") < 1, "R$ 30 é o mais raro de todos");
  assert.ok(
    chance("trinta-reais") < chance("ingresso-parque"),
    "o R$ 30 é a vitrine: o mais difícil da roda",
  );
  assert.ok(chance("pacoca") > 10, "a paçoca é o prêmio que sai de verdade");
});

test("nenhuma fatia desenhada na roleta é impossível de ganhar", () => {
  // Prêmio que o passageiro vê na roda e não tem como sair é propaganda
  // enganosa. Uma chance pequena é decisão de negócio; zero é outra coisa.
  for (const prize of PRIZES) {
    assert.ok(
      prize.weight > 0,
      `${prize.id} está na roleta com peso 0 — nunca poderia ser sorteado`,
    );
  }
});

test("os prêmios caros são mais raros que a paçoca", () => {
  const peso = (id: string) => PRIZES.find((p) => p.id === id)?.weight ?? 0;
  const pacoca = peso("pacoca");

  for (const id of ["corrida-gratis", "ingresso-parque", "trinta-reais"]) {
    assert.ok(
      peso(id) < pacoca,
      `${id} não pode sair mais que a paçoca — é o prêmio que custa caro`,
    );
  }
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

test("todo prêmio de verdade tem texto de resgate", () => {
  for (const prize of WINNING_PRIZES) {
    assert.ok(prize.title.length > 0, `${prize.id} sem título`);
    assert.ok(prize.description.length > 10, `${prize.id} sem instrução`);
  }
});

test("getPrize encontra por id e ignora id inexistente", () => {
  assert.equal(getPrize(PRIZES[0].id)?.id, PRIZES[0].id);
  assert.equal(getPrize("nao-existe"), undefined);
});
