const test = require("node:test");
const Participation = require("../public/participation.js");
const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
function scenario(
  contributing,
  method = "Pix",
  personType = "PF",
  editBeforeCompletion = false,
) {
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
    metodo: method,
    tipoPessoa: personType,
    documento: personType === "PJ" ? "08.145.713/0001-55" : "529.982.247-25",
    razaoSocial: "Empresa de Exemplo",
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
  assert.equal(
    cards.length,
    0,
    "A ficha não deve ser gerada na etapa de pagamento",
  );
  if (editBeforeCompletion) {
    emit(node("#edit-form"), "click");
    assert.equal(node("#payment-view").hidden, true);
    assert.equal(node("#form-view").hidden, false);
    assert.deepEqual(cards, ["cleared"]);
    emit(node("#complete-prayer"), "click");
    assert.deepEqual(cards, ["cleared"], "Editar invalida o cadastro anterior");
    fields.nome = "Cadastro revisado";
    form.elements.nome.value = fields.nome;
    emit(form, "submit");
    assert.equal(opened.length, 2);
    assert.match(
      new URL(opened[1]).searchParams.get("text"),
      /Cadastro revisado/,
    );
    cards.length = 0;
  }
  // Alterações posteriores nos campos não devem modificar o cadastro já enviado.
  form.elements.nome.value = "Nome alterado depois de enviar";
  if (contributing && method === "Boleto bancário") {
    const message = new URL(opened[0]).searchParams.get("text");
    assert.match(message, /SOLICITAÇÃO DE BOLETO/);
    assert.ok(message.includes(fields.documento));
    assert.equal(node("#payment-options").hidden, true);
    assert.equal(node("#finish-donation").hidden, true);
    assert.equal(node("#boleto-options").hidden, false);
    assert.equal(node("#finish-boleto").hidden, false);
    emit(node("#complete-boleto"), "click");
    assert.equal(
      node("#completion-title").textContent,
      "Aguarde seu boleto pelo WhatsApp.",
    );
  } else if (contributing) {
    assert.match(new URL(opened[0]).searchParams.get("text"), /1,00/);
    assert.equal(node("#complete-donation").disabled, true);
    emit(node("#complete-donation"), "click");
    assert.equal(node("#payment-view").hidden, false);
    assert.equal(cards.length, 0, "Sem confirmação, não deve haver ficha");
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
  assert.equal(cards.length, 1, "A ficha deve ser gerada apenas na conclusão");
  assert.equal(cards[0].contribuindo, contributing);
  assert.equal(
    cards[0].nome,
    fields.nome,
    "Usa os dados enviados, não campos alterados depois",
  );
  if (contributing) assert.equal(cards[0].valor, 1);
  assert.equal(node("#completion-view").hidden, false);
  emit(node("#exit-flow"), "click");
  assert.equal(node("#completion-view").hidden, true);
  assert.equal(node("#farewell-view").hidden, false);
  assert.equal(form.elements.nome.value, "");
  assert.equal(cards.at(-1), "cleared");
  const generatedCount = cards.length;
  emit(node("#complete-prayer"), "click");
  assert.equal(
    cards.length,
    generatedCount,
    "Sair descarta os dados usados para gerar a ficha",
  );
}
test("Contribuição: número oficial, confirmação obrigatória e limpeza ao sair", () =>
  scenario(true));
test("Oração: mensagem sem dados financeiros e finalização", () =>
  scenario(false));

test("Boleto PF: CPF no WhatsApp, aguarda emissão e limpa os dados", () =>
  scenario(true, "Boleto bancário"));
test("Boleto PJ: CNPJ e razão social no cadastro", () =>
  scenario(true, "Boleto bancário", "PJ"));

test("Transferência: ficha disponível somente após a confirmação", () =>
  scenario(true, "Transferência"));
test("Editar o cadastro descarta a ficha antiga e usa os dados revisados", () =>
  scenario(true, "Pix", "PF", true));
