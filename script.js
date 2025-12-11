/**
 * Global state variables
 */
let currentProfileId = null;
let currentUserId = null;
let loadedQuestions = [];
let loadedTasks = [];

const screens = document.querySelectorAll('.screen');

/**
 * Shows a specific screen by ID and hides all others
 * @param {string} id - The ID of the screen element to show
 */
function showScreen(id) {
  screens.forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/**
 * Waits for Supabase client to be initialized
 * @returns {Promise<Object|null>} Supabase client instance or null if timeout
 */
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
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(null);
    }, 5000);
  });
}

/**
 * Validates email format using regex
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Signs up a new user with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<Object>} Result object with success status and user data or error message
 */
async function signUp(email, password) {
  const client = await waitForSupabase();
  if (!client) {
    return { success: false, error: 'Supabase not available' };
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!isValidEmail(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  try {
    const redirectTo = `${window.location.origin}/confirm.html`;
    
    const { data, error } = await client.auth.signUp({
      email: trimmedEmail,
      password: password,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return { success: false, error: 'This email is already registered. Please log in instead.' };
      }
      if (error.message.includes('disabled')) {
        return { success: false, error: 'Email signups are disabled. Please contact support or check Supabase settings.' };
      }
      if (error.message.includes('invalid')) {
        return { success: false, error: 'Please enter a valid email address' };
      }
      throw error;
    }

    if (data.user) {
      currentUserId = data.user.id;
      if (data.session === null) {
        return { 
          success: true, 
          user: data.user, 
          needsConfirmation: true,
          message: 'Please check your email to confirm your account before continuing.'
        };
      }
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Sign up failed. Please try again.' };
  } catch (error) {
    console.error('Sign up error:', error);
    let errorMessage = 'Sign up failed. Please try again.';
    if (error.message) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please log in instead.';
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Please enter a valid email address.';
      } else {
        errorMessage = error.message;
      }
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Signs in an existing user with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<Object>} Result object with success status and user data or error message
 */
async function signIn(email, password) {
  const client = await waitForSupabase();
  if (!client) {
    return { success: false, error: 'Supabase not available' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    if (data.user) {
      currentUserId = data.user.id;
      await loadUserProfile(data.user.id);
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Login failed' };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Signs out the current user
 * @returns {Promise<Object>} Result object with success status
 */
async function signOut() {
  const client = await waitForSupabase();
  if (!client) return;

  try {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    
    currentUserId = null;
    currentProfileId = null;
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Checks for an existing user session
 * @returns {Promise<Object|null>} Session object if user is logged in, null otherwise
 */
async function checkSession() {
  const client = await waitForSupabase();
  if (!client) return null;

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;

    if (session && session.user) {
      currentUserId = session.user.id;
      await loadUserProfile(session.user.id);
      return session;
    }

    return null;
  } catch (error) {
    console.error('Session check error:', error);
    return null;
  }
}

/**
 * Loads user profile from database by user ID
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<Object|null>} Profile data or null if not found
 */
async function loadUserProfile(userId) {
  const client = await waitForSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      currentProfileId = data.id;
      return data;
    }

    return null;
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

/**
 * Loads active questions from database
 * @returns {Promise<Array>} Array of question objects
 */
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

/**
 * Generates fallback questions when database is unavailable
 * @returns {Array} Array of fallback question objects
 */
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

/**
 * Generates question UI elements from loaded questions
 * @returns {Promise<void>}
 */
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

/**
 * Calculates hero type and dominant trait from user answers
 * @param {Array<number>} answers - Array of answer scores (1-5)
 * @param {Array<Object>} questions - Array of question objects with trait weights
 * @returns {Object} Object containing heroType and dominantTrait
 */
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

  const maxTrait = Math.max(traits.v, traits.r, traits.c, traits.m);
  const dominantTrait = Object.keys(traits).find(key => traits[key] === maxTrait);

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

/**
 * Calculates base level from total attribute scores
 * Formula: floor([total_scores / 50] * 25)
 * @param {Object} attributes - Object with v, r, c, m attribute values
 * @returns {number} Base level (minimum 1)
 */
function calculateBaseLevel(attributes) {
  const totalScores = attributes.v + attributes.r + attributes.c + attributes.m;
  const baseLevel = Math.floor((totalScores / 50) * 25);
  return Math.max(1, baseLevel);
}

/**
 * Calculates experience required for next level
 * Formula: next_level = 1000 * Base_level^2
 * @param {number} baseLevel - Current base level
 * @returns {number} Experience points required for next level
 */
function calculateNextLevelExp(baseLevel) {
  return 1000 * Math.pow(baseLevel, 2);
}

/**
 * Maps pronoun values to valid database sex field values
 * @param {string} pronouns - Pronoun string (e.g., 'he/him', 'she/her', 'they/them', or custom)
 * @returns {string|null} Mapped value ('male', 'female', 'other') or null
 */
function mapPronounsToSex(pronouns) {
  if (!pronouns) return null;
  
  const validValues = ['male', 'female', 'other'];
  
  if (validValues.includes(pronouns.toLowerCase())) {
    return pronouns.toLowerCase();
  }
  
  const pronounMap = {
    'he/him': 'male',
    'she/her': 'female',
    'they/them': 'other',
    'he': 'male',
    'she': 'female',
    'they': 'other'
  };
  
  const lowerPronouns = pronouns.toLowerCase();
  if (pronounMap[lowerPronouns]) {
    return pronounMap[lowerPronouns];
  }
  
  return 'other';
}

/**
 * Saves or updates user profile in database
 * @param {string} name - User's name
 * @param {number|null} age - User's age
 * @param {string} pronouns - User's pronouns
 * @param {string} heroType - Calculated hero type
 * @param {Object} attributes - Object with v, r, c, m attribute values
 * @returns {Promise<string|null>} Profile ID if successful, null otherwise
 */
async function saveProfile(name, age, pronouns, heroType, attributes) {
  const client = await waitForSupabase();
  if (!client) {
    console.warn('Supabase not available, profile not saved');
    return null;
  }

  const baseLevel = calculateBaseLevel(attributes);
  const sexValue = mapPronounsToSex(pronouns);

  if (!currentUserId) {
    console.error('User must be authenticated to save profile');
    return null;
  }

  try {
    const existingProfile = await loadUserProfile(currentUserId);
    
    if (existingProfile) {
      const { data, error } = await client
        .from('profiles')
        .update({
          name: name,
          age: age || null,
          sex: sexValue,
          hero_type: heroType,
          level: baseLevel,
          attribute_v: attributes.v,
          attribute_r: attributes.r,
          attribute_c: attributes.c,
          attribute_m: attributes.m
        })
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;
      currentProfileId = data.id;
      return data.id;
    } else {
      const { data, error } = await client
        .from('profiles')
        .insert({
          user_id: currentUserId,
          name: name,
          age: age || null,
          sex: sexValue,
          hero_type: heroType,
          level: baseLevel,
          experience: 0,
          attribute_v: attributes.v,
          attribute_r: attributes.r,
          attribute_c: attributes.c,
          attribute_m: attributes.m
        })
        .select()
        .single();

      if (error) {
        console.error('Database error details:', error);
        throw error;
      }
      currentProfileId = data.id;
      return data.id;
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    if (error.message) {
      console.error('Error message:', error.message);
    }
    if (error.details) {
      console.error('Error details:', error.details);
    }
    if (error.hint) {
      console.error('Error hint:', error.hint);
    }
    return null;
  }
}

/**
 * Loads profile data from database by profile ID
 * @param {string} profileId - Profile ID to load
 * @returns {Promise<Object|null>} Profile data or null if not found
 */
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

/**
 * Saves question answers to database
 * @param {Array<number>} answers - Array of answer scores
 * @returns {Promise<void>}
 */
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

/**
 * Loads tasks from database, optionally sorted by primary trait
 * @param {string|null} primaryTrait - Primary trait to prioritize (v, r, c, or m)
 * @returns {Promise<Array>} Array of task objects
 */
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
    
    if (primaryTrait && tasks.length > 0) {
      tasks = tasks.sort((a, b) => {
        const aMatches = a.trait_focus && a.trait_focus.includes(primaryTrait) ? 1 : 0;
        const bMatches = b.trait_focus && b.trait_focus.includes(primaryTrait) ? 1 : 0;
        
        if (aMatches !== bMatches) {
          return bMatches - aMatches;
        }
        
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

/**
 * Completes a task and adds experience points, handling level ups
 * @param {string} taskId - Task ID to complete
 * @param {number} xpReward - Experience points to award
 * @returns {Promise<Object>} Result object with success status, level up info, and XP gained
 */
async function completeTask(taskId, xpReward) {
  if (!currentProfileId) {
    console.warn('No profile ID available');
    return { success: false };
  }

  const client = await waitForSupabase();
  if (!client) {
    console.warn('Supabase not available');
    return { success: false };
  }

  try {
    const profile = await loadProfile(currentProfileId);
    if (!profile) {
      console.error('Could not load profile');
      return { success: false };
    }

    const currentExp = profile.experience || 0;
    const newExp = currentExp + (xpReward || 10);
    const currentLevel = profile.level || 1;
    const nextLevelExp = calculateNextLevelExp(currentLevel);

    let newLevel = currentLevel;
    let finalExp = newExp;
    let leveledUp = false;
    
    if (newExp >= nextLevelExp) {
      leveledUp = true;
      newLevel = currentLevel + 1;
      finalExp = newExp - nextLevelExp;
      
      const newNextLevelExp = calculateNextLevelExp(newLevel);
      while (finalExp >= newNextLevelExp) {
        newLevel += 1;
        finalExp -= calculateNextLevelExp(newLevel - 1);
      }
    }

    const { error: logError } = await client
      .from('task_logs')
      .insert({
        profile_id: currentProfileId,
        task_id: taskId,
        status: 'completed',
        completed_at: new Date().toISOString()
      });

    if (logError) throw logError;

    const { error: updateError } = await client
      .from('profiles')
      .update({
        experience: finalExp,
        level: newLevel
      })
      .eq('id', currentProfileId);

    if (updateError) throw updateError;

    if (leveledUp) {
      window.lastLevelUp = { from: currentLevel, to: newLevel };
    }
    
    console.log(`Task completed! Gained ${xpReward} XP. ${leveledUp ? `Level up to ${newLevel}!` : ''}`);
    return { success: true, leveledUp, newLevel, xpGained: xpReward };
  } catch (error) {
    console.error('Error completing task:', error);
    return { success: false };
  }
}

/**
 * Displays tasks in the dashboard, filtered by completion status
 * @param {string|null} primaryTrait - Primary trait for task sorting
 * @returns {Promise<void>}
 */
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

  const client = await waitForSupabase();
  let completedTaskIds = [];
  if (client && currentProfileId) {
    try {
      const { data } = await client
        .from('task_logs')
        .select('task_id')
        .eq('profile_id', currentProfileId)
        .eq('status', 'completed');
      
      if (data) {
        completedTaskIds = data.map(log => log.task_id);
      }
    } catch (error) {
      console.error('Error loading completed tasks:', error);
    }
  }

  const availableTasks = tasks.filter(task => !completedTaskIds.includes(task.id));

  if (availableTasks.length === 0) {
    taskContainer.innerHTML = `
      <h3>Task Dashboard</h3>
      <p class="placeholder">All tasks completed! Great job! 🎉</p>
    `;
    return;
  }

  const tasksHTML = availableTasks.slice(0, 8).map((task, index) => {
    const isRecommended = primaryTrait && task.trait_focus && task.trait_focus.includes(primaryTrait);
    const taskId = task.id;
    const xpReward = task.experience_reward || 10;
    
    return `
    <div class="task-item" data-task-id="${taskId}" style="background: rgba(7, 15, 35, 0.72); padding: 1rem; border-radius: 12px; margin-bottom: 0.75rem; border: 1px solid ${isRecommended ? 'rgba(54, 214, 255, 0.4)' : 'rgba(118, 138, 255, 0.22)'};">
      ${isRecommended ? '<span style="font-size: 0.75rem; color: var(--accent-strong); text-transform: uppercase; letter-spacing: 0.05em;">⭐ Recommended</span>' : ''}
      <h4 style="margin: ${isRecommended ? '0.25rem' : '0'} 0 0.5rem 0; font-size: 1rem;">${task.title}</h4>
      <p style="margin: 0; color: var(--text-muted); font-size: 0.85rem;">${task.description || ''}</p>
      <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
        <span>XP: ${xpReward}</span>
        <span>•</span>
        <span>Unlocks at Level: ${task.unlock_level || 1}</span>
      </div>
      <button class="complete-task-btn" data-task-id="${taskId}" data-xp="${xpReward}" style="width: 100%; padding: 0.6rem; background: linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 100%); border: none; border-radius: 8px; color: var(--text); font-weight: 600; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(70, 108, 255, 0.3)'; this.style.filter='brightness(1.05)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'; this.style.filter='brightness(1)'">Complete Task</button>
    </div>
  `;
  }).join('');

  taskContainer.innerHTML = `
    <h3>Task Dashboard</h3>
    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">Tasks sorted by your primary needs</p>
    <div id="tasks-list" style="max-height: 400px; overflow-y: auto;">
      ${tasksHTML}
      ${availableTasks.length > 8 ? `<p style="text-align: center; color: var(--text-muted); margin-top: 1rem;">+ ${availableTasks.length - 8} more tasks</p>` : ''}
    </div>
  `;

  const completeButtons = taskContainer.querySelectorAll('.complete-task-btn');
  completeButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const taskId = button.getAttribute('data-task-id');
      const xpReward = parseInt(button.getAttribute('data-xp')) || 10;
      
      button.disabled = true;
      button.textContent = 'Completing...';
      button.style.opacity = '0.6';
      
      const result = await completeTask(taskId, xpReward);
      
      if (result && result.success) {
        if (result.leveledUp) {
          alert(`🎉 Level Up! You reached level ${result.newLevel}! 🎉`);
        }
        const taskItem = button.closest('.task-item');
        if (taskItem) {
          taskItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          taskItem.style.opacity = '0';
          taskItem.style.transform = 'translateX(-20px)';
          
          setTimeout(async () => {
            const profile = await loadProfile(currentProfileId);
            if (profile) {
              const primaryTrait = updateDashboard(profile);
              await displayTasks(primaryTrait);
            } else {
              await displayTasks(null);
            }
          }, 300);
        }
      } else {
        button.disabled = false;
        button.textContent = 'Complete Task';
        button.style.opacity = '1';
        alert('Failed to complete task. Please try again.');
      }
    });
  });
}

/**
 * Updates dashboard UI with profile data
 * @param {Object} profile - Profile data object
 * @returns {string|null} Primary trait identifier (v, r, c, or m)
 */
function updateDashboard(profile) {
  if (!profile) return null;

  const nameEl = document.getElementById('player-display-name');
  if (nameEl) nameEl.textContent = profile.name;

  const levelEl = document.getElementById('char-level');
  if (levelEl) levelEl.textContent = profile.level || 1;

  const currentLevel = profile.level || 1;
  const currentExp = profile.experience || 0;
  const nextLevelExp = calculateNextLevelExp(currentLevel);
  const expPercentage = Math.min(100, (currentExp / nextLevelExp) * 100);

  const expProgress = document.getElementById('exp-progress');
  if (expProgress) {
    expProgress.style.width = `${expPercentage}%`;
  }

  const currentExpEl = document.getElementById('current-exp');
  const nextLevelExpEl = document.getElementById('next-level-exp');
  if (currentExpEl) currentExpEl.textContent = currentExp;
  if (nextLevelExpEl) nextLevelExpEl.textContent = nextLevelExp;

  const attrV = document.getElementById('attr-v');
  const attrR = document.getElementById('attr-r');
  const attrC = document.getElementById('attr-c');
  const attrM = document.getElementById('attr-m');
  if (attrV) attrV.textContent = profile.attribute_v || 10;
  if (attrR) attrR.textContent = profile.attribute_r || 10;
  if (attrC) attrC.textContent = profile.attribute_c || 10;
  if (attrM) attrM.textContent = profile.attribute_m || 10;

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

const dialogueResponses = {
  scene1: {
    who: "I am a guide, a keeper of the old ways. I have watched over this realm for many cycles, waiting for one such as you to rise again.",
    where: "You are in the realm of your inner kingdom—a place that reflects your very essence. The Shadow Blight has left its mark here, but hope remains.",
    help: "I will guide you to the four Great Island, where you must restore the four relics: Vitality, Resilience, Connection, and Mastery. Together, we will reclaim what was lost."
  },
  scene2: {
    islands: "The four Great Island are sacred places, each representing one of the pillars of your reign. To restore your throne, you must journey to each and prove yourself worthy.",
    throne: "Your throne awaits, but first you must restore the four relics. Each island will test you, and through these trials, you will regain the power you once held.",
    blight: "The Shadow Blight is a corruption that feeds on neglect and weakness. It tarnished your four great pillars, but they can be cleansed through dedication and growth."
  },
  scene3: {
    trial: "The Scribe's Trial is a test of your true nature. Through questions, we will determine your Ascension Class—the path that best suits your spirit.",
    relics: "The four relics are Vitality—your physical strength, Resilience—your mental fortitude, Connection—your bonds with others, and Mastery—your pursuit of excellence.",
    ready: "You are ready, fallen one. The journey ahead will be challenging, but I see the spark of greatness within you. Trust in yourself, and we will succeed together."
  }
};

/**
 * Sets up dialogue interaction system for story scenes
 * @param {number} sceneNum - Scene number (1, 2, or 3)
 */
function setupDialogueSystem(sceneNum) {
  const dialogueOptionsContainer = document.getElementById(`scene${sceneNum}-dialogue-options`);
  const npcResponse = document.getElementById(`scene${sceneNum}-npc-response`);
  const mainQuestion = document.getElementById(`scene${sceneNum}-main-question`);
  const inputContainer = document.getElementById(`scene${sceneNum}-input-container`);
  const continueBtn = document.getElementById(`story-scene-${sceneNum}-btn`);
  
  dialogueOptionsContainer.style.display = 'flex';
  npcResponse.style.display = 'none';
  mainQuestion.style.display = 'none';
  inputContainer.style.display = 'none';
  continueBtn.style.display = 'none';
  
  const existingSkipBtn = dialogueOptionsContainer.querySelector('.skip-dialogue-btn');
  if (existingSkipBtn) {
    existingSkipBtn.remove();
  }
  
  const dialogueOptions = dialogueOptionsContainer.querySelectorAll('.dialogue-btn:not(.skip-dialogue-btn)');
  dialogueOptions.forEach(btn => {
    btn.classList.remove('clicked');
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
  });
  
  const sceneResponses = dialogueResponses[`scene${sceneNum}`];
  let clickedCount = 0;
  const totalOptions = dialogueOptions.length;
  let skipBtnAdded = false;
  
  dialogueOptions.forEach(btn => {
    btn.addEventListener('click', function handleClick() {
      const responseType = this.getAttribute('data-response');
      const response = sceneResponses[responseType];
      
      if (response && !this.classList.contains('clicked')) {
        this.classList.add('clicked');
        clickedCount++;
        
        npcResponse.innerHTML = `<em>"${response}"</em>`;
        npcResponse.style.display = 'block';
        
        if (!skipBtnAdded && clickedCount > 0) {
          skipBtnAdded = true;
          const skipBtn = document.createElement('button');
          skipBtn.className = 'dialogue-btn skip-dialogue-btn';
          skipBtn.textContent = '"I\'m ready to answer your question"';
          skipBtn.style.marginTop = '0.5rem';
          skipBtn.addEventListener('click', () => {
            mainQuestion.style.display = 'block';
            inputContainer.style.display = 'block';
            continueBtn.style.display = 'block';
            dialogueOptionsContainer.style.display = 'none';
            npcResponse.style.display = 'none';
            const input = inputContainer.querySelector('input, select');
            if (input) {
              setTimeout(() => input.focus(), 100);
            }
          });
          dialogueOptionsContainer.appendChild(skipBtn);
        }
        
        if (clickedCount >= totalOptions) {
          setTimeout(() => {
            mainQuestion.style.display = 'block';
            inputContainer.style.display = 'block';
            continueBtn.style.display = 'block';
            dialogueOptionsContainer.style.display = 'none';
            const input = inputContainer.querySelector('input, select');
            if (input) {
              setTimeout(() => input.focus(), 100);
            }
          }, 1000);
        }
      }
    });
  });
}

/**
 * Gets pronoun forms (subject, object, possessive, reflexive) from pronoun string
 * @param {string} pronouns - Pronoun string (e.g., 'he/him', 'she/her', 'they/them', or custom)
 * @returns {Object} Object with subject, object, possessive, and reflexive forms
 */
function getPronounForms(pronouns) {
  const pronounMap = {
    'he/him': { subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself' },
    'she/her': { subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself' },
    'they/them': { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themself' }
  };
  
  if (pronounMap[pronouns]) {
    return pronounMap[pronouns];
  }
  
  const parts = pronouns.split('/');
  if (parts.length >= 2) {
    return {
      subject: parts[0].trim(),
      object: parts[1].trim(),
      possessive: parts[2] ? parts[2].trim() : parts[1].trim() + "'s",
      reflexive: parts[0].trim() + 'self'
    };
  }
  
  return { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themself' };
}

/**
 * Updates pronoun displays in story scene 4
 */
function updatePronounDisplays() {
  if (window.pronounForms) {
    const forms = window.pronounForms;
    const pronounSubj = document.getElementById('pronoun-subject');
    const pronounObj = document.getElementById('pronoun-object');
    const pronounPoss = document.getElementById('pronoun-possessive');
    const nameDisplay4 = document.getElementById('story-name-display-4');
    
    if (pronounSubj) pronounSubj.textContent = forms.subject;
    if (pronounObj) pronounObj.textContent = forms.object;
    if (pronounPoss) pronounPoss.textContent = forms.possessive;
    if (nameDisplay4) nameDisplay4.textContent = document.getElementById('player-name').value;
  }
}

document.getElementById('skip-btn').addEventListener('click', () => {
  showScreen('start-screen');
});

document.getElementById('start-btn').addEventListener('click', async () => {
  if (currentUserId) {
    const profile = await loadUserProfile(currentUserId);
    if (profile) {
      showScreen('dashboard-screen');
      updateDashboard(profile);
      const primaryTrait = updateDashboard(profile);
      await displayTasks(primaryTrait);
    } else {
      showScreen('story-scene-1');
      setupDialogueSystem(1);
    }
  } else {
    showScreen('auth-screen');
  }
});

const loginLinkBtn = document.getElementById('login-link-btn');
if (loginLinkBtn) {
  loginLinkBtn.addEventListener('click', () => {
    showScreen('auth-screen');
  });
}

function proceedFromScene1() {
  const name = document.getElementById('story-name').value.trim();
  if (!name) {
    alert("Please enter your name.");
    document.getElementById('story-name').focus();
    return;
  }
  
  document.getElementById('player-name').value = name;
  document.getElementById('story-name-display').textContent = name;
  document.getElementById('story-name-display-2').textContent = name;
  document.getElementById('story-name-display-3').textContent = name;
  
  showScreen('story-scene-2');
  setupDialogueSystem(2);
}

document.getElementById('story-scene-1-btn').addEventListener('click', proceedFromScene1);
document.getElementById('story-name').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    proceedFromScene1();
  }
});

function proceedFromScene2() {
  const age = document.getElementById('story-age').value;
  if (!age || parseInt(age) < 1) {
    alert("Please enter a valid age.");
    document.getElementById('story-age').focus();
    return;
  }
  
  document.getElementById('player-age').value = age;
  document.getElementById('story-age-display').textContent = age;
  document.getElementById('story-age-display-2').textContent = age;
  
  showScreen('story-scene-3');
  setupDialogueSystem(3);
}

document.getElementById('story-scene-2-btn').addEventListener('click', proceedFromScene2);
document.getElementById('story-age').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    proceedFromScene2();
  }
});

function proceedFromScene3() {
  const pronouns = document.getElementById('story-pronouns').value;
  if (!pronouns) {
    alert("Please choose your pronouns.");
    document.getElementById('story-pronouns').focus();
    return;
  }
  
  let finalPronouns = pronouns;
  if (pronouns === 'custom') {
    const customPronouns = document.getElementById('story-pronouns-custom').value.trim();
    if (!customPronouns) {
      alert("Please enter your custom pronouns.");
      document.getElementById('story-pronouns-custom').focus();
      return;
    }
    finalPronouns = customPronouns;
  }
  
  window.playerPronouns = finalPronouns;
  window.pronounForms = getPronounForms(finalPronouns);
  document.getElementById('player-sex').value = finalPronouns;
  updatePronounDisplays();
  showScreen('story-scene-4');
}

document.getElementById('story-scene-3-btn').addEventListener('click', proceedFromScene3);

document.getElementById('story-pronouns').addEventListener('change', (e) => {
  const customInput = document.getElementById('story-pronouns-custom');
  if (e.target.value === 'custom') {
    customInput.style.display = 'block';
    customInput.focus();
  } else {
    customInput.style.display = 'none';
    customInput.value = '';
  }
});

document.getElementById('story-pronouns-custom').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    proceedFromScene3();
  }
});

document.getElementById('story-scene-4-btn').addEventListener('click', async () => {
  await generateQuestions();
  showScreen('question-screen');
});

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

  const heroResult = calculateHeroType(answers, loadedQuestions);
  const heroType = heroResult.heroType;

  const name = document.getElementById('player-name').value.trim();
  const age = parseInt(document.getElementById('player-age').value) || null;
  const pronouns = window.playerPronouns || document.getElementById('player-sex').value;

  await saveProfile(name, age, pronouns, heroType, attributes);
  await saveQuestionAnswers(answers);

  document.getElementById('hero-type').textContent = `You are a ${heroType}!`;
  document.getElementById('result-message').textContent = "Are you satisfied with your destiny?";
  showScreen('result-screen');
});

document.getElementById('accept-hero-btn').addEventListener('click', async () => {
  const profile = await loadProfile(currentProfileId);
  
  if (profile) {
    const primaryTrait = updateDashboard(profile);
    await displayTasks(primaryTrait);
  } else {
    const name = document.getElementById('player-name').value.trim();
    document.getElementById('player-display-name').textContent = name;
    await displayTasks();
  }
  
  showScreen('dashboard-screen');
});

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabType = tab.getAttribute('data-tab');
    
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    
    const signupForm = document.getElementById('signup-form');
    const loginForm = document.getElementById('login-form');
    if (signupForm && loginForm) {
      signupForm.style.display = tabType === 'signup' ? 'block' : 'none';
      loginForm.style.display = tabType === 'login' ? 'block' : 'none';
    }
    
    const signupError = document.getElementById('signup-error');
    const loginError = document.getElementById('login-error');
    if (signupError) signupError.style.display = 'none';
    if (loginError) loginError.style.display = 'none';
  });
});

const signupBtn = document.getElementById('signup-btn');
if (signupBtn) {
  signupBtn.addEventListener('click', async () => {
    const emailInput = document.getElementById('signup-email');
    const passwordInput = document.getElementById('signup-password');
    const errorEl = document.getElementById('signup-error');
    
    if (!emailInput || !passwordInput || !errorEl) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.style.display = 'block';
      return;
    }
    
    if (!isValidEmail(email)) {
      errorEl.textContent = 'Please enter a valid email address';
      errorEl.style.display = 'block';
      return;
    }
    
    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters';
      errorEl.style.display = 'block';
      return;
    }
    
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';
    
    const result = await signUp(email, password);
    
    if (result.success) {
      if (result.needsConfirmation) {
        errorEl.style.color = 'var(--accent-strong)';
        errorEl.textContent = result.message || 'Please check your email to confirm your account.';
        errorEl.style.display = 'block';
        signupBtn.disabled = false;
        signupBtn.textContent = 'Sign Up';
      } else {
        showScreen('story-scene-1');
        setupDialogueSystem(1);
      }
    } else {
      errorEl.style.color = 'var(--danger)';
      errorEl.textContent = result.error || 'Sign up failed. Please try again.';
      errorEl.style.display = 'block';
      signupBtn.disabled = false;
      signupBtn.textContent = 'Sign Up';
    }
  });
}

const loginBtn = document.getElementById('login-btn');
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const errorEl = document.getElementById('login-error');
    
    if (!emailInput || !passwordInput || !errorEl) return;
    
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    
    if (!email || !password) {
      errorEl.textContent = 'Please fill in all fields';
      errorEl.style.display = 'block';
      return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in...';
    
    const result = await signIn(email, password);
    
    if (result.success) {
      const profile = await loadUserProfile(currentUserId);
      if (profile) {
        showScreen('dashboard-screen');
        updateDashboard(profile);
        const primaryTrait = updateDashboard(profile);
        await displayTasks(primaryTrait);
      } else {
        showScreen('story-scene-1');
        setupDialogueSystem(1);
      }
    } else {
      errorEl.textContent = result.error || 'Login failed. Please check your credentials.';
      errorEl.style.display = 'block';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  });
}

window.addEventListener('DOMContentLoaded', async () => {
  console.log('App initialized');
  await loadQuestions();
  const session = await checkSession();
  if (session && session.user) {
    console.log('User session found:', session.user.email);
  }
});
