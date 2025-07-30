/**
 * Example configuration for Material MAP OAuth
 * Copy this file to assets/js/config.js and update with your values
 */

window.MaterialMapConfig = {
    // GitHub OAuth Configuration
    github: {
        // Replace with your GitHub OAuth App client ID
        // Get this from: https://github.com/settings/developers
        clientId: 'your_github_oauth_client_id_here',
        
        // OAuth scopes required for the application
        scopes: 'public_repo user:email',
        
        // Callback URL - should match what's configured in GitHub OAuth App
        callbackUrl: window.location.origin + '/oauth-callback.html',
        
        // Repository information
        repository: {
            owner: 'YuryNovozhilov',
            name: 'MaterialMap'
        }
    },
    
    // Development settings
    development: {
        // Enable development mode (uses mock tokens)
        // Set to false for production
        enabled: window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('127.0.0.1'),
        
        // Mock OAuth for development
        // Set to false to test real OAuth flow in development
        mockOAuth: true
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

// Initialize OAuth client with configuration
document.addEventListener('DOMContentLoaded', () => {
    if (window.GitHubOAuth && window.MaterialMapConfig) {
        // Configure OAuth client
        const oauthClient = new GitHubOAuth();
        oauthClient.setClientId(window.MaterialMapConfig.github.clientId);
        
        // Set token exchange URL for production
        if (window.MaterialMapConfig.tokenExchange.url) {
            oauthClient.setTokenExchangeUrl(window.MaterialMapConfig.tokenExchange.url);
        }
        
        // Store global reference
        window.materialMapOAuthClient = oauthClient;
        
        console.log('OAuth client configured:', {
            clientId: window.MaterialMapConfig.github.clientId ? 'Set' : 'Not set',
            development: window.MaterialMapConfig.development.enabled,
            mockOAuth: window.MaterialMapConfig.development.mockOAuth
        });
    }
});