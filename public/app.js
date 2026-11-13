const {
  PIX,
  formatOfferInput,
  validateOfferAmount,
  formatPostalCode,
  formatPhone,
  readParticipation,
  createWhatsAppUrl,
  createSummary,
  isBoleto,
  formatTaxDocument,
  validateTaxDocument,
} = window.Participation;
const form = document.querySelector("#participation-form");
const hoje = new Date();
hoje.setMinutes(hoje.getMinutes() - hoje.getTimezoneOffset());
form.elements.dataParticipacao.defaultValue = hoje.toISOString().slice(0, 10);
const contribution = document.querySelector("#contribuindo");
const fields = document.querySelector("#contribution-fields");
let submittedParticipation = null;
let submittedWithContribution = false;
let submittedWithBoleto = false;
let registrationAttempt;
let savingRegistration = false;
document.querySelector("#pix-code").value = PIX;
contribution.addEventListener("change", () => {
  fields.hidden = !contribution.checked;
  fields.disabled = !contribution.checked;
});
const transferBankDetails = document.querySelector("#transfer-bank-details");
function updateTransferBankDetails() {
  transferBankDetails.hidden =
    !contribution.checked || form.elements.metodo.value !== "Transferência";
  updateBoletoFields();
}
function updateBoletoFields() {
  const enabled =
    contribution.checked && form.elements.metodo.value === "Boleto bancário";
  const company = form.elements.tipoPessoa.value === "PJ";
  const documentInput = form.elements.documento;
  document.querySelector("#boleto-fields").hidden = !enabled;
  document.querySelector("#boleto-fields").disabled = !enabled;
  document.querySelector("#company-name-field").hidden = !company;
  form.elements.razaoSocial.disabled = !enabled || !company;
  document.querySelector("#document-label").textContent = company
    ? "CNPJ *"
    : "CPF *";
  documentInput.maxLength = company ? 18 : 14;
  documentInput.inputMode = company ? "text" : "numeric";
  documentInput.placeholder = company ? "00.000.000/0000-00" : "000.000.000-00";
  documentInput.setCustomValidity(
    enabled
      ? validateTaxDocument(documentInput.value, form.elements.tipoPessoa.value)
      : "",
  );
}
form.addEventListener("change", (event) => {
  if (event.target.name === "tipoPessoa") {
    form.elements.documento.value = "";
  }
  if (["metodo", "contribuindo", "tipoPessoa"].includes(event.target.name))
    updateTransferBankDetails();
});
updateTransferBankDetails();
function bindInputFormatter(input, formatter, validator = () => "") {
  input.addEventListener("input", (event) => {
    const value = formatter(event.target.value);
    event.target.value = value;
    event.target.setCustomValidity(validator(value));
  });
}
bindInputFormatter(form.elements.valor, formatOfferInput, validateOfferAmount);
bindInputFormatter(form.elements.cep, formatPostalCode);
bindInputFormatter(form.elements.whatsapp, formatPhone);
bindInputFormatter(
  form.elements.documento,
  (value) => formatTaxDocument(value, form.elements.tipoPessoa.value),
  (value) => validateTaxDocument(value, form.elements.tipoPessoa.value),
);
for (const name of ["orando", "contribuindo"])
  form.elements[name].addEventListener("change", () => {
    document.querySelector("#participation-error").hidden = true;
  });
document.querySelector("#copy-pix").addEventListener("click", copyPix);

async function copyPix() {
  const status = document.querySelector("#copy-status");
  try {
    await navigator.clipboard.writeText(PIX);
    status.textContent = "Código Pix copiado! Cole no aplicativo do seu banco.";
  } catch {
    document.querySelector("details").open = true;
    document.querySelector("#pix-code").select();
    status.textContent = "Selecione e copie o código abaixo.";
  }
}
form.addEventListener("submit", submitParticipation);

async function submitParticipation(event) {
  event.preventDefault();
  if (savingRegistration) return;
  if (!form.elements.orando.checked && !contribution.checked) {
    const error = document.querySelector("#participation-error");
    error.hidden = false;
    form.elements.orando.focus();
    return;
  }
  const data = new FormData(form);
  const participation = readParticipation(data);
  if (isBoleto(participation)) {
    const error = participation.documento
      ? validateTaxDocument(participation.documento, participation.tipoPessoa)
      : "Informe o CPF ou CNPJ do pagador.";
    if (error) {
      form.elements.documento.setCustomValidity(error);
      form.elements.documento.reportValidity();
      return;
    }
  }
  const whatsappUrl = createWhatsAppUrl(participation);
  const snapshot = JSON.stringify({
    ...participation,
    consentimento: data.has("consentimento"),
  });
  if (registrationAttempt?.snapshot !== snapshot)
    registrationAttempt = { snapshot, chave: crypto.randomUUID() };
  const status = document.querySelector("#registration-status");
  const button = form.querySelector("button[type=submit]");
  const popup = window.open("about:blank", "_blank");
  if (popup) popup.opener = null;
  savingRegistration = true;
  button.disabled = true;
  status.textContent = "Salvando seu cadastro…";
  try {
    const response = await fetch("/api/participacao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chave: registrationAttempt.chave,
        participacao: JSON.parse(snapshot),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (response.status !== 204) {
      status.textContent =
        response.status === 422
          ? "Confira os campos do formulário e tente novamente."
          : "Não foi possível salvar o cadastro. Tente novamente.";
      popup?.close();
      return;
    }
  } catch {
    popup?.close();
    status.textContent =
      "Não foi possível confirmar o cadastro. Tente novamente.";
    return;
  } finally {
    savingRegistration = false;
    button.disabled = false;
  }
  status.textContent = "";
  submittedWithContribution = participation.contribuindo;
  submittedWithBoleto = isBoleto(participation);
  document.querySelector("#finish-donation").hidden =
    !submittedWithContribution || submittedWithBoleto;
  document.querySelector("#finish-prayer").hidden = submittedWithContribution;
  document.querySelector("#finish-boleto").hidden = !submittedWithBoleto;
  document.querySelector("#boleto-options").hidden = !submittedWithBoleto;
  document.querySelector("#confirm-donation").checked = false;
  document.querySelector("#complete-donation").disabled = true;
  document.querySelector("#participation-summary").textContent =
    createSummary(participation);
  document.querySelector("#payment-options").hidden =
    !submittedWithContribution || submittedWithBoleto;
  document.querySelector("#form-view").hidden = true;
  document.querySelector("#payment-view").hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  document.querySelector("#payment-heading").focus({ preventScroll: true });
  submittedParticipation = participation;
  const link = document.querySelector("#registration-whatsapp");
  link.href = whatsappUrl;
  link.hidden = Boolean(popup && !popup.closed);
  if (!link.hidden) return;
  try {
    popup.location.replace(whatsappUrl);
  } catch {
    link.hidden = false;
  }
}
document
  .querySelector("#edit-form")
  .addEventListener("click", editParticipation);

function editParticipation() {
  submittedParticipation = null;
  document.querySelector("#registration-whatsapp").removeAttribute("href");
  document.querySelector("#payment-view").hidden = true;
  document.querySelector("#form-view").hidden = false;
  window.participationCard.clear();
  document.querySelector("#participar").scrollIntoView();
}

document
  .querySelector("#confirm-donation")
  .addEventListener("change", (event) => {
    document.querySelector("#complete-donation").disabled =
      !event.target.checked;
  });
function showCompletion() {
  if (!submittedParticipation) return;
  if (
    submittedWithContribution &&
    !submittedWithBoleto &&
    !document.querySelector("#confirm-donation").checked
  )
    return;
  document.querySelector("#payment-view").hidden = true;
  document.querySelector("#closing-message").hidden = true;
  document.querySelector(".header-link").hidden = true;
  document.querySelector("#completion-title").textContent = submittedWithBoleto
    ? "Aguarde seu boleto pelo WhatsApp."
    : submittedWithContribution
      ? "Doação Realizada com sucesso"
      : "Participação concluída com sucesso";
  document.querySelector("#completion-detail").textContent = submittedWithBoleto
    ? "Após receber seu cadastro, o Ministério Pão Vivo emitirá o boleto e enviará para o WhatsApp informado. Depois de pagar, envie o comprovante ao Ministério Pão Vivo."
    : submittedWithContribution
      ? "Conclusão informada por você. O Ministério Pão Vivo fará a conferência do pagamento e do comprovante."
      : "Obrigado por se unir a esta obra em oração!";
  document.querySelector("#completion-view").hidden = false;
  window.participationCard.generate(submittedParticipation);
  window.scrollTo({ top: 0, behavior: "instant" });
  document.querySelector("#completion-title").focus({ preventScroll: true });
}
document
  .querySelector("#complete-donation")
  .addEventListener("click", showCompletion);
document
  .querySelector("#complete-prayer")
  .addEventListener("click", showCompletion);
document
  .querySelector("#complete-boleto")
  .addEventListener("click", showCompletion);
document
  .querySelector("#exit-flow")
  .addEventListener("click", exitParticipation);

function exitParticipation() {
  window.participationCard.clear();
  form.reset();
  form.elements.valor.setCustomValidity("");
  form.elements.documento.setCustomValidity("");
  fields.hidden = true;
  fields.disabled = true;
  updateTransferBankDetails();
  document.querySelector("#participation-summary").textContent = "";
  document.querySelector("#registration-whatsapp").removeAttribute("href");
  registrationAttempt = undefined;
  submittedParticipation = null;
  submittedWithContribution = false;
  submittedWithBoleto = false;
  document.querySelector("#completion-view").hidden = true;
  document.querySelector("#farewell-view").hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  document.querySelector("#farewell-title").focus({ preventScroll: true });
}
