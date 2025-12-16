/**
 * Supabase Service
 * Handles Supabase client initialization and connection
 */

let supabaseClient = null;

/**
 * Waits for Supabase client to be initialized
 * @returns {Promise<Object|null>} Supabase client instance or null if timeout
 */
export function waitForSupabase() {
  return new Promise((resolve) => {
    if (supabaseClient) {
      resolve(supabaseClient);
      return;
    }
    
    if (typeof window !== 'undefined' && window.supabaseClient) {
      supabaseClient = window.supabaseClient;
      resolve(supabaseClient);
      return;
    }
    
    const checkInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.supabaseClient) {
        supabaseClient = window.supabaseClient;
        clearInterval(checkInterval);
        resolve(supabaseClient);
      } else if (supabaseClient) {
        clearInterval(checkInterval);
        resolve(supabaseClient);
      }
    }, 100);
    
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(null);
    }, 5000);
  });
}

/**
 * Initializes Supabase client
 * @returns {Promise<Object|null>} Supabase client instance or null
 */
export async function initializeSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const client = await waitForSupabase();
  if (client) {
    supabaseClient = client;
  }
  return supabaseClient;
}

/**
 * Gets the current Supabase client instance
 * @returns {Object|null} Supabase client instance or null
 */
export function getSupabaseClient() {
  return supabaseClient || (typeof window !== 'undefined' ? window.supabaseClient : null);
}

/**
 * Sets the Supabase client instance (called by config.js)
 * @param {Object} client - Supabase client instance
 */
export function setSupabaseClient(client) {
  supabaseClient = client;
  if (typeof window !== 'undefined') {
    window.supabaseClient = client;
  }
}

