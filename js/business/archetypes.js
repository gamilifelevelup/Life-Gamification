/**
 * Business Logic: Archetypes
 * Handles archetype resolution from attributes
 */

import { LOCAL_ARCHETYPE_MATRIX } from '../constants/index.js';

/**
 * Classifies raw attributes into High/Low pattern for V, R, C, M
 * Uses each attribute's relation to the average of all four pillars
 * @param {Object} attributes - Object with v, r, c, m numbers
 * @returns {{v: 'H'|'L', r: 'H'|'L', c: 'H'|'L', m: 'H'|'L'}}
 */
export function classifyAttributeLevels(attributes) {
  const values = [
    attributes.v || 0,
    attributes.r || 0,
    attributes.c || 0,
    attributes.m || 0
  ];
  const avg = (values[0] + values[1] + values[2] + values[3]) / 4 || 0;

  const levelFor = (value) => (value >= avg ? 'H' : 'L');

  return {
    v: levelFor(attributes.v || 0),
    r: levelFor(attributes.r || 0),
    c: levelFor(attributes.c || 0),
    m: levelFor(attributes.m || 0)
  };
}

/**
 * Resolves the player's archetype from their attributes using the 16-matrix
 * Prefers fetching from the `attribute_archetypes` table; falls back to local matrix
 * @param {Object} attributes - Object with v, r, c, m numbers
 * @param {Function} fetchFromDB - Function to fetch archetype from database
 * @returns {Promise<{id: number|null, name: string, coreIdentity: string, levels: Object}>}
 */
export async function resolveArchetype(attributes, fetchFromDB) {
  const levels = classifyAttributeLevels(attributes);
  const key = `${levels.v}${levels.r}${levels.c}${levels.m}`;

  // Try database first if fetchFromDB is provided
  if (fetchFromDB && typeof fetchFromDB === 'function') {
    try {
      const data = await fetchFromDB(levels.v, levels.r, levels.c, levels.m);
      if (data) {
        return {
          id: data.id,
          name: data.archetype_name,
          coreIdentity: data.core_identity || '',
          levels
        };
      }
    } catch (err) {
      console.warn('Error loading archetype from database, using local matrix.', err);
    }
  }

  // Fallback: local matrix
  const local = LOCAL_ARCHETYPE_MATRIX[key] || {
    id: null,
    name: 'Uncharted Archetype',
    coreIdentity: 'Your pattern is unique; the Royal Scribes have not yet named it.'
  };

  return {
    id: local.id,
    name: local.name,
    coreIdentity: local.coreIdentity,
    levels
  };
}

