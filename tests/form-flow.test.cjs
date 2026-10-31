const test = require("node:test");
const Participation = require("../public/participation.js");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
function scenario(contributing) {
  const nodes = new Map();
  function node(key) {
    if (!nodes.has(key))
      nodes.set(key, {
        value: "",
        checked: false,
        hidden: false,
        disabled: false,
        events: {},
        addEventListener(type, fn) {
          (this.events[type] ||= []).push(fn);
        },
        setCustomValidity(s) {
          this.validationMessage = s;
        },
        removeAttribute(k) {
          delete this[k];
        },
        focus() {},
        scrollIntoView() {},
      });
    return nodes.get(key);
  }
  const form = node("#participation-form");
  const fields = {
    nome: "Pessoa de Teste",
    endereco: "Rua Exemplo, 100",
    cep: "90000-000",
    email: "teste@example.com",
    whatsapp: "(51) 99999-0000",
    valor: "1,00",
    frequencia: "Oferta pontual",
    metodo: "Pix",
  };
  form.elements = {};
  for (const [key, value] of Object.entries(fields)) {
    form.elements[key] = node(key);
    form.elements[key].value = value;
  }
  form.elements.orando = node("orando");
  form.elements.orando.checked = true;
  form.elements.contribuindo = node("#contribuindo");
  form.elements.contribuindo.checked = contributing;
  form.reset = () => {
    for (const n of Object.values(form.elements)) {
      n.value = "";
      n.checked = false;
    }
  };
  const opened = [],
    cards = [];
  const window = {
    Participation,
    open(url) {
      opened.push(url);
    },
    scrollTo() {},
    participationCard: {
      generate(data) {
        cards.push(data);
      },
      clear() {
        cards.push("cleared");
      },
    },
  };
  const document = {
    body: { dataset: { testMode: "true" } },
    querySelector: node,
  };
  class FormData {
    get(key) {
      return form.elements[key]?.value ?? null;
    }
    has(key) {
      return Boolean(form.elements[key]?.checked);
    }
  }
  vm.runInNewContext(fs.readFileSync("public/app.js", "utf8"), {
    window,
    document,
    FormData,
    navigator: { clipboard: { writeText: async () => {} } },
    URL,
  });
  const emit = (n, type) => {
    for (const fn of n.events[type] || [])
      fn({ target: n, preventDefault() {} });
  };
  emit(form, "submit");
  assert.equal(opened.length, 1);
  assert.equal(new URL(opened[0]).pathname, "/5551993463773");
  assert.doesNotMatch(
    new URL(opened[0]).searchParams.get("text"),
    /TESTE DO FORMULÁRIO/,
  );
  assert.equal(cards[0].contribuindo, contributing);
  if (contributing) {
    assert.match(new URL(opened[0]).searchParams.get("text"), /1,00/);
    assert.equal(cards[0].valor, 1);
    assert.equal(node("#complete-donation").disabled, true);
    emit(node("#complete-donation"), "click");
    assert.equal(node("#payment-view").hidden, false);
    node("#confirm-donation").checked = true;
    emit(node("#confirm-donation"), "change");
    assert.equal(node("#complete-donation").disabled, false);
    emit(node("#complete-donation"), "click");
    assert.equal(
      node("#completion-title").textContent,
      "Doação Realizada com sucesso",
    );
  } else {
    assert.equal(node("#finish-donation").hidden, true);
    assert.equal(node("#finish-prayer").hidden, false);
    assert.doesNotMatch(
      new URL(opened[0]).searchParams.get("text"),
      /CONTRIBUIÇÃO/,
    );
    emit(node("#complete-prayer"), "click");
    assert.equal(
      node("#completion-title").textContent,
      "Participação concluída com sucesso",
    );
  }
  emit(node("#exit-flow"), "click");
  assert.equal(node("#completion-view").hidden, true);
  assert.equal(node("#farewell-view").hidden, false);
  assert.equal(form.elements.nome.value, "");
  assert.equal(node("#registration-whatsapp").href, undefined);
  assert.equal(cards.at(-1), "cleared");
}
test("Contribuição: número oficial, confirmação obrigatória e limpeza ao sair", () =>
  scenario(true));
test("Oração: mensagem sem dados financeiros e finalização", () =>
  scenario(false));
