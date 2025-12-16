/**
 * Task Service
 * Handles task loading and completion
 */

import { waitForSupabase } from './supabase.js';
import { TEST_USER_ID } from '../constants/index.js';
import { loadProfile } from './profileService.js';
import { calculateNextLevelExp } from '../business/calculations.js';
import { getTestUserProfile, saveTestUserProfile } from '../utils/storage.js';

/**
 * Loads tasks from database, optionally sorted by primary trait
 * @param {string|null} primaryTrait - Primary trait to prioritize (v, r, c, or m)
 * @returns {Promise<Array>} Array of task objects
 */
export async function loadTasks(primaryTrait = null) {
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
 * @param {string} profileId - Profile ID
 * @returns {Promise<Object>} Result object with success status, level up info, and XP gained
 */
export async function completeTask(taskId, xpReward, profileId) {
  if (!profileId) {
    console.warn('No profile ID available');
    return { success: false };
  }

  if (profileId === TEST_USER_ID) {
    try {
      const profile = await loadProfile(profileId);
      if (!profile) {
        console.error('Could not load test profile');
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

      if (!profile.completed_tasks) {
        profile.completed_tasks = [];
      }
      profile.completed_tasks.push({
        task_id: taskId,
        completed_at: new Date().toISOString()
      });

      profile.experience = finalExp;
      profile.level = newLevel;
      profile.updated_at = new Date().toISOString();
      saveTestUserProfile(profile);

      if (leveledUp) {
        if (typeof window !== 'undefined') {
          window.lastLevelUp = { from: currentLevel, to: newLevel };
        }
      }
      
      console.log(`Task completed! Gained ${xpReward} XP. ${leveledUp ? `Level up to ${newLevel}!` : ''}`);
      return { success: true, leveledUp, newLevel, xpGained: xpReward };
    } catch (error) {
      console.error('Error completing task (test user):', error);
      return { success: false };
    }
  }

  const client = await waitForSupabase();
  if (!client) {
    console.warn('Supabase not available');
    return { success: false };
  }

  try {
    const profile = await loadProfile(profileId);
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
        profile_id: profileId,
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
      .eq('id', profileId);

    if (updateError) throw updateError;

    if (leveledUp) {
      if (typeof window !== 'undefined') {
        window.lastLevelUp = { from: currentLevel, to: newLevel };
      }
    }
    
    console.log(`Task completed! Gained ${xpReward} XP. ${leveledUp ? `Level up to ${newLevel}!` : ''}`);
    return { success: true, leveledUp, newLevel, xpGained: xpReward };
  } catch (error) {
    console.error('Error completing task:', error);
    return { success: false };
  }
}

/**
 * Fetches archetype from database (used by archetypes.js)
 * @param {string} vLevel - Vitality level ('H' or 'L')
 * @param {string} rLevel - Resilience level ('H' or 'L')
 * @param {string} cLevel - Connection level ('H' or 'L')
 * @param {string} mLevel - Mastery level ('H' or 'L')
 * @returns {Promise<Object|null>} Archetype data or null
 */
export async function fetchArchetypeFromDB(vLevel, rLevel, cLevel, mLevel) {
  const client = await waitForSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('attribute_archetypes')
      .select('id, archetype_name, core_identity')
      .eq('v_level', vLevel)
      .eq('r_level', rLevel)
      .eq('c_level', cLevel)
      .eq('m_level', mLevel)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Error loading archetype from database:', error);
    return null;
  }
}

