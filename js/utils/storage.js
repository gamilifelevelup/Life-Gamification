/**
 * Storage Utilities
 * Functions for localStorage operations
 */

import { TEST_USER_STORAGE_KEY, CUSTOM_TASK_STORAGE_KEY } from '../constants/index.js';

/**
 * Gets a test user profile from localStorage
 * @returns {Object|null} Test user profile or null
 */
export function getTestUserProfile() {
  try {
    const stored = localStorage.getItem(TEST_USER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error('Error loading test user:', error);
    return null;
  }
}

/**
 * Saves a test user profile to localStorage
 * @param {Object} profile - Profile data to save
 */
export function saveTestUserProfile(profile) {
  try {
    localStorage.setItem(TEST_USER_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving test user:', error);
  }
}

/**
 * Loads locally-stored custom tasks from localStorage
 * @returns {Array} Array of custom tasks
 */
export function loadLocalCustomTasks() {
  try {
    const raw = localStorage.getItem(CUSTOM_TASK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('Failed to load local custom tasks', err);
    return [];
  }
}

/**
 * Persists local custom tasks to localStorage
 * @param {Array} tasks - Array of custom tasks to save
 */
export function saveLocalCustomTasks(tasks) {
  try {
    localStorage.setItem(CUSTOM_TASK_STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.warn('Failed to save local custom tasks', err);
  }
}

/**
 * Removes a storage item by key
 * @param {string} key - Storage key to remove
 */
export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing storage item ${key}:`, error);
  }
}

