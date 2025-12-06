const choices = ['stone', 'paper', 'scissors'];
const choiceEmojis = {
    stone: '🪨',
    paper: '📄',
    scissors: '✂️'
};

let playerScore = 0;
let computerScore = 0;
let totalRounds = 0;

// Initialize game data from localStorage
function initializeGame() {
    const savedData = localStorage.getItem('stonepaperscissors');
    if (savedData) {
        const data = JSON.parse(savedData);
        playerScore = data.playerScore || 0;
        computerScore = data.computerScore || 0;
        totalRounds = data.totalRounds || 0;
        
        document.getElementById('playerScore').textContent = playerScore;
        document.getElementById('computerScore').textContent = computerScore;
        updateStats();
    }
}

// Save game data to localStorage
function saveGameData() {
    const data = {
        playerScore,
        computerScore,
        totalRounds
    };
    localStorage.setItem('stonepaperscissors', JSON.stringify(data));
}

// Get all choice buttons
const choiceButtons = document.querySelectorAll('.choice-btn');

// Add event listeners to buttons
choiceButtons.forEach(button => {
    button.addEventListener('click', () => {
        const playerChoice = button.getAttribute('data-choice');
        playGame(playerChoice);
    });
});

function playGame(playerChoice) {
    // Get computer choice
    const computerChoice = choices[Math.floor(Math.random() * choices.length)];
    
    // Update displays
    updateChoiceDisplays(playerChoice, computerChoice);
    
    // Determine winner
    const result = determineWinner(playerChoice, computerChoice);
    
    // Update scores
    updateScores(result);
    
    // Update round and stats
    totalRounds++;
    updateStats();
}

function updateChoiceDisplays(playerChoice, computerChoice) {
    document.getElementById('playerChoice').textContent = choiceEmojis[playerChoice];
    document.getElementById('computerChoice').textContent = choiceEmojis[computerChoice];
    
    // Add animation
    document.getElementById('playerChoice').style.animation = 'none';
    document.getElementById('computerChoice').style.animation = 'none';
    
    setTimeout(() => {
        document.getElementById('playerChoice').style.animation = 'choiceAnimation 0.3s ease-out';
        document.getElementById('computerChoice').style.animation = 'choiceAnimation 0.3s ease-out';
    }, 10);
}

function determineWinner(playerChoice, computerChoice) {
    if (playerChoice === computerChoice) {
        return 'draw';
    }
    
    if (
        (playerChoice === 'stone' && computerChoice === 'scissors') ||
        (playerChoice === 'paper' && computerChoice === 'stone') ||
        (playerChoice === 'scissors' && computerChoice === 'paper')
    ) {
        return 'win';
    }
    
    return 'lose';
}

function updateScores(result) {
    const resultMessage = document.getElementById('resultMessage');
    
    if (result === 'win') {
        playerScore++;
        resultMessage.textContent = '🎉 You Won!';
        resultMessage.className = 'result-message win';
    } else if (result === 'lose') {
        computerScore++;
        resultMessage.textContent = '😢 You Lost!';
        resultMessage.className = 'result-message lose';
    } else {
        resultMessage.textContent = '🤝 It\'s a Draw!';
        resultMessage.className = 'result-message draw';
    }
    
    document.getElementById('playerScore').textContent = playerScore;
    document.getElementById('computerScore').textContent = computerScore;
    
    // Save data after updating scores
    saveGameData();
}

function updateStats() {
    document.getElementById('roundInfo').textContent = `Round: ${totalRounds}`;
    
    if (totalRounds > 0) {
        const winRate = Math.round((playerScore / totalRounds) * 100);
        document.getElementById('winRate').textContent = `Win Rate: ${winRate}%`;
    }
}

function resetGame() {
    playerScore = 0;
    computerScore = 0;
    totalRounds = 0;
    
    document.getElementById('playerScore').textContent = '0';
    document.getElementById('computerScore').textContent = '0';
    document.getElementById('playerChoice').textContent = '❓';
    document.getElementById('computerChoice').textContent = '❓';
    document.getElementById('resultMessage').textContent = 'Make your move!';
    document.getElementById('resultMessage').className = 'result-message';
    document.getElementById('roundInfo').textContent = 'Round: 0';
    document.getElementById('winRate').textContent = 'Win Rate: 0%';
    
    // Save reset data to localStorage
    saveGameData();
}

// Add animation styles dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes choiceAnimation {
        0% {
            transform: scale(0.5);
            opacity: 0;
        }
        50% {
            transform: scale(1.1);
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Initialize game on page load
window.addEventListener('DOMContentLoaded', initializeGame);
