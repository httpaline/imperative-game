const verbs = [//trocar pelo bd 
    "eat", "drink", "sleep", "buy", "pay", 
    "comment", "walk", "dance", "drive", 
    "listen", "love", "like"
];

const firebaseBaseURL = "https://firebasestorage.googleapis.com/v0/b/irregularverbslingualize.appspot.com/o/images%2F";

function preloadImages(urls) {
    urls.forEach(url => {
        const img = new Image();
        img.src = url;
    });
}

let currentQuestion = 0;
let score = 0;
let chosenAnswers = [];
const totalQuestions = verbs.length;

const coverImage = document.getElementById('cover-image');
const questionImage = document.getElementById('question-image');
const questionElement = document.getElementById('question');
const optionsElement = document.getElementById('options');
const resultSection = document.getElementById('result-section');
const resultElement = document.getElementById('result');
const playAgainButton = document.getElementById('play-again');

coverImage.addEventListener('click', () => {
    const imageUrls = verbs.map(verb => `${firebaseBaseURL}${verb}.webp?alt=media`);
    preloadImages(imageUrls); 
    startGame(); 
});

function startGame() {
    document.getElementById('cover-container').classList.add('hidden');
    document.getElementById('question-section').classList.remove('hidden');
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
    `).join('');

    document.querySelectorAll('.option').forEach(option => {
        option.addEventListener('click', () => handleAnswer(option.getAttribute('data-verb'), correctVerb));
    });
}


function handleAnswer(selectedVerb, correctVerb) {

    document.querySelectorAll('.option').forEach(option => {
        option.style.pointerEvents='none'; //botão para apos a ação
        const verb=option.getAttribute('data-verb');
        if(verb === correctVerb){
            option.style.backgroundColor= '#9ACD32';
        }else if(verb === selectedVerb){
            option.style.backgroundColor= '#FA8072';
        }
    });

    const resultMessage = document.createElement('div');
    
    if (selectedVerb === correctVerb) {
        resultMessage.classList.add('correct'); 
        score++;
    } else {
        resultMessage.classList.add('incorrect');
    }

    document.getElementById('question-section').appendChild(resultMessage);
    chosenAnswers.push({ question: correctVerb, correct: selectedVerb === correctVerb });
    currentQuestion++;
    setTimeout(() => {
        resultMessage.remove();
        displayQuestion();
    }, 800); //timing
}

function endGame() {
    document.getElementById('question-section').classList.add('hidden');
    resultSection.classList.remove('hidden');

    resultElement.innerText = `You got ${score} out of ${totalQuestions} correct!`;

    resultElement.innerHTML += '<br>Review your answers: <ul>';
    chosenAnswers.forEach(({ question, correct }) => {
        resultElement.innerHTML += `<li>${question}: <span class="${correct ? 'correct' : 'incorrect'}">${correct ? 'Correct' : 'Incorrect'}</span></li>`;
    });
    resultElement.innerHTML += '</ul>';
}

playAgainButton.addEventListener('click', () => {
    location.reload();
});