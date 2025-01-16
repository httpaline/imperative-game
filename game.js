const sheetCSVURL = "https://script.google.com/macros/s/AKfycbyuaknQikwyWMkbiVYF6x46IQgVRGMulj9ujN-gOFLx1XW92QGEUwqTVK-LcU4nckxh8A/exec";
const firebaseBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/images%2F";
let verbsData = [];
let verbs = [];
let currentQuestion = 0;
let score = 0;
let chosenAnswers = [];
let totalQuestions = 0;

// Elementos DOM
const coverImage = document.getElementById("cover-image");
const questionImage = document.getElementById("question-image");
const questionElement = document.getElementById("question");
const optionsElement = document.getElementById("options");
const resultSection = document.getElementById("result-section");
const resultElement = document.getElementById("result");
const playAgainButton = document.getElementById("play-again");

async function loadVerbsFromCSV() {
    try {
        console.log("Carregando dados do CSV...");
        const response = await fetch(sheetCSVURL);

        if (!response.ok) {
            throw new Error(`Erro ao acessar o CSV: ${response.statusText}`);
        }

        const csvText = await response.text();
        console.log("Dados brutos do CSV:", csvText);

        const rows = csvText.split("\n").slice(1); // Ignorar cabeçalhos

        verbsData = rows.map((row, index) => {
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
        }).filter(Boolean); // Remove nulos

        verbs = verbsData.filter(item => item.hasImage).map(item => item.verb);
        totalQuestions = verbs.length;

        if (verbs.length === 0) {
            throw new Error("Nenhum verbo com imagem foi encontrado.");
        }

        console.log("Verbos carregados:", verbs);
    } catch (error) {
        console.error("Erro ao carregar verbos do CSV:", error);
        alert(`Erro ao acessar o CSV: ${error.message}`);
    }
}

function preloadImages(urls) {
    urls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

function startGame() {
    document.getElementById("cover-container").classList.add("hidden");
    document.getElementById("question-section").classList.remove("hidden");
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

    questionImage.src = imageUrl;
    questionImage.alt = correctVerb;

    questionElement.innerText = `What does this image represent?`;

    const options = generateOptions(correctVerb);
    optionsElement.innerHTML = options.map(option => `
        <div class="option" data-verb="${option}">${option}</div>
    `).join("");

    document.querySelectorAll(".option").forEach(option => {
        option.addEventListener("click", () => handleAnswer(option.getAttribute("data-verb"), correctVerb));
    });
}

function handleAnswer(selectedVerb, correctVerb) {
    document.querySelectorAll(".option").forEach(option => {
        option.style.pointerEvents = "none";
        const verb = option.getAttribute("data-verb");
        if (verb === correctVerb) {
            option.style.backgroundColor = "#9ACD32";
        } else if (verb === selectedVerb) {
            option.style.backgroundColor = "#FA8072";
        }
    });

    const resultMessage = document.createElement("div");

    if (selectedVerb === correctVerb) {
        resultMessage.classList.add("correct");
        score++;
    } else {
        resultMessage.classList.add("incorrect");
    }

    document.getElementById("question-section").appendChild(resultMessage);
    chosenAnswers.push({ question: correctVerb, correct: selectedVerb === correctVerb });
    currentQuestion++;
    setTimeout(() => {
        resultMessage.remove();
        displayQuestion();
    }, 800);
}

function endGame() {
    document.getElementById("question-section").classList.add("hidden");
    resultSection.classList.remove("hidden");

    resultElement.innerText = `You got ${score} out of ${totalQuestions} correct!`;

    resultElement.innerHTML += "<br>Review your answers: <ul>";
    chosenAnswers.forEach(({ question, correct }) => {
        resultElement.innerHTML += `<li>${question}: <span class="${correct ? "correct" : "incorrect"}">${correct ? "Correct" : "Incorrect"}</span></li>`;
    });
    resultElement.innerHTML += "</ul>";
}

playAgainButton.addEventListener("click", () => {
    location.reload();
});

coverImage.addEventListener("click", async () => {
    await loadVerbsFromCSV();
    if (verbs.length === 0) {
        alert("Nenhum verbo com imagem encontrado na planilha!");
        return;
    }
    const imageUrls = verbs.map(verb => `${firebaseBaseURL}${verb}.webp?alt=media`);
    preloadImages(imageUrls);
    startGame();
});
