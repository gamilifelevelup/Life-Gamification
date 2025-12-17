/**
 * Questions UI
 * Handles question display and answer collection
 */

import { filterQuestionsByPillar } from '../services/questionService.js';
import { QUESTION_CONFIG } from '../constants/index.js';

/**
 * Generates question UI elements for a specific pillar
 * @param {Array} questions - Array of all question objects
 * @param {string} pillar - Pillar identifier ('v', 'r', 'c', or 'm')
 * @param {Object} existingAnswers - Object mapping question IDs to existing answers
 */
export function generateQuestions(questions, pillar, existingAnswers = {}) {
  const container = document.getElementById('questions-container');
  if (!container) {
    console.error('Questions container not found');
    return;
  }

  container.innerHTML = '<p>Loading questions...</p>';

  // Filter questions by pillar
  const filteredQuestions = filterQuestionsByPillar(questions, pillar);

  if (filteredQuestions.length === 0) {
    container.innerHTML = '<p>No questions available for this pillar.</p>';
    return;
  }

  container.innerHTML = '';
  filteredQuestions.forEach((question, index) => {
    const existingValue = existingAnswers[question.id] ?? QUESTION_CONFIG.DEFAULT_SCORE;
    const div = document.createElement('div');
    div.innerHTML = `
      <label>
        <span>${question.title || `Question ${index + 1}`}</span>
        <p style="margin: 0.5rem 0; color: var(--text-muted); font-size: 0.9rem;">${question.prompt}</p>
        <input type="range" min="${QUESTION_CONFIG.MIN_SCORE}" max="${QUESTION_CONFIG.MAX_SCORE}" value="${existingValue}" data-question-id="${question.id}">
        <div style="display: flex; justify-content: space-between; margin-top: 0.5rem; font-size: 0.85rem; color: var(--text-muted);">
          <span>${QUESTION_CONFIG.MIN_SCORE} - Not at all</span>
          <span>${QUESTION_CONFIG.MAX_SCORE} - Very much</span>
        </div>
      </label>
    `;
    container.appendChild(div);
  });
}

/**
 * Gets current question answers from the UI
 * @returns {Array<number>} Array of answer scores
 */
export function getQuestionAnswers() {
  const questionElements = document.querySelectorAll('[data-question-id]');
  const answers = [];
  
  questionElements.forEach((el) => {
    const value = Number(el.value);
    if (!isNaN(value)) {
      answers.push(value);
    }
  });
  
  return answers;
}

