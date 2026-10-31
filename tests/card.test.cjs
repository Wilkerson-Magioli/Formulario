const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function setupCard() {
  const nodes = new Map();
  const revoked = [];
  const pending = [];
  const downloads = [];
  const node = (id) => {
    if (!nodes.has(id))
      nodes.set(id, {
        addEventListener(type, handler) {
          this[type] = handler;
        },
        removeAttribute(name) {
          delete this[name];
        },
      });
    return nodes.get(id);
  };
  const window = {
    renderParticipationCard: () =>
      new Promise((resolve, reject) => pending.push({ resolve, reject })),
  };
  vm.runInNewContext(fs.readFileSync("public/participation-card.js", "utf8"), {
    window,
    document: {
      querySelector: node,
      createElement: () => ({
        click() {
          downloads.push(this);
        },
      }),
    },
    URL: {
      createObjectURL: (blob) => `blob:${blob}`,
      revokeObjectURL: (value) => revoked.push(value),
    },
  });
  return { card: window.participationCard, node, pending, revoked, downloads };
}

test("Ficha: uma geração antiga não substitui a mais recente", async () => {
  const { card, node, pending, revoked } = setupCard();
  const first = card.generate({ nome: "Antigo" });
  const second = card.generate({ nome: "Atual" });
  pending[1].resolve("atual");
  await second;
  pending[0].resolve("antigo");
  await first;
  assert.equal(node("#participation-card-image").src, "blob:atual");
  card.clear();
  assert.deepEqual(revoked, ["blob:atual"]);
  assert.equal(node("#download-card").disabled, true);
  assert.equal(node("#participation-card-image").src, undefined);
});

test("Ficha: sair cancela a prévia pendente", async () => {
  const { card, node, pending } = setupCard();
  const generation = card.generate({});
  card.clear();
  pending[0].resolve("cancelada");
  await generation;
  assert.equal(node("#participation-card-section").hidden, true);
  assert.equal(node("#participation-card-image").src, undefined);
});

test("Ficha: download usa PNG e falha de geração mantém botão desabilitado", async () => {
  const { card, node, pending, downloads } = setupCard();
  const success = card.generate({});
  pending[0].resolve("imagem");
  await success;
  node("#download-card").click();
  assert.equal(downloads[0].download, "ficha-participacao-pao-vivo.png");
  assert.equal(downloads[0].href, "blob:imagem");
  const failure = card.generate({});
  pending[1].reject(new Error("Falha simulada"));
  await failure;
  assert.equal(node("#download-card").disabled, true);
  assert.match(node("#card-status").textContent, /Não foi possível/);
});
