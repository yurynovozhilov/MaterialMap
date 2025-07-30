# Material Editor System Documentation

## Overview

The Material Editor System implements a GitHub PR-based collaborative editing workflow for the Material MAP project. This system allows users to suggest edits to existing materials through a user-friendly interface, with changes submitted as Pull Requests for review.

## Architecture

### Core Components

1. **MaterialEditor** (`assets/js/material-editor.js`)
   - Main orchestrator class
   - Manages edit sessions and coordinates between components
   - Handles material identification and change tracking

2. **ChangeTracker** (`assets/js/change-tracker.js`)
   - Tracks all changes made to material data
   - Calculates change confidence scores
   - Provides change history and rollback functionality

3. **ValidationEngine** (`assets/js/validation-engine.js`)
   - Validates material data structure and content
   - Checks LS-DYNA format compliance
   - Validates URLs and references

4. **GitHubIntegration** (`assets/js/github-integration.js`)
   - Handles GitHub API interactions
   - Manages authentication and repository operations
   - Creates forks, branches, and pull requests

5. **UIManager** (`assets/js/ui-manager.js`)
   - Manages the editing interface
   - Handles modal dialogs and form interactions
   - Provides real-time validation feedback

## Workflow

### 1. Edit Initiation
- User clicks "Edit" button on a material row
- System checks for GitHub authentication
- If not authenticated, shows authentication modal
- If authenticated, opens edit modal with current material data

### 2. Editing Process
- User modifies material data in the edit form
- Changes are tracked in real-time
- Validation runs continuously
- Live preview shows how changes will appear
- Diff view shows exactly what changed

### 3. Submission Process
- User provides description of changes
- System creates fork of repository (if needed)
- Creates new branch with timestamp-based name
- Applies changes to YAML file
- Creates pull request with detailed description

## Features

### Material Identification
- Each material is identified by `filename:index` format
- Hash verification prevents conflicts
- Supports materials across multiple YAML files

### Change Tracking
- Tracks field-level changes with operation types (ADD, UPDATE, DELETE)
- Calculates confidence scores for changes
- Maintains change history for rollback

### Validation System
- **Structural validation**: Required fields, data types
- **Content validation**: LS-DYNA format, reference format
- **URL validation**: Accessibility checks with caching
- **YAML validation**: Syntax and serialization checks

### GitHub Integration
- OAuth authentication
- Automatic fork creation and management
- Branch naming: `edit-{username}-{timestamp}`
- Comprehensive PR descriptions with change details

### User Interface
- Tabbed editing interface (Basic Info, Material Data, Metadata, Preview, Changes)
- Real-time validation feedback
- Live preview of changes
- Diff visualization
- Connection status indicator

## Authentication

### GitHub OAuth
- One-click authentication through GitHub OAuth
- Secure token handling via sessionStorage
- No manual token management required

## Data Structure

### ChangeSet Structure
```javascript
{
  metadata: {
    id: "change-{timestamp}-{random}",
    timestamp: "ISO8601",
    author: "GitHubUser",
    description: "User description"
  },
  target: {
    file: "filename.yaml",
    materialIndex: 0,
    materialId: "filename:index",
    originalHash: "hash"
  },
  changes: {
    type: "MODIFY",
    fields: [ChangedField],
    before: MaterialData,
    after: MaterialData
  },
  validation: {
    status: "VALID|WARNING|INVALID",
    errors: [ValidationError],
    warnings: [ValidationWarning]
  }
}
```

### ChangedField Structure
```javascript
{
  fieldPath: "field.path",
  operation: "UPDATE|ADD|DELETE",
  oldValue: any,
  newValue: any,
  confidence: 0.0-1.0
}
```

## Validation Rules

### Required Fields
- `id`: Material ID (MAT_XXX format)
- `mat`: Material type (MAT_XXX_XXX format)
- `ref`: Reference citation
- `add`: Date added (YYYY-MM-DD format)

### Field Constraints
- `id`: 5-20 characters, MAT_XXX pattern
- `mat`: 5-50 characters, MAT_XXX pattern
- `ref`: 10-1000 characters
- `url`: Valid URL format, HTTPS preferred
- `app`: 1-10 applications, each 1-100 characters

### Content Validation
- **Material Data**: LS-DYNA format compliance, 80-character line limit
- **References**: Academic format with year and authors
- **URLs**: Accessibility verification with 5-minute cache
- **Dates**: Valid date range (1990-present)

## Error Handling

### Client-Side Errors
- Network connectivity issues
- Authentication failures
- Validation errors
- YAML parsing errors

### Server-Side Errors
- GitHub API rate limiting
- Repository access issues
- Merge conflicts
- File modification conflicts

### Recovery Mechanisms
- Automatic retry with exponential backoff
- Session storage for draft preservation
- Conflict detection and resolution
- Graceful degradation for offline use

## Security Considerations

### Authentication Security
- Tokens stored in localStorage only
- No server-side token storage
- Automatic token validation
- Secure token transmission

### Input Validation
- HTML escaping for all user inputs
- YAML injection prevention
- URL validation and sanitization
- File path validation

### GitHub Security
- Limited scope tokens (public_repo only)
- Fork-based workflow prevents direct repository access
- All changes go through PR review process

## Performance Optimizations

### Caching
- URL validation results cached for 5 minutes
- GitHub API responses cached where appropriate
- Session storage for draft preservation

### Lazy Loading
- Components loaded only when needed
- Validation runs on debounced input
- Progressive enhancement approach

### Network Optimization
- Request batching where possible
- Retry mechanisms with backoff
- Offline capability detection

## Browser Compatibility

### Supported Browsers
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Required Features
- ES6+ support
- Fetch API
- LocalStorage
- SessionStorage
- CSS Grid/Flexbox

## Installation and Setup

### 1. Include Required Files
```html
<!-- CSS -->
<link rel="stylesheet" href="assets/css/material-editor.css" />

<!-- JavaScript (in order) -->
<script src="assets/js/change-tracker.js"></script>
<script src="assets/js/validation-engine.js"></script>
<script src="assets/js/github-integration.js"></script>
<script src="assets/js/ui-manager.js"></script>
<script src="assets/js/material-editor.js"></script>
```

### 2. Initialize System
```javascript
// Initialize material editor
const materialEditor = new MaterialEditor();
```

### 3. Add Edit Buttons
Edit buttons are automatically added to the materials table with the class `btn-edit`.

## Configuration

### GitHub Repository Settings
```javascript
// In github-integration.js
this.repoOwner = 'YuryNovozhilov';
this.repoName = 'MaterialMap';
```

### Validation Rules
Validation rules can be customized in `ValidationEngine.initializeValidationRules()`.

### UI Themes
The system supports light/dark themes through CSS custom properties.

## API Reference

### MaterialEditor Methods
- `startEditSession(materialId, materialData, filename, index)`: Start editing
- `updateMaterial(fieldPath, newValue)`: Update field value
- `submitChanges(description)`: Submit changes as PR
- `cancelEdit()`: Cancel current edit session

### ChangeTracker Methods
- `trackChange(fieldPath, oldValue, newValue)`: Track a change
- `getAllChanges()`: Get all tracked changes
- `getChangesSummary()`: Get summary statistics

### ValidationEngine Methods
- `validateMaterial(material)`: Validate complete material
- `getFieldValidation(validation, fieldPath)`: Get field-specific validation

### GitHubIntegration Methods
- `authenticate(token)`: Authenticate with GitHub
- `submitChanges(changeSet)`: Submit changes as PR
- `getCurrentUser()`: Get authenticated user info

## Troubleshooting

### Common Issues

1. **Edit button not working**
   - Check browser console for JavaScript errors
   - Verify all script files are loaded
   - Check MaterialEditor initialization

2. **Authentication failures**
   - Verify token has correct permissions
   - Check token expiration
   - Ensure network connectivity

3. **Validation errors**
   - Check material data format
   - Verify required fields are present
   - Review validation rules

4. **Submission failures**
   - Check GitHub API rate limits
   - Verify repository permissions
   - Check for merge conflicts

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('materialEditor_debug', 'true');
```

## Future Enhancements

### Planned Features
- OAuth authentication
- Batch editing capabilities
- Advanced diff visualization
- Collaborative editing indicators
- Mobile-responsive interface

### Integration Possibilities
- CI/CD pipeline integration
- Automated testing for submissions
- Material validation service
- Real-time collaboration features

## Contributing

### Development Setup
1. Clone repository
2. Install dependencies (if any)
3. Make changes to component files
4. Test in browser environment
5. Submit PR with changes

### Code Style
- Use ES6+ features
- Follow existing naming conventions
- Add JSDoc comments for public methods
- Include error handling for all operations

### Testing
- Test in multiple browsers
- Verify offline functionality
- Test with various material formats
- Validate GitHub integration

## License

This material editor system is part of the Material MAP project and follows the same licensing terms (CC BY-NC).