import assert from "node:assert/strict";
import test from "node:test";
import { buildPixPayload, crc16, sanitizeTxid } from "../lib/pix.ts";

test("crc16 bate com o vetor oficial CCITT-FALSE", () => {
  // "123456789" => 0x29B1 é o vetor de referência do algoritmo.
  assert.equal(crc16("123456789"), "29B1");
});

test("payload Pix tem os campos obrigatórios do BR Code", () => {
  const payload = buildPixPayload({
    key: "motorista@exemplo.com",
    merchantName: "João da Silva",
    merchantCity: "Avaré",
    amountCents: 300,
    txid: "PLAY123",
  });

  assert.ok(payload.startsWith("000201"), "deve começar com o payload format");
  assert.ok(payload.includes("br.gov.bcb.pix"), "deve conter o GUI do Pix");
  assert.ok(payload.includes("5303986"), "moeda deve ser BRL (986)");
  assert.ok(payload.includes("54043.00"), "valor deve ser 3.00");
  assert.ok(payload.includes("5802BR"), "país deve ser BR");
  assert.ok(payload.includes("JOAO DA SILVA"), "nome sem acento e em maiúsculas");
  assert.ok(payload.includes("AVARE"), "cidade sem acento");
});

test("CRC final confere com o próprio payload", () => {
  const payload = buildPixPayload({
    key: "11999999999",
    merchantName: "GIROU GANHOU",
    merchantCity: "AVARE",
    amountCents: 300,
  });

  const withoutCrc = payload.slice(0, -4);
  assert.equal(payload.slice(-4), crc16(withoutCrc));
});

test("payload sem valor não inclui o campo 54", () => {
  const payload = buildPixPayload({
    key: "11999999999",
    merchantName: "GIROU GANHOU",
    merchantCity: "AVARE",
  });
  assert.ok(!payload.includes("5404"), "não deve ter valor fixo");
});

test("txid remove caracteres inválidos e respeita o limite", () => {
  assert.equal(sanitizeTxid("play_ab-cd/ef"), "playabcdef");
  assert.equal(sanitizeTxid("!!!"), "GIROUGANHOU");
  assert.equal(sanitizeTxid("x".repeat(40)).length, 25);
});

test("chave Pix vazia falha na hora de gerar, não na hora de pagar", () => {
  assert.throws(
    () =>
      buildPixPayload({
        key: "  ",
        merchantName: "GIROU GANHOU",
        merchantCity: "AVARE",
        amountCents: 300,
      }),
    /PIX_KEY/,
  );
});
