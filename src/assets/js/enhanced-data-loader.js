/**
 * Enhanced Data Loader for Material MAP
 * Optimized loading strategy with caching, progressive loading, and offline support
 */

class EnhancedDataLoader {
    constructor() {
        this.basePath = this.getBasePath();
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
        
        // Initialize service worker communication
        this.initServiceWorkerCommunication();
    }

    getBasePath() {
        const { origin, pathname, port } = window.location;

        if (origin.startsWith("file://")) {
            const pathParts = pathname.split("/");
            pathParts.pop();
            return pathParts.join("/");
        }

        if (origin.includes("localhost") || origin.includes("127.0.0.1") || (port && parseInt(port) > 1024)) {
            return "./";
        }

        const repoName = pathname.split("/")[1];
        return repoName ? `/${repoName}` : "/";
    }

    /**
     * Main loading method with progressive strategy
     */
    async loadMaterials(options = {}) {
        const {
            progressive = true,
            useCache = true,
            forceRefresh = false
        } = options;

        try {
            // Check cache first
            if (useCache && !forceRefresh && this.cache.has('materials')) {
                console.log('📦 Loading materials from cache');
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
     */
    async loadProgressively() {
        console.log('🚀 Starting progressive data loading...');
        
        // Phase 1: Load search index and categories (fast)
        const [searchIndex, categories] = await Promise.all([
            this.fetchWithCache('search-index.json'),
            this.fetchWithCache('categories.json')
        ]);

        // Update UI with basic data immediately
        this.notifyProgressiveLoad('index', { searchIndex, categories });

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

        console.log('✅ Progressive loading completed');
        return completeData;
    }

    /**
     * Complete loading: Load full dataset at once
     */
    async loadComplete() {
        console.log('🚀 Loading complete dataset...');
        
        const fullData = await this.fetchWithCache('materials.json');
        
        this.cache.set('materials', fullData);
        this.version = fullData.metadata.version;

        console.log('✅ Complete loading finished');
        return fullData;
    }

    /**
     * Fetch with caching and retry logic
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
     */
    async performFetch(filename, options = {}) {
        const {
            maxRetries = 3,
            timeout = 10000,
            retryDelay = 1000
        } = options;

        const url = `${this.basePath}/dist/${filename}`;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📡 Fetching ${filename} (attempt ${attempt}/${maxRetries})`);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                const response = await fetch(url, {
                    signal: controller.signal,
                    cache: 'no-cache' // Always get fresh data
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                // Validate data structure
                this.validateData(data, filename);
                
                console.log(`✅ Successfully loaded ${filename}`);
                return data;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Attempt ${attempt} failed for ${filename}:`, error.message);

                // Don't retry on certain errors
                if (error.name === 'AbortError' || !this.isOnline) {
                    break;
                }

                // Wait before retry (exponential backoff)
                if (attempt < maxRetries) {
                    await new Promise(resolve => 
                        setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
                    );
                }
            }
        }

        throw new Error(`Failed to fetch ${filename} after ${maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Validate loaded data structure
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
     */
    async handleLoadingError(error) {
        console.log('🔄 Attempting fallback loading strategies...');

        // Strategy 1: Try legacy file-list approach
        try {
            console.log('📋 Trying legacy file-list loading...');
            return await this.loadLegacyFormat();
        } catch (legacyError) {
            console.warn('⚠️ Legacy loading failed:', legacyError.message);
        }

        // Strategy 2: Try cached data
        if (this.cache.has('materials')) {
            console.log('💾 Using cached data as fallback');
            return this.cache.get('materials');
        }

        // Strategy 3: Try service worker cache
        try {
            const cachedData = await this.getFromServiceWorkerCache();
            if (cachedData) {
                console.log('🔧 Using service worker cached data');
                return cachedData;
            }
        } catch (swError) {
            console.warn('⚠️ Service worker cache failed:', swError.message);
        }

        // All strategies failed
        throw new Error(`All loading strategies failed. Original error: ${error.message}`);
    }

    /**
     * Legacy loading method (backward compatibility)
     */
    async loadLegacyFormat() {
        const fileListResponse = await fetch(`${this.basePath}/dist/file-list.json`);
        const fileList = await fileListResponse.json();

        const materials = [];
        for (const fileName of fileList) {
            try {
                const fileResponse = await fetch(`${this.basePath}/data/${fileName}`);
                const yamlText = await fileResponse.text();
                const parsedMaterials = this.parseYAMLSafely(yamlText, fileName);
                materials.push(...parsedMaterials);
            } catch (fileError) {
                console.warn(`⚠️ Failed to load ${fileName}:`, fileError.message);
            }
        }

        return {
            materials,
            metadata: {
                totalMaterials: materials.length,
                loadedVia: 'legacy',
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Parse YAML safely (legacy support)
     */
    parseYAMLSafely(yamlText, fileName) {
        try {
            if (!yamlText || typeof yamlText !== 'string' || yamlText.trim().length === 0) {
                throw new Error('Invalid YAML content: empty or non-string input');
            }

            const parsed = jsyaml.load(yamlText, {
                schema: jsyaml.CORE_SCHEMA,
                json: false,
                filename: fileName
            });

            if (!Array.isArray(parsed)) {
                throw new Error('Invalid YAML structure: expected array of materials');
            }

            return parsed.filter(item => item && typeof item === 'object' && 
                                       (item.material?.id || item.id));

        } catch (error) {
            throw new Error(`YAML parsing failed in ${fileName}: ${error.message}`);
        }
    }

    /**
     * Get data from service worker cache
     */
    async getFromServiceWorkerCache() {
        if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
            return null;
        }

        return new Promise((resolve) => {
            const messageChannel = new MessageChannel();
            
            messageChannel.port1.onmessage = (event) => {
                resolve(event.data.success ? event.data.data : null);
            };

            navigator.serviceWorker.controller.postMessage({
                type: 'GET_CACHED_MATERIALS'
            }, [messageChannel.port2]);

            // Timeout after 5 seconds
            setTimeout(() => resolve(null), 5000);
        });
    }

    /**
     * Initialize service worker communication
     */
    initServiceWorkerCommunication() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data.type === 'DATA_UPDATED') {
                    console.log('🔄 Data updated, clearing cache');
                    this.cache.clear();
                    this.notifyDataUpdate(event.data);
                }
            });
        }
    }

    /**
     * Handle online/offline status changes
     */
    handleOnlineStatusChange() {
        if (this.isOnline) {
            console.log('🌐 Back online - checking for updates');
            this.checkForUpdates();
        } else {
            console.log('📴 Gone offline - using cached data');
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
     * Event notification methods
     */
    notifyProgressiveLoad(phase, data) {
        window.dispatchEvent(new CustomEvent('materialsProgressiveLoad', {
            detail: { phase, data }
        }));
    }

    notifyDataUpdate(updateInfo) {
        window.dispatchEvent(new CustomEvent('materialsDataUpdate', {
            detail: updateInfo
        }));
    }

    notifyUpdateAvailable() {
        window.dispatchEvent(new CustomEvent('materialsUpdateAvailable'));
    }

    /**
     * Utility methods
     */
    clearCache() {
        this.cache.clear();
        this.loadingPromises.clear();
        console.log('🗑️ Cache cleared');
    }

    getStats() {
        return {
            cacheSize: this.cache.size,
            isOnline: this.isOnline,
            version: this.version,
            loadingPromises: this.loadingPromises.size
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedDataLoader;
} else {
    window.EnhancedDataLoader = EnhancedDataLoader;
}