/**
 * Configuration for Material MAP application
 * This is the development configuration with mock OAuth enabled
 */

window.MaterialMapConfig = {
    // GitHub OAuth Configuration
    github: {
        // GitHub OAuth App client ID
        clientId: 'Ov23liawXcjJcsMDcAa7',
        
        // OAuth scopes required for the application
        scopes: 'public_repo user:email',
        
        // Callback URL - should match what's configured in GitHub OAuth App
        callbackUrl: window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('127.0.0.1') ||
                    window.location.port === '5500' 
                    ? window.location.origin + '/oauth-callback-modern.html'
                    : 'https://yurynovozhilov.github.io/MaterialMap/oauth-callback-modern.html',
        
        // Repository information
        repository: {
            owner: 'YuryNovozhilov',
            name: 'MaterialMap'
        }
    },
    
    // Development settings
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
        defaultAuthMethod: 'oauth', // only 'oauth' is supported now
        
        // Show only OAuth authentication
        showTokenAuth: false,
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

// Initialize OAuth client with configuration
document.addEventListener('DOMContentLoaded', () => {
    // Initialize modern OAuth client
    if (window.ModernGitHubOAuth && window.MaterialMapConfig) {
        const oauthClient = new ModernGitHubOAuth();
        
        // Store global reference
        window.materialMapOAuthClient = oauthClient;
        
        // Log configuration status
        if (window.MaterialMapConfig.development.enabled) {
            console.log('Material MAP OAuth: Development mode enabled');
            if (window.MaterialMapConfig.development.mockOAuth) {
                console.log('Material MAP OAuth: Using mock authentication');
            }
        }
        
        console.log('Modern OAuth client initialized');
    }
    
    // Fallback to old OAuth client if modern one is not available
    else if (window.GitHubOAuth && window.MaterialMapConfig) {
        console.warn('Using legacy OAuth client - consider upgrading');
        const oauthClient = new GitHubOAuth();
        oauthClient.setClientId(window.MaterialMapConfig.github.clientId);
        
        if (window.MaterialMapConfig.tokenExchange && window.MaterialMapConfig.tokenExchange.url) {
            oauthClient.setTokenExchangeUrl(window.MaterialMapConfig.tokenExchange.url);
        }
        
        window.materialMapOAuthClient = oauthClient;
    }
});