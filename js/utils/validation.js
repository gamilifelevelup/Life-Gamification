/**
 * Validation Utilities
 * Functions for validating user input and data
 */

/**
 * Validates email format using regex
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password meets minimum requirements
 * @param {string} password - Password to validate
 * @param {number} minLength - Minimum password length (default: 6)
 * @returns {boolean} True if password is valid
 */
export function isValidPassword(password, minLength = 6) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= minLength;
}

/**
 * Validates age is a positive number within reasonable range
 * @param {string|number} age - Age to validate
 * @param {number} min - Minimum age (default: 1)
 * @param {number} max - Maximum age (default: 150)
 * @returns {boolean} True if age is valid
 */
export function isValidAge(age, min = 1, max = 150) {
  if (age === null || age === undefined || age === '') return false;
  const numAge = typeof age === 'string' ? parseInt(age, 10) : age;
  if (isNaN(numAge)) return false;
  return numAge >= min && numAge <= max;
}

/**
 * Checks if a string is non-empty after trimming
 * @param {string} str - String to check
 * @returns {boolean} True if string is non-empty
 */
export function isNonEmptyString(str) {
  return typeof str === 'string' && str.trim().length > 0;
}

