/**
 * Loading Manager for Material MAP
 * Provides a unified way to manage loading states and progress
 */

/**
 * Loading state
 * @typedef {Object} LoadingState
 * @property {number} totalFiles - Total number of files to process
 * @property {number} processedFiles - Number of processed files
 * @property {string[]} failedFiles - Array of failed file names
 * @property {boolean} isOffline - Whether the app is offline
 * @property {Object|null} lastError - Last error that occurred
 */

/**
 * Loading Manager
 */
class LoadingManager {
  constructor() {
    /**
     * Current loading state
     * @type {LoadingState}
     */
    this.state = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: [],
      isOffline: false,
      lastError: null
    };

    // DOM elements
    this.loadingContainer = null;
    this.progressFill = null;
    this.loadingDetails = null;
    this.errorContainer = null;
    this.errorDescription = null;
    this.retryButton = null;
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Initialize the loading manager
   */
  initialize() {
    // Get DOM elements
    this.loadingContainer = document.getElementById('loading-container');
    this.progressFill = document.getElementById('progress-fill');
    this.loadingDetails = document.getElementById('loading-details');
    this.errorContainer = document.getElementById('error-container');
    this.errorDescription = document.getElementById('error-description');
    this.retryButton = document.getElementById('retry-button');
    
    // Set up retry button
    if (this.retryButton) {
      this.retryButton.addEventListener('click', () => {
        if (typeof this.onRetry === 'function') {
          this.onRetry();
        }
      });
    }
    
    // Update offline status
    this.state.isOffline = !navigator.onLine;
  }

  /**
   * Reset the loading state
   */
  reset() {
    this.state = {
      totalFiles: 0,
      processedFiles: 0,
      failedFiles: [],
      isOffline: !navigator.onLine,
      lastError: null
    };
  }

  /**
   * Show the loading indicator
   */
  showLoading() {
    this.reset();
    
    if (this.loadingContainer) {
      this.loadingContainer.style.display = 'flex';
    }
    
    if (this.errorContainer) {
      this.errorContainer.style.display = 'none';
    }
  }

  /**
   * Hide the loading indicator
   */
  hideLoading() {
    if (this.loadingContainer) {
      this.loadingContainer.style.display = 'none';
    }
  }

  /**
   * Update the loading progress
   * @param {number} current - Current progress value
   * @param {number} total - Total progress value
   * @param {string} details - Progress details text
   */
  updateProgress(current, total, details) {
    if (this.progressFill) {
      const percentage = (current / total) * 100;
      this.progressFill.style.width = `${percentage}%`;
    }
    
    if (this.loadingDetails && details) {
      // Enhanced details with error information
      let detailsText = details;
      if (this.state.failedFiles.length > 0) {
        detailsText += ` (${this.state.failedFiles.length} files failed)`;
      }
      if (this.state.isOffline) {
        detailsText += " [Offline Mode]";
      }
      this.loadingDetails.textContent = detailsText;
    }
  }

  /**
   * Show an error message
   * @param {string} message - The error message
   * @param {string} details - Error details
   * @param {Object} options - Additional options
   */
  showError(message, details, options = {}) {
    this.hideLoading();
    
    // Store error in loading state
    this.state.lastError = { message, details, timestamp: new Date() };
    
    if (this.errorContainer && this.errorDescription) {
      let errorText = details || message;
      
      // Add contextual information
      if (this.state.failedFiles.length > 0) {
        errorText += `\n\nFailed files (${this.state.failedFiles.length}): ${this.state.failedFiles.slice(0, 3).join(', ')}`;
        if (this.state.failedFiles.length > 3) {
          errorText += ` and ${this.state.failedFiles.length - 3} more...`;
        }
      }
      
      if (this.state.processedFiles > 0) {
        errorText += `\n\nSuccessfully processed: ${this.state.processedFiles} files`;
      }
      
      if (options.isNetworkError && !navigator.onLine) {
        errorText += "\n\nYou appear to be offline. Please check your internet connection.";
      }
      
      this.errorDescription.textContent = errorText;
      this.errorContainer.style.display = 'flex';
    }
  }

  /**
   * Track a file processing failure
   * @param {string} fileName - The name of the failed file
   * @param {Error} error - The error that occurred
   */
  trackFailure(fileName, error) {
    this.state.failedFiles.push(fileName);
    console.error(`Error processing file ${fileName}:`, error);
  }

  /**
   * Track a file processing success
   */
  trackSuccess() {
    this.state.processedFiles++;
  }

  /**
   * Set the retry callback
   * @param {Function} callback - The function to call when retry is clicked
   */
  setRetryCallback(callback) {
    this.onRetry = callback;
  }

  /**
   * Get the current loading state
   * @returns {LoadingState} The current loading state
   */
  getState() {
    return { ...this.state };
  }
}

// Create a singleton instance
const loadingManager = new LoadingManager();

// For backward compatibility
window.loadingManager = loadingManager;

export default loadingManager;