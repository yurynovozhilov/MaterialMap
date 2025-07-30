# Security Implementation

This document outlines the security measures implemented in Material MAP to protect against common web vulnerabilities.

## Security Vulnerabilities Addressed

### 1. Cross-Site Scripting (XSS) Protection

**Content Security Policy (CSP)**
- Implemented strict CSP headers in both HTML files
- Restricts script sources to trusted CDNs and self
- Prevents inline script execution except where explicitly allowed
- Blocks object embedding and restricts base URI

**Input Sanitization**
- All user-generated content is escaped using `escapeHtml()` function
- URL validation prevents malicious links
- YAML parsing uses secure schema to prevent code execution

### 2. Subresource Integrity (SRI)

**CDN Resource Protection**
- All external JavaScript and CSS resources include SRI hashes
- Prevents tampering with third-party resources
- Uses SHA-384 hashing algorithm for integrity verification

**Implemented for:**
- js-yaml library (v4.1.0)
- jQuery library (v3.7.0)
- DataTables library (v1.13.7)
- DataTables CSS

### 3. Additional Security Headers

**X-Frame-Options**
- Set to "DENY" to prevent clickjacking attacks

**X-Content-Type-Options**
- Set to "nosniff" to prevent MIME type sniffing

**X-XSS-Protection**
- Enables browser XSS filtering

**Referrer-Policy**
- Set to "strict-origin-when-cross-origin" for privacy

**Permissions-Policy**
- Restricts access to sensitive browser APIs

## Implementation Details

### HTML Security Features

1. **Meta CSP Headers**: Implemented in both `index.html` and `about.html`
2. **SRI Attributes**: Added to all external script and link tags
3. **Secure Link Attributes**: External links use `rel="noopener noreferrer"`

### JavaScript Security Features

1. **Input Sanitization**: `escapeHtml()` function sanitizes all dynamic content
2. **URL Validation**: `sanitizeUrl()` function validates and sanitizes URLs
3. **Secure YAML Parsing**: Uses `CORE_SCHEMA` to prevent code execution
4. **Type Checking**: Validates data types before processing

### Server Configuration

1. **Apache (.htaccess)**: Security headers and file access restrictions
2. **Nginx (nginx-security.conf)**: Security headers and caching rules

## Security Best Practices

### For Developers

1. **Always sanitize user input** before displaying in HTML
2. **Validate URLs** before using in href attributes
3. **Use secure YAML parsing options** when processing external data
4. **Keep dependencies updated** and verify SRI hashes when updating

### For Deployment

1. **Use HTTPS** in production environments
2. **Implement proper server security headers**
3. **Regularly update CDN resource SRI hashes**
4. **Monitor for security vulnerabilities** in dependencies

## Testing Security

### Manual Testing

1. **XSS Testing**: Try injecting script tags in YAML data
2. **CSP Testing**: Check browser console for CSP violations
3. **SRI Testing**: Modify SRI hashes to verify integrity checking

### Automated Testing

Consider implementing:
- Security scanning tools
- Dependency vulnerability checking
- CSP violation monitoring

## Updating SRI Hashes

When updating CDN resources, generate new SRI hashes:

```bash
# Generate SHA-384 hash for a resource
curl -s [URL] | openssl dgst -sha384 -binary | openssl base64 -A
```

Example:
```bash
curl -s https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js | openssl dgst -sha384 -binary | openssl base64 -A
```

## Security Contact

For security-related issues, please create an issue in the GitHub repository with the "security" label.