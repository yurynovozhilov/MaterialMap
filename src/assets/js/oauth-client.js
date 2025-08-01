/**
 * Modern GitHub OAuth Client using PKCE flow
 * This implementation uses Authorization Code Flow with PKCE for security
 * and doesn't rely on sessionStorage for critical state management
 */

class ModernGitHubOAuth {
    constructor() {
        this.clientId = null;
        this.redirectUri = null;
        this.scope = 'public_repo user:email';
        this.authUrl = 'https://github.com/login/oauth/authorize';
        this.tokenUrl = 'https://github.com/login/oauth/access_token';
        
        // PKCE parameters
        this.codeVerifier = null;
        this.codeChallenge = null;
        
        // Development mode detection
        this.isDevelopment = this.detectDevelopmentMode();
        
        this.loadConfig();
        this.setupMessageListener();
    }

    detectDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.hostname.includes('127.0.0.1') ||
               window.location.port === '5500';
    }

    loadConfig() {
        if (window.MaterialMapConfig && window.MaterialMapConfig.github) {
            const config = window.MaterialMapConfig.github;
            this.clientId = config.clientId;
            this.scope = config.scopes || this.scope;
            this.redirectUri = config.callbackUrl;
        }
        
        if (!this.redirectUri) {
            this.redirectUri = window.location.origin + '/oauth-callback.html';
        }
    }

    /**
     * Generate PKCE code verifier and challenge
     */
    async generatePKCE() {
        // Generate code verifier (random string)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        this.codeVerifier = Array.from(array, byte => 
            byte.toString(16).padStart(2, '0')
        ).join('');

        // Generate code challenge (SHA256 hash of verifier, base64url encoded)
        const encoder = new TextEncoder();
        const data = encoder.encode(this.codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        
        this.codeChallenge = this.base64URLEncode(digest);
    }

    /**
     * Base64URL encode (without padding)
     */
    base64URLEncode(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * Start OAuth authentication flow with PKCE
     */
    async authenticate() {
        try {
            // Check configuration
            if (!this.clientId || this.clientId === 'YOUR_GITHUB_CLIENT_ID') {
                if (this.isDevelopment && window.MaterialMapConfig?.development?.mockOAuth) {
                    return this.mockAuthentication();
                }
                throw new Error('GitHub OAuth Client ID not configured');
            }

            // Generate PKCE parameters
            await this.generatePKCE();

            // Generate state for CSRF protection
            const state = this.generateSecureState();

            // Store PKCE verifier and state in memory (not storage)
            this.pendingAuth = {
                codeVerifier: this.codeVerifier,
                state: state,
                timestamp: Date.now()
            };

            // Build authorization URL with PKCE
            const params = new URLSearchParams({
                client_id: this.clientId,
                redirect_uri: this.redirectUri,
                scope: this.scope,
                state: state,
                code_challenge: this.codeChallenge,
                code_challenge_method: 'S256',
                allow_signup: 'true'
            });

            const authUrl = `${this.authUrl}?${params.toString()}`;

            // Open popup for OAuth
            const popup = this.openAuthPopup(authUrl);
            
            if (!popup) {
                throw new Error('Popup blocked. Please allow popups for this site.');
            }

            // Return promise that resolves when auth completes
            return new Promise((resolve, reject) => {
                this.authPromise = { resolve, reject };
                
                // Monitor popup
                this.monitorPopup(popup);
            });

        } catch (error) {
            console.error('OAuth authentication error:', error);
            throw error;
        }
    }

    /**
     * Generate cryptographically secure state
     */
    generateSecureState() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => 
            byte.toString(16).padStart(2, '0')
        ).join('');
    }

    /**
     * Open authentication popup
     */
    openAuthPopup(url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        return window.open(
            url,
            'github-oauth',
            `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );
    }

    /**
     * Monitor popup window
     */
    monitorPopup(popup) {
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                if (this.authPromise) {
                    this.authPromise.reject(new Error('Authentication cancelled by user'));
                    this.authPromise = null;
                }
            }
        }, 1000);
    }

    /**
     * Setup message listener for popup communication
     */
    setupMessageListener() {
        window.addEventListener('message', (event) => {
            // Verify origin
            if (event.origin !== window.location.origin) {
                return;
            }

            if (event.data.type === 'github_oauth_callback') {
                if (event.data.success) {
                    this.handleOAuthSuccess(event.data);
                } else {
                    this.handleOAuthError(event.data);
                }
            }
        });
    }

    /**
     * Handle successful OAuth callback
     */
    async handleOAuthSuccess(data) {
        try {
            // Verify we have pending auth
            if (!this.pendingAuth) {
                throw new Error('No pending authentication found');
            }

            // Verify state matches
            if (data.state !== this.pendingAuth.state) {
                throw new Error('Invalid state parameter - CSRF protection failed');
            }

            // Check if auth is too old (10 minutes)
            const authAge = Date.now() - this.pendingAuth.timestamp;
            if (authAge > 10 * 60 * 1000) {
                throw new Error('Authentication request expired');
            }

            // Exchange code for token using PKCE
            const tokenData = await this.exchangeCodeForToken(
                data.code, 
                this.pendingAuth.codeVerifier
            );

            // Get user info
            const user = await this.getUserInfo(tokenData.access_token);

            // Store auth data
            this.storeAuthData(tokenData, user);

            // Clear pending auth
            this.pendingAuth = null;

            // Resolve promise
            if (this.authPromise) {
                this.authPromise.resolve({ user, token: tokenData.access_token });
                this.authPromise = null;
            }

        } catch (error) {
            console.error('OAuth success handler error:', error);
            this.handleOAuthError({ error: error.message });
        }
    }

    /**
     * Handle OAuth error
     */
    handleOAuthError(data) {
        const error = new Error(data.description || data.error || 'Authentication failed');
        
        // Clear pending auth
        this.pendingAuth = null;

        if (this.authPromise) {
            this.authPromise.reject(error);
            this.authPromise = null;
        }
    }

    /**
     * Exchange authorization code for access token using PKCE
     */
    async exchangeCodeForToken(code, codeVerifier) {
        // For client-side apps, we need a proxy service for token exchange
        // GitHub doesn't support CORS for token endpoint
        
        if (this.isDevelopment) {
            // Mock token for development
            return {
                access_token: 'gho_dev_mock_token_' + Date.now(),
                token_type: 'bearer',
                scope: this.scope
            };
        }

        // In production, you would call your backend service here
        // Example:
        // const response = await fetch('/api/oauth/token', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         code,
        //         code_verifier: codeVerifier,
        //         client_id: this.clientId,
        //         redirect_uri: this.redirectUri
        //     })
        // });

        throw new Error('Token exchange service not configured. Please set up a backend service for production use.');
    }

    /**
     * Get user information from GitHub API
     */
    async getUserInfo(token) {
        if (this.isDevelopment) {
            // Mock user for development
            return {
                login: 'dev-user',
                name: 'Development User',
                email: 'dev@example.com',
                avatar_url: 'https://github.com/identicons/dev-user.png'
            };
        }

        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get user info: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Store authentication data
     */
    storeAuthData(tokenData, user) {
        const authData = {
            token: tokenData.access_token,
            user: user,
            timestamp: Date.now(),
            scope: tokenData.scope || this.scope
        };

        try {
            localStorage.setItem('github_auth', JSON.stringify(authData));
        } catch (error) {
            console.warn('Failed to store auth data:', error);
        }
    }

    /**
     * Get stored authentication data
     */
    getStoredAuth() {
        try {
            const stored = localStorage.getItem('github_auth');
            if (stored) {
                const authData = JSON.parse(stored);
                
                // Check if token is too old (24 hours)
                const tokenAge = Date.now() - authData.timestamp;
                if (tokenAge > 24 * 60 * 60 * 1000) {
                    this.clearStoredAuth();
                    return null;
                }
                
                return authData;
            }
        } catch (error) {
            console.warn('Failed to get stored auth:', error);
        }
        return null;
    }

    /**
     * Clear stored authentication data
     */
    clearStoredAuth() {
        try {
            localStorage.removeItem('github_auth');
        } catch (error) {
            console.warn('Failed to clear stored auth:', error);
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const auth = this.getStoredAuth();
        return auth && auth.token && auth.user;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        const auth = this.getStoredAuth();
        return auth ? auth.user : null;
    }

    /**
     * Get current token
     */
    getCurrentToken() {
        const auth = this.getStoredAuth();
        return auth ? auth.token : null;
    }

    /**
     * Mock authentication for development
     */
    async mockAuthentication() {
        console.warn('Using mock authentication for development');
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockUser = {
            login: 'dev-user',
            name: 'Development User',
            email: 'dev@example.com',
            avatar_url: 'https://github.com/identicons/dev-user.png'
        };
        
        const mockToken = 'gho_dev_mock_token_' + Date.now();
        
        this.storeAuthData({ access_token: mockToken }, mockUser);
        
        return { user: mockUser, token: mockToken };
    }

    /**
     * Logout user
     */
    logout() {
        this.clearStoredAuth();
        
        // Clear any pending auth
        this.pendingAuth = null;
        
        if (this.authPromise) {
            this.authPromise.reject(new Error('Logged out'));
            this.authPromise = null;
        }
    }
}

// Export for use in other modules
window.ModernGitHubOAuth = ModernGitHubOAuth;