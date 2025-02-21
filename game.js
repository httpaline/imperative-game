const sheetCSVURL = "https://script.google.com/macros/s/AKfycbyuaknQikwyWMkbiVYF6x46IQgVRGMulj9ujN-gOFLx1XW92QGEUwqTVK-LcU4nckxh8A/exec";
const firebaseBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/images%2F";
const firebaseVoiceBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/voice%2F";
const firebaseSoundEffectBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/soundeffect%2F";

const ANSWER_DELAY = 800;
const SEGMENTS = 12;
const INITIAL_TIME = 10;

let verbsData = [],
    verbs = [],
    currentQuestion = 0,
    score = 0,
    chosenAnswers = [],
    totalQuestions = 0,
    isDataLoaded = false,
    currentPhase = 1;

let timerInterval;
let timerValue = INITIAL_TIME;

const elements = {
  questionImage: document.getElementById("question-image"),
  questionElement: document.getElementById("question"),
  optionsElement: document.getElementById("options"),
  resultSection: document.getElementById("result-section"),
  resultElement: document.getElementById("result"),
  questionSection: document.getElementById("question-section"),
  categorySelection: document.getElementById("category-selection"),
  categoriesContainer: document.getElementById("categories"),
  phaseSelection: document.getElementById("phase-selection")
};

const imageContainer = document.getElementById("image-container");
const imageCache = {};

const audioCache = {};

const getImageUrl = name => `${firebaseBaseURL}${encodeURIComponent(name)}.webp?alt=media`;
const getVoiceUrl = name => `${firebaseVoiceBaseURL}${encodeURIComponent(name)}.aac?alt=media`;
const getSoundUrl = name => `${firebaseSoundEffectBaseURL}${encodeURIComponent(name)}.AAC?alt=media`;

function getCachedAudio(url) {
  if (!audioCache[url]) {
    const audio = new Audio(url);
    audio.preload = "auto";
    audioCache[url] = audio;
  }
  return audioCache[url];
}

function playSoundEffect(name) {
  const url = getSoundUrl(name);
  const audio = getCachedAudio(url).cloneNode();
  audio.play().catch(err => console.error("Erro ao tocar som:", err));
}

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
  return text.trim().split("\n").slice(1).map(row => {
    const parts = row.split(",");
    if (parts.length >= 4) {
      const [cat, id, verb, translation] = parts;
      return (cat && id && verb) ? { category: cat.trim(), id: id.trim(), verb: verb.trim(), translation: translation.trim() } : null;
    } else {
      const [cat, id, verb] = parts;
      return (cat && id && verb) ? { category: cat.trim(), id: id.trim(), verb: verb.trim(), translation: "" } : null;
    }
  }).filter(Boolean);
}

function displayCategories() {
  const catImages = {};
  verbsData.forEach(({ category }) => {
    if (!catImages[category]) catImages[category] = getImageUrl(category);
  });
  const uniqueCats = [...new Set(verbsData.map(item => item.category))];
  elements.categoriesContainer.innerHTML = uniqueCats
    .map(cat => `<button class="category" data-category="${cat}" style="background-image: url('${catImages[cat]}');">
        ${cat.charAt(0).toUpperCase() + cat.slice(1)}
      </button>`).join("");
  elements.categoriesContainer.innerHTML += 
    `<button class="category" id="dictionary-btn" data-action="dictionary" style="background-image: url('${getImageUrl("dictionary")}'); border-radius: 12px; width: 420px; height: 50px;">
      Dictionary
    </button>`;
  document.querySelectorAll(".category").forEach(btn => {
    const action = btn.getAttribute("data-action");
    btn.addEventListener("click", () => {
      playSoundEffect("click");
      if (action === "dictionary") {
        displayDictionary();
      } else {
        const selectedCat = btn.getAttribute("data-category");
        filterVerbsByCategory(selectedCat);
        displayPhaseSelection();
      }
    });
  });
  elements.categorySelection.classList.remove("hidden");
}

function filterVerbsByCategory(catName) {
  verbs = verbsData.filter(item => item.category.toLowerCase() === catName.toLowerCase()).map(item => item.verb);
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
  elements.phaseSelection.innerHTML = 
    `<button class="phase" data-phase="1">Phase 1<br><small>Palavra/Imagem</small></button>
     <button class="phase" data-phase="2">Phase 2<br><small>Imagem/Palavra</small></button>
     <button class="phase" data-phase="3">Phase 3<br><small>Imagem/Palavra</small></button>
     <button class="phase" data-phase="4">Phase 4<br><small>Áudio/Palavra</small></button>`;
  elements.phaseSelection.classList.remove("hidden");
  document.querySelectorAll(".phase").forEach(btn =>
    btn.addEventListener("click", e => {
      playSoundEffect("click");
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
  startTimer(verbs[currentQuestion]);
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
  stopTimer();
  elements.questionSection.classList.add("hidden");
  elements.phaseSelection.classList.add("hidden");
  elements.resultSection.classList.add("hidden");
  const dictContainer = document.getElementById("dictionary-section");
  if (dictContainer) dictContainer.remove();
  elements.categorySelection.classList.remove("hidden");
  const exitBtn = document.getElementById("exit-game");
  playSoundEffect("click");
  if (exitBtn) exitBtn.remove();
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

function ensureProgressBar() {
  let progressBar = document.getElementById("progress-container");
  if (!progressBar) {
    progressBar = document.createElement("div");
    progressBar.id = "progress-container";
    progressBar.style.display = "flex";
    progressBar.style.width = "100%";
    progressBar.style.maxWidth = "400px";
    progressBar.style.height = "10px";
    progressBar.style.margin = "10px auto";
    progressBar.style.gap = "2px";
    for (let i = 0; i < SEGMENTS; i++) {
      const segment = document.createElement("div");
      segment.className = "progress-segment";
      segment.style.flex = "1";
      segment.style.backgroundColor = "#e0e0e0";
      segment.style.borderRadius = "2px";
      const fill = document.createElement("div");
      fill.className = "segment-fill";
      fill.style.height = "100%";
      fill.style.width = "0%";
      fill.style.transition = "width 0.1s linear";
      segment.appendChild(fill);
      progressBar.appendChild(segment);
    }
    elements.questionSection.insertBefore(progressBar, elements.questionSection.firstChild);
  }
}

function updateProgressBar() {
  const segments = document.querySelectorAll("#progress-container .progress-segment");
  segments.forEach((segment, index) => {
    const fill = segment.querySelector(".segment-fill");
    if (index < chosenAnswers.length) {
      fill.style.width = "100%";
      fill.style.backgroundColor = chosenAnswers[index].correct ? "#6ad089" : "#ff4d4e";
    } else if (index === chosenAnswers.length) {
      // Segment para o tempo atual
    } else {
      fill.style.width = "0%";
    }
  });
}

function updateTimerProgress(value) {
  const segments = document.querySelectorAll("#progress-container .progress-segment");
  const currentIndex = chosenAnswers.length;
  if (segments[currentIndex]) {
    const fill = segments[currentIndex].querySelector(".segment-fill");
    if (fill) {
      let percent = (1 - (value / INITIAL_TIME)) * 100;
      fill.style.width = percent + "%";
      fill.style.backgroundColor = "#808080";
    }
  }
}

function startTimer(correctVerb) {
  timerValue = INITIAL_TIME;
  updateTimerProgress(timerValue);
  timerInterval = setInterval(() => {
    timerValue--;
    updateTimerProgress(timerValue);
    if (timerValue <= 3 && timerValue > 0) playSoundEffect("bip");
    if (timerValue === 0) {
      clearInterval(timerInterval);
      handleAnswer(null, correctVerb);
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  updateTimerProgress(INITIAL_TIME);
}

function displayQuestion() {
  ensureProgressBar();
  updateProgressBar();
  if (currentQuestion >= totalQuestions) return endGame();
  const correctVerb = verbs[currentQuestion];
  stopTimer();
  startTimer(correctVerb);
  
  if (currentPhase === 1) {
    setupImageQuestion(correctVerb, null);
    elements.optionsElement.classList.remove("phase2");
    const options = generateOptions(correctVerb);
    elements.optionsElement.innerHTML = options.map(getOptionHTML).join("");
  } else if (currentPhase === 2) {
    imageContainer.style.display = "none";
    imageContainer.style.paddingTop = "0";
    imageContainer.style.height = "0";
    elements.questionElement.innerText = correctVerb;
    elements.questionElement.style.fontSize = "45px";
    elements.optionsElement.classList.add("phase2");
    const options = generateOptions(correctVerb);
    elements.optionsElement.innerHTML = options.map(getOptionHTML).join("");
  } else if (currentPhase === 3) {
    setupImageQuestion(correctVerb, null);
    elements.optionsElement.classList.remove("phase2");
    elements.optionsElement.innerHTML = `
      <div class="input-container">
        <input type="text" id="text-answer" autofocus />
        <button id="submit-answer">Enviar</button>
      </div>
    `;
    document.getElementById("text-answer").focus();
    
    document.getElementById("submit-answer").addEventListener("click", () => {
      stopTimer();
      handleAnswer(null, correctVerb);
    });
    document.getElementById("text-answer").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        stopTimer();
        handleAnswer(null, correctVerb);
      }
    });
  } else if (currentPhase === 4) {
    imageContainer.style.display = "none";
    imageContainer.style.paddingTop = "0";
    imageContainer.style.height = "0";
    elements.questionElement.innerText = "";
    elements.optionsElement.classList.remove("phase2");
    elements.optionsElement.innerHTML = `
      <div class="phase4-container" style="display: flex; flex-direction: column; align-items: center;">
        <div class="audio-container" style="margin-bottom: 20px;">
          <button id="play-audio" style="width: 80px; height: 80px; border-radius: 50%; border: none; background-color: #1d3561; font-size: 40px; display: flex; justify-content: center; align-items: center;">▶</button>
        </div>
        <div class="input-container">
          <input type="text" id="text-answer" autofocus />
          <button id="submit-answer">Enviar</button>
        </div>
      </div>
    `;
    updateProgressBar();
    
    // Reproduz o áudio de voz utilizando cache para otimização
    const voiceUrl = getVoiceUrl(correctVerb);
    const voiceAudio = getCachedAudio(voiceUrl).cloneNode();
    voiceAudio.play().catch(err => console.error("Erro ao reproduzir o áudio automaticamente:", err));
    
    document.getElementById("text-answer").focus();

    document.getElementById("play-audio").addEventListener("click", () => {
      const voiceAudio = getCachedAudio(voiceUrl).cloneNode();
      voiceAudio.play().catch(err => console.error("Erro ao reproduzir o áudio:", err));
    });
    document.getElementById("submit-answer").addEventListener("click", () => {
      stopTimer();
      handleAnswer(null, correctVerb);
    });
    document.getElementById("text-answer").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        stopTimer();
        handleAnswer(null, correctVerb);
      }
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
              <img src="${src}" alt="${option}" loading="lazy" decoding="async">
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
  stopTimer();
  handleAnswer(selectedVerb, correctVerb);
});

function recordAnswer(correctVerb, isCorrect) {
  score += isCorrect ? 1 : 0;
  chosenAnswers.push({ question: correctVerb, correct: isCorrect });
  currentQuestion++;
  updateProgressBar();
  setTimeout(displayQuestion, ANSWER_DELAY);
}

function handleAnswer(selectedVerb, correctVerb) {
  if (currentPhase === 3 || currentPhase === 4) {
    const inputEl = document.getElementById("text-answer");
    if (!inputEl) return;
    const answer = inputEl.value.trim();
    const isCorrect = answer.toLowerCase() === correctVerb.toLowerCase();
    inputEl.style.backgroundColor = isCorrect ? "#6ad089" : "#ff4d4e";
    playSoundEffect(isCorrect ? "correct" : "mistake");
    recordAnswer(correctVerb, isCorrect);
  } else {
    elements.optionsElement.querySelectorAll(".option").forEach(option => {
      option.style.pointerEvents = "none";
      const verb = option.getAttribute("data-verb");
      option.style.backgroundColor = (verb === correctVerb)
        ? "#6ad089"
        : (verb === selectedVerb ? "#ff4d4e" : "");
    });
    playSoundEffect(selectedVerb === correctVerb ? "correct" : "mistake");
    recordAnswer(correctVerb, selectedVerb === correctVerb);
  }
}

function endGame() {
  stopTimer();
  if (score >= totalQuestions / 2) {
    playSoundEffect("win");
  } else {
    playSoundEffect("fail");
  }
  elements.questionSection.classList.add("hidden");
  elements.resultSection.classList.remove("hidden");
  elements.resultElement.innerHTML = `
    <p class="result-score">Você acertou <span class="score">${score}</span> de <span class="total">${totalQuestions}</span>!</p>
    <ul class="result-list">
      ${chosenAnswers.map(({ question, correct }) => 
        `<li class="result-item" style="background-color: ${correct ? "#6ad089" : "#ff4d4e"}; border: 1px solid ${correct ? "#c3e6cb" : "#f5c6cb"}">
          <span class="result-verb">${question}</span>
        </li>`).join("")
      }
    </ul>
  `;
  let buttonsContainer = document.getElementById("result-buttons");
  if (!buttonsContainer) {
    buttonsContainer = document.createElement("div");
    buttonsContainer.id = "result-buttons";
    buttonsContainer.style.display = "flex";
    buttonsContainer.style.justifyContent = (currentPhase === 4) ? "center" : "space-between";
    buttonsContainer.style.alignItems = "center";
    buttonsContainer.style.width = "100%";
    buttonsContainer.style.marginTop = "20px";
    elements.resultSection.appendChild(buttonsContainer);
  } else {
    buttonsContainer.innerHTML = "";
    buttonsContainer.style.justifyContent = (currentPhase === 4) ? "center" : "space-between";
  }
  if (currentPhase < 4) {
    const leftContainer = document.createElement("div");
    leftContainer.style.flex = "1";
    buttonsContainer.appendChild(leftContainer);
  }
  const centerContainer = document.createElement("div");
  centerContainer.style.flex = "1";
  centerContainer.style.display = "flex";
  centerContainer.style.justifyContent = "center";
  const playAgainImg = document.createElement("img");
  playAgainImg.src = getImageUrl("again");
  playAgainImg.alt = "Play Again";
  playAgainImg.style.cursor = "pointer";
  playAgainImg.style.width = "30px";
  playAgainImg.style.height = "30px";
  playAgainImg.addEventListener("click", () => {
    currentQuestion = 0;
    score = 0;
    chosenAnswers = [];
    elements.resultSection.classList.add("hidden");
    elements.questionSection.classList.remove("hidden");
    document.getElementById("phase-title").innerText = `Imperative Game - Phase ${currentPhase}`;
    startGame();
  });
  centerContainer.appendChild(playAgainImg);
  buttonsContainer.appendChild(centerContainer);
  if (currentPhase < 4) {
    const rightContainer = document.createElement("div");
    rightContainer.style.flex = "1";
    rightContainer.style.display = "flex";
    rightContainer.style.justifyContent = "flex-end";
    const nextPhaseBtn = document.createElement("button");
    nextPhaseBtn.id = "next-phase";
    nextPhaseBtn.style.background = "transparent";
    nextPhaseBtn.style.border = "none";
    nextPhaseBtn.style.marginRight = "30px";
    nextPhaseBtn.style.cursor = "pointer";
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
    rightContainer.appendChild(nextPhaseBtn);
    buttonsContainer.appendChild(rightContainer);
  }
}

function renderDictionary(filterCategory = "all") {
  let dictContainer = document.getElementById("dictionary-section");
  dictContainer.innerHTML = "";
  const filterContainer = document.createElement("div");
  filterContainer.style.marginBottom = "10px";
  filterContainer.innerHTML = `
    <label for="dict-category-filter">Filter by category: </label>
    <select id="dict-category-filter">
      <option value="all">All</option>
    </select>`;
  dictContainer.appendChild(filterContainer);
  const selectEl = document.getElementById("dict-category-filter");
  const uniqueCategories = [...new Set(verbsData.map(item => item.category))];
  uniqueCategories.forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
    if (filterCategory === cat) option.selected = true;
    selectEl.appendChild(option);
  });
  selectEl.addEventListener("change", () => {
    renderDictionary(selectEl.value);
  });
  let filteredData = verbsData;
  if (filterCategory !== "all") {
    filteredData = verbsData.filter(item => item.category === filterCategory);
  }
  filteredData.forEach(item => {
    try {
      const entry = document.createElement("div");
      entry.className = "dictionary-entry";
      entry.style.display = "flex";
      entry.style.justifyContent = "center";
      entry.style.borderBottom = "1px solid #ccc";
      entry.style.padding = "10px 0";
      
      const wordContainer = document.createElement("div");
      wordContainer.style.display = "inline-flex";
      wordContainer.style.flexDirection = "column";
      wordContainer.style.alignItems = "center";
      
      const verbEl = document.createElement("div");
      verbEl.className = "dictionary-verb";
      verbEl.textContent = item.verb;
      verbEl.style.fontWeight = "bold";
      verbEl.style.textAlign = "center";
      
      const translationEl = document.createElement("div");
      translationEl.className = "dictionary-translation";
      translationEl.textContent = item.translation || "";
      translationEl.style.fontStyle = "italic";
      translationEl.style.textAlign = "center";
      
      const audioBtn = document.createElement("button");
      audioBtn.className = "audio-btn";
      audioBtn.innerHTML = "&#9654;";
      audioBtn.style.color = "#1d3561";
      audioBtn.style.marginLeft = "8px";
      audioBtn.style.cursor = "pointer";
      audioBtn.style.background = "transparent";
      audioBtn.style.border = "none";
      
      audioBtn.addEventListener("click", () => {
        try {
          const voiceUrl = getVoiceUrl(item.verb);
          const audio = getCachedAudio(voiceUrl).cloneNode();
          audio.play().catch(err => console.error("Erro ao reproduzir áudio:", err));
        } catch (err) {
          console.error("Erro ao criar áudio:", err);
        }
      });
      
      wordContainer.appendChild(verbEl);
      wordContainer.appendChild(translationEl);
      
      entry.appendChild(wordContainer);
      entry.appendChild(audioBtn);
      dictContainer.appendChild(entry);
    } catch (err) {
      console.error("Erro ao criar entrada do dicionário:", err);
    }
  });
}

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
    renderDictionary("all");
  } catch (err) {
    console.error("Erro ao exibir o dicionário:", err);
    alert("Ocorreu um erro ao exibir o dicionário. Tente novamente.");
  }
}
