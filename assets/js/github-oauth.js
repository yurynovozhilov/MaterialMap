/**
 * GitHub OAuth Client - Handles OAuth authentication flow
 */

class GitHubOAuth {
    constructor() {
        // GitHub OAuth configuration - will be set from config
        this.clientId = null;
        this.redirectUri = window.location.origin + '/oauth-callback.html';
        this.scope = 'public_repo user:email';
        this.authUrl = 'https://github.com/login/oauth/authorize';
        
        // Development mode detection
        this.isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('127.0.0.1');
        
        // Since we're a static site, we'll use a proxy service for token exchange
        // You can use services like:
        // - Netlify Functions
        // - Vercel Functions  
        // - GitHub Actions with repository dispatch
        // - Third-party OAuth proxy services
        this.tokenExchangeUrl = null; // Will be set based on deployment
        
        this.setupMessageListener();
        this.loadConfig();
    }

    /**
     * Load configuration from global config
     */
    loadConfig() {
        if (window.MaterialMapConfig && window.MaterialMapConfig.github) {
            const config = window.MaterialMapConfig.github;
            this.clientId = config.clientId;
            this.scope = config.scopes || this.scope;
            this.redirectUri = config.callbackUrl || this.redirectUri;
        }
    }

    /**
     * Generate a random state string for CSRF protection
     */
    generateState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Start OAuth authentication flow
     */
    async authenticate() {
        try {
            // Check if client ID is configured
            if (!this.clientId || this.clientId === 'YOUR_GITHUB_CLIENT_ID') {
                if (this.isDevelopment && window.MaterialMapConfig?.development?.mockOAuth) {
                    // Development mode: simulate OAuth flow
                    console.warn('Development mode: Simulating OAuth flow');
                    
                    // Simulate OAuth delay
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Generate mock token and user
                    const mockToken = 'gho_dev_mock_token_' + Date.now();
                    const mockUser = await this.getUserInfo(mockToken);
                    
                    // Store auth data
                    this.storeAuthData({ access_token: mockToken }, mockUser);
                    
                    return { user: mockUser, token: mockToken };
                } else {
                    throw new Error('GitHub OAuth Client ID not configured. Please set up your GitHub OAuth App or enable development mode.');
                }
            }

            // Generate and store state for CSRF protection
            const state = this.generateState();
            sessionStorage.setItem('github_oauth_state', state);
            sessionStorage.setItem('github_oauth_client_id', this.clientId);

            // Build authorization URL
            const params = new URLSearchParams({
                client_id: this.clientId,
                redirect_uri: this.redirectUri,
                scope: this.scope,
                state: state,
                allow_signup: 'true'
            });

            const authUrl = `${this.authUrl}?${params.toString()}`;

            // Open popup window for OAuth
            const popup = window.open(
                authUrl,
                'github-oauth',
                'width=600,height=700,scrollbars=yes,resizable=yes'
            );

            if (!popup) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }

            // Return a promise that resolves when authentication completes
            return new Promise((resolve, reject) => {
                this.authPromise = { resolve, reject };
                
                // Check if popup was closed manually
                const checkClosed = setInterval(() => {
                    if (popup.closed) {
                        clearInterval(checkClosed);
                        if (this.authPromise) {
                            this.authPromise.reject(new Error('Authentication cancelled by user'));
                            this.authPromise = null;
                        }
                    }
                }, 1000);
            });

        } catch (error) {
            console.error('OAuth authentication error:', error);
            throw error;
        }
    }

    /**
     * Setup message listener for popup communication
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            // Verify origin for security
            if (event.origin !== window.location.origin) {
                return;
            }

            // Handle both old and new message types for compatibility
            if (event.data.type === 'GITHUB_OAUTH_SUCCESS' || event.data.type === 'github_oauth_callback') {
                if (event.data.success !== false) {
                    this.handleOAuthSuccess(event.data);
                } else {
                    this.handleOAuthError(event.data);
                }
            } else if (event.data.type === 'GITHUB_OAUTH_ERROR') {
                this.handleOAuthError(event.data);
            }
        });
    }

    /**
     * Handle successful OAuth callback
     */
    async handleOAuthSuccess(data) {
        try {
            // Verify state matches
            const storedState = sessionStorage.getItem('github_oauth_state');
            if (data.state !== storedState) {
                throw new Error('Invalid state parameter');
            }

            // Exchange code for access token
            const tokenData = await this.exchangeCodeForToken(data.code);
            
            // Get user information
            const user = await this.getUserInfo(tokenData.access_token);
            
            // Store authentication data in sessionStorage
            this.storeAuthData(tokenData, user);
            
            // Clean up OAuth state
            this.cleanupOAuthState();
            
            // Resolve the authentication promise
            if (this.authPromise) {
                this.authPromise.resolve({ user, token: tokenData.access_token });
                this.authPromise = null;
            }

        } catch (error) {
            console.error('OAuth success handling error:', error);
            this.handleOAuthError({ error: 'token_exchange_failed', description: error.message });
        }
    }

    /**
     * Handle OAuth error
     */
    handleOAuthError(data) {
        console.error('OAuth error:', data);
        
        this.cleanupOAuthState();
        
        if (this.authPromise) {
            this.authPromise.reject(new Error(data.description || data.error));
            this.authPromise = null;
        }
    }

    /**
     * Exchange authorization code for access token
     * Note: This requires a backend service or proxy since GitHub doesn't support CORS for token endpoint
     */
    async exchangeCodeForToken(code) {
        if (this.isDevelopment && window.MaterialMapConfig?.development?.mockOAuth) {
            // Development mode: use mock token
            console.warn('Development mode: Using mock OAuth token');
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                access_token: 'gho_dev_mock_token_' + Date.now(),
                token_type: 'bearer',
                scope: this.scope
            };
        }
        
        if (this.tokenExchangeUrl) {
            // Use configured token exchange service
            const response = await fetch(this.tokenExchangeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: code,
                    client_id: this.clientId,
                    redirect_uri: this.redirectUri
                })
            });

            if (!response.ok) {
                throw new Error(`Token exchange failed: ${response.statusText}`);
            }

            return await response.json();
        } else {
            // No token exchange service configured
            throw new Error('OAuth token exchange service not configured. Please set up a backend service or enable development mode.');
        }
    }

    /**
     * Get user information from GitHub API
     */
    async getUserInfo(accessToken) {
        if (this.isDevelopment && accessToken.startsWith('gho_dev_mock_token_')) {
            // Development mode: return mock user
            console.warn('Development mode: Using mock user data');
            
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return {
                id: 12345,
                login: 'dev-user',
                name: 'Development User',
                email: 'dev@example.com',
                avatar_url: 'https://github.com/identicons/dev-user.png',
                html_url: 'https://github.com/dev-user',
                type: 'User',
                public_repos: 10,
                followers: 5,
                following: 8
            };
        }
        
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get user info: ${response.statusText}`);
            }

            const user = await response.json();
            
            // Also get user email if not public
            try {
                const emailResponse = await fetch('https://api.github.com/user/emails', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (emailResponse.ok) {
                    const emails = await emailResponse.json();
                    const primaryEmail = emails.find(email => email.primary);
                    if (primaryEmail && !user.email) {
                        user.email = primaryEmail.email;
                    }
                }
            } catch (emailError) {
                console.warn('Could not fetch user emails:', emailError);
            }

            return user;

        } catch (error) {
            console.error('Error fetching user info:', error);
            throw error;
        }
    }

    /**
     * Store authentication data in sessionStorage
     */
    storeAuthData(tokenData, user) {
        try {
            sessionStorage.setItem('github_oauth_token', tokenData.access_token);
            sessionStorage.setItem('github_oauth_user', JSON.stringify(user));
            sessionStorage.setItem('github_oauth_expires', Date.now() + (3600 * 1000)); // 1 hour
        } catch (error) {
            console.warn('Failed to store auth data:', error);
        }
    }

    /**
     * Get stored authentication data
     */
    getStoredAuthData() {
        try {
            const token = sessionStorage.getItem('github_oauth_token');
            const userJson = sessionStorage.getItem('github_oauth_user');
            const expires = sessionStorage.getItem('github_oauth_expires');

            if (!token || !userJson || !expires) {
                return null;
            }

            // Check if token has expired
            if (Date.now() > parseInt(expires)) {
                this.clearStoredAuthData();
                return null;
            }

            return {
                token: token,
                user: JSON.parse(userJson)
            };

        } catch (error) {
            console.warn('Failed to get stored auth data:', error);
            this.clearStoredAuthData();
            return null;
        }
    }

    /**
     * Clear stored authentication data
     */
    clearStoredAuthData() {
        sessionStorage.removeItem('github_oauth_token');
        sessionStorage.removeItem('github_oauth_user');
        sessionStorage.removeItem('github_oauth_expires');
    }

    /**
     * Clean up OAuth state data
     */
    cleanupOAuthState() {
        sessionStorage.removeItem('github_oauth_state');
        sessionStorage.removeItem('github_oauth_client_id');
        sessionStorage.removeItem('github_oauth_code');
    }

    /**
     * Check if user is currently authenticated
     */
    isAuthenticated() {
        const authData = this.getStoredAuthData();
        return authData !== null;
    }

    /**
     * Get current user data
     */
    getCurrentUser() {
        const authData = this.getStoredAuthData();
        return authData ? authData.user : null;
    }

    /**
     * Get current access token
     */
    getAccessToken() {
        const authData = this.getStoredAuthData();
        return authData ? authData.token : null;
    }

    /**
     * Logout user
     */
    logout() {
        this.clearStoredAuthData();
        this.cleanupOAuthState();
    }

    /**
     * Configure token exchange URL for production
     */
    setTokenExchangeUrl(url) {
        this.tokenExchangeUrl = url;
    }

    /**
     * Configure GitHub client ID
     */
    setClientId(clientId) {
        this.clientId = clientId;
    }
}

// Export for use in other modules
window.GitHubOAuth = GitHubOAuth;