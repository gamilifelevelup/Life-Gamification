/**
 * Tasks UI
 * Handles task display, completion, and quest board management
 */

import { loadTasks, completeTask } from '../services/taskService.js';
import { loadProfile } from '../services/profileService.js';
import { computeTaskXp } from '../business/calculations.js';
import { updateDashboard } from './dashboard.js';
import { showToast } from './toast.js';
import { PILLAR_INFO, TASK_CONFIG, TEST_USER_ID, CUSTOM_TASK_STORAGE_KEY } from '../constants/index.js';
import { waitForSupabase } from '../services/supabase.js';
import { 
  getCurrentProfileId, 
  getVisibleTaskCount, 
  setVisibleTaskCount,
  getLastTaskRefreshAt,
  setLastTaskRefreshAt,
  getLastQuestGenerationAt,
  setLastQuestGenerationAt,
  getTaskRefreshTimerId,
  setTaskRefreshTimerId,
  getQuestGenerationTimerId,
  setQuestGenerationTimerId,
  getLocalCustomTasks,
  setLocalCustomTasks
} from '../state/appState.js';
import { loadLocalCustomTasks, saveLocalCustomTasks } from '../utils/storage.js';
import { getTestUserProfile } from '../utils/storage.js';

let currentPrimaryTraitForTasks = null;

/**
 * Gets completed task IDs for current profile
 * @returns {Promise<Array<string>>} Array of completed task IDs
 */
async function getCompletedTaskIds() {
  const profileId = getCurrentProfileId();
  if (!profileId) return [];

  if (profileId === TEST_USER_ID) {
    const testProfile = getTestUserProfile();
    if (testProfile && testProfile.completed_tasks) {
      return testProfile.completed_tasks.map(t => t.task_id);
    }
    return [];
  }

  const client = await waitForSupabase();
  if (!client || !profileId) return [];

  try {
    const { data } = await client
      .from('task_logs')
      .select('task_id')
      .eq('profile_id', profileId)
      .eq('status', 'completed');
    
    return data ? data.map(log => log.task_id) : [];
  } catch (error) {
    console.error('Error loading completed tasks:', error);
    return [];
  }
}

/**
 * Gets pillar info for display
 * @param {string} trait - Trait identifier
 * @returns {Object} Pillar info object
 */
function getPillarInfo(trait) {
  return PILLAR_INFO[trait] || { name: '', icon: '', color: '#7c5cff', short: '' };
}

/**
 * Renders a single task card
 * @param {Object} task - Task object
 * @param {boolean} isRecommended - Whether task is recommended
 * @param {Object|null} profile - Profile for XP calculation
 * @returns {string} HTML string for task card
 */
function renderTaskCard(task, isRecommended, profile) {
  const xpReward = computeTaskXp(task, profile);
  const traitFocus = task.trait_focus || [];
  
  const pillarBadges = traitFocus.map(trait => {
    const info = getPillarInfo(trait);
    return `<span class="pillar-badge" style="background: ${info.color}20; color: ${info.color}; border: 1px solid ${info.color}40;">
      ${info.icon} ${info.short}
    </span>`;
  }).join('');

  return `
    <div class="quest-card ${isRecommended ? 'recommended' : ''}" data-task-id="${task.id}">
      ${isRecommended ? '<div class="quest-badge">⭐ Recommended for You</div>' : ''}
      <div class="quest-header">
        <h3 class="quest-title">${task.title}</h3>
        <div class="quest-xp">
          <span class="xp-icon">✨</span>
          <span class="xp-value">${xpReward}</span>
          <span class="xp-label">XP</span>
        </div>
      </div>
      <p class="quest-description">${task.description || 'Complete this quest to strengthen your realm.'}</p>
      <div class="quest-meta">
        ${pillarBadges ? `<div class="quest-pillars">
          <span class="meta-label">Strengthens:</span>
          <div class="pillar-badges">${pillarBadges}</div>
        </div>` : ''}
        <div class="quest-level">
          <span class="level-icon">📜</span>
          <span>Level ${task.unlock_level || 1}+</span>
        </div>
      </div>
      <button class="complete-task-btn quest-action-btn" data-task-id="${task.id}" data-xp="${xpReward}">
        <span class="btn-text">Complete Quest</span>
        <span class="btn-arrow">→</span>
      </button>
    </div>
  `;
}

/**
 * Sets up task completion handlers
 * @param {HTMLElement} container - Container element
 * @param {string|null} primaryTrait - Primary trait for refresh
 */
function setupTaskCompletionHandlers(container, primaryTrait) {
  const completeButtons = container.querySelectorAll('.complete-task-btn');
  completeButtons.forEach(button => {
    button.addEventListener('click', async () => {
      const taskId = button.getAttribute('data-task-id');
      const xpReward = parseInt(button.getAttribute('data-xp')) || 10;
      const profileId = getCurrentProfileId();
      
      button.disabled = true;
      const btnText = button.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = 'Completing...';
      } else {
        button.textContent = 'Completing...';
      }
      button.style.opacity = '0.6';
      
      const result = await completeTask(taskId, xpReward, profileId);
      
      if (result && result.success) {
        if (result.leveledUp) {
          showToast(`🎉 Level Up! You reached level ${result.newLevel}! 🎉`, 'success', 4000);
        } else {
          showToast(`Quest complete! +${xpReward} XP gained.`, 'success');
        }
        
        const questCard = button.closest('.quest-card');
        if (questCard) {
          questCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          questCard.style.opacity = '0';
          questCard.style.transform = 'translateX(-20px)';
          
          setTimeout(async () => {
            const profile = await loadProfile(profileId);
            if (profile) {
              const primaryTraitNext = updateDashboard(profile);
              setVisibleTaskCount(TASK_CONFIG.PAGE_SIZE);
              await displayTasks(primaryTraitNext);
            } else {
              setVisibleTaskCount(TASK_CONFIG.PAGE_SIZE);
              await displayTasks(null);
            }
          }, 300);
        } else {
          const profile = await loadProfile(profileId);
          if (profile) {
            const primaryTraitNext = updateDashboard(profile);
            setVisibleTaskCount(TASK_CONFIG.PAGE_SIZE);
            await displayTasks(primaryTraitNext);
          } else {
            setVisibleTaskCount(TASK_CONFIG.PAGE_SIZE);
            await displayTasks(null);
          }
        }
      } else {
        button.disabled = false;
        const btnText = button.querySelector('.btn-text');
        if (btnText) {
          btnText.textContent = 'Complete Quest';
        } else {
          button.textContent = 'Complete Quest';
        }
        button.style.opacity = '1';
        showToast('Failed to complete quest. Please try again.', 'error');
      }
    });
  });
}

/**
 * Sets up refresh button handler
 * @param {HTMLElement} container - Container element
 * @param {string|null} primaryTrait - Primary trait for refresh
 * @param {number} availableTasksCount - Number of available tasks
 */
function setupRefreshButton(container, primaryTrait, availableTasksCount) {
  const refreshBtn = container.querySelector('#refresh-tasks-btn');
  if (!refreshBtn) return;

  const updateCooldownLabel = () => {
    const now = Date.now();
    const remaining = getLastTaskRefreshAt() + TASK_CONFIG.REFRESH_COOLDOWN_MS - now;
    if (remaining <= 0) {
      const timerId = getTaskRefreshTimerId();
      if (timerId) clearInterval(timerId);
      setTaskRefreshTimerId(null);
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh quest board';
      return;
    }
    const seconds = Math.ceil(remaining / 1000);
    refreshBtn.textContent = `New quests in ${seconds}s`;
  };

  if (getLastTaskRefreshAt() && Date.now() < getLastTaskRefreshAt() + TASK_CONFIG.REFRESH_COOLDOWN_MS) {
    refreshBtn.disabled = true;
    if (!getTaskRefreshTimerId()) {
      setTaskRefreshTimerId(setInterval(updateCooldownLabel, 500));
    }
    updateCooldownLabel();
  }

  refreshBtn.addEventListener('click', async () => {
    const now = Date.now();
    if (now < getLastTaskRefreshAt() + TASK_CONFIG.REFRESH_COOLDOWN_MS) {
      return;
    }
    setLastTaskRefreshAt(now);
    
    if (availableTasksCount === 0) {
      setLastQuestGenerationAt(now);
    }
    
    setVisibleTaskCount(TASK_CONFIG.PAGE_SIZE);
    refreshBtn.disabled = true;
    updateCooldownLabel();
    const timerId = getTaskRefreshTimerId();
    if (timerId) clearInterval(timerId);
    setTaskRefreshTimerId(setInterval(updateCooldownLabel, 500));
    await displayTasks(primaryTrait);
  });
}

/**
 * Sets up custom task form handler
 * @param {HTMLElement} container - Container element
 * @param {string|null} primaryTrait - Primary trait for refresh
 */
function setupCustomTaskForm(container, primaryTrait) {
  const addCustomBtn = container.querySelector('#add-custom-task-btn');
  if (!addCustomBtn) return;

  addCustomBtn.addEventListener('click', async () => {
    const titleInput = container.querySelector('#custom-task-title');
    const descInput = container.querySelector('#custom-task-desc');
    const title = titleInput ? titleInput.value.trim() : '';
    const description = descInput ? descInput.value.trim() : '';

    if (!title) {
      showToast('Name your quest before posting it to the board.', 'error');
      if (titleInput) titleInput.focus();
      return;
    }

    const client = await waitForSupabase();
    const newTaskBase = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      description,
      category: 'custom',
      difficulty: 1,
      unlock_level: 1,
      trait_focus: [],
      experience_reward: 1,
      recommended_frequency: 'player',
      is_active: true
    };

    let localTasks = getLocalCustomTasks();
    
    if (client) {
      try {
        const { data, error } = await client
          .from('tasks')
          .insert({
            title,
            description,
            category: 'custom',
            difficulty: 1,
            unlock_level: 1,
            trait_focus: [],
            experience_reward: 1,
            recommended_frequency: 'player',
            is_active: true
          })
          .select()
          .single();

        if (!error && data) {
          localTasks.push({ ...newTaskBase, id: data.id });
        } else {
          console.warn('Could not persist custom task to server, keeping local only.', error);
          localTasks.push(newTaskBase);
        }
      } catch (err) {
        console.warn('Error inserting custom task, keeping local only.', err);
        localTasks.push(newTaskBase);
      }
    } else {
      console.warn('Supabase not available; custom quest will exist only for this session.');
      localTasks.push(newTaskBase);
    }

    setLocalCustomTasks(localTasks);
    saveLocalCustomTasks(localTasks);

    if (titleInput) titleInput.value = '';
    if (descInput) descInput.value = '';
    
    showToast('Custom quest posted!', 'success');
    setVisibleTaskCount(TASK_CONFIG.PAGE_SIZE);
    await displayTasks(primaryTrait);
  });
}

/**
 * Displays tasks in the dashboard
 * @param {string|null} primaryTrait - Primary trait for task sorting
 * @returns {Promise<void>}
 */
export async function displayTasks(primaryTrait = null) {
  const taskContainer = document.querySelector('.task-dashboard');
  if (!taskContainer) return;

  currentPrimaryTraitForTasks = primaryTrait;

  const tasks = await loadTasks(primaryTrait);
  let localTasks = getLocalCustomTasks();
  
  if (localTasks.length === 0) {
    localTasks = loadLocalCustomTasks();
    setLocalCustomTasks(localTasks);
  }

  if (tasks.length === 0 && localTasks.length === 0) {
    taskContainer.innerHTML = `
      <h3>Quest Board</h3>
      <p class="placeholder">No quests have been posted yet. Check back soon, hero.</p>
    `;
    return;
  }

  const completedTaskIds = await getCompletedTaskIds();
  const allTasks = [...tasks, ...localTasks];
  const availableTasks = allTasks.filter(task => !completedTaskIds.includes(task.id));

  if (availableTasks.length === 0) {
    const now = Date.now();
    if (getLastQuestGenerationAt() === 0) {
      setLastQuestGenerationAt(now);
    }
    
    const timeUntilGeneration = getLastQuestGenerationAt() + TASK_CONFIG.QUEST_GENERATION_COOLDOWN_MS - now;
    const minutesRemaining = Math.max(0, Math.ceil(timeUntilGeneration / 60000));
    const secondsRemaining = Math.max(0, Math.ceil(timeUntilGeneration / 1000));
    
    let cooldownMessage = '';
    if (timeUntilGeneration > 0) {
      const displayTime = minutesRemaining > 0 
        ? `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`
        : `${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''}`;
      cooldownMessage = `<p class="generation-cooldown" style="font-size: 0.9rem; color: var(--accent-strong); margin-top: 1rem; font-weight: 600;">
        ⏳ New quests will be generated in ${displayTime}
      </p>`;
    } else {
      cooldownMessage = `<p style="font-size: 0.9rem; color: var(--text-muted); margin-top: 1rem;">
        Refresh the board to generate new quests.
      </p>`;
    }
    
    taskContainer.innerHTML = `
      <h3>Quest Board</h3>
      <p class="placeholder">All posted quests are complete. Take a moment to rest, then refresh for new challenges.</p>
      ${cooldownMessage}
      <div id="custom-task-form" style="margin-top: 1.5rem; padding-top: 0.75rem; border-top: 1px solid rgba(118, 138, 255, 0.22); text-align: left;">
        <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Want to forge your own quest? Add a custom task below. For now, such quests grant <strong>1 XP</strong>.
        </p>
        <label>
          <span>Custom quest title</span>
          <input type="text" id="custom-task-title" placeholder="e.g., Clean the study like a royal archive">
        </label>
        <label style="margin-top: 0.6rem;">
          <span>Custom quest details</span>
          <input type="text" id="custom-task-desc" placeholder="What must be done to claim this honor?">
        </label>
        <button id="add-custom-task-btn" style="margin-top: 0.75rem; width: 100%;">Post custom quest (1 XP)</button>
      </div>
    `;
    
    setupCustomTaskForm(taskContainer, primaryTrait);
    return;
  }
  
  const timerId = getQuestGenerationTimerId();
  if (timerId) {
    clearInterval(timerId);
    setQuestGenerationTimerId(null);
  }
  
  const visibleTaskCount = getVisibleTaskCount();
  const sliceEnd = Math.min(visibleTaskCount, availableTasks.length);
  const visibleTasks = availableTasks.slice(0, sliceEnd);

  const profileId = getCurrentProfileId();
  let profileForXp = null;
  if (profileId && profileId !== TEST_USER_ID) {
    profileForXp = await loadProfile(profileId);
  }

  const tasksHTML = visibleTasks.map(task => {
    const isRecommended = primaryTrait && task.trait_focus && task.trait_focus.includes(primaryTrait);
    return renderTaskCard(task, isRecommended, profileForXp);
  }).join('');

  const hasMore = sliceEnd < availableTasks.length;
  const tasksRoot = document.getElementById('tasks-root');
  const outer = tasksRoot || taskContainer;

  outer.innerHTML = `
    <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
      Quests are tuned to your weakest pillar. Complete them to strengthen your realm.
    </p>
    <div id="tasks-list" class="quest-cards-grid">
      ${tasksHTML || '<p class="placeholder">No quests available right now.</p>'}
    </div>
    ${hasMore ? `
      <button id="show-more-tasks-btn" style="width: 100%; margin-bottom: 0.75rem; background: transparent; border: 1px solid var(--panel-border);">
        Show more quests
      </button>
    ` : ''}
    <button id="refresh-tasks-btn" style="width: 100%; margin-bottom: 1rem;">
      Refresh quest board
    </button>
    <div id="custom-task-form" style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid rgba(118, 138, 255, 0.22); text-align: left;">
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 0.75rem;">
        Want to forge your own quest? Add a custom task below. For now, such quests grant <strong>1 XP</strong>.
      </p>
      <label>
        <span>Custom quest title</span>
        <input type="text" id="custom-task-title" placeholder="e.g., Clean the study like a royal archive">
      </label>
      <label style="margin-top: 0.6rem;">
        <span>Custom quest details</span>
        <input type="text" id="custom-task-desc" placeholder="What must be done to claim this honor?">
      </label>
      <button id="add-custom-task-btn" style="margin-top: 0.75rem; width: 100%;">Post custom quest (1 XP)</button>
    </div>
  `;

  setupTaskCompletionHandlers(outer, primaryTrait);
  setupRefreshButton(outer, primaryTrait, availableTasks.length);
  setupCustomTaskForm(outer, primaryTrait);

  const showMoreBtn = outer.querySelector('#show-more-tasks-btn');
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', async () => {
      setVisibleTaskCount(getVisibleTaskCount() + TASK_CONFIG.PAGE_SIZE);
      await displayTasks(currentPrimaryTraitForTasks);
    });
  }
}

