# GitHub OAuth Setup Guide

This guide explains how to set up GitHub OAuth authentication for Material MAP.

## Overview

Material MAP now supports two authentication methods:
1. **Personal Access Token** (legacy method)
2. **GitHub OAuth** (recommended method)

OAuth provides a better user experience as users don't need to manually create and manage tokens.

## Development Mode

For development and testing, OAuth works out of the box with mock authentication:

- Mock user: `dev-user`
- Mock email: `dev@example.com`
- Tokens are stored in `sessionStorage` (cleared when browser session ends)

## Production Setup

### Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: `Material MAP`
   - **Homepage URL**: `https://your-domain.com`
   - **Application description**: `Material MAP - LS-DYNA Material Parameter Library`
   - **Authorization callback URL**: `https://your-domain.com/oauth-callback.html`

4. Click "Register application"
5. Note down the **Client ID** (you'll need this)
6. Generate a **Client Secret** (keep this secure)

### Step 2: Configure Client ID

Update the configuration in `assets/js/config.js`:

```javascript
window.MaterialMapConfig = {
    github: {
        // Replace with your actual GitHub OAuth App client ID
        clientId: 'your_actual_client_id_here',
        
        // Other settings...
        scopes: 'public_repo user:email',
        callbackUrl: window.location.origin + '/oauth-callback.html',
        
        repository: {
            owner: 'YuryNovozhilov',
            name: 'MaterialMap'
        }
    },
    
    // Disable development mode for production
    development: {
        enabled: false,
        mockOAuth: false
    }
};
```

### Step 3: Set up Token Exchange Service

Since GitHub doesn't allow CORS requests to their token endpoint, you need a backend service to exchange the authorization code for an access token.

#### Option A: Netlify Functions

Create `netlify/functions/oauth-token.js`:

```javascript
exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { code, client_id, redirect_uri } = JSON.parse(event.body);
    
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: client_id,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
            redirect_uri: redirect_uri
        })
    });

    const data = await response.json();
    
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify(data)
    };
};
```

Then configure the token exchange URL:

```javascript
// In your OAuth client initialization
if (window.location.hostname !== 'localhost') {
    oauthClient.setTokenExchangeUrl('/.netlify/functions/oauth-token');
}
```

#### Option B: Vercel Functions

Create `api/oauth-token.js`:

```javascript
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { code, client_id, redirect_uri } = req.body;
    
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            client_id: client_id,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
            redirect_uri: redirect_uri
        })
    });

    const data = await response.json();
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.json(data);
}
```

#### Option C: GitHub Actions (Advanced)

You can use GitHub Actions with repository dispatch events to handle token exchange, but this is more complex and not recommended for real-time authentication.

### Step 4: Environment Variables

Set the following environment variables in your deployment platform:

- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App client secret

### Step 5: Update Content Security Policy

Update the CSP in `index.html` to allow GitHub OAuth:

```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self'; 
    script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://code.jquery.com https://cdn.datatables.net https://www.googletagmanager.com; 
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.datatables.net; 
    font-src 'self' https://fonts.gstatic.com; 
    connect-src 'self' https://api.github.com https://github.com https://www.google-analytics.com; 
    img-src 'self' data: https://github.com https://avatars.githubusercontent.com; 
    object-src 'none'; 
    base-uri 'self'; 
    form-action 'self';
">
```

## Testing OAuth

### Development Testing

1. Start your development server
2. Click "Edit" on any material
3. Click "Authenticate with GitHub" 
4. Should show mock authentication success

### Production Testing

1. Deploy your application with OAuth configuration
2. Click "Edit" on any material
3. Click "Authenticate with GitHub"
4. Should redirect to GitHub for authorization
5. After authorization, should redirect back and show success

## Security Considerations

1. **Client Secret**: Never expose your GitHub client secret in frontend code
2. **HTTPS**: Always use HTTPS in production for OAuth
3. **State Parameter**: The implementation includes CSRF protection via state parameter
4. **Token Storage**: Tokens are stored in sessionStorage (cleared when browser closes)
5. **Scopes**: Only request necessary scopes (`public_repo` and `user:email`)

## Troubleshooting

### Common Issues

1. **"Popup blocked"**: Users need to allow popups for your domain
2. **"Invalid client_id"**: Check that your client ID is correct
3. **"Redirect URI mismatch"**: Ensure callback URL matches exactly in GitHub settings
4. **CORS errors**: Make sure your token exchange service is properly configured

### Debug Mode

Enable debug logging by setting:

```javascript
window.MaterialMapConfig.development.enabled = true;
```

This will show detailed OAuth flow information in the browser console.

## Migration from Token Authentication

Users can still use Personal Access Tokens if they prefer. The system supports both methods simultaneously. OAuth is recommended for new users, while existing users can continue using their tokens.

## Support

If you encounter issues with OAuth setup, please:

1. Check the browser console for error messages
2. Verify your GitHub OAuth App configuration
3. Test with development mode first
4. Create an issue in the repository with detailed error information