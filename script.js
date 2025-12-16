/**
 * Main Application Entry Point
 * Life Gamification App - Refactored with modular architecture
 */

// Import constants
import { TEST_USER_ID, SCREENS, QUESTION_CONFIG, DEFAULT_ATTRIBUTES } from './js/constants/index.js';

// Import services
import { initializeSupabase } from './js/services/supabase.js';
import { signUp, signIn, checkSession } from './js/services/authService.js';
import { loadUserProfile, loadProfile, saveProfile } from './js/services/profileService.js';
import { loadQuestions, saveQuestionAnswers, filterQuestionsByPillar } from './js/services/questionService.js';
import { fetchArchetypeFromDB } from './js/services/taskService.js';

// Import business logic
import { calculateAttributesFromAnswers, calculateBaseLevel } from './js/business/calculations.js';
import { resolveArchetype } from './js/business/archetypes.js';

// Import UI utilities
import { showScreen } from './js/ui/screenManager.js';
import { showToast, showErrorToast } from './js/ui/toast.js';
import { setButtonLoading } from './js/ui/buttonUtils.js';
import { updateDashboard } from './js/ui/dashboard.js';
import { generateQuestions, getQuestionAnswers } from './js/ui/questions.js';
import { displayTasks } from './js/ui/tasks.js';

// Import handlers
import { setupDialogueSystem } from './js/handlers/dialogueHandler.js';

// Import state management
import {
  initializeTestUser,
  getCurrentUserId,
  setCurrentUserId,
  getCurrentProfileId,
  setCurrentProfileId,
  getLoadedQuestions,
  setLoadedQuestions,
  getPillarCompletion,
  setPillarCompletion,
  getPillarAnswers,
  setPillarAnswer,
  getActivePillar,
  setActivePillar,
  getState,
  setState
} from './js/state/appState.js';

// Import utilities
import { getTestUserProfile } from './js/utils/storage.js';
import { isValidEmail, isValidPassword, isValidAge, isNonEmptyString } from './js/utils/validation.js';
import { getPronounForms } from './js/utils/pronouns.js';

/**
 * Initializes the application
 */
async function initializeApp() {
  console.log('App initialized');
  
  // Initialize Supabase
  await initializeSupabase();
  
  // Initialize test user (for development)
  initializeTestUser();
  
  // Load questions
  const questions = await loadQuestions();
  setLoadedQuestions(questions);
  
  // Setup event listeners
  setupEventListeners();
  
  // Setup map interactions
  setupMapInteractions();
  
  // Check for existing session
  const session = await checkSession();
  if (session && session.user) {
    setCurrentUserId(session.user.id);
    const profile = await loadUserProfile(session.user.id);
    if (profile) {
      setCurrentProfileId(profile.id);
      showScreen(SCREENS.DASHBOARD);
      updateDashboard(profile);
      const primaryTrait = updateDashboard(profile);
      await displayTasks(primaryTrait);
    }
  }
}

/**
 * Sets up all event listeners
 */
function setupEventListeners() {
  // Welcome screen
  const skipBtn = document.getElementById('skip-btn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => showScreen(SCREENS.START));
  }

  // Start screen
  const startBtn = document.getElementById('start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', handleStartClick);
  }

  const loginLinkBtn = document.getElementById('login-link-btn');
  if (loginLinkBtn) {
    loginLinkBtn.addEventListener('click', () => showScreen(SCREENS.AUTH));
  }

  // Auth screen
  setupAuthListeners();

  // Story scenes
  setupStorySceneListeners();

  // Question screen
  const submitAnswersBtn = document.getElementById('submit-answers-btn');
  if (submitAnswersBtn) {
    submitAnswersBtn.addEventListener('click', handleSubmitAnswers);
  }

  // Result screen
  const acceptHeroBtn = document.getElementById('accept-hero-btn');
  if (acceptHeroBtn) {
    acceptHeroBtn.addEventListener('click', handleAcceptHero);
  }
}

/**
 * Sets up authentication event listeners
 */
function setupAuthListeners() {
  // Auth tabs
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

  // Signup button
  const signupBtn = document.getElementById('signup-btn');
  if (signupBtn) {
    signupBtn.addEventListener('click', handleSignup);
  }

  // Login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
}

/**
 * Sets up story scene event listeners
 */
function setupStorySceneListeners() {
  // Scene 1
  const scene1Btn = document.getElementById('story-scene-1-btn');
  if (scene1Btn) {
    scene1Btn.addEventListener('click', proceedFromScene1);
  }
  
  const storyNameInput = document.getElementById('story-name');
  if (storyNameInput) {
    storyNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') proceedFromScene1();
    });
  }

  // Scene 2
  const scene2Btn = document.getElementById('story-scene-2-btn');
  if (scene2Btn) {
    scene2Btn.addEventListener('click', proceedFromScene2);
  }
  
  const storyAgeInput = document.getElementById('story-age');
  if (storyAgeInput) {
    storyAgeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') proceedFromScene2();
    });
  }

  // Scene 3
  const scene3Btn = document.getElementById('story-scene-3-btn');
  if (scene3Btn) {
    scene3Btn.addEventListener('click', proceedFromScene3);
  }
  
  const pronounsSelect = document.getElementById('story-pronouns');
  if (pronounsSelect) {
    pronounsSelect.addEventListener('change', (e) => {
      const customInput = document.getElementById('story-pronouns-custom');
      if (customInput) {
        if (e.target.value === 'custom') {
          customInput.style.display = 'block';
          customInput.focus();
        } else {
          customInput.style.display = 'none';
          customInput.value = '';
        }
      }
    });
  }
  
  const customPronounsInput = document.getElementById('story-pronouns-custom');
  if (customPronounsInput) {
    customPronounsInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') proceedFromScene3();
    });
  }

  // Scene 4
  const scene4Btn = document.getElementById('story-scene-4-btn');
  if (scene4Btn) {
    scene4Btn.addEventListener('click', () => {
      showScreen(SCREENS.MAP);
    });
  }
}

/**
 * Handles start button click
 */
async function handleStartClick() {
  const testProfile = getTestUserProfile();
  if (testProfile && testProfile.hero_type) {
    // Test user has completed onboarding, go to dashboard
    setCurrentUserId(TEST_USER_ID);
    setCurrentProfileId(TEST_USER_ID);
    showScreen(SCREENS.DASHBOARD);
    updateDashboard(testProfile);
    const primaryTrait = updateDashboard(testProfile);
    await displayTasks(primaryTrait);
  } else {
    // New test user, start story flow
    setCurrentUserId(TEST_USER_ID);
    showScreen(SCREENS.STORY_SCENE_1);
    setupDialogueSystem(1);
  }
}

/**
 * Handles signup
 */
async function handleSignup() {
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
  
  if (!isValidPassword(password)) {
    errorEl.textContent = 'Password must be at least 6 characters';
    errorEl.style.display = 'block';
    return;
  }
  
  const signupBtn = document.getElementById('signup-btn');
  setButtonLoading(signupBtn, true);
  
  const result = await signUp(email, password);
  
  if (result.success) {
    if (result.needsConfirmation) {
      errorEl.style.color = 'var(--accent-strong)';
      errorEl.textContent = result.message || 'Please check your email to confirm your account.';
      errorEl.style.display = 'block';
      setButtonLoading(signupBtn, false);
    } else {
      setCurrentUserId(result.user.id);
      showScreen(SCREENS.STORY_SCENE_1);
      setupDialogueSystem(1);
    }
  } else {
    errorEl.style.color = 'var(--danger)';
    errorEl.textContent = result.error || 'Sign up failed. Please try again.';
    errorEl.style.display = 'block';
    setButtonLoading(signupBtn, false);
  }
}

/**
 * Handles login
 */
async function handleLogin() {
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
  
  const loginBtn = document.getElementById('login-btn');
  setButtonLoading(loginBtn, true);
  
  const result = await signIn(email, password);
  
  if (result.success) {
    setCurrentUserId(result.user.id);
    const profile = await loadUserProfile(result.user.id);
    if (profile) {
      setCurrentProfileId(profile.id);
      showScreen(SCREENS.DASHBOARD);
      updateDashboard(profile);
      const primaryTrait = updateDashboard(profile);
      await displayTasks(primaryTrait);
    } else {
      showScreen(SCREENS.STORY_SCENE_1);
      setupDialogueSystem(1);
    }
  } else {
    errorEl.textContent = result.error || 'Login failed. Please check your credentials.';
    errorEl.style.display = 'block';
    setButtonLoading(loginBtn, false);
  }
}

/**
 * Proceeds from story scene 1
 */
function proceedFromScene1() {
  const name = document.getElementById('story-name')?.value.trim();
  if (!isNonEmptyString(name)) {
    showErrorToast("Please enter your name.");
    document.getElementById('story-name')?.focus();
    return;
  }
  
  const playerNameInput = document.getElementById('player-name');
  if (playerNameInput) playerNameInput.value = name;
  
  // Update name displays
  ['story-name-display', 'story-name-display-2', 'story-name-display-3'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = name;
  });
  
  showScreen(SCREENS.STORY_SCENE_2);
  setupDialogueSystem(2);
}

/**
 * Proceeds from story scene 2
 */
function proceedFromScene2() {
  const ageInput = document.getElementById('story-age');
  const age = ageInput?.value;
  
  if (!isValidAge(age)) {
    showErrorToast("Please enter a valid age.");
    ageInput?.focus();
    return;
  }
  
  const playerAgeInput = document.getElementById('player-age');
  if (playerAgeInput) playerAgeInput.value = age;
  
  // Update age displays
  ['story-age-display', 'story-age-display-2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = age;
  });
  
  showScreen(SCREENS.STORY_SCENE_3);
  setupDialogueSystem(3);
}

/**
 * Proceeds from story scene 3
 */
function proceedFromScene3() {
  const pronounsSelect = document.getElementById('story-pronouns');
  const pronouns = pronounsSelect?.value;
  
  if (!pronouns) {
    showErrorToast("Please choose your pronouns.");
    pronounsSelect?.focus();
    return;
  }
  
  let finalPronouns = pronouns;
  if (pronouns === 'custom') {
    const customPronouns = document.getElementById('story-pronouns-custom')?.value.trim();
    if (!isNonEmptyString(customPronouns)) {
      showErrorToast("Please enter your custom pronouns.");
      document.getElementById('story-pronouns-custom')?.focus();
      return;
    }
    finalPronouns = customPronouns;
  }
  
  window.playerPronouns = finalPronouns;
  window.pronounForms = getPronounForms(finalPronouns);
  
  const playerSexInput = document.getElementById('player-sex');
  if (playerSexInput) playerSexInput.value = finalPronouns;
  
  updatePronounDisplays();
  showScreen(SCREENS.STORY_SCENE_4);
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
    
    const playerNameInput = document.getElementById('player-name');
    if (nameDisplay4 && playerNameInput) {
      nameDisplay4.textContent = playerNameInput.value;
    }
  }
}

/**
 * Sets up map interactions
 */
function setupMapInteractions() {
  const dots = document.querySelectorAll('.pillar-dot');
  if (!dots || dots.length === 0) return;

  const titleEl = document.getElementById('pillar-question-title');
  const subtitleEl = document.getElementById('pillar-question-subtitle');

  const titles = {
    v: 'Vitality Island — The Forge of Energy',
    r: 'Resilience Island — The Citadel of Focus',
    c: 'Connection Island — The Circle of Companions',
    m: 'Mastery Island — The Hall of Craft'
  };

  const subtitles = {
    v: 'Answer a few questions about your sleep, movement, and physical energy.',
    r: 'Answer a few questions about your focus, discipline, and emotional balance.',
    c: 'Answer a few questions about your relationships and sense of belonging.',
    m: 'Answer a few questions about your skills, work, and control over resources.'
  };

  dots.forEach((dot) => {
    const pillar = dot.getAttribute('data-pillar');
    dot.addEventListener('click', async () => {
      if (!pillar) return;

      const pillarCompletion = getPillarCompletion();
      if (pillarCompletion[pillar]) {
        showToast('This island has already been restored. Choose another relic.', 'info');
        return;
      }

      setActivePillar(pillar);

      if (titleEl && titles[pillar]) {
        titleEl.textContent = titles[pillar];
      }
      if (subtitleEl && subtitles[pillar]) {
        subtitleEl.textContent = subtitles[pillar];
      }

      const questions = getLoadedQuestions();
      generateQuestions(questions, pillar);
      showScreen(SCREENS.QUESTION);
    });
  });
}

/**
 * Handles answer submission
 */
async function handleSubmitAnswers() {
  const activePillar = getActivePillar();
  if (!activePillar) {
    showErrorToast("Choose an island on the map first.");
    return;
  }

  const questions = getLoadedQuestions();
  if (!questions || questions.length === 0) {
    showErrorToast("No questions loaded. Please try again.");
    return;
  }

  const submitBtn = document.getElementById('submit-answers-btn');
  setButtonLoading(submitBtn, true);

  const answers = getQuestionAnswers();
  
  // Save answers for this pillar
  const pillarAnswers = getPillarAnswers();
  questions.forEach((q, index) => {
    if (answers[index] !== undefined) {
      pillarAnswers[q.id] = answers[index];
    }
  });

  setPillarCompletion(activePillar, true);

  // Check if all pillars completed
  const pillarCompletion = getPillarCompletion();
  const allDone = Object.values(pillarCompletion).every(v => v);

  if (!allDone) {
    setButtonLoading(submitBtn, false);
    showToast('Relic sealed! Choose the next island.', 'success');
    showScreen(SCREENS.MAP);
    return;
  }

  // All pillars done - calculate final attributes
  const allQuestions = getLoadedQuestions();
  const allAnswers = allQuestions.map((q) => {
    return pillarAnswers[q.id] ?? QUESTION_CONFIG.DEFAULT_SCORE;
  });

  const attributes = calculateAttributesFromAnswers(allAnswers, allQuestions, DEFAULT_ATTRIBUTES);

  // Resolve archetype
  const archetype = await resolveArchetype(attributes, fetchArchetypeFromDB);
  const heroType = archetype.name;

  const name = document.getElementById('player-name')?.value.trim() || '';
  const age = parseInt(document.getElementById('player-age')?.value) || null;
  const pronouns = window.playerPronouns || document.getElementById('player-sex')?.value || '';

  const userId = getCurrentUserId();
  const profileId = await saveProfile(userId, name, age, pronouns, heroType, attributes);
  if (profileId) {
    setCurrentProfileId(profileId);
  }

  await saveQuestionAnswers(profileId, allQuestions, allAnswers);

  setButtonLoading(submitBtn, false);
  
  const heroTypeEl = document.getElementById('hero-type');
  if (heroTypeEl) {
    heroTypeEl.textContent = `Your Archetype: ${heroType}`;
  }
  
  const resultMessageEl = document.getElementById('result-message');
  if (resultMessageEl) {
    resultMessageEl.textContent = archetype.coreIdentity || "Your relics have been restored. This is the title you now bear.";
  }
  
  showToast('All relics restored! Your title has been revealed.', 'success', 4000);
  showScreen(SCREENS.RESULT);
}

/**
 * Handles accept hero button click
 */
async function handleAcceptHero() {
  const profileId = getCurrentProfileId();
  const profile = await loadProfile(profileId);
  
  if (profile) {
    const primaryTrait = updateDashboard(profile);
    await displayTasks(primaryTrait);
  } else {
    const name = document.getElementById('player-name')?.value.trim() || '';
    const nameDisplay = document.getElementById('player-display-name');
    if (nameDisplay) nameDisplay.textContent = name;
    await displayTasks();
  }
  
  showScreen(SCREENS.DASHBOARD);
}

/**
 * Resets test account (for development)
 */
async function resetTestAccount() {
  if (confirm('Are you sure you want to reset your test account? All progress will be lost.')) {
    const { removeStorageItem } = await import('./js/utils/storage.js');
    const { STORAGE_KEYS } = await import('./js/constants/index.js');
    const { resetState } = await import('./js/state/appState.js');
    
    removeStorageItem(STORAGE_KEYS.TEST_USER);
    removeStorageItem(STORAGE_KEYS.CUSTOM_TASKS);
    resetState();
    
    console.log('Test account reset! Reloading...');
    location.reload();
  }
}

// Make resetTestAccount available globally for console access
window.resetTestAccount = resetTestAccount;

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

