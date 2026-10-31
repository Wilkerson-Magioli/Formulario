const test = require("node:test");
const assert = require("node:assert/strict");
const participation = require("../public/participation.js");

test("Valor usa centavos, milhares e formato brasileiro", () => {
  for (const [input, expected] of [
    ["", ""],
    ["1", "0,01"],
    ["100", "1,00"],
    ["123456", "1.234,56"],
    ["R$ 1.234,56", "1.234,56"],
  ]) {
    assert.equal(participation.formatOfferInput(input), expected);
  }
  assert.equal(participation.parseOfferAmount("1.234,56"), 1234.56);
});

test("Validação aceita limites e rejeita zero, excedente e valor inválido", () => {
  assert.equal(participation.validateOfferAmount(""), "");
  assert.equal(participation.validateOfferAmount("0,01"), "");
  assert.equal(participation.validateOfferAmount("9.999.999,00"), "");
  for (const value of ["0,00", "10.000.000,00", "inválido"]) {
    assert.notEqual(participation.validateOfferAmount(value), "");
  }
});

test("CEP e telefone removem caracteres e limitam comprimento", () => {
  assert.equal(participation.formatPostalCode("90000123999"), "90000-123");
  assert.equal(participation.formatPostalCode("900"), "900");
  assert.equal(participation.formatPhone("51993463773"), "(51) 99346-3773");
  assert.equal(participation.formatPhone("5133334444"), "(51) 3333-4444");
  assert.equal(participation.formatPhone("5"), "5");
});

function fixture(contributing) {
  const entries = new Map(
    Object.entries({
      nome: "  Ana & João  ",
      endereco: "Rua São José, 10",
      cep: "90000-000",
      email: "ana@example.com",
      whatsapp: "(51) 99999-0000",
      orando: "on",
      frequencia: "Oferta mensal",
      metodo: "Transferência",
      valor: "1.234,56",
    }),
  );
  if (contributing) entries.set("contribuindo", "on");
  return participation.readParticipation(entries);
}

test("Uma única ficha normalizada alimenta a imagem e o WhatsApp oficial", () => {
  const data = fixture(true);
  assert.equal(data.nome, "Ana & João");
  assert.equal(data.valor, 1234.56);
  const url = new URL(participation.createWhatsAppUrl(data));
  assert.equal(url.pathname, "/5551993463773");
  const text = url.searchParams.get("text");
  for (const value of [
    "Ana & João",
    "Rua São José",
    "Transferência",
    "Oferta mensal",
    "1.234,56",
    "AUTORIZAÇÃO",
    "Orando e Contribuindo",
  ])
    assert.ok(text.includes(value));
  assert.match(participation.createSummary(data), /oferta mensal/);
});

test("Somente oração ignora valores financeiros antigos", () => {
  const data = fixture(false);
  assert.equal(data.valor, null);
  assert.equal(data.metodo, null);
  assert.equal(data.frequencia, null);
  assert.doesNotMatch(
    participation.createWhatsAppMessage(data),
    /CONTRIBUIÇÃO|1.234,56|Transferência/,
  );
  assert.match(participation.createSummary(data), /oração/);
});
