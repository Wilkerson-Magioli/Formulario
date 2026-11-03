// Regras compartilhadas pelo formulário, pela mensagem e pela ficha em imagem.
(function (root) {
  const WHATSAPP_NUMBER = "5551993463773";
  const PIX =
    "00020126360014BR.GOV.BCB.PIX0114081457130001555204000053039865802BR5919MINISTERIO PAO VIVO6012PORTO ALEGRE62070503***6304F895";
  const MAX_OFFER_AMOUNT = 9999999;
  const formatCurrency = (value) =>
    Number(value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const digitsOnly = (value) => String(value).replace(/\D/g, "");

  function parseOfferAmount(value) {
    return Number(String(value).replace(/\./g, "").replace(",", "."));
  }

  function formatOfferInput(value) {
    const digits = digitsOnly(value).slice(0, 12);
    return digits
      ? (Number(digits) / 100).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";
  }

  function validateOfferAmount(value) {
    if (!value) return ""; // O atributo required trata o campo vazio.
    const amount = parseOfferAmount(value);
    if (!Number.isFinite(amount) || amount <= 0)
      return "Informe um valor maior que R$ 0,00.";
    return amount > MAX_OFFER_AMOUNT
      ? "Informe um valor de até R$ 9.999.999,00."
      : "";
  }

  function formatPostalCode(value) {
    const digits = digitsOnly(value).slice(0, 8);
    return digits.length > 5
      ? `${digits.slice(0, 5)}-${digits.slice(5)}`
      : digits;
  }

  function formatPhone(value) {
    const digits = digitsOnly(value).slice(0, 11);
    if (digits.length <= 2) return digits;
    const local = digits.slice(2);
    const formatted =
      local.length > 4 ? `${local.slice(0, -4)}-${local.slice(-4)}` : local;
    return `(${digits.slice(0, 2)}) ${formatted}`;
  }

  function readParticipation(formData) {
    const text = (name) => String(formData.get(name) ?? "").trim();
    const contribuindo = formData.has("contribuindo");
    const boleto = contribuindo && text("metodo") === "Boleto bancário";
    return {
      nome: text("nome"),
      endereco: text("endereco"),
      cep: text("cep"),
      email: text("email"),
      whatsapp: text("whatsapp"),
      orando: formData.has("orando"),
      contribuindo,
      frequencia: contribuindo ? text("frequencia") : null,
      metodo: contribuindo ? text("metodo") : null,
      valor: contribuindo ? parseOfferAmount(text("valor")) : null,
      tipoPessoa: boleto ? text("tipoPessoa") : null,
      documento: boleto
        ? formatTaxDocument(text("documento"), text("tipoPessoa"))
        : null,
      razaoSocial:
        boleto && text("tipoPessoa") === "PJ" ? text("razaoSocial") : null,
    };
  }

  function participationModes(data) {
    return [
      data.orando ? "Orando" : "",
      data.contribuindo ? "Contribuindo" : "",
    ]
      .filter(Boolean)
      .join(" e ");
  }

  function isBoleto(data) {
    return data.contribuindo && data.metodo === "Boleto bancário";
  }

  function normalizeTaxDocument(value) {
    return String(value)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  function formatTaxDocument(value, personType) {
    const groups = personType === "PJ" ? [2, 3, 3, 4, 2] : [3, 3, 3, 2];
    const separators =
      personType === "PJ" ? [".", ".", "/", "-"] : [".", ".", "-"];
    const raw =
      personType === "PJ"
        ? normalizeTaxDocument(value).slice(0, 14)
        : digitsOnly(value).slice(0, 11);
    let offset = 0;
    return groups
      .map((length, index) => {
        const part = raw.slice(offset, offset + length);
        offset += length;
        return part ? (index ? separators[index - 1] : "") + part : "";
      })
      .join("");
  }

  function validateTaxDocument(value, personType) {
    if (!value) return ""; // O campo required trata o documento vazio.
    const raw = normalizeTaxDocument(value);
    const cnpj = personType === "PJ";
    const pattern = cnpj ? /^[A-Z0-9]{12}[0-9]{2}$/ : /^[0-9]{11}$/;
    const error = cnpj ? "Informe um CNPJ válido." : "Informe um CPF válido.";
    if (!pattern.test(raw) || /^(.)\1+$/.test(raw)) return error;
    const weights = cnpj
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [10, 9, 8, 7, 6, 5, 4, 3, 2];
    const digit = (base, factors) => {
      // Receita Federal: também aceita CNPJ alfanumérico (ASCII menos 48).
      const sum = Array.from(base).reduce(
        (total, char, index) =>
          total + (char.charCodeAt(0) - 48) * factors[index],
        0,
      );
      const remainder = sum % 11;
      return String(remainder < 2 ? 0 : 11 - remainder);
    };
    const base = raw.slice(0, -2);
    const first = digit(base, weights);
    const second = digit(base + first, [cnpj ? 6 : 11, ...weights]);
    return raw.endsWith(first + second) ? "" : error;
  }

  function createWhatsAppMessage(data) {
    const sections = [
      "🧡 *MINISTÉRIO PÃO VIVO*\n*Ficha de participação*",
      "Olá! Quero fazer parte desta obra.",
      `👤 *DADOS DO PARTICIPANTE*\n*Nome:* ${data.nome}\n*Endereço:* ${data.endereco}\n*CEP:* ${data.cep}\n*E-mail:* ${data.email}\n*WhatsApp:* ${data.whatsapp}`,
      `🤝 *MINHA PARTICIPAÇÃO*\n${participationModes(data)}`,
    ];
    if (data.contribuindo)
      sections.push(
        `🎁 *CONTRIBUIÇÃO*\n*Frequência:* ${data.frequencia}\n*Forma:* ${data.metodo}\n*Valor: ${formatCurrency(data.valor)}*`,
      );
    if (isBoleto(data)) {
      sections.push(
        `🧾 *SOLICITAÇÃO DE BOLETO*\nSolicito boleto para contribuição.\n*Tipo de pessoa:* ${data.tipoPessoa === "PJ" ? "Pessoa jurídica" : "Pessoa física"}\n*${data.tipoPessoa === "PJ" ? "CNPJ" : "CPF"}:* ${data.documento}${data.razaoSocial ? `\n*Razão social:* ${data.razaoSocial}` : ""}\nPor favor, envie o boleto para o WhatsApp informado no cadastro.`,
      );
    }
    sections.push(
      "✅ *AUTORIZAÇÃO*\nAutorizo o contato do Ministério Pão Vivo sobre minha participação.",
    );
    return sections.join("\n\n");
  }

  function createWhatsAppUrl(data) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(createWhatsAppMessage(data))}`;
  }

  function createSummary(data) {
    if (isBoleto(data))
      return `${data.nome}, você escolheu ${data.frequencia.toLowerCase()} de ${formatCurrency(data.valor)} por boleto bancário. O Ministério enviará seu boleto pelo WhatsApp após receber seu cadastro.`;
    return data.contribuindo
      ? `${data.nome}, você escolheu participar ${participationModes(data).toLowerCase()}, com ${data.frequencia.toLowerCase()} de ${formatCurrency(data.valor)}. Informe esse valor no aplicativo do banco.`
      : `${data.nome}, obrigado por se unir a esta obra em oração!`;
  }

  const api = {
    PIX,
    WHATSAPP_NUMBER,
    formatCurrency,
    parseOfferAmount,
    formatOfferInput,
    validateOfferAmount,
    formatPostalCode,
    formatPhone,
    readParticipation,
    createWhatsAppMessage,
    createWhatsAppUrl,
    createSummary,
    isBoleto,
    formatTaxDocument,
    validateTaxDocument,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Participation = api;
})(globalThis);
