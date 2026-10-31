const {
  PIX,
  formatOfferInput,
  validateOfferAmount,
  formatPostalCode,
  formatPhone,
  readParticipation,
  createWhatsAppUrl,
  createSummary,
} = window.Participation;
const form = document.querySelector("#participation-form");
const contribution = document.querySelector("#contribuindo");
const fields = document.querySelector("#contribution-fields");
let submittedWithContribution = false;
document.querySelector("#pix-code").value = PIX;
contribution.addEventListener("change", () => {
  fields.hidden = !contribution.checked;
  fields.disabled = !contribution.checked;
});
const transferBankDetails = document.querySelector("#transfer-bank-details");
function updateTransferBankDetails() {
  transferBankDetails.hidden =
    !contribution.checked || form.elements.metodo.value !== "Transferência";
}
form.addEventListener("change", (event) => {
  if (event.target.name === "metodo" || event.target.name === "contribuindo")
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

function submitParticipation(event) {
  event.preventDefault();
  if (!form.elements.orando.checked && !contribution.checked) {
    const error = document.querySelector("#participation-error");
    error.hidden = false;
    form.elements.orando.focus();
    return;
  }
  const participation = readParticipation(new FormData(form));
  const whatsappUrl = createWhatsAppUrl(participation);
  document.querySelector("#registration-whatsapp").href = whatsappUrl;
  submittedWithContribution = contribution.checked;
  document.querySelector("#finish-donation").hidden =
    !submittedWithContribution;
  document.querySelector("#finish-prayer").hidden = submittedWithContribution;
  document.querySelector("#confirm-donation").checked = false;
  document.querySelector("#complete-donation").disabled = true;
  document.querySelector("#participation-summary").textContent =
    createSummary(participation);
  document.querySelector("#payment-options").hidden = !contribution.checked;
  document.querySelector("#form-view").hidden = true;
  document.querySelector("#payment-view").hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  document.querySelector("#payment-heading").focus({ preventScroll: true });
  window.participationCard.generate(participation);
  // Abre o texto pronto. O envio permanece sob confirmação do doador no WhatsApp.
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}
document
  .querySelector("#edit-form")
  .addEventListener("click", editParticipation);

function editParticipation() {
  document.querySelector("#payment-view").hidden = true;
  document.querySelector("#form-view").hidden = false;
  window.participationCard.clear();
  document.querySelector("#registration-whatsapp").removeAttribute("href");
  document.querySelector("#participar").scrollIntoView();
}

document
  .querySelector("#confirm-donation")
  .addEventListener("change", (event) => {
    document.querySelector("#complete-donation").disabled =
      !event.target.checked;
  });
function showCompletion() {
  if (
    submittedWithContribution &&
    !document.querySelector("#confirm-donation").checked
  )
    return;
  document.querySelector("#payment-view").hidden = true;
  document.querySelector("#closing-message").hidden = true;
  document.querySelector(".header-link").hidden = true;
  document.querySelector("#completion-title").textContent =
    submittedWithContribution
      ? "Doação Realizada com sucesso"
      : "Participação concluída com sucesso";
  document.querySelector("#completion-detail").textContent =
    submittedWithContribution
      ? "Conclusão informada por você. O Ministério fará a conferência do pagamento e do comprovante."
      : "Obrigado por se unir a esta obra em oração!";
  document.querySelector("#completion-view").hidden = false;
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
  .querySelector("#exit-flow")
  .addEventListener("click", exitParticipation);

function exitParticipation() {
  window.participationCard.clear();
  form.reset();
  form.elements.valor.setCustomValidity("");
  fields.hidden = true;
  fields.disabled = true;
  updateTransferBankDetails();
  document.querySelector("#registration-whatsapp").removeAttribute("href");
  document.querySelector("#participation-summary").textContent = "";
  submittedWithContribution = false;
  document.querySelector("#completion-view").hidden = true;
  document.querySelector("#farewell-view").hidden = false;
  window.scrollTo({ top: 0, behavior: "instant" });
  document.querySelector("#farewell-title").focus({ preventScroll: true });
}
