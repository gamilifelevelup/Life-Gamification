/**
 * Question Service
 * Handles question loading and answer saving
 */

import { waitForSupabase } from './supabase.js';
import { TEST_USER_ID } from '../constants/index.js';

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
 * Loads active questions from database
 * @returns {Promise<Array>} Array of question objects
 */
export async function loadQuestions() {
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
 * Filters questions by pillar (trait focus)
 * @param {Array} questions - Array of question objects
 * @param {string} pillar - Pillar identifier ('v', 'r', 'c', or 'm')
 * @returns {Array} Filtered array of questions
 */
export function filterQuestionsByPillar(questions, pillar) {
  if (!questions || questions.length === 0) return [];

  let filtered = questions.filter((q) => {
    if (!q.trait_weights) return false;
    const w = q.trait_weights;
    const v = w.v || 0;
    const r = w.r || 0;
    const c = w.c || 0;
    const m = w.m || 0;
    const max = Math.max(v, r, c, m);
    const map = { v, r, c, m };
    return map[pillar] === max && max > 0;
  });

  if (!filtered || filtered.length === 0) {
    return questions;
  }

  return filtered;
}

/**
 * Saves question answers to database
 * @param {string} profileId - Profile ID
 * @param {Array} questions - Array of question objects
 * @param {Array} answers - Array of answer scores
 * @returns {Promise<void>}
 */
export async function saveQuestionAnswers(profileId, questions, answers) {
  if (!profileId) return;

  if (profileId === TEST_USER_ID) {
    try {
      const { getTestUserProfile, saveTestUserProfile } = await import('../utils/storage.js');
      const testProfile = getTestUserProfile();
      if (testProfile) {
        testProfile.question_answers = questions.map((question, index) => ({
          question_id: question.id,
          score: answers[index] || 3
        }));
        testProfile.updated_at = new Date().toISOString();
        saveTestUserProfile(testProfile);
        console.log('Question answers saved (test user)');
      }
    } catch (error) {
      console.error('Error saving question answers (test user):', error);
    }
    return;
  }

  const client = await waitForSupabase();
  if (!client) return;

  try {
    const answerRecords = questions.map((question, index) => ({
      profile_id: profileId,
      question_id: question.id,
      score: answers[index] || 3
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

