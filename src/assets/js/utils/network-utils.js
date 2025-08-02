/**
 * Network utilities for Material MAP
 * Provides enhanced fetch operations with retry logic and error handling
 */

/**
 * Fetch with retry mechanism
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<Response>} The fetch response
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        return response;
      }
      
      // If it's a client error (4xx), don't retry
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // For server errors (5xx), retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
      
    } catch (error) {
      lastError = error;
      
      // Don't retry on timeout or network errors if offline
      if (error.name === 'AbortError' || !navigator.onLine) {
        break;
      }
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw lastError;
}

/**
 * Fetch JSON with retry
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} The parsed JSON response
 */
export async function fetchJsonWithRetry(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  return await response.json();
}

/**
 * Fetch text with retry
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<string>} The text response
 */
export async function fetchTextWithRetry(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  return await response.text();
}

/**
 * Check if the browser is online
 * @returns {boolean} True if online, false otherwise
 */
export function isOnline() {
  return navigator.onLine;
}

// Export a singleton instance for backward compatibility
const NetworkUtils = {
  fetchWithRetry,
  fetchJsonWithRetry,
  fetchTextWithRetry,
  isOnline
};

// For backward compatibility
window.NetworkUtils = NetworkUtils;

export default NetworkUtils;