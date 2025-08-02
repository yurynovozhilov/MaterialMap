# Material MAP Architecture

This document describes the architecture of the Material MAP application, explaining the design decisions, component structure, and data flow.

## Overview

Material MAP is a static web application that provides a searchable database of material models for LS-DYNA simulations. The application is built using vanilla JavaScript with a modular architecture to improve maintainability and extensibility.

## Design Principles

The application follows these key design principles:

1. **Modularity**: Code is organized into small, focused modules with clear responsibilities
2. **Progressive Enhancement**: Core functionality works without JavaScript, enhanced features added when available
3. **Offline Support**: Application works offline using service workers and caching
4. **Error Resilience**: Robust error handling with fallbacks at multiple levels
5. **Performance**: Optimized loading with progressive data fetching

## Component Architecture

The application is structured into four main layers:

### 1. Utilities

Utility modules provide common functions used throughout the application:

- **path-utils.js**: Handles path resolution for different environments
  - `getBasePath()`: Determines the base path for the application
  - `getResourceUrl()`: Builds full URLs for resources

- **string-utils.js**: String manipulation and formatting
  - `escapeHtml()`: Sanitizes strings for safe HTML insertion
  - `sanitizeUrl()`: Validates and sanitizes URLs
  - `formatDate()`: Formats dates in a consistent way

- **network-utils.js**: Enhanced network operations
  - `fetchWithRetry()`: Fetch with automatic retry and timeout
  - `fetchJsonWithRetry()`: Fetch and parse JSON with retry
  - `fetchTextWithRetry()`: Fetch and parse text with retry

### 2. Components

Components handle the user interface and interactions:

- **notification-system.js**: Unified notification system
  - Shows success, error, warning, and info notifications
  - Handles animation and automatic dismissal
  - Provides consistent styling and positioning

- **loading-manager.js**: Loading state management
  - Tracks loading progress
  - Shows loading indicators
  - Handles loading errors
  - Provides retry functionality

- **table-manager.js**: DataTable management
  - Initializes and configures DataTables
  - Handles row click events
  - Creates code blocks with copy functionality
  - Manages table filtering and sorting

### 3. Services

Services handle data operations and business logic:

- **data-loader.js**: Data loading and caching
  - Progressive loading strategy
  - Caching for offline use
  - Fallback strategies for error handling
  - Update detection

- **yaml-parser.js**: YAML parsing and validation
  - Safe YAML parsing
  - Schema validation
  - Error handling and reporting

### 4. Main Application

The main application orchestrates the components and services:

- **main.js**: Application initialization
  - Theme management
  - Network monitoring
  - Application startup sequence

- **service-worker-new.js**: Offline support
  - Resource caching
  - Offline fallback pages
  - Update notification

## Data Flow

1. **Initialization**:
   - `main.js` initializes the application
   - Theme is set based on user preference
   - Network monitoring is set up

2. **Data Loading**:
   - `data-loader.js` loads material data
   - Progressive loading shows search index first
   - Full data is loaded in the background
   - Loading progress is tracked and displayed

3. **Data Display**:
   - `table-manager.js` initializes the DataTable
   - Material data is formatted for display
   - Row click handlers are set up

4. **User Interactions**:
   - User can search and filter materials
   - Clicking a row shows detailed material data
   - Theme can be toggled between light and dark

5. **Offline Support**:
   - Service worker caches resources
   - Application works offline
   - Updates are detected and notified

## Error Handling

The application implements multiple layers of error handling:

1. **Network Errors**:
   - Automatic retry with exponential backoff
   - Offline detection and notification
   - Cached data fallback

2. **Data Parsing Errors**:
   - YAML validation with detailed error messages
   - Partial success handling (some files may fail)
   - Schema validation

3. **UI Errors**:
   - Error boundaries around critical components
   - Fallback UI for error states
   - Retry functionality

## Future Improvements

Potential areas for future improvement:

1. **Add TypeScript**: For better type safety and developer experience
2. **Implement Unit Tests**: For better code quality and regression prevention
3. **Add Build Process**: For code minification and optimization
4. **Improve Accessibility**: For better usability for all users
5. **Add Analytics**: For usage tracking and improvement insights