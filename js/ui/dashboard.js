/**
 * Dashboard UI
 * Handles dashboard display and updates
 */

import { calculateNextLevelExp } from '../business/calculations.js';

/**
 * Updates dashboard UI with profile data
 * @param {Object} profile - Profile data object
 * @returns {string|null} Primary trait identifier (v, r, c, or m)
 */
export function updateDashboard(profile) {
  if (!profile) return null;

  const nameEl = document.getElementById('player-display-name');
  if (nameEl) nameEl.textContent = profile.name || 'Hero';

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

  const coinsEl = document.getElementById('coins-display');
  if (coinsEl) coinsEl.textContent = profile.coins || 0;

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

