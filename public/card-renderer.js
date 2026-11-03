// Renderização da ficha, independente dos controles de prévia e download.
window.renderParticipationCard = (() => {
  let logoPromise;

  function loadLogo() {
    logoPromise ||= new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        logoPromise = null;
        reject(new Error("Logo indisponível"));
      };
      image.src = new URL("assets/logo-oficial.png", document.baseURI).href;
    });
    return logoPromise;
  }

  async function render(data) {
    const logo = await loadLogo();
    await Promise.all([
      document.fonts.load('500 26px "Manrope"'),
      document.fonts.load('800 44px "Manrope"'),
    ]).catch(() => {});
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    const ctx = canvas.getContext("2d");
    const ink = "#302b22",
      muted = "#786b61",
      orange = "#b74d23";
    const font = (size, weight = 500) =>
      `${weight} ${size}px Manrope, Arial, sans-serif`;
    const operations = [];
    function text(
      value,
      x,
      y,
      size,
      color = ink,
      weight = 500,
      align = "left",
    ) {
      operations.push(() => {
        ctx.font = font(size, weight);
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.fillText(String(value), x, y);
      });
    }
    function box(
      x,
      y,
      w,
      h,
      fill = "#ffffff",
      stroke = "#eadfd7",
      radius = 22,
    ) {
      operations.push(() => {
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, radius);
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }
    function wrap(value, maxWidth, size, weight = 500) {
      ctx.font = font(size, weight);
      const lines = [];
      let line = "";
      for (const word of String(value ?? "")
        .trim()
        .split(/\s+/u)) {
        if (
          ctx.measureText(line ? line + " " + word : word).width <= maxWidth
        ) {
          line += (line ? " " : "") + word;
          continue;
        }
        if (line) {
          lines.push(line);
          line = "";
        }
        // Quebra também nomes e e-mails longos sem espaços.
        for (const char of Array.from(word)) {
          if (line && ctx.measureText(line + char).width > maxWidth) {
            lines.push(line);
            line = "";
          }
          line += char;
        }
      }
      if (line) lines.push(line);
      return lines.length ? lines : ["—"];
    }
    function field(label, value, x, y, width) {
      text(label, x, y, 17, muted, 700);
      const lines = wrap(value, width, 26);
      lines.forEach((line, i) => text(line, x, y + 31 + i * 37, 26));
      return 31 + lines.length * 37 + 24;
    }
    function sectionTitle(number, title, y) {
      box(72, y - 24, 40, 36, "#fff0e7", null, 10);
      text(number, 92, y, 16, orange, 800, "center");
      text(title, 130, y, 20, orange, 800);
    }

    operations.push(() => {
      const width = 300,
        height = (logo.naturalHeight * width) / logo.naturalWidth;
      ctx.drawImage(logo, (1080 - width) / 2, 60, width, height);
    });
    text("Ficha de participação", 540, 239, 43, ink, 800, "center");
    text(
      "Uma obra de amor. Uma parte sua.",
      540,
      282,
      23,
      muted,
      500,
      "center",
    );
    sectionTitle("01", "DADOS DO PARTICIPANTE", 356);
    let y = 412;
    const participantBox = operations.length;
    y += field("NOME COMPLETO", data.nome, 104, y, 872);
    y += field("ENDEREÇO COMPLETO", data.endereco, 104, y, 872);
    const leftHeight = field("CEP", data.cep, 104, y, 365);
    const rightHeight = field("WHATSAPP", data.whatsapp, 550, y, 426);
    y += Math.max(leftHeight, rightHeight);
    y += field("E-MAIL", data.email, 104, y, 872);
    if (data.contribuindo && data.metodo === "Boleto bancário") {
      y += field(
        data.tipoPessoa === "PJ" ? "CNPJ DO PAGADOR" : "CPF DO PAGADOR",
        data.documento,
        104,
        y,
        872,
      );
      if (data.tipoPessoa === "PJ")
        y += field("RAZÃO SOCIAL", data.razaoSocial, 104, y, 872);
    }
    const participantBottom = y - 4;
    // Desenha o fundo antes dos textos já planejados.
    const fieldsOperations = operations.splice(participantBox);
    box(72, 382, 936, participantBottom - 382, "#fff", "#eadfd7");
    operations.push(...fieldsOperations);

    y = participantBottom + 62;
    sectionTitle("02", "MINHA PARTICIPAÇÃO", y);
    const participation = [
      data.orando ? "Orando" : "",
      data.contribuindo ? "Contribuindo" : "",
    ]
      .filter(Boolean)
      .join("  +  ");
    box(72, y + 23, 936, 84, "#fff4ee", null);
    text(participation, 104, y + 77, 29, orange, 700);
    y += 170;

    if (data.contribuindo) {
      sectionTitle("03", "CONTRIBUIÇÃO", y);
      const contributionTop = y + 26;
      const contributionBox = operations.length;
      const frequencyHeight = field(
        "FREQUÊNCIA",
        data.frequencia,
        104,
        y + 60,
        400,
      );
      const methodHeight = field(
        "FORMA DE CONTRIBUIÇÃO",
        data.metodo,
        550,
        y + 60,
        426,
      );
      const amountTop = y + 60 + Math.max(frequencyHeight, methodHeight);
      box(96, amountTop, 888, 124, "#fff0e7", null, 14);
      text("VALOR DA OFERTA", 122, amountTop + 35, 17, orange, 700);
      text(
        Number(data.valor).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        }),
        122,
        amountTop + 91,
        43,
        orange,
        800,
      );
      const contributionBottom = amountTop + 150;
      const contributionOperations = operations.splice(contributionBox);
      box(72, contributionTop, 936, contributionBottom - contributionTop);
      operations.push(...contributionOperations);
      text(
        "Intenção de contribuição. Não é comprovante de pagamento.",
        104,
        contributionBottom + 37,
        19,
        muted,
      );
      y = contributionBottom + 103;
    }

    text("AUTORIZAÇÃO DE CONTATO", 72, y, 17, muted, 800);
    const consentLines = wrap(
      "Autorizo o contato do Ministério Pão Vivo sobre minha participação.",
      936,
      21,
    );
    consentLines.forEach((line, i) =>
      text(line, 72, y + 34 + i * 31, 21, muted),
    );
    y += 34 + consentLines.length * 31 + 54;
    box(72, y, 936, 2, "#eadfd7", null, 0);
    text(
      "Fé que alimenta. Amor que alcança.",
      540,
      y + 48,
      21,
      muted,
      500,
      "center",
    );
    canvas.height = y + 92;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#d36a38";
    ctx.fillRect(0, 0, canvas.width, 12);
    operations.forEach((operation) => operation());
    return new Promise((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Falha na geração")),
        "image/png",
      ),
    );
  }

  return render;
})();
