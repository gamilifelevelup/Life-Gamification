/**
 * Application State Management
 * Centralized state management for the application
 */

import { TEST_USER_ID } from '../constants/index.js';
import { getTestUserProfile } from '../utils/storage.js';

// Application state
let currentProfileId = null;
let currentUserId = null;
let loadedQuestions = [];
let loadedTasks = [];
let pillarCompletion = { v: false, r: false, c: false, m: false };
let pillarAnswers = {};
let activePillar = null;
let visibleTaskCount = 5;
let lastTaskRefreshAt = 0;
let lastQuestGenerationAt = 0;
let taskRefreshTimerId = null;
let questGenerationTimerId = null;
let localCustomTasks = [];

/**
 * Initializes test user on app load
 */
export function initializeTestUser() {
  currentUserId = TEST_USER_ID;
  
  const testProfile = getTestUserProfile();
  if (testProfile) {
    currentProfileId = TEST_USER_ID;
    console.log('Test user loaded from localStorage');
  } else {
    console.log('New test user - will create profile after onboarding');
  }
}

/**
 * Gets current user ID
 * @returns {string|null} Current user ID
 */
export function getCurrentUserId() {
  return currentUserId;
}

/**
 * Sets current user ID
 * @param {string} userId - User ID to set
 */
export function setCurrentUserId(userId) {
  currentUserId = userId;
}

/**
 * Gets current profile ID
 * @returns {string|null} Current profile ID
 */
export function getCurrentProfileId() {
  return currentProfileId;
}

/**
 * Sets current profile ID
 * @param {string} profileId - Profile ID to set
 */
export function setCurrentProfileId(profileId) {
  currentProfileId = profileId;
}

/**
 * Gets loaded questions
 * @returns {Array} Array of question objects
 */
export function getLoadedQuestions() {
  return loadedQuestions;
}

/**
 * Sets loaded questions
 * @param {Array} questions - Array of question objects
 */
export function setLoadedQuestions(questions) {
  loadedQuestions = questions || [];
}

/**
 * Gets pillar completion status
 * @returns {Object} Object with v, r, c, m completion status
 */
export function getPillarCompletion() {
  return { ...pillarCompletion };
}

/**
 * Sets pillar completion status
 * @param {string} pillar - Pillar identifier ('v', 'r', 'c', or 'm')
 * @param {boolean} completed - Whether pillar is completed
 */
export function setPillarCompletion(pillar, completed) {
  if (pillarCompletion.hasOwnProperty(pillar)) {
    pillarCompletion[pillar] = completed;
  }
}

/**
 * Gets pillar answers
 * @returns {Object} Object mapping question IDs to answers
 */
export function getPillarAnswers() {
  return { ...pillarAnswers };
}

/**
 * Sets answer for a specific question
 * @param {string} questionId - Question ID
 * @param {number} answer - Answer score
 */
export function setPillarAnswer(questionId, answer) {
  pillarAnswers[questionId] = answer;
}

/**
 * Gets active pillar
 * @returns {string|null} Active pillar identifier
 */
export function getActivePillar() {
  return activePillar;
}

/**
 * Sets active pillar
 * @param {string} pillar - Pillar identifier ('v', 'r', 'c', or 'm')
 */
export function setActivePillar(pillar) {
  activePillar = pillar;
}

/**
 * Gets current state (for debugging)
 * @returns {Object} Current state object
 */
export function getState() {
  return {
    currentUserId,
    currentProfileId,
    loadedQuestions: loadedQuestions.length,
    pillarCompletion: { ...pillarCompletion },
    activePillar,
    visibleTaskCount
  };
}

/**
 * Sets state (for advanced use cases)
 * @param {Object} newState - State object to merge
 */
export function setState(newState) {
  if (newState.currentUserId !== undefined) currentUserId = newState.currentUserId;
  if (newState.currentProfileId !== undefined) currentProfileId = newState.currentProfileId;
  if (newState.loadedQuestions !== undefined) loadedQuestions = newState.loadedQuestions;
  if (newState.pillarCompletion !== undefined) pillarCompletion = { ...newState.pillarCompletion };
  if (newState.activePillar !== undefined) activePillar = newState.activePillar;
  if (newState.visibleTaskCount !== undefined) visibleTaskCount = newState.visibleTaskCount;
}

/**
 * Resets application state
 */
export function resetState() {
  currentProfileId = null;
  currentUserId = null;
  loadedQuestions = [];
  loadedTasks = [];
  pillarCompletion = { v: false, r: false, c: false, m: false };
  pillarAnswers = {};
  activePillar = null;
  visibleTaskCount = 5;
  lastTaskRefreshAt = 0;
  lastQuestGenerationAt = 0;
  if (taskRefreshTimerId) {
    clearInterval(taskRefreshTimerId);
    taskRefreshTimerId = null;
  }
  if (questGenerationTimerId) {
    clearInterval(questGenerationTimerId);
    questGenerationTimerId = null;
  }
  localCustomTasks = [];
}

// Task-related state getters/setters (for tasks UI)
export function getVisibleTaskCount() {
  return visibleTaskCount;
}

export function setVisibleTaskCount(count) {
  visibleTaskCount = count;
}

export function getLastTaskRefreshAt() {
  return lastTaskRefreshAt;
}

export function setLastTaskRefreshAt(timestamp) {
  lastTaskRefreshAt = timestamp;
}

export function getLastQuestGenerationAt() {
  return lastQuestGenerationAt;
}

export function setLastQuestGenerationAt(timestamp) {
  lastQuestGenerationAt = timestamp;
}

export function getTaskRefreshTimerId() {
  return taskRefreshTimerId;
}

export function setTaskRefreshTimerId(timerId) {
  taskRefreshTimerId = timerId;
}

export function getQuestGenerationTimerId() {
  return questGenerationTimerId;
}

export function setQuestGenerationTimerId(timerId) {
  questGenerationTimerId = timerId;
}

export function getLocalCustomTasks() {
  return [...localCustomTasks];
}

export function setLocalCustomTasks(tasks) {
  localCustomTasks = tasks || [];
}

