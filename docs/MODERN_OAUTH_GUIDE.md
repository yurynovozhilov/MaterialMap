# Modern OAuth Implementation Guide

## Overview

This guide describes the new modern OAuth implementation for Material MAP that addresses the "OAuth state lost from browser storage" error and provides a more robust authentication system.

## Problem with Previous Implementation

The previous OAuth implementation had several issues:

1. **Storage Dependency**: Relied heavily on sessionStorage/localStorage for state management
2. **Browser Compatibility**: Different browsers handle storage differently in popup windows
3. **Security Concerns**: State could be lost due to browser security settings
4. **Complex Error Handling**: Difficult to debug storage-related issues

## New Modern Implementation

### Key Features

1. **PKCE Flow**: Uses Authorization Code Flow with PKCE (Proof Key for Code Exchange) for enhanced security
2. **Memory-Based State**: Stores critical state in memory instead of browser storage
3. **Simplified Callback**: Streamlined callback handling with better error messages
4. **Development Mode**: Built-in mock authentication for development
5. **Better Error Handling**: Clear error messages and fallback mechanisms

### Files Structure

```
src/assets/js/
├── oauth-client.js          # New modern OAuth client
├── github-oauth.js          # Legacy OAuth client (fallback)
└── config.js               # Updated configuration

oauth-callback-modern.html   # New callback page
test-oauth-modern.html      # Test page for OAuth functionality
```

## Implementation Details

### 1. PKCE Flow

The new implementation uses PKCE (RFC 7636) which is the recommended approach for client-side applications:

```javascript
// Generate code verifier and challenge
async generatePKCE() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    this.codeVerifier = Array.from(array, byte => 
        byte.toString(16).padStart(2, '0')
    ).join('');

    const encoder = new TextEncoder();
    const data = encoder.encode(this.codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    
    this.codeChallenge = this.base64URLEncode(digest);
}
```

### 2. Memory-Based State Management

Instead of relying on browser storage, the new implementation stores state in memory:

```javascript
// Store state in memory (not storage)
this.pendingAuth = {
    codeVerifier: this.codeVerifier,
    state: state,
    timestamp: Date.now()
};
```

### 3. Simplified Callback Handling

The new callback page is much simpler and just passes data to the parent window:

```javascript
// Send data to parent window
window.opener.postMessage({
    type: 'github_oauth_callback',
    success: true,
    code: code,
    state: state
}, window.location.origin);
```

## Configuration

### GitHub OAuth App Setup

1. **Update Redirect URI** in your GitHub OAuth App:
   - Development: `http://127.0.0.1:5500/oauth-callback-modern.html`
   - Production: `https://yurynovozhilov.github.io/MaterialMap/oauth-callback-modern.html`

2. **Verify Settings**:
   - Application name: Material MAP
   - Homepage URL: Your site URL
   - Authorization callback URL: Must match exactly

### Code Configuration

The configuration in `config.js` automatically detects the environment:

```javascript
callbackUrl: window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('127.0.0.1') ||
            window.location.port === '5500' 
            ? window.location.origin + '/oauth-callback-modern.html'
            : 'https://yurynovozhilov.github.io/MaterialMap/oauth-callback-modern.html'
```

## Usage

### Basic Authentication

```javascript
// Get OAuth client
const oauthClient = window.materialMapOAuthClient;

// Authenticate user
try {
    const result = await oauthClient.authenticate();
    console.log('User:', result.user);
    console.log('Token:', result.token);
} catch (error) {
    console.error('Authentication failed:', error.message);
}
```

### Check Authentication Status

```javascript
// Check if user is authenticated
if (oauthClient.isAuthenticated()) {
    const user = oauthClient.getCurrentUser();
    const token = oauthClient.getCurrentToken();
    console.log('Authenticated as:', user.login);
}
```

### Logout

```javascript
// Logout user
oauthClient.logout();
```

## Development Mode

For development, the system automatically enables mock authentication:

```javascript
development: {
    enabled: true,  // Auto-detected for localhost
    mockOAuth: true // Uses mock tokens and users
}
```

Mock authentication provides:
- Fake but valid-looking tokens
- Mock user data
- No actual GitHub API calls
- Instant authentication for testing

## Testing

### Test Page

Use `test-oauth-modern.html` to test the OAuth functionality:

1. Open `http://127.0.0.1:5500/test-oauth-modern.html`
2. Click "Test Login" to test authentication
3. Check the debug log for detailed information
4. Verify user information is displayed correctly

### Manual Testing Steps

1. **Clear browser data** (cookies, localStorage, sessionStorage)
2. **Open the test page**
3. **Click "Test Login"**
4. **Verify popup opens** to GitHub OAuth page
5. **Complete authentication** on GitHub
6. **Verify callback** returns successfully
7. **Check user info** is displayed

## Error Handling

The new implementation provides clear error messages:

- `"GitHub OAuth Client ID not configured"` - Configuration issue
- `"Popup blocked"` - Browser blocked the popup
- `"Authentication cancelled by user"` - User closed popup
- `"Invalid state parameter"` - CSRF protection failed
- `"Authentication request expired"` - Request too old (>10 minutes)

## Migration from Legacy System

The new system is backward compatible:

1. **Automatic Detection**: Config automatically loads the modern client if available
2. **Fallback Support**: Falls back to legacy client if modern one fails
3. **Same API**: Uses the same global `window.materialMapOAuthClient` reference

### Migration Steps

1. **Add new files** to your project
2. **Update index.html** to include `oauth-client.js`
3. **Update GitHub OAuth App** redirect URI
4. **Test thoroughly** with the test page
5. **Deploy** when ready

## Security Considerations

### PKCE Benefits

- **No Client Secret**: Doesn't require storing client secrets in client-side code
- **Dynamic Secrets**: Each authentication uses a unique code verifier
- **Replay Protection**: Code verifier can only be used once

### State Protection

- **Memory Storage**: State stored in memory, not persistent storage
- **Timestamp Validation**: Requests expire after 10 minutes
- **Origin Validation**: Messages validated against expected origin

### Best Practices

1. **Always use HTTPS** in production
2. **Validate all callbacks** before processing
3. **Clear sensitive data** after use
4. **Monitor for errors** and handle gracefully

## Troubleshooting

### Common Issues

1. **"Popup blocked"**
   - Solution: Allow popups for your site
   - Alternative: Use redirect flow instead of popup

2. **"Invalid state parameter"**
   - Solution: Clear browser cache and try again
   - Check: Ensure callback URL matches exactly

3. **"Authentication request expired"**
   - Solution: Complete authentication within 10 minutes
   - Check: System clock is correct

4. **"Parent window not available"**
   - Solution: Ensure popup wasn't opened in new tab
   - Check: Browser popup settings

### Debug Information

Enable debug logging by opening browser console:

```javascript
// Enable verbose logging
window.MaterialMapConfig.development.enabled = true;
```

The system logs detailed information about:
- OAuth flow steps
- State generation and validation
- Token exchange attempts
- Error conditions

## Production Deployment

### Requirements

For production deployment, you need:

1. **Token Exchange Service**: Backend service to exchange authorization codes for tokens
2. **HTTPS**: Required for GitHub OAuth
3. **Correct Redirect URI**: Must match GitHub OAuth App configuration

### Token Exchange Service

Example implementation (Node.js/Express):

```javascript
app.post('/api/oauth/token', async (req, res) => {
    const { code, code_verifier, client_id, redirect_uri } = req.body;
    
    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                client_id,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                code_verifier,
                redirect_uri
            })
        });
        
        const tokenData = await response.json();
        res.json(tokenData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Configuration for Production

Update `config.js` for production:

```javascript
tokenExchange: {
    url: '/api/oauth/token' // Your token exchange endpoint
}
```

## Conclusion

The new modern OAuth implementation provides:

- ✅ **Reliable authentication** without storage issues
- ✅ **Enhanced security** with PKCE flow
- ✅ **Better error handling** with clear messages
- ✅ **Development support** with mock authentication
- ✅ **Backward compatibility** with existing code

This should resolve the "OAuth state lost from browser storage" error and provide a much more robust authentication experience.