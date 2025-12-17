/**
 * Supabase Configuration Template
 * Copy this file to config.js and fill in your actual Supabase credentials
 * 
 * @constant {Object} SUPABASE_CONFIG
 * @property {string} SUPABASE_URL - Supabase project URL
 * @property {string} SUPABASE_ANON_KEY - Supabase anonymous/public API key
 */
const SUPABASE_CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE', 
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE' 
};

/**
 * Global Supabase client instance
 * @type {Object|null}
 */
let supabaseClient = null;

/**
 * Initializes Supabase client by dynamically loading the library
 * Only initializes if valid configuration is provided
 */
if (SUPABASE_CONFIG.SUPABASE_URL && SUPABASE_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && SUPABASE_CONFIG.SUPABASE_ANON_KEY && SUPABASE_CONFIG.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.onload = () => {
    if (typeof supabase !== 'undefined') {
      supabaseClient = supabase.createClient(
        SUPABASE_CONFIG.SUPABASE_URL,
        SUPABASE_CONFIG.SUPABASE_ANON_KEY
      );
      if (typeof window !== 'undefined') {
        window.supabaseClient = supabaseClient;
      }
      console.log('Supabase client initialized');
    }
  };
  document.head.appendChild(script);
} else {
  console.warn('Supabase not configured. Please update config.js with your credentials.');
}

if (typeof window !== 'undefined') {
  window.supabaseClient = supabaseClient;
}

