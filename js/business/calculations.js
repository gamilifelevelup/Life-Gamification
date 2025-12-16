/**
 * Business Logic: Calculations
 * Core calculation functions for attributes, levels, and XP
 */

import { DEFAULT_ATTRIBUTES, QUESTION_CONFIG, DIFFICULTY_MULTIPLIERS, ATTRIBUTE_BONUS } from '../constants/index.js';

/**
 * Calculates attributes from question answers
 * @param {Array<number>} answers - Array of answer scores (1-5)
 * @param {Array<Object>} questions - Array of question objects with trait_weights
 * @param {Object} baseAttributes - Base attribute values (default: DEFAULT_ATTRIBUTES)
 * @returns {Object} Object with v, r, c, m attribute values
 */
export function calculateAttributesFromAnswers(answers, questions, baseAttributes = DEFAULT_ATTRIBUTES) {
  const attributes = { ...baseAttributes };

  answers.forEach((answer, index) => {
    const question = questions[index];
    if (question && question.trait_weights) {
      const weights = question.trait_weights;
      const deviation = answer - QUESTION_CONFIG.NEUTRAL_VALUE;
      attributes.v += Math.round(deviation * (weights.v || 0) * 2);
      attributes.r += Math.round(deviation * (weights.r || 0) * 2);
      attributes.c += Math.round(deviation * (weights.c || 0) * 2);
      attributes.m += Math.round(deviation * (weights.m || 0) * 2);
    }
  });

  attributes.v = Math.max(1, attributes.v);
  attributes.r = Math.max(1, attributes.r);
  attributes.c = Math.max(1, attributes.c);
  attributes.m = Math.max(1, attributes.m);

  return attributes;
}

/**
 * Calculates base level from total attribute scores
 * Formula: floor([total_scores / 50] * 25)
 * @param {Object} attributes - Object with v, r, c, m attribute values
 * @returns {number} Base level (minimum 1)
 */
export function calculateBaseLevel(attributes) {
  const totalScores = (attributes.v || 0) + (attributes.r || 0) + (attributes.c || 0) + (attributes.m || 0);
  const baseLevel = Math.floor((totalScores / 50) * 25);
  return Math.max(1, baseLevel);
}

/**
 * Calculates experience required for next level
 * Formula: next_level = 1000 * Base_level^2
 * @param {number} baseLevel - Current base level
 * @returns {number} Experience points required for next level
 */
export function calculateNextLevelExp(baseLevel) {
  if (!baseLevel || baseLevel < 1) return 1000;
  return 1000 * Math.pow(baseLevel, 2);
}

/**
 * Computes dynamic XP for a task based on base XP, difficulty, and attribute focus
 * XPT = Base XP × Difficulty Multiplier × Attribute Focus Bonus
 * @param {Object} task - Task object from DB
 * @param {Object|null} profile - Player profile with attribute_v/r/c/m
 * @returns {number} Final XP reward for this task
 */
export function computeTaskXp(task, profile) {
  const baseXp = task.experience_reward || 10;

  let difficultyType = 'standard';
  const d = task.difficulty || 1;
  if (d <= 1) difficultyType = 'micro';
  else if (d === 2) difficultyType = 'standard';
  else difficultyType = 'challenge';

  let difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficultyType] || 1.0;
  let attributeBonus = ATTRIBUTE_BONUS.default;

  if (profile && Array.isArray(task.trait_focus) && task.trait_focus.length > 0) {
    const attrs = {
      v: profile.attribute_v ?? 10,
      r: profile.attribute_r ?? 10,
      c: profile.attribute_c ?? 10,
      m: profile.attribute_m ?? 10
    };

    const ordered = Object.entries(attrs).sort((a, b) => a[1] - b[1]);
    const weakest = ordered[0]?.[0];
    const secondWeakest = ordered[1]?.[0];

    if (weakest && task.trait_focus.includes(weakest)) {
      attributeBonus = ATTRIBUTE_BONUS.weakest;
    } else if (secondWeakest && task.trait_focus.includes(secondWeakest)) {
      attributeBonus = ATTRIBUTE_BONUS.secondWeakest;
    }
  }

  return Math.max(1, Math.round(baseXp * difficultyMultiplier * attributeBonus));
}

