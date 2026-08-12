"use strict";

/*
  Imagens na raiz do GitHub:
  Quadro 1: img01.jpg, img02.jpg, img03.jpg
  Quadro 2: img04.jpg, img05.jpg, img06.jpg
  Quadro 3: img07.jpg, img08.jpg, img09.jpg
  Fundo do pergaminho: img10.jpg
*/
const sequences = [
  ["img01.jpg", "img02.jpg", "img03.jpg"],
  ["img04.jpg", "img05.jpg", "img06.jpg"],
  ["img07.jpg", "img08.jpg", "img09.jpg"]
];

const currentScenes = [0, 0, 0];
const finishedSequences = [false, false, false];

const journeyGrid = document.getElementById("journeyGrid");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const progressTrack = document.getElementById("progressTrack");
const progressBar = document.getElementById("progressBar");
const completionBox = document.getElementById("completionBox");
const openParchmentButton = document.getElementById("openParchmentButton");
const parchmentModal = document.getElementById("parchmentModal");
const parchmentContent = document.getElementById("parchmentContent");
const generatePdfButton = document.getElementById("generatePdfButton");
const formMessage = document.getElementById("formMessage");
const toast = document.getElementById("toast");
const editableFields = [...document.querySelectorAll(".editable-field")];

let toastTimer;

function createCards() {
  journeyGrid.innerHTML = sequences.map((images, index) => `
    <article class="journey-card" data-card-index="${index}">
      <header class="card-heading">
        <h2 class="scene-title">Cena 1</h2>
        <span class="scene-counter">1 / 3</span>
      </header>

      <div class="image-wrap">
        <button class="image-button" type="button" aria-label="Avançar o quadro ${index + 1} para a Cena 2">
          <img class="scene-image" src="${images[0]}" alt="Quadro ${index + 1}, Cena 1" draggable="false">
        </button>

        <button class="back-button" type="button" aria-label="Retornar para a cena anterior" title="Retornar" hidden>↩</button>
        <div class="image-error" hidden>Imagem não encontrada.<br>Confira o nome do arquivo na raiz do GitHub.</div>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".journey-card").forEach((card, index) => {
    card.querySelector(".image-button").addEventListener("click", () => advanceScene(index));
    card.querySelector(".back-button").addEventListener("click", () => returnScene(index));

    const image = card.querySelector(".scene-image");
    const error = card.querySelector(".image-error");
    image.addEventListener("load", () => { image.hidden = false; error.hidden = true; });
    image.addEventListener("error", () => { image.hidden = true; error.hidden = false; });
  });
}

function advanceScene(cardIndex) {
  if (currentScenes[cardIndex] >= 2) {
    showToast("Este quadro já chegou à Cena 3.");
    return;
  }

  currentScenes[cardIndex] += 1;
  if (currentScenes[cardIndex] === 2) finishedSequences[cardIndex] = true;
  updateCard(cardIndex);
  updateProgress();
}

function returnScene(cardIndex) {
  if (currentScenes[cardIndex] === 0) return;
  currentScenes[cardIndex] -= 1;
  updateCard(cardIndex);
}

function updateCard(cardIndex) {
  const sceneIndex = currentScenes[cardIndex];
  const sceneNumber = sceneIndex + 1;
  const card = document.querySelector(`[data-card-index="${cardIndex}"]`);
  const image = card.querySelector(".scene-image");
  const imageButton = card.querySelector(".image-button");

  card.querySelector(".scene-title").textContent = `Cena ${sceneNumber}`;
  card.querySelector(".scene-counter").textContent = `${sceneNumber} / 3`;
  card.querySelector(".back-button").hidden = sceneIndex === 0;
  card.classList.toggle("completed", sceneIndex === 2);

  image.hidden = false;
  image.src = sequences[cardIndex][sceneIndex];
  image.alt = `Quadro ${cardIndex + 1}, Cena ${sceneNumber}`;
  image.classList.remove("scene-changing");
  void image.offsetWidth;
  image.classList.add("scene-changing");

  const nextScene = Math.min(sceneNumber + 1, 3);
  imageButton.setAttribute("aria-label", sceneIndex === 2
    ? `Quadro ${cardIndex + 1} concluído`
    : `Avançar o quadro ${cardIndex + 1} para a Cena ${nextScene}`
  );
}

function updateProgress() {
  const completed = finishedSequences.filter(Boolean).length;
  const percentage = Math.round((completed / sequences.length) * 100);

  progressText.textContent = `${completed} de 3 ${completed === 1 ? "sequência concluída" : "sequências concluídas"}`;
  progressPercent.textContent = `${percentage}%`;
  progressTrack.setAttribute("aria-valuenow", String(completed));
  progressBar.style.width = `${percentage}%`;
  progressBar.classList.toggle("full", percentage === 100);
  completionBox.hidden = completed !== sequences.length;

  if (completed === sequences.length) {
    setTimeout(() => completionBox.scrollIntoView({ behavior: "smooth", block: "center" }), 180);
  }
}

function openParchment() {
  parchmentModal.hidden = false;
  document.body.style.overflow = "hidden";
  setTimeout(() => editableFields[0].focus(), 80);
}

function closeParchment() {
  parchmentModal.hidden = true;
  document.body.style.overflow = "";
  formMessage.textContent = "";
}

function cleanEditableField(field) {
  const text = field.textContent.replace(/\s+/g, " ").trim();
  field.textContent = text.slice(0, 120);
  field.classList.remove("invalid");
}

function validateFields() {
  let valid = true;
  editableFields.forEach(field => {
    cleanEditableField(field);
    const empty = !field.textContent.trim();
    field.classList.toggle("invalid", empty);
    if (empty) valid = false;
  });

  formMessage.textContent = valid ? "" : "Preencha os quatro campos editáveis antes de gerar o PDF.";
  if (!valid) document.querySelector(".editable-field.invalid")?.focus();
  return valid;
}

async function preloadImage(source) {
  await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = resolve;
    image.onerror = () => reject(new Error(`Não foi possível carregar ${source}.`));
    image.src = source;
  });
}

async function generatePdf() {
  if (!validateFields()) return;
  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    formMessage.textContent = "As bibliotecas de PDF não foram carregadas. Verifique sua conexão.";
    return;
  }

  generatePdfButton.disabled = true;
  generatePdfButton.innerHTML = "Gerando PDF…";
  formMessage.textContent = "Preparando seu pergaminho…";

  let exportCard;

  try {
    await preloadImage("img10.jpg");
    if (document.fonts?.ready) await document.fonts.ready;

    exportCard = document.querySelector(".parchment-screen").cloneNode(true);
    exportCard.removeAttribute("role");
    exportCard.removeAttribute("aria-modal");
    exportCard.classList.add("pdf-export-card");
    exportCard.querySelectorAll(".pdf-ignore").forEach(element => element.remove());
    exportCard.querySelectorAll("[contenteditable]").forEach(element => element.removeAttribute("contenteditable"));
    document.body.appendChild(exportCard);

    const canvas = await html2canvas(exportCard, {
      width: 1600,
      height: 900,
      scale: 2,
      backgroundColor: null,
      useCORS: true,
      logging: false,
      imageTimeout: 15000
    });

    const imageData = canvas.toDataURL("image/jpeg", 0.96);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [1600, 900],
      hotfixes: ["px_scaling"],
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imageData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");

    const personName = document.querySelector('[data-field="nome"]').textContent.trim();
    const safeName = personName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "formadora";

    pdf.save(`pergaminho-da-formadora-${safeName}.pdf`);
    formMessage.textContent = "PDF gerado com sucesso.";
    showToast("O Pergaminho da Formadora foi baixado em PDF.");
  } catch (error) {
    console.error(error);
    formMessage.textContent = "Não foi possível gerar o PDF. Confira se img10.jpg está na raiz do projeto.";
  } finally {
    exportCard?.remove();
    generatePdfButton.disabled = false;
    generatePdfButton.innerHTML = '<span aria-hidden="true">⬇</span> Gerar Pergaminho';
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("visible");
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 3200);
}

editableFields.forEach(field => {
  field.addEventListener("keydown", event => {
    if (event.key === "Enter") event.preventDefault();
  });
  field.addEventListener("paste", event => {
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData("text").replace(/\s+/g, " ");
    document.execCommand("insertText", false, text);
  });
  field.addEventListener("blur", () => cleanEditableField(field));
  field.addEventListener("input", () => field.classList.remove("invalid"));
});

openParchmentButton.addEventListener("click", openParchment);
generatePdfButton.addEventListener("click", generatePdf);
document.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", closeParchment));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !parchmentModal.hidden) closeParchment();
});

createCards();
updateProgress();
