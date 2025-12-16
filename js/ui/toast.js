/**
 * Toast Notification System
 * Displays temporary notifications to the user
 */

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info' (default: 'success')
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showToast(message, type = 'success', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Shows an error toast notification
 * @param {string} message - Error message to display
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
export function showErrorToast(message, duration = 3000) {
  showToast(message, 'error', duration);
}

