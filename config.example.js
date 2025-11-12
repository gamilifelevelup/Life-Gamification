// Supabase Configuration Template
// Copy this file to config.js and fill in your actual credentials
// Get them from: Supabase Dashboard > Settings > API
// 
// IMPORTANT: Never commit config.js to version control!

const SUPABASE_CONFIG = {
  SUPABASE_URL: 'YOUR_SUPABASE_URL_HERE', // e.g., 'https://xxxxxxxxxxxxx.supabase.co'
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY_HERE' // Your anon/public key
};

// Initialize Supabase client
let supabaseClient = null;

if (SUPABASE_CONFIG.SUPABASE_URL && SUPABASE_CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE') {
  // Load Supabase client library dynamically
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.onload = () => {
    if (typeof supabase !== 'undefined') {
      supabaseClient = supabase.createClient(
        SUPABASE_CONFIG.SUPABASE_URL,
        SUPABASE_CONFIG.SUPABASE_ANON_KEY
      );
      console.log('Supabase client initialized');
    }
  };
  document.head.appendChild(script);
} else {
  console.warn('Supabase not configured. Please update config.js with your credentials.');
}

