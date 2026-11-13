const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

test("API aceita uma data real e rejeita uma data impossível", async (t) => {
  const { default: participar } = await import("../api/participacao.mjs");
  const urlAnterior = process.env.MPV_DATABASE_URL;
  delete process.env.MPV_DATABASE_URL;
  t.after(() => {
    if (urlAnterior !== undefined) process.env.MPV_DATABASE_URL = urlAnterior;
  });
  async function enviar(dataParticipacao) {
    let status;
    await participar(
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: {
          chave: randomUUID(),
          participacao: {
            nome: "Pessoa Teste",
            endereco: "Rua Exemplo",
            cep: "90000-000",
            email: "teste@example.com",
            whatsapp: "(51) 99999-0000",
            orando: true,
            contribuindo: false,
            consentimento: true,
            dataParticipacao,
          },
        },
      },
      {
        setHeader() {},
        writeHead(codigo) {
          status = codigo;
          return this;
        },
        end() {},
      },
    );
    return status;
  }
  assert.equal(await enviar("2026-02-30"), 422);
  assert.equal(await enviar("2026-02-28"), 503);
});
