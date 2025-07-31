# GitHub OAuth Redirect URI Fix Guide

## Problem
The error "The redirect_uri is not associated with this application" occurs because the GitHub OAuth app is not configured with the correct redirect URI.

## Current Configuration
- Client ID: `Ov23liawXcjJcsMDcAa7`
- Expected Redirect URI: `https://yurynovozhilov.github.io/MaterialMap/oauth-callback.html`

## Solution 1: Update Existing OAuth App (Recommended)

1. **Go to GitHub OAuth App Settings**:
   - Visit: https://github.com/settings/developers
   - Find the OAuth app with client ID `Ov23liawXcjJcsMDcAa7`
   - Click on the app to edit it

2. **Update the Authorization callback URL**:
   - Set to: `https://yurynovozhilov.github.io/MaterialMap/oauth-callback.html`
   - Make sure there are no extra spaces or characters
   - Save the changes

3. **Verify other settings**:
   - Application name: Material MAP
   - Homepage URL: `https://yurynovozhilov.github.io/MaterialMap/`
   - Application description: Material MAP - LS-DYNA Material Parameter Library

## Solution 2: Create New OAuth App

If you can't access the existing app:

1. **Create New OAuth App**:
   - Go to: https://github.com/settings/developers
   - Click "New OAuth App"
   - Fill in:
     - Application name: `Material MAP`
     - Homepage URL: `https://yurynovozhilov.github.io/MaterialMap/`
     - Application description: `Material MAP - LS-DYNA Material Parameter Library`
     - Authorization callback URL: `https://yurynovozhilov.github.io/MaterialMap/oauth-callback.html`

2. **Update Configuration**:
   - Copy the new Client ID
   - Update `assets/js/config.js` with the new Client ID

## Solution 3: Temporary Development Mode

For immediate testing, you can enable development mode:

```javascript
// In assets/js/config.js, temporarily set:
development: {
    enabled: true,
    mockOAuth: true
}
```

This will bypass OAuth and use mock authentication for testing.

## Testing the Fix

1. **Clear browser cache and session storage**
2. **Navigate to the Material MAP site**
3. **Click Edit on any material**
4. **Click "Authenticate with GitHub"**
5. **Should redirect to GitHub without the error**

## Common Issues

- **Exact URL Match**: The redirect URI must match exactly (case-sensitive)
- **HTTPS Required**: GitHub OAuth requires HTTPS for production
- **No Trailing Slash**: Don't add trailing slashes to the callback URL
- **Browser Cache**: Clear browser cache after making changes

## Verification

After fixing, the OAuth flow should work as follows:
1. User clicks "Authenticate with GitHub"
2. Popup opens to GitHub OAuth page
3. User authorizes the application
4. GitHub redirects to `oauth-callback.html`
5. Callback page sends token back to main window
6. Authentication completes successfully