//links
const sheetCSVURL = "https://script.google.com/macros/s/AKfycbyuaknQikwyWMkbiVYF6x46IQgVRGMulj9ujN-gOFLx1XW92QGEUwqTVK-LcU4nckxh8A/exec";
const firebaseBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/images%2F";
const ANSWER_DELAY = 800;

//variables
let verbsData = [],
    verbs = [],
    currentQuestion = 0,
    score = 0,
    chosenAnswers = [],
    totalQuestions = 0,
    isDataLoaded = false,
    currentPhase = 1;

//DOM  
const elements = {
  questionImage: document.getElementById("question-image"),
  questionElement: document.getElementById("question"),
  optionsElement: document.getElementById("options"),
  resultSection: document.getElementById("result-section"),
  resultElement: document.getElementById("result"),
  playAgainButton: document.getElementById("play-again"),
  questionSection: document.getElementById("question-section"),
  categorySelection: document.getElementById("category-selection"),
  categoriesContainer: document.getElementById("categories"),
  phaseSelection: document.getElementById("phase-selection")
};

const imageContainer = document.getElementById("image-container");
const imageCache = {};
const getImageUrl = name => `${firebaseBaseURL}${encodeURIComponent(name)}.webp?alt=media`;

(async () => { await loadVerbsFromCSV(); })();

async function loadVerbsFromCSV() {
  try {
    const res = await fetch(sheetCSVURL);
    if (!res.ok) throw new Error(`Erro ao acessar o CSV: ${res.statusText}`);
    const csvText = await res.text();
    verbsData = parseCSV(csvText);
    if (!verbsData.length) throw new Error("Nenhum dado foi carregado do CSV.");
    isDataLoaded = true;
    displayCategories();
  } catch (e) {
    alert(`Erro ao acessar o CSV: ${e.message}`);
  }
}

function parseCSV(text) {
  return text
    .trim()
    .split("\n")
    .slice(1)
    .map(row => {
      const [cat, id, verb] = row.split(",");
      return (cat && id && verb) ? { category: cat.trim(), id: id.trim(), verb: verb.trim() } : null;
    })
    .filter(Boolean);
}

function displayCategories() {
  const catImages = {};
  verbsData.forEach(({ category }) => {
    if (!catImages[category]) {
      catImages[category] = getImageUrl(category);
    }
  });
  const uniqueCats = [...new Set(verbsData.map(item => item.category))];
  elements.categoriesContainer.innerHTML = uniqueCats
    .map(cat => `
      <button class="category" data-category="${cat}" style="background-image: url('${catImages[cat]}');">
        ${cat.charAt(0).toUpperCase() + cat.slice(1)}
      </button>
    `)
    .join("");

  document.querySelectorAll(".category").forEach(btn =>
    btn.addEventListener("click", e => {
      const selectedCat = e.currentTarget.getAttribute("data-category");
      filterVerbsByCategory(selectedCat);
      displayPhaseSelection();
    })
  );
  elements.categorySelection.classList.remove("hidden");
}

function filterVerbsByCategory(catName) {
  verbs = verbsData
    .filter(item => item.category.toLowerCase() === catName.toLowerCase())
    .map(item => item.verb);
  totalQuestions = verbs.length;
  if (!verbs.length) {
    alert("Nenhum verbo foi encontrado para esta categoria.");
    return;
  }
  preloadImages(verbs);
}

function preloadImages(list) {
  list.forEach(verb => {
    const url = getImageUrl(verb);
    if (!imageCache[url]) {
      const img = new Image();
      img.src = url;
      img.loading = "eager";
      img.decoding = "async";
      imageCache[url] = img;
    }
  });
}

function displayPhaseSelection() {
  createExitButton();

  elements.categorySelection.classList.add("hidden");
  elements.phaseSelection.innerHTML = `
    <button class="phase" data-phase="1">Phase 1<br><small>Palavra/Imagem</small></button>
    <button class="phase" data-phase="2">Phase 2<br><small>Imagem/Palavra</small></button>
    <button class="phase" data-phase="3">Phase 3<br><small>Imagem/Palavra Digitada</small></button>
  `;
  elements.phaseSelection.classList.remove("hidden");

  document.querySelectorAll(".phase").forEach(btn =>
    btn.addEventListener("click", e => {
      currentPhase = parseInt(e.currentTarget.getAttribute("data-phase"), 10);
      elements.phaseSelection.classList.add("hidden");
      startGame();
    })
  );
}

function startGame() {
  currentQuestion = 0;
  score = 0;
  chosenAnswers = [];
  elements.categorySelection.classList.add("hidden");
  elements.phaseSelection.classList.add("hidden");
  elements.questionSection.classList.remove("hidden");
  document.getElementById("phase-title").innerText = `Imperative Game - Phase ${currentPhase}`;
  createExitButton();
  displayQuestion();
}

function createExitButton() {
  let exitBtn = document.getElementById("exit-game");
  if (!exitBtn) {
    exitBtn = document.createElement("button");
    exitBtn.id = "exit-game";
    exitBtn.innerHTML = `<img src="${getImageUrl('exit')}" alt="Exit Icon" style="width:20px; height:20px;">`;
    Object.assign(exitBtn.style, {
      backgroundColor: "transparent",
      border: "none",
      padding: "5px 10px",
      cursor: "pointer"
    });
    
    const headerContainer = document.getElementById("game-header");
    headerContainer.insertBefore(exitBtn, headerContainer.firstChild);
    exitBtn.addEventListener("click", exitGame);
  }
}

function exitGame() {
  elements.questionSection.classList.add("hidden");
  elements.phaseSelection.classList.add("hidden");
  elements.categorySelection.classList.remove("hidden");
  const exitBtn = document.getElementById("exit-game");
  if (exitBtn) {
    exitBtn.remove();
  }
  document.getElementById("phase-title").innerText = "Imperative Game";
}

function setupImageQuestion(verb, questionText, fontSize = "24px") {
  imageContainer.style.display = "block";
  imageContainer.style.paddingTop = "56.25%";
  imageContainer.style.height = "";
  elements.questionImage.style.display = "block";
  const url = getImageUrl(verb);
  elements.questionImage.src = url;
  elements.questionImage.alt = verb;
  elements.questionImage.setAttribute("loading", "eager");
  elements.questionElement.innerText = questionText;
  elements.questionElement.style.fontSize = fontSize;
}

function displayQuestion() {
  if (currentQuestion >= totalQuestions) return endGame();
  const correctVerb = verbs[currentQuestion];

  if (currentPhase === 1) {
    // Fase 1: Imagem e opções de resposta em texto
    setupImageQuestion(correctVerb, null);
    elements.optionsElement.classList.remove("phase2");
    const options = generateOptions(correctVerb);
    elements.optionsElement.innerHTML = options.map(getOptionHTML).join("");
  } else if (currentPhase === 2) {
    // Fase 2: Palavra e opções de resposta em imagens
    imageContainer.style.display = "none";
    imageContainer.style.paddingTop = "0";
    imageContainer.style.height = "0";
    elements.questionElement.innerText = correctVerb;
    elements.questionElement.style.fontSize = "45px";
    elements.optionsElement.classList.add("phase2");
    const options = generateOptions(correctVerb);
    elements.optionsElement.innerHTML = options.map(getOptionHTML).join("");
  } else if (currentPhase === 3) {
    // Fase 3: Imagem e campo de texto para resposta
    setupImageQuestion(correctVerb, null);
    elements.optionsElement.classList.remove("phase2");
    elements.optionsElement.innerHTML = `
      <div class="input-container">
        <input type="text" id="text-answer"  autofocus />
        <button id="submit-answer">Enviar</button>
      </div>
    `;
    document.getElementById("submit-answer").addEventListener("click", () => {
      handleAnswer(null, correctVerb);
    });
    document.getElementById("text-answer").addEventListener("keydown", e => {
      if (e.key === "Enter") handleAnswer(null, correctVerb);
    });
  }
}

function generateOptions(correctVerb) {
  const opts = [correctVerb];
  while (opts.length < 4) {
    const random = verbs[Math.floor(Math.random() * verbs.length)];
    if (!opts.includes(random)) opts.push(random);
  }
  return shuffleArray(opts);
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getOptionHTML(option) {
  if (currentPhase === 1) {
    return `<div class="option" data-verb="${option}">${option}</div>`;
  } else if (currentPhase === 2) {
    const url = getImageUrl(option);
    const src = imageCache[url]?.src || url;
    return `<div class="option" data-verb="${option}">
              <img src="${src}" alt="${option}" loading="eager" decoding="async">
            </div>`;
  }
  return `<div class="option" data-verb="${option}">${option}</div>`;
}

elements.optionsElement.addEventListener("click", e => {
  if (currentPhase === 3) return;
  const optionEl = e.target.closest(".option");
  if (!optionEl || optionEl.style.pointerEvents === "none") return;
  const selectedVerb = optionEl.getAttribute("data-verb");
  const correctVerb = verbs[currentQuestion];
  handleAnswer(selectedVerb, correctVerb);
});

function recordAnswer(correctVerb, isCorrect) {
  score += isCorrect ? 1 : 0;
  chosenAnswers.push({ question: correctVerb, correct: isCorrect });
  currentQuestion++;
  setTimeout(displayQuestion, ANSWER_DELAY);
}

function handleAnswer(selectedVerb, correctVerb) {
  if (currentPhase === 3) {
    const inputEl = document.getElementById("text-answer");
    if (!inputEl) return;
    const answer = inputEl.value.trim();
    const isCorrect = answer.toLowerCase() === correctVerb.toLowerCase();
    inputEl.style.backgroundColor = isCorrect ? "#6ad089" : "#ff4d4e";
    recordAnswer(correctVerb, isCorrect);
  } else {
    elements.optionsElement.querySelectorAll(".option").forEach(option => {
      option.style.pointerEvents = "none";
      const verb = option.getAttribute("data-verb");
      option.style.backgroundColor = (verb === correctVerb)
        ? "#6ad089"
        : (verb === selectedVerb ? "#ff4d4e" : "");
    });
    recordAnswer(correctVerb, selectedVerb === correctVerb);
  }
}

function endGame() {
  elements.questionSection.classList.add("hidden");
  elements.resultSection.classList.remove("hidden");
  elements.resultElement.innerHTML = `
    <p class="result-score">You got <span class="score">${score}</span> out of <span class="total">${totalQuestions}</span> correct!</p>
    <ul class="result-list">
      ${chosenAnswers
        .map(({ question, correct }) => `
          <li class="result-item" style="background-color: ${correct ? "#6ad089" : "#ff4d4e"}; border: 1px solid ${correct ? "#c3e6cb" : "#f5c6cb"}">
            <span class="result-verb">${question}</span>
          </li>
        `)
        .join("")}
    </ul>
  `;
  const exitBtn = document.getElementById("exit-game");
  if (exitBtn) {
    exitBtn.remove();
  }
}

elements.playAgainButton.addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;
  chosenAnswers = [];
  elements.resultSection.classList.add("hidden");
  elements.categorySelection.classList.remove("hidden");
  const exitBtn = document.getElementById("exit-game");
  if (exitBtn) {
    exitBtn.remove();
  }
  document.getElementById("phase-title").innerText = `Imperative Game`;
});
