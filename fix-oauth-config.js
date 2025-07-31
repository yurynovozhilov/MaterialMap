/**
 * OAuth Configuration Fix Script
 * 
 * This script provides the correct OAuth configuration for Material MAP.
 * Use this to restore proper OAuth settings after fixing the GitHub OAuth app.
 */

// Correct OAuth configuration for production
const correctOAuthConfig = {
    // GitHub OAuth Configuration
    github: {
        // GitHub OAuth App client ID
        clientId: 'Ov23liawXcjJcsMDcAa7', // Update this if you create a new OAuth app
        
        // OAuth scopes required for the application
        scopes: 'public_repo user:email',
        
        // Callback URL - should match what's configured in GitHub OAuth App
        callbackUrl: window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('127.0.0.1') ||
                    window.location.port === '5500' 
                    ? window.location.origin + '/oauth-callback.html'
                    : 'https://yurynovozhilov.github.io/MaterialMap/oauth-callback.html',
        
        // Repository information
        repository: {
            owner: 'YuryNovozhilov',
            name: 'MaterialMap'
        }
    },
    
    // Development settings - PRODUCTION VERSION
    development: {
        // Enable development mode (uses mock tokens)
        enabled: window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('127.0.0.1') ||
                window.location.port === '5500', // VS Code Live Server
        
        // Mock OAuth for development
        mockOAuth: window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1' ||
                  window.location.hostname.includes('127.0.0.1') ||
                  window.location.port === '5500'
    },
    
    // UI Configuration
    ui: {
        // Default authentication method to show first
        defaultAuthMethod: 'oauth', // 'oauth' or 'token'
        
        // Show both authentication options
        showTokenAuth: true,
        showOAuthAuth: true
    },
    
    // Token exchange service configuration (for production)
    tokenExchange: {
        // URL to your token exchange service
        // Examples:
        // Netlify: '/.netlify/functions/oauth-token'
        // Vercel: '/api/oauth-token'
        // Custom: 'https://your-api.com/oauth/token'
        url: null // Set this for production
    }
};

// Instructions for applying the fix
console.log(`
=== OAuth Configuration Fix Instructions ===

1. FIRST: Fix the GitHub OAuth App
   - Go to: https://github.com/settings/developers
   - Find OAuth app with client ID: ${correctOAuthConfig.github.clientId}
   - Set Authorization callback URL to: ${correctOAuthConfig.github.callbackUrl}

2. THEN: Apply this configuration to assets/js/config.js
   - Replace the entire window.MaterialMapConfig object with the correctOAuthConfig above
   - Or manually update the development settings to use hostname detection instead of hardcoded true

3. VERIFY: Test the OAuth flow
   - Clear browser cache and session storage
   - Try authenticating with GitHub
   - Should work without redirect_uri errors

Current Status:
- Development mode: ${correctOAuthConfig.development.enabled ? 'ENABLED' : 'DISABLED'}
- Mock OAuth: ${correctOAuthConfig.development.mockOAuth ? 'ENABLED' : 'DISABLED'}
- Callback URL: ${correctOAuthConfig.github.callbackUrl}
`);

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = correctOAuthConfig;
}

// Make available globally for browser console testing
if (typeof window !== 'undefined') {
    window.correctOAuthConfig = correctOAuthConfig;
}