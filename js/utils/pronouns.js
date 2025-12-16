/**
 * Pronoun Utilities
 * Functions for handling pronoun forms and mappings
 */

/**
 * Gets pronoun forms (subject, object, possessive, reflexive) from pronoun string
 * @param {string} pronouns - Pronoun string (e.g., 'he/him', 'she/her', 'they/them', or custom)
 * @returns {Object} Object with subject, object, possessive, and reflexive forms
 */
export function getPronounForms(pronouns) {
  if (!pronouns || typeof pronouns !== 'string') {
    return { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themself' };
  }

  const pronounMap = {
    'he/him': { subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself' },
    'she/her': { subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself' },
    'they/them': { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themself' }
  };
  
  const normalized = pronouns.trim().toLowerCase();
  if (pronounMap[normalized]) {
    return pronounMap[normalized];
  }
  
  // Handle custom pronouns (e.g., 'xe/xem' or 'they/them/theirs')
  const parts = pronouns.split('/').map(p => p.trim());
  if (parts.length >= 2) {
    return {
      subject: parts[0],
      object: parts[1],
      possessive: parts[2] || `${parts[1]}'s`,
      reflexive: `${parts[0]}self`
    };
  }
  
  // Default fallback
  return { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themself' };
}

/**
 * Maps pronoun values to valid database sex field values
 * @param {string} pronouns - Pronoun string (e.g., 'he/him', 'she/her', 'they/them', or custom)
 * @returns {string|null} Mapped value ('male', 'female', 'other') or null
 */
export function mapPronounsToSex(pronouns) {
  if (!pronouns) return null;
  
  const validValues = ['male', 'female', 'other'];
  const normalized = pronouns.trim().toLowerCase();
  
  if (validValues.includes(normalized)) {
    return normalized;
  }
  
  const pronounMap = {
    'he/him': 'male',
    'she/her': 'female',
    'they/them': 'other',
    'he': 'male',
    'she': 'female',
    'they': 'other'
  };
  
  if (pronounMap[normalized]) {
    return pronounMap[normalized];
  }
  
  return 'other';
}

