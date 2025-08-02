/**
 * String utilities for Material MAP
 * Provides string manipulation and sanitization functions
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} unsafe - The unsafe string that might contain HTML
 * @returns {string} The escaped string
 */
export function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') {
    return String(unsafe);
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Validate and sanitize URLs
 * @param {string} url - The URL to sanitize
 * @returns {string} The sanitized URL or '#' if invalid
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== 'string') {
    return '#';
  }
  
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return '#';
    }
    return escapeHtml(url);
  } catch (e) {
    // Invalid URL
    return '#';
  }
}

/**
 * Format date in DD.MM.YYYY format
 * @param {string} dateString - The date string to format
 * @returns {string} The formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

// Export a singleton instance for backward compatibility
const StringUtils = {
  escapeHtml,
  sanitizeUrl,
  formatDate
};

// For backward compatibility
window.StringUtils = StringUtils;

export default StringUtils;