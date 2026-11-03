const test = require("node:test");
const assert = require("node:assert/strict");
const {
  formatTaxDocument,
  validateTaxDocument,
  readParticipation,
  createWhatsAppMessage,
  createSummary,
} = require("../public/participation.js");

test("CPF: máscara, dígitos verificadores e sequências inválidas", () => {
  assert.equal(formatTaxDocument("52998224725", "PF"), "529.982.247-25");
  assert.equal(validateTaxDocument("529.982.247-25", "PF"), "");
  for (const value of ["52998224724", "11111111111", "123", "12345678901234"])
    assert.notEqual(validateTaxDocument(value, "PF"), "");
});

test("CNPJ: aceita formato numérico e alfanumérico com DV válido", () => {
  assert.equal(formatTaxDocument("08145713000155", "PJ"), "08.145.713/0001-55");
  assert.equal(formatTaxDocument("00000000e08g12", "PJ"), "00.000.000/E08G-12");
  for (const value of ["08.145.713/0001-55", "00.000.000/E08G-12"])
    assert.equal(validateTaxDocument(value, "PJ"), "");
  for (const value of [
    "08145713000154",
    "00000000E08G13",
    "00000000000000",
    "123",
  ])
    assert.notEqual(validateTaxDocument(value, "PJ"), "");
});

function fixture(method, company = false) {
  return new Map(
    Object.entries({
      nome: "Pessoa Exemplo",
      contribuindo: "on",
      metodo: method,
      valor: "100,00",
      frequencia: "Oferta mensal",
      tipoPessoa: company ? "PJ" : "PF",
      documento: company ? "08145713000155" : "52998224725",
      razaoSocial: " Empresa Exemplo ",
    }),
  );
}

test("Boleto: inclui documento e razão social apenas quando necessários", () => {
  const individual = readParticipation(fixture("Boleto bancário"));
  assert.equal(individual.documento, "529.982.247-25");
  assert.equal(individual.razaoSocial, null);
  assert.match(
    createWhatsAppMessage(individual),
    /Solicito boleto para contribuição/,
  );
  assert.match(createSummary(individual), /enviará seu boleto pelo WhatsApp/);
  assert.doesNotMatch(
    createSummary(individual),
    /Informe esse valor no aplicativo/,
  );
  const company = readParticipation(fixture("Boleto bancário", true));
  assert.equal(company.razaoSocial, "Empresa Exemplo");
  assert.match(createWhatsAppMessage(company), /CNPJ.*08\.145\.713\/0001-55/);
  assert.match(createWhatsAppMessage(company), /Razão social.*Empresa Exemplo/);
});

test("Pix, transferência e oração ignoram documentos antigos do boleto", () => {
  for (const method of ["Pix", "Transferência", "Boleto bancário"]) {
    const entries = fixture(method, true);
    if (method === "Boleto bancário") entries.delete("contribuindo");
    const data = readParticipation(entries);
    assert.equal(data.documento, null);
    assert.equal(data.tipoPessoa, null);
    assert.equal(data.razaoSocial, null);
    assert.doesNotMatch(
      createWhatsAppMessage(data),
      /CNPJ|CPF|Empresa Exemplo|SOLICITAÇÃO DE BOLETO/,
    );
  }
});
