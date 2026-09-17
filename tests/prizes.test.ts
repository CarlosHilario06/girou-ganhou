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
  assert.ok(semPremio / total > 0.5, `esperado mais de 50%, veio ${semPremio / total}`);
});

test("ingresso e corrida grátis são os mais difíceis", () => {
  const dificeis = ["ingresso-parque", "corrida-gratis"];
  const maiorDificil = Math.max(
    ...PRIZES.filter((p) => dificeis.includes(p.id)).map((p) => p.weight),
  );
  const menorFacil = Math.min(
    ...PRIZES.filter((p) => !dificeis.includes(p.id)).map((p) => p.weight),
  );
  assert.ok(
    maiorDificil < menorFacil,
    "os prêmios grandes têm que ser mais raros que qualquer outra fatia",
  );
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
