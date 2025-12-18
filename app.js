// Load questions from genai.json
let allQuestions = [];
let examQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let timeLimit = 0;
let timeRemaining = 0;
let timerInterval = null;

// Load questions from JSON file
async function loadQuestions() {
    try {
        const response = await fetch('genai.json');
        allQuestions = await response.json();
    } catch (error) {
        console.error('Error loading questions:', error);
        alert('Failed to load questions. Please make sure genai.json is in the same directory.');
    }
}

// Initialize the app
window.onload = async function() {
    await loadQuestions();
};

// Start exam with selected number of questions and time
function startExam(numQuestions, minutes) {
    if (allQuestions.length === 0) {
        alert('Questions not loaded yet. Please try again.');
        return;
    }

    // Randomly select questions
    examQuestions = getRandomQuestions(numQuestions);

    // Scramble options for each question
    examQuestions = examQuestions.map(question => scrambleOptions(question));

    currentQuestionIndex = 0;
    userAnswers = new Array(numQuestions).fill(null);

    // Set time limit
    timeLimit = minutes * 60; // Convert to seconds
    timeRemaining = timeLimit;

    // Hide welcome page, show exam page
    document.getElementById('welcomePage').classList.add('hidden');
    document.getElementById('examPage').classList.remove('hidden');

    // Update total questions display
    document.getElementById('totalQuestions').textContent = numQuestions;

    // Start timer
    startTimer();

    // Display first question
    displayQuestion();
}

// Get random questions from the pool
function getRandomQuestions(count) {
    const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, allQuestions.length));
}

// Scramble options for a question while tracking the correct answer
function scrambleOptions(question) {
    // Create deep copy of the question
    const scrambledQuestion = { ...question };

    // Create an array of indices
    const indices = question.options.map((_, index) => index);

    // Shuffle the indices using Fisher-Yates algorithm
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Reorder options based on shuffled indices
    scrambledQuestion.options = indices.map(i => question.options[i]);

    // Update the correct answer index to match the new position
    scrambledQuestion.correctAnswer = indices.indexOf(question.correctAnswer);

    return scrambledQuestion;
}

// Start the countdown timer
function startTimer() {
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();

        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            alert('Time is up! Submitting your exam.');
            submitExam();
        }
    }, 1000);
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timeDisplay').textContent =
        `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// Display current question
function displayQuestion() {
    const question = examQuestions[currentQuestionIndex];

    // Update question number
    document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;

    // Display question text
    document.getElementById('questionText').textContent = question.question;

    // Display options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.textContent = option;

        // Check if this option was previously selected
        if (userAnswers[currentQuestionIndex] === index) {
            optionDiv.classList.add('selected');
        }

        optionDiv.onclick = () => selectOption(index);
        optionsContainer.appendChild(optionDiv);
    });

    // Update navigation buttons
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;

    if (currentQuestionIndex === examQuestions.length - 1) {
        document.getElementById('nextBtn').classList.add('hidden');
        document.getElementById('submitBtn').classList.remove('hidden');
    } else {
        document.getElementById('nextBtn').classList.remove('hidden');
        document.getElementById('submitBtn').classList.add('hidden');
    }
}

// Select an option
function selectOption(index) {
    userAnswers[currentQuestionIndex] = index;

    // Update visual selection
    const options = document.querySelectorAll('.option');
    options.forEach((option, i) => {
        if (i === index) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// Navigate to previous question
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

// Navigate to next question
function nextQuestion() {
    if (currentQuestionIndex < examQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

// Finish test early - mark unanswered questions as failed
function finishTest() {
    const unansweredCount = userAnswers.filter(answer => answer === null).length;

    if (unansweredCount > 0) {
        const confirmed = confirm(`You have ${unansweredCount} unanswered question(s). These will be marked as incorrect. Do you want to finish the test now?`);
        if (!confirmed) {
            return;
        }
    } else {
        const confirmed = confirm('Are you sure you want to finish the test?');
        if (!confirmed) {
            return;
        }
    }

    submitExam();
}

// Submit exam
function submitExam() {
    // Stop timer
    clearInterval(timerInterval);

    // Calculate score
    let correctCount = 0;
    examQuestions.forEach((question, index) => {
        if (userAnswers[index] === question.correctAnswer) {
            correctCount++;
        }
    });

    const totalQuestions = examQuestions.length;
    const percentage = (correctCount / totalQuestions) * 100;
    const passed = percentage >= 70;

    // Hide exam page, show results page
    document.getElementById('examPage').classList.add('hidden');
    document.getElementById('resultsPage').classList.remove('hidden');

    // Display score
    document.getElementById('scoreDisplay').textContent = `${percentage.toFixed(1)}%`;
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('totalCount').textContent = totalQuestions;

    const passStatusElement = document.getElementById('passStatus');
    if (passed) {
        passStatusElement.textContent = 'Congratulations! You passed!';
        passStatusElement.className = 'pass';
    } else {
        passStatusElement.textContent = 'You did not pass. Keep studying!';
        passStatusElement.className = 'fail';
    }

    // Display review
    displayReview();
}

// Display review of all questions
function displayReview() {
    const reviewContainer = document.getElementById('reviewContainer');
    reviewContainer.innerHTML = '';

    examQuestions.forEach((question, index) => {
        const reviewDiv = document.createElement('div');
        reviewDiv.className = 'review-question';

        const questionTitle = document.createElement('h3');
        const userAnswer = userAnswers[index];
        const wasAnswered = userAnswer !== null;
        const statusText = wasAnswered ? '' : ' (Not Answered - Marked as Failed)';
        questionTitle.textContent = `Question ${index + 1}: ${question.question}${statusText}`;
        if (!wasAnswered) {
            questionTitle.style.color = '#e74c3c';
        }
        reviewDiv.appendChild(questionTitle);

        // Display options with color coding
        question.options.forEach((option, optionIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'review-option';
            optionDiv.textContent = option;

            const correctAnswer = question.correctAnswer;

            if (optionIndex === correctAnswer) {
                // This is the correct answer
                optionDiv.classList.add('correct');
                optionDiv.textContent += ' ✓ (Correct Answer)';
            } else if (optionIndex === userAnswer) {
                // User selected this wrong answer
                optionDiv.classList.add('incorrect');
                optionDiv.textContent += ' ✗ (Your Answer)';
            } else if (userAnswer === null && optionIndex === 0) {
                // Mark first option as skipped for unanswered questions
                optionDiv.classList.add('neutral');
            } else {
                optionDiv.classList.add('neutral');
            }

            reviewDiv.appendChild(optionDiv);
        });

        // Display explanation
        if (question.explanation) {
            const explanationDiv = document.createElement('div');
            explanationDiv.className = 'explanation';
            explanationDiv.innerHTML = `<strong>Explanation:</strong> ${question.explanation}`;
            reviewDiv.appendChild(explanationDiv);
        }

        reviewContainer.appendChild(reviewDiv);
    });
}

// Restart exam
function restartExam() {
    // Clear timer
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // Reset variables
    examQuestions = [];
    currentQuestionIndex = 0;
    userAnswers = [];
    timeRemaining = 0;

    // Hide results page, show welcome page
    document.getElementById('resultsPage').classList.add('hidden');
    document.getElementById('welcomePage').classList.remove('hidden');
}

// Exit to home page
function exitToHome() {
    const confirmed = confirm('Are you sure you want to exit to the home page? Your progress will be lost.');

    if (confirmed) {
        // Clear timer
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        // Reset variables
        examQuestions = [];
        currentQuestionIndex = 0;
        userAnswers = [];
        timeRemaining = 0;

        // Hide all pages, show welcome page
        document.getElementById('examPage').classList.add('hidden');
        document.getElementById('resultsPage').classList.add('hidden');
        document.getElementById('welcomePage').classList.remove('hidden');
    }
}
