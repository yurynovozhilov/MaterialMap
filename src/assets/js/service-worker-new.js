/**
 * Material MAP Service Worker
 * Simplified implementation using Workbox
 */

// Import Workbox from CDN
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Check if Workbox loaded correctly
if (!workbox) {
  console.error('Workbox failed to load');
} else {
  console.log('Workbox loaded successfully');
  
  // Set debug mode to false in production
  workbox.setConfig({ debug: false });
  
  // Cache names
  const CACHE_NAMES = {
    static: 'material-map-static-v1',
    data: 'material-map-data-v1',
    documents: 'material-map-documents-v1'
  };
  
  // Cache expiration plugin
  const { ExpirationPlugin } = workbox.expiration;
  const { CacheableResponsePlugin } = workbox.cacheableResponse;
  
  // Strategies
  const { CacheFirst, NetworkFirst, StaleWhileRevalidate } = workbox.strategies;
  
  // Routing
  const { registerRoute, setCatchHandler, setDefaultHandler } = workbox.routing;
  
  // Precache manifest (will be populated by workbox-cli in production)
  workbox.precaching.precacheAndRoute([
    { url: '/', revision: '1' },
    { url: '/index.html', revision: '1' },
    { url: '/src/assets/css/styles.css', revision: '1' },
    { url: '/src/assets/js/main.js', revision: '1' },
    { url: '/src/assets/html/about.html', revision: '1' },
    { url: '/manifest.json', revision: '1' }
  ]);
  
  // Cache static assets (CSS, JS, fonts)
  registerRoute(
    ({ request }) => 
      request.destination === 'style' || 
      request.destination === 'script' || 
      request.destination === 'font',
    new CacheFirst({
      cacheName: CACHE_NAMES.static,
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxEntries: 60
        })
      ]
    })
  );
  
  // Cache data files (JSON, YAML)
  registerRoute(
    ({ url }) => 
      url.pathname.includes('/dist/') || 
      url.pathname.includes('/data/'),
    new NetworkFirst({
      cacheName: CACHE_NAMES.data,
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          maxEntries: 100
        })
      ]
    })
  );
  
  // Cache HTML documents
  registerRoute(
    ({ request }) => request.destination === 'document',
    new StaleWhileRevalidate({
      cacheName: CACHE_NAMES.documents,
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          maxEntries: 20
        })
      ]
    })
  );
  
  // Cache CDN resources
  registerRoute(
    ({ url }) => 
      url.origin.includes('cdnjs.cloudflare.com') || 
      url.origin.includes('code.jquery.com') || 
      url.origin.includes('cdn.datatables.net') || 
      url.origin.includes('fonts.googleapis.com') || 
      url.origin.includes('fonts.gstatic.com'),
    new CacheFirst({
      cacheName: CACHE_NAMES.static,
      plugins: [
        new CacheableResponsePlugin({
          statuses: [0, 200]
        }),
        new ExpirationPlugin({
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          maxEntries: 30
        })
      ]
    })
  );
  
  // Default handler for all other requests
  setDefaultHandler(new NetworkFirst());
  
  // Catch handler for offline fallback
  setCatchHandler(async ({ request }) => {
    // Return specific offline pages based on request type
    if (request.destination === 'document') {
      return caches.match('/src/assets/html/offline.html');
    }
    
    if (request.destination === 'image') {
      return new Response(
        '<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><text x="50" y="50" font-family="sans-serif" font-size="12" text-anchor="middle" dominant-baseline="middle">Offline</text></svg>',
        { 
          headers: { 'Content-Type': 'image/svg+xml' },
          status: 503
        }
      );
    }
    
    if (request.url.includes('.json')) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This content is not available offline' 
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 503
        }
      );
    }
    
    // Default offline response
    return new Response('Content not available offline', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  });
  
  // Listen for message events
  self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });
}