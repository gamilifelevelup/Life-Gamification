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
async function saveProfile(name, age, pronouns, heroType, attributes) {
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
        sex: pronouns || null, // Storing pronouns in sex field
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

// Complete a task and add XP
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
    // Load current profile to get experience
    const profile = await loadProfile(currentProfileId);
    if (!profile) {
      console.error('Could not load profile');
      return { success: false };
    }

    // Calculate new experience
    const currentExp = profile.experience || 0;
    const newExp = currentExp + (xpReward || 10);
    const currentLevel = profile.level || 1;
    const nextLevelExp = calculateNextLevelExp(currentLevel);

    // Check if level up
    let newLevel = currentLevel;
    let finalExp = newExp;
    let leveledUp = false;
    
    if (newExp >= nextLevelExp) {
      // Level up!
      leveledUp = true;
      newLevel = currentLevel + 1;
      finalExp = newExp - nextLevelExp; // Carry over excess XP
      
      // Recalculate next level exp for new level
      const newNextLevelExp = calculateNextLevelExp(newLevel);
      // If still over, keep leveling up (shouldn't happen with normal XP gains, but just in case)
      while (finalExp >= newNextLevelExp) {
        newLevel += 1;
        finalExp -= calculateNextLevelExp(newLevel - 1);
      }
    }

    // Save task log
    const { error: logError } = await client
      .from('task_logs')
      .insert({
        profile_id: currentProfileId,
        task_id: taskId,
        status: 'completed',
        completed_at: new Date().toISOString()
      });

    if (logError) throw logError;

    // Update profile with new experience and level
    const { error: updateError } = await client
      .from('profiles')
      .update({
        experience: finalExp,
        level: newLevel
      })
      .eq('id', currentProfileId);

    if (updateError) throw updateError;

    // Store level up info for UI notification
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

  // Filter out already completed tasks
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

  // Filter out completed tasks
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

  // Add event listeners to complete buttons
  const completeButtons = taskContainer.querySelectorAll('.complete-task-btn');
  completeButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const taskId = button.getAttribute('data-task-id');
      const xpReward = parseInt(button.getAttribute('data-xp')) || 10;
      
      // Disable button to prevent double-clicks
      button.disabled = true;
      button.textContent = 'Completing...';
      button.style.opacity = '0.6';
      
      // Complete the task
      const result = await completeTask(taskId, xpReward);
      
      if (result && result.success) {
        // Show level up notification if applicable
        if (result.leveledUp) {
          alert(`🎉 Level Up! You reached level ${result.newLevel}! 🎉`);
        }
        // Remove the task from display with animation
        const taskItem = button.closest('.task-item');
        if (taskItem) {
          taskItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          taskItem.style.opacity = '0';
          taskItem.style.transform = 'translateX(-20px)';
          
          setTimeout(async () => {
            // Reload profile to update XP/level
            const profile = await loadProfile(currentProfileId);
            if (profile) {
              // Update dashboard and get primary trait
              const primaryTrait = updateDashboard(profile);
              
              // Reload and display new tasks
              await displayTasks(primaryTrait);
            } else {
              // Fallback: just reload tasks
              await displayTasks(null);
            }
          }, 300);
        }
      } else {
        // Re-enable button on error
        button.disabled = false;
        button.textContent = 'Complete Task';
        button.style.opacity = '1';
        alert('Failed to complete task. Please try again.');
      }
    });
  });
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

// Dialogue responses for each scene
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

// Function to handle dialogue interactions
function setupDialogueSystem(sceneNum) {
  // Reset dialogue state
  const dialogueOptionsContainer = document.getElementById(`scene${sceneNum}-dialogue-options`);
  const npcResponse = document.getElementById(`scene${sceneNum}-npc-response`);
  const mainQuestion = document.getElementById(`scene${sceneNum}-main-question`);
  const inputContainer = document.getElementById(`scene${sceneNum}-input-container`);
  const continueBtn = document.getElementById(`story-scene-${sceneNum}-btn`);
  
  // Reset visibility
  dialogueOptionsContainer.style.display = 'flex';
  npcResponse.style.display = 'none';
  mainQuestion.style.display = 'none';
  inputContainer.style.display = 'none';
  continueBtn.style.display = 'none';
  
  // Remove any existing skip button
  const existingSkipBtn = dialogueOptionsContainer.querySelector('.skip-dialogue-btn');
  if (existingSkipBtn) {
    existingSkipBtn.remove();
  }
  
  // Reset all dialogue buttons
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
        // Mark button as clicked
        this.classList.add('clicked');
        clickedCount++;
        
        // Show NPC response
        npcResponse.innerHTML = `<em>"${response}"</em>`;
        npcResponse.style.display = 'block';
        
        // Add skip button after first click
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
        
        // After all dialogues are clicked, show main question
        if (clickedCount >= totalOptions) {
          setTimeout(() => {
            mainQuestion.style.display = 'block';
            inputContainer.style.display = 'block';
            continueBtn.style.display = 'block';
            dialogueOptionsContainer.style.display = 'none';
            // Focus on input
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

// Start -> Story Scene 1
document.getElementById('start-btn').addEventListener('click', () => {
  showScreen('story-scene-1');
  setupDialogueSystem(1);
});

// Story Scene 1 -> Scene 2 (Name)
function proceedFromScene1() {
  const name = document.getElementById('story-name').value.trim();
  if (!name) {
    alert("Please enter your name.");
    document.getElementById('story-name').focus();
    return;
  }
  
  // Store name and display it in next scene
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

// Story Scene 2 -> Scene 3 (Age)
function proceedFromScene2() {
  const age = document.getElementById('story-age').value;
  if (!age || parseInt(age) < 1) {
    alert("Please enter a valid age.");
    document.getElementById('story-age').focus();
    return;
  }
  
  // Store age and display it in next scene
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

// Pronoun utility functions
function getPronounForms(pronouns) {
  // Default forms for common pronouns
  const pronounMap = {
    'he/him': { subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself' },
    'she/her': { subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself' },
    'they/them': { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themself' }
  };
  
  if (pronounMap[pronouns]) {
    return pronounMap[pronouns];
  }
  
  // For custom pronouns, try to parse (e.g., "xe/xem" -> subject: xe, object: xem)
  const parts = pronouns.split('/');
  if (parts.length >= 2) {
    return {
      subject: parts[0].trim(),
      object: parts[1].trim(),
      possessive: parts[2] ? parts[2].trim() : parts[1].trim() + "'s",
      reflexive: parts[0].trim() + 'self'
    };
  }
  
  // Fallback
  return { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themself' };
}

// Story Scene 3 -> Scene 4 (Pronouns)
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
  
  // Store pronouns
  window.playerPronouns = finalPronouns;
  window.pronounForms = getPronounForms(finalPronouns);
  
  // Store in hidden field for compatibility (using sex field for now, but it's actually pronouns)
  document.getElementById('player-sex').value = finalPronouns;
  
  // Update pronoun displays in scene 4
  updatePronounDisplays();
  
  showScreen('story-scene-4');
}

// Function to update pronoun displays in dialogue
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

document.getElementById('story-scene-3-btn').addEventListener('click', proceedFromScene3);

// Show/hide custom pronoun input
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

// Story Scene 4 -> Questions
document.getElementById('story-scene-4-btn').addEventListener('click', async () => {
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
  const pronouns = window.playerPronouns || document.getElementById('player-sex').value;

  await saveProfile(name, age, pronouns, heroType, attributes);
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
