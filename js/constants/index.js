/**
 * Application Constants
 * Centralized configuration values and constants used throughout the application
 */

// Test user system (for development/testing)
export const TEST_USER_ID = 'test-user-local';
export const TEST_USER_STORAGE_KEY = 'life-gamification-test-user';
export const CUSTOM_TASK_STORAGE_KEY = 'life-gamification-custom-tasks';

// Screen identifiers
export const SCREENS = {
  WELCOME: 'welcome-screen',
  START: 'start-screen',
  AUTH: 'auth-screen',
  STORY_SCENE_1: 'story-scene-1',
  STORY_SCENE_2: 'story-scene-2',
  STORY_SCENE_3: 'story-scene-3',
  STORY_SCENE_4: 'story-scene-4',
  MAP: 'map-screen',
  INFO: 'info-screen',
  QUESTION: 'question-screen',
  RESULT: 'result-screen',
  DASHBOARD: 'dashboard-screen'
};

// Question configuration
export const QUESTION_CONFIG = {
  MIN_SCORE: 1,
  MAX_SCORE: 5,
  DEFAULT_SCORE: 3,
  NEUTRAL_VALUE: 3
};

// Default attribute values
export const DEFAULT_ATTRIBUTES = {
  v: 10,
  r: 10,
  c: 10,
  m: 10
};

// Task configuration
export const TASK_CONFIG = {
  PAGE_SIZE: 5,
  REFRESH_COOLDOWN_MS: 60000, // 60 seconds
  QUEST_GENERATION_COOLDOWN_MS: 300000, // 5 minutes
  DEFAULT_XP: 10,
  CUSTOM_TASK_XP: 1
};

// Difficulty multipliers for XP calculation
export const DIFFICULTY_MULTIPLIERS = {
  micro: 0.5,
  standard: 1.0,
  challenge: 2.0
};

// Attribute bonus multipliers
export const ATTRIBUTE_BONUS = {
  weakest: 1.5,
  secondWeakest: 1.2,
  default: 1.0
};

// Pillar identifiers
export const PILLARS = {
  VITALITY: 'v',
  RESILIENCE: 'r',
  CONNECTION: 'c',
  MASTERY: 'm'
};

// Pillar information
export const PILLAR_INFO = {
  v: { name: 'Vitality', icon: '⚔️', color: '#ff6b7c', short: 'V' },
  r: { name: 'Resilience', icon: '🛡️', color: '#8b9aff', short: 'R' },
  c: { name: 'Connection', icon: '🤝', color: '#36d6ff', short: 'C' },
  m: { name: 'Mastery', icon: '📜', color: '#ffd93d', short: 'M' }
};

// Local fallback archetype matrix (16 archetypes)
export const LOCAL_ARCHETYPE_MATRIX = {
  'HHHH': { id: 1, name: 'The True Sovereign', coreIdentity: 'Perfect Balance (Tier 2 Master).' },
  'LLLL': { id: 2, name: 'The Broken Vassal', coreIdentity: 'Critical deficit in all Pillars (The Wanderer).' },
  'LHHH': { id: 3, name: 'The Frail Archon', coreIdentity: 'Strong mental, social, and mastery skills, but lacks physical fuel.' },
  'HLHH': { id: 4, name: 'The Tempestuous Noble', coreIdentity: 'High capability and energy, but lacks discipline and focus.' },
  'HHLH': { id: 5, name: 'The Vigilant Bastion', coreIdentity: 'High self-sufficiency, but isolated and lacking connection.' },
  'HHHL': { id: 6, name: 'The Vibrant Chancellor', coreIdentity: 'High energy, focus, and social strength, but weak practical resource management.' },
  'LLHH': { id: 7, name: 'The Wayward Alchemist', coreIdentity: 'Strong social ties and skills, but chaotic energy and focus.' },
  'LHLH': { id: 8, name: 'The Ascetic Crafter', coreIdentity: 'High drive and skill, sacrificing recovery and social life (The Hustler).' },
  'LHHL': { id: 9, name: 'The Cloistered Oracle', coreIdentity: 'Mentally disciplined and connected, but lacking physical fuel and mastery.' },
  'HLLH': { id: 10, name: 'The Unruly Freeblade', coreIdentity: 'High energy and skills, but impulsive and socially awkward.' },
  'HLHL': { id: 11, name: 'The Wandering Troubadour', coreIdentity: 'High energy and social ease, but lacks focus and practical skills (The Social Butterfly).' },
  'HHLL': { id: 12, name: 'The Wild Huntsman', coreIdentity: 'High energy and focus, lacking practical skills and connection.' },
  'LLLH': { id: 13, name: 'The Forsaken Scribe', coreIdentity: 'Possesses skills alone; critical deficits in body, mind, and social pillars.' },
  'LLHL': { id: 14, name: 'The Grieving Shepherd', coreIdentity: 'Possesses social grace alone; deficits in vitality, resilience, and mastery.' },
  'LHLL': { id: 15, name: 'The Stark Monk', coreIdentity: 'Possesses mental discipline alone; deficits in body, social, and practical skills.' },
  'HLLL': { id: 16, name: 'The Untamed Thrall', coreIdentity: 'Possesses physical vitality alone; deficits in control and structure.' }
};

// Dialogue responses for story scenes
export const DIALOGUE_RESPONSES = {
  scene1: {
    who: "I am a guide, a keeper of the old ways. I have watched over this realm for many cycles, waiting for one such as you to rise again.",
    where: "You are in the realm of your inner kingdom—a place that reflects your very essence. The Shadow Blight has left its mark here, but hope remains.",
    help: "I will guide you to the four Great Island, where you must restore the four relics: Vitality, Resilience, Connection, and Mastery. Together, we will reclaim what was lost."
  },
  scene2: {
    islands: "The four Great Island are sacred places, each representing one of the pillars of your reign. To restore your throne, you must journey to each and prove yourself worthy.",
    throne: "Your throne awaits, but first you must restore the four relics. Each island will test you, and through these trials, you will regain the power you once held.",
    blight: "The Shadow Blight is a corruption that feeds on neglect and weakness. It tarnished your four great pillars, but they can be cleansed through dedication and growth."
  },
  scene3: {
    trial: "The Scribe's Trial is a test of your true nature. Through questions, we will determine your Ascension Class—the path that best suits your spirit.",
    relics: "The four relics are Vitality—your physical strength, Resilience—your mental fortitude, Connection—your bonds with others, and Mastery—your pursuit of excellence.",
    ready: "You are ready, fallen one. The journey ahead will be challenging, but I see the spark of greatness within you. Trust in yourself, and we will succeed together."
  }
};

// Storage keys
export const STORAGE_KEYS = {
  TEST_USER: TEST_USER_STORAGE_KEY,
  CUSTOM_TASKS: CUSTOM_TASK_STORAGE_KEY
};

