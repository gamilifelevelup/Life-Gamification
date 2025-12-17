/**
 * Screen Manager
 * Handles screen navigation and visibility
 */

const screens = document.querySelectorAll('.screen');

/**
 * Shows a specific screen by ID and hides all others
 * @param {string} id - The ID of the screen element to show
 */
export function showScreen(id) {
  screens.forEach(s => s.classList.remove('active'));
  const targetScreen = document.getElementById(id);
  if (targetScreen) {
    targetScreen.classList.add('active');
  } else {
    console.warn(`Screen with id "${id}" not found`);
  }
}

