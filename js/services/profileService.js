/**
 * Profile Service
 * Handles user profile operations (load, save, update)
 */

import { waitForSupabase } from './supabase.js';
import { TEST_USER_ID } from '../constants/index.js';
import { getTestUserProfile, saveTestUserProfile } from '../utils/storage.js';
import { calculateBaseLevel } from '../business/calculations.js';
import { mapPronounsToSex } from '../utils/pronouns.js';

/**
 * Loads user profile from database by user ID
 * @param {string} userId - Authenticated user ID
 * @returns {Promise<Object|null>} Profile data or null if not found
 */
export async function loadUserProfile(userId) {
  if (userId === TEST_USER_ID) {
    return getTestUserProfile();
  }

  const client = await waitForSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

/**
 * Loads profile data from database by profile ID
 * @param {string} profileId - Profile ID to load
 * @returns {Promise<Object|null>} Profile data or null if not found
 */
export async function loadProfile(profileId) {
  if (!profileId) {
    console.warn('No profile ID provided; skipping remote profile load.');
    return null;
  }

  if (profileId === TEST_USER_ID) {
    return getTestUserProfile();
  }

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

/**
 * Saves or updates user profile in database
 * @param {string} userId - User ID
 * @param {string} name - User's name
 * @param {number|null} age - User's age
 * @param {string} pronouns - User's pronouns
 * @param {string} heroType - Calculated hero type
 * @param {Object} attributes - Object with v, r, c, m attribute values
 * @returns {Promise<string|null>} Profile ID if successful, null otherwise
 */
export async function saveProfile(userId, name, age, pronouns, heroType, attributes) {
  const baseLevel = calculateBaseLevel(attributes);
  const sexValue = mapPronounsToSex(pronouns);

  if (userId === TEST_USER_ID) {
    const testProfile = {
      id: TEST_USER_ID,
      user_id: TEST_USER_ID,
      name: name,
      age: age || null,
      sex: sexValue,
      hero_type: heroType,
      level: baseLevel,
      experience: 0,
      coins: 0,
      attribute_v: attributes.v,
      attribute_r: attributes.r,
      attribute_c: attributes.c,
      attribute_m: attributes.m,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const existing = getTestUserProfile();
    if (existing) {
      testProfile.experience = existing.experience || 0;
      testProfile.level = existing.level || baseLevel;
      testProfile.coins = existing.coins || 0;
    }
    
    saveTestUserProfile(testProfile);
    return TEST_USER_ID;
  }

  const client = await waitForSupabase();
  if (!client) {
    console.warn('Supabase not available, profile not saved');
    return null;
  }

  if (!userId) {
    console.warn('No authenticated user; skipping remote profile save (local-only mode).');
    return null;
  }

  try {
    const existingProfile = await loadUserProfile(userId);
    
    if (existingProfile) {
      const { data, error } = await client
        .from('profiles')
        .update({
          name: name,
          age: age || null,
          sex: sexValue,
          hero_type: heroType,
          level: baseLevel,
          attribute_v: attributes.v,
          attribute_r: attributes.r,
          attribute_c: attributes.c,
          attribute_m: attributes.m
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } else {
      const { data, error } = await client
        .from('profiles')
        .insert({
          user_id: userId,
          name: name,
          age: age || null,
          sex: sexValue,
          hero_type: heroType,
          level: baseLevel,
          experience: 0,
          coins: 0,
          attribute_v: attributes.v,
          attribute_r: attributes.r,
          attribute_c: attributes.c,
          attribute_m: attributes.m
        })
        .select()
        .single();

      if (error) {
        console.error('Database error details:', error);
        throw error;
      }
      return data.id;
    }
  } catch (error) {
    console.error('Error saving profile:', error);
    return null;
  }
}

