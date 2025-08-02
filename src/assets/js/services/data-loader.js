/**
 * Data Loader Service for Material MAP
 * Provides unified data loading with caching and offline support
 */

import { getBasePath } from '../utils/path-utils.js';
import { fetchJsonWithRetry, fetchTextWithRetry, isOnline } from '../utils/network-utils.js';
import { parseYAMLSafely } from './yaml-parser.js';
import loadingManager from '../components/loading-manager.js';
import notificationSystem from '../components/notification-system.js';

/**
 * Data Loader Service
 */
class DataLoaderService {
  constructor() {
    this.basePath = getBasePath();
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.isOnline = navigator.onLine;
    this.version = null;
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatusChange();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOnlineStatusChange();
    });
  }

  /**
   * Load materials data
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} The loaded materials data
   */
  async loadMaterials(options = {}) {
    const {
      progressive = true,
      useCache = true,
      forceRefresh = false
    } = options;

    try {
      // Show loading indicator
      loadingManager.showLoading();
      loadingManager.updateProgress(0, 100, "Initializing data loader...");
      
      // Check cache first
      if (useCache && !forceRefresh && this.cache.has('materials')) {
        console.log('📦 Loading materials from cache');
        loadingManager.updateProgress(100, 100, "Loaded from cache");
        setTimeout(() => loadingManager.hideLoading(), 500);
        return this.cache.get('materials');
      }

      // Progressive loading strategy
      if (progressive) {
        return await this.loadProgressively();
      } else {
        return await this.loadComplete();
      }

    } catch (error) {
      console.error('❌ Failed to load materials:', error);
      
      // Try fallback strategies
      return await this.handleLoadingError(error);
    }
  }

  /**
   * Progressive loading: Load index first, then full data
   * @returns {Promise<Object>} The loaded materials data
   */
  async loadProgressively() {
    console.log('🚀 Starting progressive data loading...');
    loadingManager.updateProgress(10, 100, "Loading search index...");
    
    try {
      // Phase 1: Load search index and categories (fast)
      const [searchIndex, categories] = await Promise.all([
        this.fetchWithCache('search-index.json'),
        this.fetchWithCache('categories.json')
      ]);

      loadingManager.updateProgress(30, 100, "Loading full data...");

      // Phase 2: Load full materials data (slower)
      const fullData = await this.fetchWithCache('materials-min.json');
      
      // Merge and cache complete dataset
      const completeData = {
        materials: fullData.materials,
        metadata: fullData.metadata,
        searchIndex: searchIndex.materials,
        categories: categories
      };

      this.cache.set('materials', completeData);
      this.version = fullData.metadata.version;

      loadingManager.updateProgress(100, 100, "Loading complete!");
      setTimeout(() => loadingManager.hideLoading(), 500);
      
      console.log('✅ Progressive loading completed');
      return completeData;
    } catch (error) {
      loadingManager.showError("Failed to load materials", error.message);
      throw error;
    }
  }

  /**
   * Complete loading: Load full dataset at once
   * @returns {Promise<Object>} The loaded materials data
   */
  async loadComplete() {
    console.log('🚀 Loading complete dataset...');
    loadingManager.updateProgress(10, 100, "Loading full dataset...");
    
    try {
      const fullData = await this.fetchWithCache('materials.json');
      
      this.cache.set('materials', fullData);
      this.version = fullData.metadata.version;

      loadingManager.updateProgress(100, 100, "Loading complete!");
      setTimeout(() => loadingManager.hideLoading(), 500);
      
      console.log('✅ Complete loading finished');
      return fullData;
    } catch (error) {
      loadingManager.showError("Failed to load materials", error.message);
      throw error;
    }
  }

  /**
   * Fetch with caching
   * @param {string} filename - The file to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} The fetched data
   */
  async fetchWithCache(filename, options = {}) {
    const cacheKey = `fetch_${filename}`;
    
    // Return existing promise if already loading
    if (this.loadingPromises.has(cacheKey)) {
      return await this.loadingPromises.get(cacheKey);
    }

    // Create loading promise
    const loadingPromise = this.performFetch(filename, options);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const result = await loadingPromise;
      this.loadingPromises.delete(cacheKey);
      return result;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Perform actual fetch with retry and timeout
   * @param {string} filename - The file to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Object>} The fetched data
   */
  async performFetch(filename, options = {}) {
    const url = `${this.basePath}/dist/${filename}`;
    console.log(`📡 Fetching ${filename}`);
    
    try {
      const data = await fetchJsonWithRetry(url, options);
      
      // Validate data structure
      this.validateData(data, filename);
      
      console.log(`✅ Successfully loaded ${filename}`);
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Validate loaded data structure
   * @param {Object} data - The data to validate
   * @param {string} filename - The filename for context
   * @throws {Error} If validation fails
   */
  validateData(data, filename) {
    switch (filename) {
      case 'materials.json':
      case 'materials-min.json':
        if (!data.materials || !Array.isArray(data.materials)) {
          throw new Error('Invalid materials data: missing materials array');
        }
        if (!data.metadata) {
          throw new Error('Invalid materials data: missing metadata');
        }
        break;

      case 'search-index.json':
        if (!data.materials || !Array.isArray(data.materials)) {
          throw new Error('Invalid search index: missing materials array');
        }
        break;

      case 'categories.json':
        if (!data.categories || !Array.isArray(data.categories)) {
          throw new Error('Invalid categories data: missing categories array');
        }
        break;
    }
  }

  /**
   * Handle loading errors with fallback strategies
   * @param {Error} error - The error that occurred
   * @returns {Promise<Object>} The loaded materials data
   */
  async handleLoadingError(error) {
    console.log('🔄 Attempting fallback loading strategies...');
    loadingManager.updateProgress(20, 100, "Trying fallback loading...");

    // Strategy 1: Try legacy file-list approach
    try {
      console.log('📋 Trying legacy file-list loading...');
      loadingManager.updateProgress(30, 100, "Trying legacy loading...");
      return await this.loadLegacyFormat();
    } catch (legacyError) {
      console.warn('⚠️ Legacy loading failed:', legacyError.message);
    }

    // Strategy 2: Try cached data
    if (this.cache.has('materials')) {
      console.log('💾 Using cached data as fallback');
      loadingManager.updateProgress(100, 100, "Using cached data");
      setTimeout(() => loadingManager.hideLoading(), 500);
      return this.cache.get('materials');
    }

    // All strategies failed
    loadingManager.showError(
      "Failed to load materials", 
      `All loading strategies failed. Original error: ${error.message}`,
      { isNetworkError: !this.isOnline }
    );
    
    throw new Error(`All loading strategies failed. Original error: ${error.message}`);
  }

  /**
   * Legacy loading method (backward compatibility)
   * @returns {Promise<Object>} The loaded materials data
   */
  async loadLegacyFormat() {
    try {
      loadingManager.updateProgress(40, 100, "Loading file list...");
      const fileListUrl = `${this.basePath}/dist/file-list.json`;
      const fileList = await fetchJsonWithRetry(fileListUrl);

      if (!Array.isArray(fileList) || fileList.length === 0) {
        throw new Error("File list is empty or not valid.");
      }

      loadingManager.updateProgress(50, 100, `Found ${fileList.length} files to process...`);
      
      const materials = [];
      let processedCount = 0;
      
      for (const fileName of fileList) {
        try {
          const progress = 50 + (processedCount / fileList.length) * 40;
          loadingManager.updateProgress(progress, 100, `Processing ${fileName}...`);
          
          const fileUrl = `${this.basePath}/data/${fileName}`;
          const yamlText = await fetchTextWithRetry(fileUrl);
          const parsedMaterials = parseYAMLSafely(yamlText, fileName);
          
          materials.push(...parsedMaterials);
          loadingManager.trackSuccess();
          processedCount++;
          
          console.log(`✅ Processed ${fileName}: ${parsedMaterials.length} materials`);
        } catch (fileError) {
          loadingManager.trackFailure(fileName, fileError);
          console.warn(`⚠️ Failed to load ${fileName}:`, fileError.message);
        }
      }

      if (materials.length === 0) {
        throw new Error("No materials were successfully loaded");
      }

      const result = {
        materials,
        metadata: {
          totalMaterials: materials.length,
          loadedVia: 'legacy',
          generatedAt: new Date().toISOString()
        }
      };
      
      this.cache.set('materials', result);
      
      loadingManager.updateProgress(100, 100, "Legacy loading complete!");
      setTimeout(() => loadingManager.hideLoading(), 500);
      
      return result;
    } catch (error) {
      loadingManager.showError("Legacy loading failed", error.message);
      throw error;
    }
  }

  /**
   * Handle online/offline status changes
   */
  handleOnlineStatusChange() {
    if (this.isOnline) {
      console.log('🌐 Back online - checking for updates');
      notificationSystem.success('You are back online', 3000);
      this.checkForUpdates();
    } else {
      console.log('📴 Gone offline - using cached data');
      notificationSystem.warning('You are now offline', 3000);
    }
  }

  /**
   * Check for data updates
   */
  async checkForUpdates() {
    try {
      const response = await fetch(`${this.basePath}/dist/materials.json`, {
        method: 'HEAD',
        cache: 'no-cache'
      });

      const lastModified = response.headers.get('last-modified');
      const etag = response.headers.get('etag');

      // Compare with stored version info
      const storedInfo = localStorage.getItem('materialmap_version_info');
      if (storedInfo) {
        const { lastModified: storedLastModified, etag: storedEtag } = JSON.parse(storedInfo);
        
        if (lastModified !== storedLastModified || etag !== storedEtag) {
          console.log('🆕 New data available');
          this.notifyUpdateAvailable();
        }
      }

      // Store current version info
      localStorage.setItem('materialmap_version_info', JSON.stringify({
        lastModified,
        etag,
        checkedAt: new Date().toISOString()
      }));

    } catch (error) {
      console.warn('⚠️ Failed to check for updates:', error.message);
    }
  }

  /**
   * Notify that an update is available
   */
  notifyUpdateAvailable() {
    notificationSystem.info('New data is available. Refresh to update.', 5000);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('materialsUpdateAvailable'));
  }

  /**
   * Clear the cache
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get stats about the data loader
   * @returns {Object} Stats about the data loader
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      isOnline: this.isOnline,
      version: this.version,
      loadingPromises: this.loadingPromises.size
    };
  }
}

// Create a singleton instance
const dataLoader = new DataLoaderService();

// For backward compatibility
window.dataLoader = dataLoader;

export default dataLoader;