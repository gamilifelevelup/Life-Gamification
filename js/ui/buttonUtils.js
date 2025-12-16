/**
 * Button Utilities
 * Helper functions for button state management
 */

/**
 * Sets loading state on a button
 * @param {HTMLElement} button - Button element
 * @param {boolean} isLoading - Whether button is loading
 */
export function setButtonLoading(button, isLoading) {
  if (!button) return;
  
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.textContent;
    button.classList.add('loading');
    button.textContent = '';
  } else {
    button.disabled = false;
    button.classList.remove('loading');
    button.textContent = button.dataset.originalText || button.textContent;
  }
}

