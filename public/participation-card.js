// A ficha é renderizada no navegador; os dados e a imagem não são enviados a um servidor.
(() => {
  const section = document.querySelector("#participation-card-section");
  const preview = document.querySelector("#participation-card-image");
  const status = document.querySelector("#card-status");
  const downloadButton = document.querySelector("#download-card");
  const filename = "ficha-participacao-pao-vivo.png";
  let currentUrl = null;
  let generation = 0;
  function clear() {
    generation++;
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentUrl = null;
    preview.removeAttribute("src");
    preview.hidden = true;
    downloadButton.disabled = true;
    status.textContent = "";
    section.hidden = true;
  }
  async function generate(data) {
    clear();
    const version = generation;
    section.hidden = false;
    status.textContent = "Preparando sua ficha em imagem…";
    try {
      const blob = await window.renderParticipationCard(data);
      if (version !== generation) return;
      currentUrl = URL.createObjectURL(blob);
      preview.src = currentUrl;
      preview.hidden = false;
      downloadButton.disabled = false;
      status.textContent = "Imagem pronta para baixar e guardar com você.";
    } catch {
      if (version === generation)
        status.textContent =
          "Não foi possível gerar a imagem. Volte ao formulário e tente novamente.";
    }
  }
  downloadButton.addEventListener("click", () => {
    if (!currentUrl) return;
    const link = document.createElement("a");
    link.href = currentUrl;
    link.download = filename;
    link.click();
    status.textContent =
      "Ficha pronta para baixar. Guarde esta cópia para você.";
  });
  window.participationCard = { generate, clear };
})();
