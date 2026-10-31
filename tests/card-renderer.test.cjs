const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("PNG acomoda respostas longas e omite contribuição na ficha de oração", async () => {
  const texts = [];
  const context = {
    beginPath() {},
    roundRect() {},
    fill() {},
    stroke() {},
    drawImage() {},
    fillRect() {},
    measureText(value) {
      return {
        width:
          Array.from(value).length *
          Number(this.font.match(/(\d+)px/)[1]) *
          0.6,
      };
    },
    fillText(value, x, y) {
      texts.push({
        value,
        x,
        y,
        width: this.measureText(value).width,
        align: this.textAlign,
      });
    },
  };
  const canvas = {
    getContext: () => context,
    toBlob(callback, type) {
      assert.equal(type, "image/png");
      callback({ type });
    },
  };
  class Image {
    naturalWidth = 406;
    naturalHeight = 135;
    set src(value) {
      this.onload();
    }
  }
  const window = {};
  vm.runInNewContext(fs.readFileSync("public/card-renderer.js", "utf8"), {
    window,
    Image,
    URL,
    document: {
      baseURI: "https://example.com/",
      fonts: { load: async () => [] },
      createElement: () => canvas,
    },
  });
  const data = {
    nome: "Maria ".repeat(30),
    endereco: "Rua da Comunidade ".repeat(25),
    email: `${"a".repeat(150)}@example.com`,
    cep: "90000-000",
    whatsapp: "(51) 99999-0000",
    orando: true,
    contribuindo: true,
    frequencia: "Oferta mensal",
    metodo: "Transferência",
    valor: 1234.56,
  };
  await window.renderParticipationCard(data);
  assert.equal(canvas.width, 1080);
  assert.ok(canvas.height > 1600);
  assert.ok(texts.some(({ value }) => value.includes("1.234,56")));
  assert.ok(texts.some(({ value }) => value === "Orando  +  Contribuindo"));
  for (const text of texts) {
    assert.ok(text.y > 0 && text.y < canvas.height, text.value);
    const left = text.align === "center" ? text.x - text.width / 2 : text.x;
    assert.ok(left >= 0 && left + text.width <= canvas.width, text.value);
  }
  texts.length = 0;
  await window.renderParticipationCard({ ...data, contribuindo: false });
  assert.ok(!texts.some(({ value }) => value === "VALOR DA OFERTA"));
});
