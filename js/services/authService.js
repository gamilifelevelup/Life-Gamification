/**
 * Authentication Service
 * Handles user authentication (sign up, sign in, session management)
 */

import { waitForSupabase } from './supabase.js';
import { isValidEmail } from '../utils/validation.js';

/**
 * Signs up a new user with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<Object>} Result object with success status and user data or error message
 */
export async function signUp(email, password) {
  const client = await waitForSupabase();
  if (!client) {
    return { success: false, error: 'Supabase not available' };
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!isValidEmail(trimmedEmail)) {
    return { success: false, error: 'Please enter a valid email address' };
  }

  try {
    const redirectTo = `${window.location.origin}/confirm.html`;
    
    const { data, error } = await client.auth.signUp({
      email: trimmedEmail,
      password: password,
      options: {
        emailRedirectTo: redirectTo
      }
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return { success: false, error: 'This email is already registered. Please log in instead.' };
      }
      if (error.message.includes('disabled')) {
        return { success: false, error: 'Email signups are disabled. Please contact support or check Supabase settings.' };
      }
      if (error.message.includes('invalid')) {
        return { success: false, error: 'Please enter a valid email address' };
      }
      throw error;
    }

    if (data.user) {
      if (data.session === null) {
        return { 
          success: true, 
          user: data.user, 
          needsConfirmation: true,
          message: 'Please check your email to confirm your account before continuing.'
        };
      }
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Sign up failed. Please try again.' };
  } catch (error) {
    console.error('Sign up error:', error);
    let errorMessage = 'Sign up failed. Please try again.';
    if (error.message) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        errorMessage = 'This email is already registered. Please log in instead.';
      } else if (error.message.includes('invalid')) {
        errorMessage = 'Please enter a valid email address.';
      } else {
        errorMessage = error.message;
      }
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Signs in an existing user with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<Object>} Result object with success status and user data or error message
 */
export async function signIn(email, password) {
  const client = await waitForSupabase();
  if (!client) {
    return { success: false, error: 'Supabase not available' };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password
    });

    if (error) throw error;

    if (data.user) {
      return { success: true, user: data.user };
    }

    return { success: false, error: 'Login failed' };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message || 'Login failed. Please check your credentials.' };
  }
}

/**
 * Signs out the current user
 * @returns {Promise<Object>} Result object with success status
 */
export async function signOut() {
  const client = await waitForSupabase();
  if (!client) return { success: false, error: 'Supabase not available' };

  try {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Checks for an existing user session
 * @returns {Promise<Object|null>} Session object if user is logged in, null otherwise
 */
export async function checkSession() {
  const client = await waitForSupabase();
  if (!client) return null;

  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;

    if (session && session.user) {
      return session;
    }

    return null;
  } catch (error) {
    console.error('Session check error:', error);
    return null;
  }
}

