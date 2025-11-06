// Basic screen management
const screens = document.querySelectorAll('.screen');
function showScreen(id) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// Welcome -> Skip
document.getElementById('skip-btn').addEventListener('click', () => {
  showScreen('start-screen');
});

// Start -> Info
document.getElementById('start-btn').addEventListener('click', () => {
  showScreen('info-screen');
});

// Info -> Questions
document.getElementById('to-questions-btn').addEventListener('click', () => {
  const name = document.getElementById('player-name').value.trim();
  if (!name) {
    alert("Please enter your name.");
    return;
  }
  generateQuestions();
  showScreen('question-screen');
});

// Generate 10 sliders
function generateQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>Question ${i}: <input type="range" min="1" max="5" value="3" id="q${i}"></label>
    `;
    container.appendChild(div);
  }
}

// Questions -> Result
document.getElementById('submit-answers-btn').addEventListener('click', () => {
  const scores = [];
  for (let i = 1; i <= 10; i++) {
    scores.push(Number(document.getElementById(`q${i}`).value));
  }
  const avg = scores.reduce((a,b) => a+b) / scores.length;
  let heroType = "Adventurer";
  if (avg >= 4) heroType = "Mage";
  else if (avg >= 3) heroType = "Warrior";
  else heroType = "Archer";

  document.getElementById('hero-type').textContent = `You are a ${heroType}!`;
  document.getElementById('result-message').textContent = "Are you satisfied with your destiny?";
  showScreen('result-screen');
});

// Accept Hero -> Dashboard
document.getElementById('accept-hero-btn').addEventListener('click', () => {
  const name = document.getElementById('player-name').value.trim();
  document.getElementById('player-display-name').textContent = name;
  showScreen('dashboard-screen');
});
