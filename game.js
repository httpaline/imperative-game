// URLs e Dados
const sheetCSVURL = "https://script.google.com/macros/s/AKfycbyuaknQikwyWMkbiVYF6x46IQgVRGMulj9ujN-gOFLx1XW92QGEUwqTVK-LcU4nckxh8A/exec";
const firebaseBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/images%2F";
let verbsData = [];
let verbs = [];
let currentQuestion = 0;
let score = 0;
let chosenAnswers = [];
let totalQuestions = 0;
let isDataLoaded = false;

// Elementos DOM
const elements = {
    coverImage: document.getElementById("cover-image"),
    questionImage: document.getElementById("question-image"),
    questionElement: document.getElementById("question"),
    optionsElement: document.getElementById("options"),
    resultSection: document.getElementById("result-section"),
    resultElement: document.getElementById("result"),
    playAgainButton: document.getElementById("play-again"),
    coverContainer: document.getElementById("cover-container"),
    questionSection: document.getElementById("question-section")
};

async function loadVerbsFromCSV() {
    try {
        console.log("Carregando dados do CSV...");
        const response = await fetch(sheetCSVURL);

        if (!response.ok) {
            throw new Error(`Erro ao acessar o CSV: ${response.statusText}`);
        }

        const csvText = await response.text();
        verbsData = parseCSV(csvText);
        filterVerbsByCategory(1); // Categoria 1 com imagem
        isDataLoaded = true;
    } catch (error) {
        console.error("Erro ao carregar verbos do CSV:", error);
        alert(`Erro ao acessar o CSV: ${error.message}`);
    }
}

function parseCSV(csvText) {
    const rows = csvText.split("\n").slice(1);
    return rows.map((row, index) => {
        const [categoryName, categoryId, verb, image] = row.split(",");
        if (!categoryName || !categoryId || !verb) {
            console.warn(`Linha inválida ${index + 2}: ${row}`);
            return null;
        }
        return {
            category: categoryName.trim(),
            id: categoryId.trim(),
            verb: verb.trim(),
            hasImage: image?.trim().toLowerCase() === "yes"
        };
    }).filter(Boolean);
}

function filterVerbsByCategory(categoryId) {
    verbs = verbsData
        .filter(item => item.id === String(categoryId) && item.hasImage)
        .map(item => item.verb);
    totalQuestions = verbs.length;

    if (verbs.length === 0) {
        throw new Error("Nenhum verbo com imagem foi encontrado para esta categoria.");
    }
    console.log(`Verbos da categoria ${categoryId} carregados:`, verbs);
}

function preloadImagesAsync(urls) {
    urls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

function startGame() {
    if (!isDataLoaded) return;
    elements.coverContainer.classList.add("hidden");
    elements.questionSection.classList.remove("hidden");
    displayQuestion();
}

function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

function generateOptions(correctVerb) {
    const options = [correctVerb];
    while (options.length < 4) {
        const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];
        if (!options.includes(randomVerb)) {
            options.push(randomVerb);
        }
    }
    return shuffleArray(options);
}

function displayQuestion() {
    if (currentQuestion >= totalQuestions) {
        endGame();
        return;
    }

    const correctVerb = verbs[currentQuestion];
    const imageUrl = `${firebaseBaseURL}${correctVerb}.webp?alt=media`;

    elements.questionImage.src = imageUrl;
    elements.questionImage.alt = correctVerb;
    elements.questionElement.innerText = "What does this image represent?";

    const options = generateOptions(correctVerb);
    elements.optionsElement.innerHTML = options.map(option => `
        <div class="option" data-verb="${option}">${option}</div>
    `).join("");

    attachOptionListeners(correctVerb);
}

function attachOptionListeners(correctVerb) {
    document.querySelectorAll(".option").forEach(option => {
        option.addEventListener("click", () => handleAnswer(option.getAttribute("data-verb"), correctVerb));
    });
}

function handleAnswer(selectedVerb, correctVerb) {
    document.querySelectorAll(".option").forEach(option => {
        option.style.pointerEvents = "none";
        const verb = option.getAttribute("data-verb");
        option.style.backgroundColor = verb === correctVerb ? "#6ad089" : verb === selectedVerb ? "#ff4d4e" : "";
    });

    const isCorrect = selectedVerb === correctVerb;
    score += isCorrect ? 1 : 0;

    chosenAnswers.push({ question: correctVerb, correct: isCorrect });
    currentQuestion++;
    setTimeout(displayQuestion, 800);
}

function endGame() {
    elements.questionSection.classList.add("hidden");
    elements.resultSection.classList.remove("hidden");


    elements.resultElement.innerHTML = `
    <p class="result-score">You got <span class="score">${score}</span> out of <span class="total">${totalQuestions}</span> correct!</p>
    <ul class="result-list">
        ${chosenAnswers.map(({ question, correct }) => `
            <li class="result-item" style="background-color: ${correct ? '#6ad089' : '#ff4d4e'}; border: 1px solid ${correct ? '#c3e6cb' : '#f5c6cb'}">
                <span class="result-verb">${question}</span>
            </li>
        `).join("")}
    </ul>
`;
}

elements.playAgainButton.addEventListener("click", () => {
    if (!isDataLoaded) return;
    location.reload();
});

document.addEventListener("DOMContentLoaded", async () => {
    elements.coverImage.innerText = "Loading data...";
    await loadVerbsFromCSV();
    preloadImagesAsync(verbs.map(verb => `${firebaseBaseURL}${verb}.webp?alt=media`));
    elements.coverImage.innerText = "Click to Start!";
});

elements.coverImage.addEventListener("click", () => startGame());
