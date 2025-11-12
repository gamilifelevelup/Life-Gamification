// Supabase Configuration Template

const SUPABASE_CONFIG = {
  SUPABASE_URL: 'SUPABASE_URL', 
  SUPABASE_ANON_KEY: 'SUPABASE_ANON_KEY' 
};

// Initialize Supabase client
let supabaseClient = null;

if (SUPABASE_CONFIG.SUPABASE_URL && SUPABASE_CONFIG.SUPABASE_URL !== 'SUPABASE_URL') {
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

