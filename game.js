//links
const sheetCSVURL = "https://script.google.com/macros/s/AKfycbyuaknQikwyWMkbiVYF6x46IQgVRGMulj9ujN-gOFLx1XW92QGEUwqTVK-LcU4nckxh8A/exec";
const firebaseBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/images%2F";
const firebaseVoiceBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/voice%2F";
const ANSWER_DELAY = 800;

//variáveis
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
const getVoiceUrl = name => `${firebaseVoiceBaseURL}${encodeURIComponent(name)}.aac?alt=media`;

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
      const parts = row.split(",");
      if (parts.length >= 4) {
        const [cat, id, verb, translation] = parts;
        return (cat && id && verb) ? { category: cat.trim(), id: id.trim(), verb: verb.trim(), translation: translation.trim() } : null;
      } else {
        const [cat, id, verb] = parts;
        return (cat && id && verb) ? { category: cat.trim(), id: id.trim(), verb: verb.trim(), translation: "" } : null;
      }
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

  elements.categoriesContainer.innerHTML += `
    <button class="category" id="dictionary-btn" data-action="dictionary" style="background-image: url('${getImageUrl("dictionary")}');">
      Dictionary
    </button>
  `;

  document.querySelectorAll(".category").forEach(btn => {
    const action = btn.getAttribute("data-action");
    if (action === "dictionary") {
      btn.addEventListener("click", () => {
        displayDictionary();
      });
    } else {
      btn.addEventListener("click", e => {
        const selectedCat = e.currentTarget.getAttribute("data-category");
        filterVerbsByCategory(selectedCat);
        displayPhaseSelection();
      });
    }
  });
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
    <button class="phase" data-phase="3">Phase 3<br><small>Imagem/Palavra</small></button>
    <button class="phase" data-phase="4">Phase 4<br><small>Áudio/Palavra</small></button>
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
  elements.resultSection.classList.add("hidden");
  const dictContainer = document.getElementById("dictionary-section");
  if (dictContainer) {
    dictContainer.remove();
  }
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
    //1 Imagem -> Palavra
    setupImageQuestion(correctVerb, null);
    elements.optionsElement.classList.remove("phase2");
    const options = generateOptions(correctVerb);
    elements.optionsElement.innerHTML = options.map(getOptionHTML).join("");
  } else if (currentPhase === 2) {
    //2 Palavra -> Imagem
    imageContainer.style.display = "none";
    imageContainer.style.paddingTop = "0";
    imageContainer.style.height = "0";
    elements.questionElement.innerText = correctVerb;
    elements.questionElement.style.fontSize = "45px";
    elements.optionsElement.classList.add("phase2");
    const options = generateOptions(correctVerb);
    elements.optionsElement.innerHTML = options.map(getOptionHTML).join("");
  } else if (currentPhase === 3) {
    //3 Imagem -> Input de texto
    setupImageQuestion(correctVerb, null);
    elements.optionsElement.classList.remove("phase2");
    elements.optionsElement.innerHTML = `
      <div class="input-container">
        <input type="text" id="text-answer" autofocus />
        <button id="submit-answer">Enviar</button>
      </div>
    `;
    document.getElementById("submit-answer").addEventListener("click", () => {
      handleAnswer(null, correctVerb);
    });
    document.getElementById("text-answer").addEventListener("keydown", e => {
      if (e.key === "Enter") handleAnswer(null, correctVerb);
    });
  } else if (currentPhase === 4) {
    //4 Áudio -> Input de texto 
    imageContainer.style.display = "none";
    imageContainer.style.paddingTop = "0";
    imageContainer.style.height = "0";
    elements.questionElement.innerText = "";
    elements.optionsElement.classList.remove("phase2");
    elements.optionsElement.innerHTML = `
      <div class="phase4-container" style="display: flex; flex-direction: column; align-items: center;">
        <div class="audio-container" style="margin-bottom: 20px;">
          <button id="play-audio" style="width: 100px; height: 100px; border-radius: 50%; border: none; background-color: #1d3561; font-size: 40px; display: flex; justify-content: center; align-items: center;">▶</button>
        </div>
        <div class="input-container">
          <input type="text" id="text-answer" autofocus />
          <button id="submit-answer">Enviar</button>
        </div>
      </div>
    `;
    document.getElementById("play-audio").addEventListener("click", () => {
      const audio = new Audio(getVoiceUrl(correctVerb));
      audio.play();
    });
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
  if (currentPhase === 3 || currentPhase === 4) return;
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
  if (currentPhase === 3 || currentPhase === 4) {
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
    <p class="result-score">Você acertou <span class="score">${score}</span> de <span class="total">${totalQuestions}</span>!</p>
    <ul class="result-list">
      ${chosenAnswers
        .map(
          ({ question, correct }) => `
          <li class="result-item" style="background-color: ${correct ? "#6ad089" : "#ff4d4e"}; border: 1px solid ${correct ? "#c3e6cb" : "#f5c6cb"}">
            <span class="result-verb">${question}</span>
          </li>
        `
        )
        .join("")}
    </ul>
  `;

  let buttonsContainer = document.getElementById("result-buttons");
  if (!buttonsContainer) {
    buttonsContainer = document.createElement("div");
    buttonsContainer.id = "result-buttons";
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.width = "100%";
    buttonsContainer.style.marginTop = "20px";
    elements.resultSection.appendChild(buttonsContainer);
  } else {
    buttonsContainer.innerHTML = "";
  }

  const playAgainContainer = document.createElement("div");
  playAgainContainer.style.flex = "1";
  playAgainContainer.style.display = "flex";
  playAgainContainer.style.justifyContent = "center";
  playAgainContainer.appendChild(elements.playAgainButton);
  buttonsContainer.appendChild(playAgainContainer);

  if (currentPhase < 4) {
    const nextContainer = document.createElement("div");
    nextContainer.style.display = "flex";
    nextContainer.style.justifyContent = "flex-end";
    nextContainer.style.paddingRight = "40px";
    
    const nextPhaseBtn = document.createElement("button");
    nextPhaseBtn.id = "next-phase";
    nextPhaseBtn.style.background = "transparent";
    nextPhaseBtn.style.border = "none";
    nextPhaseBtn.style.cursor = "pointer";
    nextPhaseBtn.style.gap = "5px";
    nextPhaseBtn.innerHTML = `<img src="${getImageUrl('next')}" alt="Next Phase" style="width:20px; height:20px;">`;
    nextPhaseBtn.addEventListener("click", () => {
      currentPhase++;
      currentQuestion = 0;
      score = 0;
      chosenAnswers = [];
      document.getElementById("phase-title").innerText = `Imperative Game - Phase ${currentPhase}`;
      elements.resultSection.classList.add("hidden");
      elements.questionSection.classList.remove("hidden");
      startGame();
    });

    nextContainer.appendChild(nextPhaseBtn);
    buttonsContainer.appendChild(nextContainer);
  }
}

elements.playAgainButton.addEventListener("click", () => {
  currentQuestion = 0;
  score = 0;
  chosenAnswers = [];
  elements.resultSection.classList.add("hidden");
  elements.questionSection.classList.remove("hidden");
  document.getElementById("phase-title").innerText = `Imperative Game - Phase ${currentPhase}`;
  startGame();
});

function displayDictionary() {
  try {
    
    elements.categorySelection.classList.add("hidden");
    createExitButton();

    let dictContainer = document.getElementById("dictionary-section");
    if (!dictContainer) {
      dictContainer = document.createElement("div");
      dictContainer.id = "dictionary-section";
      Object.assign(dictContainer.style, {
        padding: "20px",
        maxHeight: "80vh",
        overflowY: "auto",
        width: "100%"
      });
      const headerContainer = document.getElementById("game-header");
      if (headerContainer && headerContainer.parentNode) {
        headerContainer.parentNode.insertBefore(dictContainer, headerContainer.nextSibling);
      } else {
        document.body.appendChild(dictContainer);
      }
    } else {
      dictContainer.innerHTML = "";
    }
    
    verbsData.forEach(item => {
      try {
        const entry = document.createElement("div");
        entry.className = "dictionary-entry";
        entry.style.display = "flex";
        entry.style.alignItems = "center";
        entry.style.justifyContent = "space-between";
        entry.style.borderBottom = "1px solid #ccc";
        entry.style.padding = "10px 0";

        const textContainer = document.createElement("div");
        textContainer.style.flex = "1";

        const verbEl = document.createElement("div");
        verbEl.className = "dictionary-verb";
        verbEl.textContent = item.verb;
        verbEl.style.fontWeight = "bold";

        const translationEl = document.createElement("div");
        translationEl.className = "dictionary-translation";
        translationEl.textContent = item.translation || "";
        translationEl.style.fontStyle = "italic";

        textContainer.appendChild(verbEl);
        textContainer.appendChild(translationEl);

        const audioBtn = document.createElement("button");
        audioBtn.className = "audio-btn";
        audioBtn.innerHTML = "&#9654;"; 
        audioBtn.style.color = "#1d3561";
        audioBtn.style.marginLeft = "10px";
        audioBtn.style.cursor = "pointer";
        audioBtn.style.background = "transparent";
        audioBtn.style.border = "none";
        audioBtn.addEventListener("click", () => {
          try {
            const audio = new Audio(getVoiceUrl(item.verb));
            audio.play().catch(err => console.error("Erro ao reproduzir áudio:", err));
          } catch (err) {
            console.error("Erro ao criar áudio:", err);
          }
        });

        entry.appendChild(textContainer);
        entry.appendChild(audioBtn);
        dictContainer.appendChild(entry);
      } catch (err) {
        console.error("Erro ao criar entrada do dicionário:", err);
      }
    });
  } catch (err) {
    console.error("Erro ao exibir o dicionário:", err);
    alert("Ocorreu um erro ao exibir o dicionário. Tente novamente.");
  }
}
