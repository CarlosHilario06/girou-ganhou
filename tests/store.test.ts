import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryStore } from "../lib/store/memory.ts";
import type { Payment, Store } from "../lib/store/types.ts";
import { createPgliteStore } from "./helpers/pglite-store.ts";

/**
 * A mesma bateria roda nos dois armazenamentos: memória (desenvolvimento) e
 * Postgres de verdade (o que vai para a festa). Se um dia os dois discordarem,
 * um teste quebra aqui e não na noite do evento.
 */

type Fabrica = { nome: string; criar: () => Promise<Store> };

const FABRICAS: Fabrica[] = [
  { nome: "memória", criar: async () => createMemoryStore() },
  { nome: "postgres", criar: () => createPgliteStore() },
];

function pagamento(overrides: Partial<Payment> = {}): Payment {
  return {
    id: `pay_${Math.random().toString(36).slice(2, 10)}`,
    playId: "",
    provider: "mercadopago",
    externalId: `ext_${Math.random().toString(36).slice(2, 10)}`,
    amountCents: 300,
    spins: 2,
    status: "pending",
    payload: "000201pix",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 900_000).toISOString(),
    ...overrides,
  };
}

for (const { nome, criar } of FABRICAS) {
  test(`[${nome}] cadastro começa sem giro e sem prêmio`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Maria", phone: "14999990000" });

    assert.equal(play.spinsAvailable, 0);
    assert.deepEqual(play.payments, []);
    assert.deepEqual(play.spins, []);
    assert.equal((await store.getPlay(play.id))?.name, "Maria");
    assert.equal(await store.getPlay("play_inexistente"), undefined);
  });

  test(`[${nome}] pagamento aprovado libera os giros uma única vez`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "João", phone: "14988887777" });
    const pay = pagamento({ playId: play.id });
    await store.addPayment(pay);

    assert.equal(await store.creditPayment(pay.id), true);
    assert.equal((await store.getPlay(play.id))?.spinsAvailable, 2);

    // Webhook e consulta de status chegando depois, no mesmo pagamento.
    assert.equal(await store.creditPayment(pay.id), false);
    assert.equal(await store.creditPayment(pay.id, "motorista"), false);
    assert.equal((await store.getPlay(play.id))?.spinsAvailable, 2);

    const salvo = await store.getPayment(pay.id);
    assert.equal(salvo?.status, "paid");
    assert.ok(salvo?.paidAt, "guarda quando o dinheiro entrou");
  });

  test(`[${nome}] webhook e consulta simultâneos não creditam em dobro`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Ana", phone: "14977776666" });
    const pay = pagamento({ playId: play.id });
    await store.addPayment(pay);

    // Cinco confirmações ao mesmo tempo: uma vence, quatro voltam de mãos vazias.
    const resultados = await Promise.all(
      Array.from({ length: 5 }, () => store.creditPayment(pay.id)),
    );

    assert.equal(resultados.filter(Boolean).length, 1, "só um crédito pode valer");
    assert.equal((await store.getPlay(play.id))?.spinsAvailable, 2);
  });

  test(`[${nome}] não dá para gastar o mesmo giro duas vezes`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Carlos", phone: "14966665555" });
    const pay = pagamento({ playId: play.id });
    await store.addPayment(pay);
    await store.creditPayment(pay.id);

    // Dez cliques ao mesmo tempo no botão de girar.
    const giros = await Promise.all(
      Array.from({ length: 10 }, () => store.consumeSpin(play.id)),
    );

    assert.equal(giros.filter(Boolean).length, 2, "só os 2 giros pagos valem");
    assert.equal((await store.getPlay(play.id))?.spinsAvailable, 0);
    assert.equal(await store.consumeSpin(play.id), false);
  });

  test(`[${nome}] código do prêmio é de uso único`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Bia", phone: "14955554444" });
    await store.addSpin({
      id: "spin_1",
      playId: play.id,
      prizeId: "pirulito",
      code: "ABC-123",
      createdAt: new Date().toISOString(),
    });

    const achado = await store.findSpinByCode("abc123");
    assert.equal(achado?.spin.prizeId, "pirulito", "aceita minúscula e sem hífen");
    assert.equal(achado?.winner, "Bia");

    // Dois aparelhos confirmando a entrega ao mesmo tempo.
    const entregas = await Promise.all([
      store.redeemSpin("ABC-123"),
      store.redeemSpin("abc-123"),
    ]);
    assert.equal(entregas.filter(Boolean).length, 1, "só uma entrega vale");
    assert.equal(await store.redeemSpin("ABC-123"), false);
    assert.ok((await store.findSpinByCode("ABC-123"))?.spin.redeemedAt);
  });

  test(`[${nome}] código inexistente ou vazio não encontra nada`, async () => {
    const store = await criar();
    assert.equal(await store.findSpinByCode("ZZZ-999"), undefined);
    assert.equal(await store.findSpinByCode(""), undefined);
    assert.equal(await store.findSpinByCode("   "), undefined);
    assert.equal(await store.redeemSpin(""), false);
  });

  test(`[${nome}] giro sem prêmio não vira código para resgatar`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Léo", phone: "14944443333" });
    await store.addSpin({
      id: "spin_perdeu",
      playId: play.id,
      prizeId: "nada-1",
      createdAt: new Date().toISOString(),
    });

    assert.equal((await store.listRecentPrizes()).length, 0);
    assert.equal((await store.getStats()).prizesPending, 0);
    assert.equal((await store.getPlay(play.id))?.spins.length, 1, "o giro fica registrado");
  });

  test(`[${nome}] Pix vencido expira e libera nova tentativa`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Rita", phone: "14933332222" });
    const vencido = pagamento({
      playId: play.id,
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    await store.addPayment(vencido);

    assert.equal(await store.findPendingPayment(play.id), undefined, "vencido não conta como pendente");

    await store.expireStalePayments();
    assert.equal((await store.getPayment(vencido.id))?.status, "expired");

    // E o vencido não pode mais creditar giro nenhum.
    assert.equal(await store.creditPayment(vencido.id), false);
    assert.equal((await store.getPlay(play.id))?.spinsAvailable, 0);
  });

  test(`[${nome}] Pix válido é reaproveitado em vez de gerar outro`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Ivo", phone: "14922221111" });
    const pay = pagamento({ playId: play.id });
    await store.addPayment(pay);

    assert.equal((await store.findPendingPayment(play.id))?.id, pay.id);
  });

  test(`[${nome}] webhook encontra o pagamento pelo id do provedor`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Sol", phone: "14911110000" });
    const pay = pagamento({ playId: play.id, externalId: "mp-123456" });
    await store.addPayment(pay);

    const achado = await store.findPaymentByExternalId("mp-123456");
    assert.equal(achado?.id, pay.id);
    assert.equal(achado?.playId, play.id, "o webhook precisa saber de quem é");
    assert.equal(await store.findPaymentByExternalId("mp-000"), undefined);
  });

  test(`[${nome}] painel do motorista soma o caixa da noite`, async () => {
    const store = await criar();

    const um = await store.createPlay({ name: "Cliente 1", phone: "14900000001" });
    const pay1 = pagamento({ playId: um.id });
    await store.addPayment(pay1);
    await store.creditPayment(pay1.id);
    await store.addSpin({
      id: "s1", playId: um.id, prizeId: "cookie", code: "AAA-111",
      createdAt: new Date().toISOString(),
    });
    await store.redeemSpin("AAA-111");

    const dois = await store.createPlay({ name: "Cliente 2", phone: "14900000002" });
    const pay2 = pagamento({ playId: dois.id });
    await store.addPayment(pay2);
    await store.creditPayment(pay2.id);
    await store.addSpin({
      id: "s2", playId: dois.id, prizeId: "pirulito", code: "BBB-222",
      createdAt: new Date().toISOString(),
    });

    const tres = await store.createPlay({ name: "Cliente 3", phone: "14900000003" });
    await store.addPayment(pagamento({ playId: tres.id })); // não pagou

    const stats = await store.getStats();
    assert.equal(stats.players, 3);
    assert.equal(stats.paidCount, 2);
    assert.equal(stats.revenueCents, 600, "dois pagamentos de R$ 3,00");
    assert.equal(stats.prizesGiven, 1);
    assert.equal(stats.prizesPending, 1);

    const pendentes = await store.listPendingPayments();
    assert.equal(pendentes.length, 1, "só o que ainda não foi pago");
    assert.equal(pendentes[0].playName, "Cliente 3");

    const premios = await store.listRecentPrizes();
    assert.equal(premios.length, 2);
    assert.ok(premios.every((p) => p.winner.startsWith("Cliente")));
  });
}

/* ------------------ pacotes de giros comprados de uma vez ----------------- */

for (const { nome, criar } of FABRICAS) {
  test(`[${nome}] o pagamento credita a quantidade de giros que ele comprou`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Pacote", phone: "14900001111" });
    const pay = pagamento({ playId: play.id, spins: 5, amountCents: 1425 });
    await store.addPayment(pay);

    assert.equal(await store.creditPayment(pay.id), true);
    assert.equal((await store.getPlay(play.id))?.spinsAvailable, 5);
    assert.equal((await store.getStats()).revenueCents, 1425);
  });

  test(`[${nome}] pacotes diferentes somam sem se confundir`, async () => {
    const store = await criar();
    const play = await store.createPlay({ name: "Dois pacotes", phone: "14900002222" });
    const um = pagamento({ playId: play.id, spins: 1, amountCents: 300 });
    const dez = pagamento({ playId: play.id, spins: 10, amountCents: 2550 });
    await store.addPayment(um);
    await store.addPayment(dez);

    await store.creditPayment(um.id);
    await store.creditPayment(dez.id);
    assert.equal((await store.getPlay(play.id))?.spinsAvailable, 11);
    assert.equal((await store.getStats()).revenueCents, 2850);
  });
}
