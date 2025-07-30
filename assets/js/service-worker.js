/**
 * Material MAP Service Worker
 * Provides caching and offline functionality
 */

const CACHE_NAME = 'material-map-v1.2.0';
const DATA_CACHE_NAME = 'material-map-data-v1.0.0';

// Static resources for caching
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/assets/html/about.html',
    '/assets/css/styles.css',
    '/assets/js/scripts.js',
    '/manifest.json',
    
    // External CDN resources (will be cached on first request)
    'https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js',
    'https://code.jquery.com/jquery-3.7.0.js',
    'https://cdn.datatables.net/1.13.7/js/jquery.dataTables.min.js',
    'https://cdn.datatables.net/1.13.7/css/jquery.dataTables.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap'
];

// Patterns for data that should be cached separately
const DATA_CACHE_PATTERNS = [
    /\/dist\/file-list\.json$/,
    /\/data\/.*\.yaml$/
];

/**
 * Service Worker installation
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Install event');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static resources');
                return cache.addAll(STATIC_CACHE_URLS);
            })
            .then(() => {
                // Force activation of new SW
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Failed to cache static resources:', error);
            })
    );
});

/**
 * Service Worker activation
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // Take control of all open tabs
            self.clients.claim()
        ])
    );
});

/**
 * Fetch request interception
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignore non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignore chrome-extension and other special protocols
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Determine caching strategy
    if (isDataRequest(request)) {
        // Use Network First strategy for data
        event.respondWith(networkFirstStrategy(request, DATA_CACHE_NAME));
    } else if (isStaticResource(request)) {
        // Use Cache First strategy for static resources
        event.respondWith(cacheFirstStrategy(request, CACHE_NAME));
    } else {
        // Use Network First for other requests
        event.respondWith(networkFirstStrategy(request, CACHE_NAME));
    }
});

/**
 * Check if request is for data
 */
function isDataRequest(request) {
    const url = new URL(request.url);
    return DATA_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

/**
 * Check if request is for static resource
 */
function isStaticResource(request) {
    const url = new URL(request.url);
    
    // Local static resources
    if (url.origin === location.origin) {
        return url.pathname.match(/\.(js|css|html|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
    }
    
    // External CDN resources
    return url.hostname.includes('cdnjs.cloudflare.com') || 
           url.hostname.includes('code.jquery.com') ||
           url.hostname.includes('cdn.datatables.net') ||
           url.hostname.includes('fonts.googleapis.com') ||
           url.hostname.includes('fonts.gstatic.com');
}

/**
 * Cache First strategy - check cache first, then network
 */
async function cacheFirstStrategy(request, cacheName) {
    try {
        // Look in cache
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('[SW] Cache hit:', request.url);
            return cachedResponse;
        }
        
        // If not in cache, make network request
        console.log('[SW] Cache miss, fetching:', request.url);
        const response = await fetch(request);
        
        // Cache successful responses
        if (response.status === 200) {
            const responseToCache = response.clone();
            cache.put(request, responseToCache);
        }
        
        return response;
        
    } catch (error) {
        console.error('[SW] Cache First strategy failed:', error);
        
        // Try to return something from cache
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // If nothing available, return offline response
        return createOfflineResponse(request);
    }
}

/**
 * Network First strategy - try network first, then cache
 */
async function networkFirstStrategy(request, cacheName) {
    try {
        // Try network request first
        const response = await fetch(request);
        
        if (response.status === 200) {
            // Cache successful responses
            const cache = await caches.open(cacheName);
            const responseToCache = response.clone();
            cache.put(request, responseToCache);
            
            console.log('[SW] Network success, cached:', request.url);
            return response;
        }
        
        // If request not successful, try cache
        throw new Error(`HTTP ${response.status}`);
        
    } catch (error) {
        console.log('[SW] Network failed, trying cache:', request.url);
        
        // Look in cache
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('[SW] Serving from cache:', request.url);
            return cachedResponse;
        }
        
        // If not in cache either, create offline response
        console.log('[SW] No cache available for:', request.url);
        return createOfflineResponse(request);
    }
}

/**
 * Create offline response
 */
function createOfflineResponse(request) {
    const url = new URL(request.url);
    
    // For HTML pages return offline page
    if (request.headers.get('accept')?.includes('text/html')) {
        return new Response(
            createOfflineHTML(),
            {
                status: 200,
                headers: { 'Content-Type': 'text/html' }
            }
        );
    }
    
    // For JSON requests return empty response
    if (url.pathname.includes('.json')) {
        return new Response(
            JSON.stringify({ 
                error: 'Offline', 
                message: 'This content is not available offline' 
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
    
    // For other requests return error
    return new Response(
        'Content not available offline',
        { 
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
        }
    );
}

/**
 * Create HTML for offline page
 */
function createOfflineHTML() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Material MAP - Offline</title>
            <style>
                body {
                    font-family: Inter, sans-serif;
                    background: #f8fafc;
                    margin: 0;
                    padding: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    color: #1e293b;
                }
                .offline-container {
                    text-align: center;
                    max-width: 400px;
                    background: white;
                    padding: 2rem;
                    border-radius: 1rem;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h1 {
                    margin: 0 0 1rem 0;
                    color: #1e293b;
                    font-size: 1.5rem;
                }
                p {
                    color: #64748b;
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }
                .retry-button {
                    background: #4169E1;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .retry-button:hover {
                    background: #27408B;
                }
                [data-theme="dark"] body {
                    background: #0f172a;
                    color: #e2e8f0;
                }
                [data-theme="dark"] .offline-container {
                    background: #1e293b;
                }
                [data-theme="dark"] h1 {
                    color: #e2e8f0;
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="offline-icon">📱</div>
                <h1>You're Offline</h1>
                <p>Material MAP is not available without an internet connection. Please check your connection and try again.</p>
                <button class="retry-button" onclick="window.location.reload()">
                    Try Again
                </button>
            </div>
        </body>
        </html>
    `;
}

/**
 * Handle messages from client
 */
self.addEventListener('message', (event) => {
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'GET_CACHE_SIZE':
            getCacheSize().then((size) => {
                event.ports[0].postMessage({ type: 'CACHE_SIZE', payload: size });
            });
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches().then(() => {
                event.ports[0].postMessage({ type: 'CACHE_CLEARED' });
            });
            break;
            
        case 'FORCE_UPDATE':
            self.registration.update();
            break;
    }
});

/**
 * Get cache size
 */
async function getCacheSize() {
    try {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }
        }
        
        return {
            bytes: totalSize,
            formatted: formatBytes(totalSize),
            caches: cacheNames.length
        };
    } catch (error) {
        console.error('[SW] Failed to calculate cache size:', error);
        return { bytes: 0, formatted: '0 B', caches: 0 };
    }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
    try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('[SW] All caches cleared');
    } catch (error) {
        console.error('[SW] Failed to clear caches:', error);
    }
}

/**
 * Format bytes size
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Periodic cleanup of old cache entries (once a day)
setInterval(() => {
    cleanupOldCacheEntries();
}, 24 * 60 * 60 * 1000);

/**
 * Clean up old entries from data cache
 */
async function cleanupOldCacheEntries() {
    try {
        const cache = await caches.open(DATA_CACHE_NAME);
        const requests = await cache.keys();
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        
        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const dateHeader = response.headers.get('date');
                if (dateHeader) {
                    const responseDate = new Date(dateHeader).getTime();
                    if (responseDate < oneWeekAgo) {
                        await cache.delete(request);
                        console.log('[SW] Cleaned up old cache entry:', request.url);
                    }
                }
            }
        }
    } catch (error) {
        console.error('[SW] Cache cleanup failed:', error);
    }
}