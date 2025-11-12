// Database and Screen Management
let currentProfileId = null;
let loadedQuestions = [];
let loadedTasks = [];

// Basic screen management
const screens = document.querySelectorAll('.screen');
function showScreen(id) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// Wait for Supabase to be ready
function waitForSupabase() {
  return new Promise((resolve) => {
    if (supabaseClient) {
      resolve(supabaseClient);
      return;
    }
    const checkInterval = setInterval(() => {
      if (supabaseClient) {
        clearInterval(checkInterval);
        resolve(supabaseClient);
      }
    }, 100);
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(null);
    }, 5000);
  });
}

// Load questions from database
async function loadQuestions() {
  const client = await waitForSupabase();
  if (!client) {
    console.warn('Supabase not available, using fallback questions');
    return generateFallbackQuestions();
  }

  try {
    const { data, error } = await client
      .from('questions')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    if (data && data.length > 0) {
      loadedQuestions = data;
      return data;
    } else {
      console.warn('No questions found in database, using fallback');
      return generateFallbackQuestions();
    }
  } catch (error) {
    console.error('Error loading questions:', error);
    return generateFallbackQuestions();
  }
}

// Fallback questions if database is not available
function generateFallbackQuestions() {
  return [
    { id: 'fallback-1', title: 'Physical Activity', prompt: 'I enjoy engaging in physical activities', trait_weights: { v: 0.4, r: 0.1, c: 0.2, m: 0.3 } },
    { id: 'fallback-2', title: 'Social Interaction', prompt: 'I feel energized when spending time with others', trait_weights: { v: 0.2, r: 0.4, c: 0.2, m: 0.2 } },
    { id: 'fallback-3', title: 'Problem Solving', prompt: 'I enjoy tackling complex problems', trait_weights: { v: 0.1, r: 0.2, c: 0.5, m: 0.2 } },
    { id: 'fallback-4', title: 'Meditation', prompt: 'I practice meditation regularly', trait_weights: { v: 0.1, r: 0.3, c: 0.1, m: 0.5 } },
    { id: 'fallback-5', title: 'Learning', prompt: 'I actively seek to learn new skills', trait_weights: { v: 0.2, r: 0.2, c: 0.4, m: 0.2 } },
    { id: 'fallback-6', title: 'Outdoor Adventures', prompt: 'I love spending time outdoors', trait_weights: { v: 0.5, r: 0.2, c: 0.1, m: 0.2 } },
    { id: 'fallback-7', title: 'Team Collaboration', prompt: 'I work best in team environments', trait_weights: { v: 0.1, r: 0.5, c: 0.2, m: 0.2 } },
    { id: 'fallback-8', title: 'Strategic Planning', prompt: 'I prefer to plan in detail', trait_weights: { v: 0.1, r: 0.1, c: 0.6, m: 0.2 } },
    { id: 'fallback-9', title: 'Spiritual Practice', prompt: 'I engage in spiritual practices', trait_weights: { v: 0.1, r: 0.2, c: 0.1, m: 0.6 } },
    { id: 'fallback-10', title: 'Competition', prompt: 'I enjoy competitive activities', trait_weights: { v: 0.4, r: 0.3, c: 0.2, m: 0.1 } }
  ];
}

// Generate questions UI from database
async function generateQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '<p>Loading questions...</p>';

  const questions = await loadQuestions();
  loadedQuestions = questions;

  container.innerHTML = '';
  questions.forEach((question, index) => {
    const div = document.createElement('div');
    div.innerHTML = `
      <label>
        <span>${question.title || `Question ${index + 1}`}</span>
        <p style="margin: 0.5rem 0; color: var(--text-muted); font-size: 0.9rem;">${question.prompt}</p>
        <input type="range" min="1" max="5" value="3" id="q${index}" data-question-id="${question.id}">
        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">
          <span>1 - Not at all</span>
          <span>5 - Very much</span>
        </div>
      </label>
    `;
    container.appendChild(div);
  });
}

// Calculate hero type from answers
function calculateHeroType(answers, questions) {
  const traits = { v: 0, r: 0, c: 0, m: 0 };

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (question && question.trait_weights) {
      const weights = question.trait_weights;
      traits.v += (answer * (weights.v || 0));
      traits.r += (answer * (weights.r || 0));
      traits.c += (answer * (weights.c || 0));
      traits.m += (answer * (weights.m || 0));
    }
  });

  // Normalize traits
  const maxTrait = Math.max(traits.v, traits.r, traits.c, traits.m);
  const dominantTrait = Object.keys(traits).find(key => traits[key] === maxTrait);

  // Determine hero type based on dominant trait
  const heroTypes = {
    v: 'Warrior',
    r: 'Bard',
    c: 'Mage',
    m: 'Monk'
  };

  return heroTypes[dominantTrait] || 'Adventurer';
}

// Save profile to database
async function saveProfile(name, age, sex, heroType, attributes) {
  const client = await waitForSupabase();
  if (!client) {
    console.warn('Supabase not available, profile not saved');
    return null;
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .insert({
        name: name,
        age: age || null,
        sex: sex || null,
        hero_type: heroType,
        attribute_v: attributes.v,
        attribute_r: attributes.r,
        attribute_c: attributes.c,
        attribute_m: attributes.m
      })
      .select()
      .single();

    if (error) throw error;
    currentProfileId = data.id;
    return data.id;
  } catch (error) {
    console.error('Error saving profile:', error);
    return null;
  }
}

// Save question answers to database
async function saveQuestionAnswers(answers) {
  if (!currentProfileId) return;

  const client = await waitForSupabase();
  if (!client) return;

  try {
    const answerRecords = answers.map((answer, index) => ({
      profile_id: currentProfileId,
      question_id: loadedQuestions[index].id,
      score: answer
    }));

    const { error } = await client
      .from('question_answers')
      .upsert(answerRecords, { onConflict: 'profile_id,question_id' });

    if (error) throw error;
    console.log('Question answers saved');
  } catch (error) {
    console.error('Error saving question answers:', error);
  }
}

// Load tasks from database
async function loadTasks() {
  const client = await waitForSupabase();
  if (!client) {
    console.warn('Supabase not available, tasks not loaded');
    return [];
  }

  try {
    const { data, error } = await client
      .from('tasks')
      .select('*')
      .eq('is_active', true)
      .order('unlock_level', { ascending: true });

    if (error) throw error;
    loadedTasks = data || [];
    return loadedTasks;
  } catch (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
}

// Display tasks in dashboard
async function displayTasks() {
  const taskContainer = document.querySelector('.task-dashboard');
  if (!taskContainer) return;

  const tasks = await loadTasks();
  if (tasks.length === 0) {
    taskContainer.innerHTML = `
      <h3>Task Dashboard</h3>
      <p class="placeholder">No tasks available yet. Check back soon!</p>
    `;
    return;
  }

  const tasksHTML = tasks.slice(0, 5).map(task => `
    <div style="background: rgba(7, 15, 35, 0.72); padding: 1rem; border-radius: 12px; margin-bottom: 0.75rem; border: 1px solid rgba(118, 138, 255, 0.22);">
      <h4 style="margin: 0 0 0.5rem 0; font-size: 1rem;">${task.title}</h4>
      <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem;">${task.description || ''}</p>
      <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
        <span>XP: ${task.experience_reward}</span>
        <span>•</span>
        <span>Level: ${task.unlock_level}</span>
      </div>
    </div>
  `).join('');

  taskContainer.innerHTML = `
    <h3>Task Dashboard</h3>
    <div style="max-height: 400px; overflow-y: auto;">
      ${tasksHTML}
      ${tasks.length > 5 ? `<p style="text-align: center; color: var(--text-muted); margin-top: 1rem;">+ ${tasks.length - 5} more tasks</p>` : ''}
    </div>
  `;
}

// Event Listeners

// Welcome -> Skip
document.getElementById('skip-btn').addEventListener('click', () => {
  showScreen('start-screen');
});

// Start -> Info
document.getElementById('start-btn').addEventListener('click', () => {
  showScreen('info-screen');
});

// Info -> Questions
document.getElementById('to-questions-btn').addEventListener('click', async () => {
  const name = document.getElementById('player-name').value.trim();
  if (!name) {
    alert("Please enter your name.");
    return;
  }
  await generateQuestions();
  showScreen('question-screen');
});

// Questions -> Result
document.getElementById('submit-answers-btn').addEventListener('click', async () => {
  const answers = [];
  const questionElements = document.querySelectorAll('[data-question-id]');
  
  questionElements.forEach((el, index) => {
    answers.push(Number(el.value));
  });

  if (answers.length === 0) {
    alert("Please answer all questions.");
    return;
  }

  // Calculate hero type
  const heroType = calculateHeroType(answers, loadedQuestions);
  
  // Calculate attributes based on answers
  const attributes = { v: 10, r: 10, c: 10, m: 10 };
  answers.forEach((answer, index) => {
    const question = loadedQuestions[index];
    if (question && question.trait_weights) {
      const weights = question.trait_weights;
      attributes.v += Math.round((answer - 3) * (weights.v || 0) * 2);
      attributes.r += Math.round((answer - 3) * (weights.r || 0) * 2);
      attributes.c += Math.round((answer - 3) * (weights.c || 0) * 2);
      attributes.m += Math.round((answer - 3) * (weights.m || 0) * 2);
    }
  });

  // Save to database
  const name = document.getElementById('player-name').value.trim();
  const age = parseInt(document.getElementById('player-age').value) || null;
  const sex = document.getElementById('player-sex').value;

  await saveProfile(name, age, sex, heroType, attributes);
  await saveQuestionAnswers(answers);

  // Display result
  document.getElementById('hero-type').textContent = `You are a ${heroType}!`;
  document.getElementById('result-message').textContent = "Are you satisfied with your destiny?";
  showScreen('result-screen');
});

// Accept Hero -> Dashboard
document.getElementById('accept-hero-btn').addEventListener('click', async () => {
  const name = document.getElementById('player-name').value.trim();
  document.getElementById('player-display-name').textContent = name;
  
  // Load and display tasks
  await displayTasks();
  
  showScreen('dashboard-screen');
});

// Initialize: Pre-load questions when page loads
window.addEventListener('DOMContentLoaded', async () => {
  console.log('App initialized');
  // Pre-load questions for faster display
  await loadQuestions();
});
