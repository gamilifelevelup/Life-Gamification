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

// Calculate hero type and attributes from answers
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

  return {
    heroType: heroTypes[dominantTrait] || 'Adventurer',
    dominantTrait: dominantTrait
  };
}

// Calculate base level from total attribute scores
// Formula: floor([total_scores / 50] * 25)
function calculateBaseLevel(attributes) {
  const totalScores = attributes.v + attributes.r + attributes.c + attributes.m;
  const baseLevel = Math.floor((totalScores / 50) * 25);
  return Math.max(1, baseLevel); // Minimum level is 1
}

// Calculate experience required for next level
// Formula: next_level = 1000 * Base_level^2
function calculateNextLevelExp(baseLevel) {
  return 1000 * Math.pow(baseLevel, 2);
}

// Save profile to database with calculated level and experience
async function saveProfile(name, age, sex, heroType, attributes) {
  const client = await waitForSupabase();
  if (!client) {
    console.warn('Supabase not available, profile not saved');
    return null;
  }

  // Calculate base level from total attribute scores
  const baseLevel = calculateBaseLevel(attributes);
  const nextLevelExp = calculateNextLevelExp(baseLevel);

  try {
    const { data, error } = await client
      .from('profiles')
      .insert({
        name: name,
        age: age || null,
        sex: sex || null,
        hero_type: heroType,
        level: baseLevel,
        experience: 0, // Start with 0 experience
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

// Load profile data from database
async function loadProfile(profileId) {
  const client = await waitForSupabase();
  if (!client) {
    console.warn('Supabase not available, profile not loaded');
    return null;
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error loading profile:', error);
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

// Load tasks from database, sorted by user's primary needs
async function loadTasks(primaryTrait = null) {
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
    
    let tasks = data || [];
    
    // Sort tasks based on user's primary needs (highest attribute)
    if (primaryTrait && tasks.length > 0) {
      tasks = tasks.sort((a, b) => {
        const aMatches = a.trait_focus && a.trait_focus.includes(primaryTrait) ? 1 : 0;
        const bMatches = b.trait_focus && b.trait_focus.includes(primaryTrait) ? 1 : 0;
        
        // Prioritize tasks that match the primary trait
        if (aMatches !== bMatches) {
          return bMatches - aMatches;
        }
        
        // Then sort by unlock level
        return (a.unlock_level || 1) - (b.unlock_level || 1);
      });
    }
    
    loadedTasks = tasks;
    return tasks;
  } catch (error) {
    console.error('Error loading tasks:', error);
    return [];
  }
}

// Display tasks in dashboard, sorted by user's primary needs
async function displayTasks(primaryTrait = null) {
  const taskContainer = document.querySelector('.task-dashboard');
  if (!taskContainer) return;

  const tasks = await loadTasks(primaryTrait);
  if (tasks.length === 0) {
    taskContainer.innerHTML = `
      <h3>Task Dashboard</h3>
      <p class="placeholder">No tasks available yet. Check back soon!</p>
    `;
    return;
  }

  const tasksHTML = tasks.slice(0, 8).map(task => {
    const isRecommended = primaryTrait && task.trait_focus && task.trait_focus.includes(primaryTrait);
    return `
    <div style="background: rgba(7, 15, 35, 0.72); padding: 1rem; border-radius: 12px; margin-bottom: 0.75rem; border: 1px solid ${isRecommended ? 'rgba(54, 214, 255, 0.4)' : 'rgba(118, 138, 255, 0.22)'};">
      ${isRecommended ? '<span style="font-size: 0.75rem; color: var(--accent-strong); text-transform: uppercase; letter-spacing: 0.05em;">⭐ Recommended</span>' : ''}
      <h4 style="margin: ${isRecommended ? '0.25rem' : '0'} 0 0.5rem 0; font-size: 1rem;">${task.title}</h4>
      <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem;">${task.description || ''}</p>
      <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted);">
        <span>XP: ${task.experience_reward || 10}</span>
        <span>•</span>
        <span>Unlocks at Level: ${task.unlock_level || 1}</span>
      </div>
    </div>
  `;
  }).join('');

  taskContainer.innerHTML = `
    <h3>Task Dashboard</h3>
    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Tasks sorted by your primary needs</p>
    <div style="max-height: 400px; overflow-y: auto;">
      ${tasksHTML}
      ${tasks.length > 8 ? `<p style="text-align: center; color: var(--text-muted); margin-top: 1rem;">+ ${tasks.length - 8} more tasks</p>` : ''}
    </div>
  `;
}

// Update dashboard with profile data
function updateDashboard(profile) {
  if (!profile) return null;

  // Update player name
  const nameEl = document.getElementById('player-display-name');
  if (nameEl) nameEl.textContent = profile.name;

  // Update level
  const levelEl = document.getElementById('char-level');
  if (levelEl) levelEl.textContent = profile.level || 1;

  // Calculate experience progress
  const currentLevel = profile.level || 1;
  const currentExp = profile.experience || 0;
  const nextLevelExp = calculateNextLevelExp(currentLevel);
  const expPercentage = Math.min(100, (currentExp / nextLevelExp) * 100);

  // Update experience bar
  const expProgress = document.getElementById('exp-progress');
  if (expProgress) {
    expProgress.style.width = `${expPercentage}%`;
  }

  // Update experience text
  const currentExpEl = document.getElementById('current-exp');
  const nextLevelExpEl = document.getElementById('next-level-exp');
  if (currentExpEl) currentExpEl.textContent = currentExp;
  if (nextLevelExpEl) nextLevelExpEl.textContent = nextLevelExp;

  // Update attributes
  const attrV = document.getElementById('attr-v');
  const attrR = document.getElementById('attr-r');
  const attrC = document.getElementById('attr-c');
  const attrM = document.getElementById('attr-m');
  if (attrV) attrV.textContent = profile.attribute_v || 10;
  if (attrR) attrR.textContent = profile.attribute_r || 10;
  if (attrC) attrC.textContent = profile.attribute_c || 10;
  if (attrM) attrM.textContent = profile.attribute_m || 10;

  // Determine primary trait for task sorting
  const attributes = {
    v: profile.attribute_v || 10,
    r: profile.attribute_r || 10,
    c: profile.attribute_c || 10,
    m: profile.attribute_m || 10
  };
  const maxAttr = Math.max(attributes.v, attributes.r, attributes.c, attributes.m);
  const primaryTrait = Object.keys(attributes).find(key => attributes[key] === maxAttr);

  return primaryTrait;
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

  // Calculate attributes based on answers (V/R/C/M Base P)
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

  // Calculate hero type and persona/traits from attributes
  const heroResult = calculateHeroType(answers, loadedQuestions);
  const heroType = heroResult.heroType;

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
  // Load profile data from database
  const profile = await loadProfile(currentProfileId);
  
  if (profile) {
    // Update dashboard with profile data
    const primaryTrait = updateDashboard(profile);
    
    // Load and display tasks sorted by primary needs
    await displayTasks(primaryTrait);
  } else {
    // Fallback if profile can't be loaded
    const name = document.getElementById('player-name').value.trim();
    document.getElementById('player-display-name').textContent = name;
    await displayTasks();
  }
  
  showScreen('dashboard-screen');
});

// Initialize: Pre-load questions when page loads
window.addEventListener('DOMContentLoaded', async () => {
  console.log('App initialized');
  // Pre-load questions for faster display
  await loadQuestions();
});
