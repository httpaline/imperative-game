const sheetCSVURL = "https://script.google.com/macros/s/AKfycbyuaknQikwyWMkbiVYF6x46IQgVRGMulj9ujN-gOFLx1XW92QGEUwqTVK-LcU4nckxh8A/exec";
const firebaseBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/images%2F";
let verbsData = [];
let verbs = [];
let currentQuestion = 0;
let score = 0;
let chosenAnswers = [];
let totalQuestions = 0;
let isDataLoaded = false;

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
};

async function loadVerbsFromCSV() {
    try {
        const response = await fetch(sheetCSVURL);
        if (!response.ok) {
            throw new Error(`Erro ao acessar o CSV: ${response.statusText}`);
        }
        const csvText = await response.text();
        verbsData = parseCSV(csvText);
        if (verbsData.length === 0) {
            throw new Error("Nenhum dado foi carregado do CSV.");
        }
        isDataLoaded = true;
        displayCategories();
    } catch (error) {
        alert(`Erro ao acessar o CSV: ${error.message}`);
    }
}

function parseCSV(csvText) {
    const rows = csvText.split("\n").slice(1);
    return rows
        .map((row) => {
            const [categoryName, categoryId, verb] = row.split(",");
            if (!categoryName || !categoryId || !verb) {
                return null;
            }
            return {
                category: categoryName.trim(),
                id: categoryId.trim(),
                verb: verb.trim(),
            };
        })
        .filter(Boolean);
}

function displayCategories() {
    const categoryImages = {
        basic: `${firebaseBaseURL}basic.webp?alt=media`,
        fitness: `${firebaseBaseURL}fitness.webp?alt=media`,
        business: `${firebaseBaseURL}business.webp?alt=media`,
        tourism: `${firebaseBaseURL}tourism.webp?alt=media`,
        academic: `${firebaseBaseURL}academic.webp?alt=media`,
        family: `${firebaseBaseURL}family.webp?alt=media`,
    };

    const uniqueCategories = [...new Set(verbsData.map((verb) => verb.category))];

    elements.categoriesContainer.innerHTML = uniqueCategories
        .map(
            (category) => `
        <button 
            class="category" 
            data-category="${category}" 
            style="background-image: url('${
                categoryImages[category] || `${firebaseBaseURL}default.webp?alt=media`
            }');">
            ${category.charAt(0).toUpperCase() + category.slice(1)}
        </button>
    `
        )
        .join("");

    document.querySelectorAll(".category").forEach((button) => {
        button.addEventListener("click", (event) => {
            const selectedCategory = event.target.getAttribute("data-category");
            filterVerbsByCategory(selectedCategory);
            startGame();
        });
    });

    elements.categorySelection.classList.remove("hidden");
}

function filterVerbsByCategory(categoryName) {
    verbs = verbsData
        .filter((item) => item.category.toLowerCase() === categoryName.toLowerCase())
        .map((item) => item.verb);
    totalQuestions = verbs.length;

    if (verbs.length === 0) {
        alert("Nenhum verbo foi encontrado para esta categoria.");
    }
}

function startGame() {
    elements.categorySelection.classList.add("hidden");
    elements.questionSection.classList.remove("hidden");
    currentQuestion = 0;
    displayQuestion();
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
    elements.optionsElement.innerHTML = options
        .map(
            (option) => `
        <div class="option" data-verb="${option}">${option}</div>
    `
        )
        .join("");

    attachOptionListeners(correctVerb);
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

function shuffleArray(array) {
    return array.sort(() => Math.random() - 0.5);
}

function attachOptionListeners(correctVerb) {
    document.querySelectorAll(".option").forEach((option) => {
        option.addEventListener("click", () => handleAnswer(option.getAttribute("data-verb"), correctVerb));
    });
}

function handleAnswer(selectedVerb, correctVerb) {
    document.querySelectorAll(".option").forEach((option) => {
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
    currentQuestion = 0;
    score = 0;
    chosenAnswers = [];
    elements.resultSection.classList.add("hidden");
    elements.categorySelection.classList.remove("hidden");
});

document.addEventListener("DOMContentLoaded", async () => {
    await loadVerbsFromCSV();
});
