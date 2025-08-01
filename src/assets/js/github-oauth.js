/**
 * GitHub OAuth Client - Handles OAuth authentication flow
 */

class GitHubOAuth {
    constructor() {
        // GitHub OAuth configuration - will be set from config
        this.clientId = null;
        this.redirectUri = null; // Will be set from config
        this.scope = 'public_repo user:email';
        this.authUrl = 'https://github.com/login/oauth/authorize';
        
        // Development mode detection
        this.isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.hostname.includes('127.0.0.1') ||
                           window.location.port === '5500'; // VS Code Live Server
        
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
            this.redirectUri = config.callbackUrl;
        }
        
        // Fallback if no callback URL is set
        if (!this.redirectUri) {
            this.redirectUri = window.location.origin + '/oauth-callback.html';
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
                // Check if development mode should be enabled
                const devModeEnabled = this.isDevelopment || window.MaterialMapConfig?.development?.enabled;
                const mockOAuthEnabled = window.MaterialMapConfig?.development?.mockOAuth;
                
                // Debug information for development
                if (devModeEnabled) {
                    console.log('OAuth Debug: Development mode enabled, using mock authentication');
                }
                
                if (devModeEnabled && mockOAuthEnabled) {
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
                    // Provide more helpful error message
                    const isLocalhost = window.location.hostname === 'localhost' || 
                                      window.location.hostname === '127.0.0.1' ||
                                      window.location.hostname.includes('127.0.0.1') ||
                                      window.location.port === '5500';
                    
                    if (isLocalhost) {
                        throw new Error('Development mode detected but not properly configured. Please check that development.enabled and development.mockOAuth are set to true in config.js, or configure a real GitHub OAuth Client ID.');
                    } else {
                        throw new Error('GitHub OAuth Client ID not configured. Please set up your GitHub OAuth App with a valid Client ID.');
                    }
                }
            }

            // Force cleanup any existing OAuth state to prevent conflicts
            this.forceCleanupOAuthState();
            
            // Generate and store state for CSRF protection
            const state = this.generateState();
            const timestamp = Date.now().toString();
            
            // Store new state with multiple fallback mechanisms
            try {
                sessionStorage.setItem('github_oauth_state', state);
                sessionStorage.setItem('github_oauth_client_id', this.clientId);
                sessionStorage.setItem('github_oauth_timestamp', timestamp);
                
                // Verify storage worked
                const verifyState = sessionStorage.getItem('github_oauth_state');
                if (verifyState !== state) {
                    throw new Error('Session storage verification failed');
                }
                
                console.log('OAuth state generated and stored:', {
                    state: state.substring(0, 8) + '...',
                    timestamp: timestamp,
                    verified: true
                });
                
            } catch (storageError) {
                console.error('Session storage failed:', storageError);
                
                // Fallback: try localStorage
                try {
                    localStorage.setItem('github_oauth_state_fallback', state);
                    localStorage.setItem('github_oauth_timestamp_fallback', timestamp);
                    console.warn('Using localStorage fallback for OAuth state');
                } catch (localStorageError) {
                    console.error('Both session and local storage failed:', localStorageError);
                    throw new Error('Unable to store OAuth state - browser storage may be disabled or full. Please check your browser settings and try again.');
                }
            }

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
            console.log('OAuth message received:', {
                origin: event.origin,
                expectedOrigin: window.location.origin,
                type: event.data?.type,
                success: event.data?.success,
                hasState: !!event.data?.state,
                hasCode: !!event.data?.code
            });

            // Verify origin for security
            if (event.origin !== window.location.origin) {
                console.warn('OAuth message from unexpected origin:', event.origin);
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
            // Verify state matches - check both sessionStorage and localStorage fallback
            let storedState = sessionStorage.getItem('github_oauth_state');
            let storedTimestamp = sessionStorage.getItem('github_oauth_timestamp');
            let usingFallback = false;
            
            // If not found in sessionStorage, check localStorage fallback
            if (!storedState) {
                storedState = localStorage.getItem('github_oauth_state_fallback');
                storedTimestamp = localStorage.getItem('github_oauth_timestamp_fallback');
                usingFallback = true;
                
                if (storedState) {
                    console.log('Using localStorage fallback for OAuth state verification');
                }
            }
            
            console.log('OAuth state verification:', {
                received: data.state ? data.state.substring(0, 8) + '...' : 'missing',
                stored: storedState ? storedState.substring(0, 8) + '...' : 'missing',
                timestamp: storedTimestamp,
                usingFallback: usingFallback,
                match: data.state === storedState
            });
            
            // Enhanced state verification with better error handling
            if (!data.state) {
                console.error('OAuth state missing from callback:', { 
                    received: data.state, 
                    stored: storedState ? 'present' : 'missing',
                    url: window.location.href 
                });
                throw new Error('OAuth state parameter missing from GitHub callback - authentication failed. Please try again.');
            }
            
            if (!storedState) {
                console.error('OAuth state missing from storage:', { 
                    received: data.state ? 'present' : 'missing', 
                    stored: storedState,
                    timestamp: storedTimestamp,
                    sessionStorageLength: sessionStorage.length
                });
                
                // Check if state was lost due to session storage issues
                const allKeys = [];
                for (let i = 0; i < sessionStorage.length; i++) {
                    allKeys.push(sessionStorage.key(i));
                }
                console.log('Available session storage keys:', allKeys);
                
                throw new Error('OAuth state lost from browser storage - authentication failed. This may be due to browser security settings or storage limitations. Please try again.');
            }
            
            if (data.state !== storedState) {
                console.error('OAuth state mismatch:', { 
                    received: data.state.substring(0, 8) + '...', 
                    stored: storedState.substring(0, 8) + '...',
                    receivedLength: data.state.length,
                    storedLength: storedState.length,
                    timestamp: storedTimestamp
                });
                
                // Clear potentially corrupted state from both storage locations
                sessionStorage.removeItem('github_oauth_state');
                sessionStorage.removeItem('github_oauth_timestamp');
                localStorage.removeItem('github_oauth_state_fallback');
                localStorage.removeItem('github_oauth_timestamp_fallback');
                throw new Error('Invalid state parameter - CSRF protection failed. The authentication request may have expired or been tampered with. Please try again.');
            }
            
            // Check if the state is too old (older than 10 minutes)
            if (storedTimestamp) {
                const stateAge = Date.now() - parseInt(storedTimestamp);
                const maxAge = 10 * 60 * 1000; // 10 minutes
                if (stateAge > maxAge) {
                    console.warn('OAuth state is old:', { 
                        age: Math.round(stateAge / 1000), 
                        maxAge: Math.round(maxAge / 1000) 
                    });
                    // Don't fail for old state, just warn - GitHub's OAuth flow can sometimes be slow
                }
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
        
        // Force cleanup of all OAuth-related data
        this.forceCleanupOAuthState();
        
        if (this.authPromise) {
            this.authPromise.reject(new Error(data.description || data.error));
            this.authPromise = null;
        }
    }

    /**
     * Force cleanup of all OAuth state data (more thorough than regular cleanup)
     */
    forceCleanupOAuthState() {
        // Regular cleanup
        this.cleanupOAuthState();
        
        // Additional cleanup for potential conflicts in sessionStorage
        try {
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && key.startsWith('github_oauth')) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => sessionStorage.removeItem(key));
        } catch (error) {
            console.warn('Failed to force cleanup OAuth state from sessionStorage:', error);
        }
        
        // Also cleanup localStorage fallback
        try {
            localStorage.removeItem('github_oauth_state_fallback');
            localStorage.removeItem('github_oauth_timestamp_fallback');
        } catch (error) {
            console.warn('Failed to cleanup OAuth state from localStorage:', error);
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
            // For static sites without backend, we can't securely exchange OAuth codes for tokens
            // because it requires a client_secret that cannot be exposed in frontend code.
            // 
            // Solutions for static sites:
            // 1. Use GitHub Apps with installation tokens (more complex)
            // 2. Use a serverless function (Netlify/Vercel Functions)
            // 3. Use a third-party OAuth proxy service
            // 4. Ask users to provide Personal Access Tokens directly
            
            console.error('OAuth token exchange not possible for static sites without backend');
            
            // Provide helpful error message to users
            throw new Error(`
                OAuth authentication requires a backend service to securely exchange tokens.
                
                For static sites, please use one of these alternatives:
                1. Set up a serverless function (Netlify/Vercel Functions)
                2. Use Personal Access Tokens instead of OAuth
                3. Deploy with a backend service
                
                Contact the site administrator to set up proper OAuth backend.
            `.trim());
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
        // Clean up sessionStorage
        sessionStorage.removeItem('github_oauth_state');
        sessionStorage.removeItem('github_oauth_client_id');
        sessionStorage.removeItem('github_oauth_code');
        sessionStorage.removeItem('github_oauth_timestamp');
        sessionStorage.removeItem('github_oauth_state_conflict');
        
        // Clean up localStorage fallback
        try {
            localStorage.removeItem('github_oauth_state_fallback');
            localStorage.removeItem('github_oauth_timestamp_fallback');
        } catch (error) {
            console.warn('Failed to cleanup OAuth fallback state:', error);
        }
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