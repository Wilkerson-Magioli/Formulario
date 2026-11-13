const test = require("node:test");
const assert = require("node:assert/strict");
const ExcelJS = require("exceljs");

test("Admin exige sessão válida e remove o cookie ao sair", async () => {
  const { default: admin } = await import("../api/admin.mjs");
  const senha = "Abc0123456789!xy";
  const anterior = process.env.MPV_ADMIN_PASSWORD;
  process.env.MPV_ADMIN_PASSWORD = senha;
  async function pedir(acao, extras = {}, cookie) {
    const headers = { "content-type": "application/json", cookie };
    const resultado = { headers: {} };
    await admin(
      { method: "POST", headers, body: { acao, ...extras } },
      {
        setHeader(chave, valor) {
          resultado.headers[chave] = valor;
        },
        writeHead(status) {
          resultado.status = status;
          return this;
        },
        end() {},
      },
    );
    return resultado;
  }
  try {
    const curta = senha.slice(0, 15);
    process.env.MPV_ADMIN_PASSWORD = curta;
    assert.equal((await pedir("entrar", { senha: curta })).status, 503);
    const longa = senha.repeat(2);
    process.env.MPV_ADMIN_PASSWORD = longa;
    assert.equal((await pedir("entrar", { senha: longa })).status, 200);
    process.env.MPV_ADMIN_PASSWORD = senha;
    assert.equal((await pedir("listar")).status, 401);
    assert.equal((await pedir("historico")).status, 401);
    assert.equal((await pedir("exportar")).status, 401);
    assert.equal((await pedir("entrar", { senha: "incorreta" })).status, 401);
    const login = await pedir("entrar", { senha });
    assert.equal(login.status, 200);
    const sessao = login.headers["Set-Cookie"];
    assert.match(sessao, /HttpOnly; SameSite=Strict/);
    const token = sessao.split(";")[0];
    assert.equal((await pedir("sessao", {}, token)).status, 200);
    const adulterado =
      token.slice(0, -4) + (token.endsWith("AAAA") ? "BBBB" : "AAAA");
    assert.equal((await pedir("sessao", {}, adulterado)).status, 401);
    assert.match(
      (await pedir("sair", {}, token)).headers["Set-Cookie"],
      /Max-Age=0/,
    );
  } finally {
    if (anterior === undefined) delete process.env.MPV_ADMIN_PASSWORD;
    else process.env.MPV_ADMIN_PASSWORD = anterior;
  }
});

test("Excel preserva dados como texto e separa referência de pagamento", async () => {
  const { gerarExcel } = await import("../lib/admin-dados.mjs");
  const arquivo = await gerarExcel(
    [
      {
        id: "doador-1",
        nome: "=Exemplo",
        frequencias: ["mensal"],
        formas: ["pix"],
        orando: true,
        cep: "01234000",
        documento: "01234567890",
        origem: "excel",
      },
    ],
    [
      {
        doador_id: "doador-1",
        nome: "=Exemplo",
        frequencia: "regular",
        valor_declarado_centavos: 1900,
      },
    ],
    [
      {
        doador_id: "doador-1",
        nome: "=Exemplo",
        data_pagamento: "2026-11-11",
        valor_recebido_centavos: 500,
        situacao: "confirmado",
      },
    ],
  );
  const livro = new ExcelJS.Workbook();
  await livro.xlsx.load(arquivo);
  assert.deepEqual(
    livro.worksheets.map((aba) => aba.name),
    ["Doadores", "Participações", "Doações recebidas"],
  );
  const [doadores, participacoes, doacoes] = livro.worksheets;
  assert.equal(doadores.getCell("B2").value, "=Exemplo");
  assert.equal(doadores.getCell("E2").value, "01234000");
  assert.equal(doadores.getCell("I2").value, "01234567890");
  assert.equal(doadores.getCell("K2").value, "Mensal, Orando");
  assert.equal(doadores.getCell("L2").value, "Pix, Orando");
  assert.equal(doadores.views[0].state, "frozen");
  assert.ok(doadores.autoFilter);
  assert.equal(participacoes.getCell("G2").value, 19);
  assert.equal(participacoes.getCell("G3").value, 19);
  assert.equal(
    doacoes.getCell("C2").value.toISOString(),
    "2026-11-11T00:00:00.000Z",
  );
  assert.equal(doacoes.getCell("D2").value, 5);
  assert.equal(doacoes.getCell("D3").value, 5);
});
