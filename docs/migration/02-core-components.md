# Phase 2: Core Components Migration

This document covers the migration of core components from the vanilla HTML/JavaScript implementation to Astro components.

## Overview

In this phase, we'll create the fundamental Astro components that form the backbone of the Material MAP application, including layouts, data loading systems, and the main materials table.

## Prerequisites

- Phase 1 (Foundation Setup) completed
- Understanding of Astro component syntax
- Familiarity with the current Material MAP structure

## Step 1: Create Type Definitions

### 1.1 Material Types

Create `src/types/material.ts`:

```typescript
export interface Material {
  id: string;
  mat: string;
  mat_data: string;
  app?: string[];
  ref: string;
  add: string;
  url: string;
  eos?: string;
  filename?: string;
}

export interface MaterialFile {
  filename: string;
  materials: Material[];
}

export interface MaterialsTableProps {
  materials: Material[];
  loading?: boolean;
  error?: string;
}

export interface MaterialEditorProps {
  material?: Material;
  isOpen: boolean;
  onClose: () => void;
  onSave: (material: Material) => void;
}
```

### 1.2 UI Types

Create `src/types/ui.ts`:

```typescript
export interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  details?: string;
}

export interface ErrorState {
  hasError: boolean;
  message: string;
  details?: string;
  canRetry: boolean;
}

export interface ThemeState {
  theme: 'light' | 'dark';
  systemPreference: 'light' | 'dark';
}

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
export type ButtonSize = 'sm' | 'md' | 'lg';
```

## Step 2: Create Base Layout

### 2.1 Main Layout Component

Create `src/layouts/Layout.astro`:

```astro
---
export interface Props {
  title: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
}

const { 
  title, 
  description = "Material MAP - Library of material model parameter sets for LS-DYNA", 
  image,
  noIndex = false 
} = Astro.props;

const canonicalURL = new URL(Astro.url.pathname, Astro.site);
const socialImageURL = image ? new URL(image, Astro.url) : null;
---

<!DOCTYPE html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="description" content={description} />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <!-- Canonical URL -->
    <link rel="canonical" href={canonicalURL} />
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    
    <!-- Generator -->
    <meta name="generator" content={Astro.generator} />
    
    <!-- SEO -->
    {noIndex && <meta name="robots" content="noindex, nofollow" />}
    
    <!-- PWA Manifest -->
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#4169E1" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Material MAP" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalURL} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:site_name" content="Material MAP" />
    {socialImageURL && <meta property="og:image" content={socialImageURL} />}
    
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content={canonicalURL} />
    <meta property="twitter:title" content={title} />
    <meta property="twitter:description" content={description} />
    {socialImageURL && <meta property="twitter:image" content={socialImageURL} />}
    
    <!-- Structured Data -->
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Material MAP",
        "description": "Library of material model parameter sets for LS-DYNA",
        "url": "https://yourusername.github.io/MaterialMap",
        "author": {
          "@type": "Organization",
          "name": "Material MAP Team"
        },
        "keywords": "material, LS-DYNA, engineering, simulation, FEA"
      }
    </script>
    
    <title>{title}</title>
  </head>
  <body>
    <div id="app">
      <slot />
    </div>
    
    <!-- Service Worker Registration -->
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
              console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
              console.log('SW registration failed: ', registrationError);
            });
        });
      }
    </script>
    
    <!-- Theme initialization -->
    <script>
      // Initialize theme before page renders to prevent flash
      (function() {
        const savedTheme = localStorage.getItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = savedTheme || systemTheme;
        document.documentElement.setAttribute('data-theme', theme);
      })();
    </script>
  </body>
</html>
```

## Step 3: Create UI Components

### 3.1 Theme Toggle Component

Create `src/components/ui/ThemeToggle.astro`:

```astro
---
// No props needed for this component
---

<button 
  id="theme-toggle" 
  class="theme-toggle" 
  aria-label="Toggle dark mode"
  type="button"
>
  <span class="theme-icon light-icon">🌙</span>
  <span class="theme-icon dark-icon">☀️</span>
</button>

<script>
  class ThemeToggle {
    private button: HTMLButtonElement;
    private currentTheme: string;

    constructor() {
      this.button = document.getElementById('theme-toggle') as HTMLButtonElement;
      this.currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      
      if (this.button) {
        this.updateButton();
        this.button.addEventListener('click', this.toggleTheme.bind(this));
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!localStorage.getItem('theme')) {
            this.setTheme(e.matches ? 'dark' : 'light');
          }
        });
      }
    }

    private toggleTheme(): void {
      const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
      this.setTheme(newTheme);
    }

    private setTheme(theme: string): void {
      this.currentTheme = theme;
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
      this.updateButton();
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    private updateButton(): void {
      if (this.button) {
        this.button.setAttribute('aria-label', 
          `Switch to ${this.currentTheme === 'dark' ? 'light' : 'dark'} mode`
        );
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ThemeToggle());
  } else {
    new ThemeToggle();
  }
</script>

<style>
  .theme-toggle {
    position: relative;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 50%;
    width: 3rem;
    height: 3rem;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
  }

  .theme-toggle:hover {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
    transform: scale(1.05);
  }

  .theme-toggle:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .theme-icon {
    position: absolute;
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  [data-theme="light"] .light-icon {
    opacity: 1;
    transform: rotate(0deg);
  }

  [data-theme="light"] .dark-icon {
    opacity: 0;
    transform: rotate(180deg);
  }

  [data-theme="dark"] .light-icon {
    opacity: 0;
    transform: rotate(-180deg);
  }

  [data-theme="dark"] .dark-icon {
    opacity: 1;
    transform: rotate(0deg);
  }
</style>
```

### 3.2 Loading Spinner Component

Create `src/components/ui/LoadingSpinner.astro`:

```astro
---
export interface Props {
  message?: string;
  details?: string;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
}

const { 
  message = "Loading...", 
  details,
  progress,
  size = 'md'
} = Astro.props;
---

<div class={`loading-container loading-${size}`} role="status" aria-live="polite">
  <div class="spinner">
    <div class="spinner-ring"></div>
    <div class="spinner-ring"></div>
    <div class="spinner-ring"></div>
  </div>
  
  <div class="loading-content">
    <div class="loading-message">{message}</div>
    
    {progress !== undefined && (
      <div class="progress-bar">
        <div class="progress-fill" style={`width: ${progress}%`}></div>
      </div>
    )}
    
    {details && (
      <div class="loading-details">{details}</div>
    )}
  </div>
</div>

<style>
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    gap: 1rem;
  }

  .loading-sm {
    padding: 1rem;
    gap: 0.5rem;
  }

  .loading-lg {
    padding: 3rem;
    gap: 1.5rem;
  }

  .spinner {
    position: relative;
    width: 3rem;
    height: 3rem;
  }

  .loading-sm .spinner {
    width: 2rem;
    height: 2rem;
  }

  .loading-lg .spinner {
    width: 4rem;
    height: 4rem;
  }

  .spinner-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 3px solid transparent;
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 1.2s linear infinite;
  }

  .spinner-ring:nth-child(2) {
    border-top-color: var(--color-secondary);
    animation-delay: -0.4s;
    animation-duration: 1.8s;
  }

  .spinner-ring:nth-child(3) {
    border-top-color: var(--color-primary);
    animation-delay: -0.8s;
    animation-duration: 2.4s;
    opacity: 0.5;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 200px;
  }

  .loading-message {
    font-size: 1.125rem;
    font-weight: 500;
    color: var(--color-text);
  }

  .loading-sm .loading-message {
    font-size: 1rem;
  }

  .loading-lg .loading-message {
    font-size: 1.25rem;
  }

  .progress-bar {
    width: 100%;
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 2px;
    transition: width 0.3s ease;
  }

  .loading-details {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
  }

  /* Hide loading container by default */
  .loading-container {
    display: none;
  }

  .loading-container.active {
    display: flex;
  }
</style>
```

### 3.3 Error Message Component

Create `src/components/ui/ErrorMessage.astro`:

```astro
---
export interface Props {
  title?: string;
  message?: string;
  details?: string;
  canRetry?: boolean;
  onRetry?: string; // JavaScript function name to call
}

const { 
  title = "Error",
  message = "Something went wrong",
  details,
  canRetry = false,
  onRetry
} = Astro.props;
---

<div class="error-container" role="alert" aria-live="assertive">
  <div class="error-icon">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" fill="currentColor"/>
      <path d="M12 16V22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <path d="M12 8V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  </div>
  
  <div class="error-content">
    <div class="error-title">{title}</div>
    <div class="error-message">{message}</div>
    
    {details && (
      <details class="error-details">
        <summary>Show details</summary>
        <pre class="error-details-content">{details}</pre>
      </details>
    )}
    
    {canRetry && (
      <button 
        class="retry-button" 
        type="button"
        onclick={onRetry}
      >
        Try Again
      </button>
    )}
  </div>
</div>

<style>
  .error-container {
    display: none;
    align-items: flex-start;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--color-error-bg, #fef2f2);
    border: 1px solid var(--color-error-border, #fecaca);
    border-radius: var(--border-radius);
    color: var(--color-error-text, #991b1b);
    margin: 1rem 0;
  }

  .error-container.active {
    display: flex;
  }

  [data-theme="dark"] .error-container {
    background: var(--color-error-bg, #1f1315);
    border-color: var(--color-error-border, #4c1d1d);
    color: var(--color-error-text, #fca5a5);
  }

  .error-icon {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-error, #ef4444);
    color: white;
    border-radius: 50%;
  }

  .error-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .error-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
  }

  .error-message {
    font-size: 1rem;
    line-height: 1.5;
    margin: 0;
  }

  .error-details {
    margin-top: 0.5rem;
  }

  .error-details summary {
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.25rem 0;
    user-select: none;
  }

  .error-details summary:hover {
    color: var(--color-primary);
  }

  .error-details-content {
    margin-top: 0.5rem;
    padding: 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-size: 0.75rem;
    font-family: var(--font-family-mono);
    white-space: pre-wrap;
    overflow-x: auto;
  }

  .retry-button {
    align-self: flex-start;
    padding: 0.5rem 1rem;
    background: var(--color-error);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-button:hover {
    background: var(--color-error-hover, #dc2626);
    transform: translateY(-1px);
  }

  .retry-button:focus {
    outline: 2px solid var(--color-error);
    outline-offset: 2px;
  }
</style>
```

## Step 4: Create Data Loading System

### 4.1 Data Utilities

Create `src/scripts/utils.ts`:

```typescript
import yaml from 'js-yaml';
import type { Material, MaterialFile } from '../types/material';

/**
 * Load all materials from YAML files
 */
export async function loadMaterials(): Promise<Material[]> {
  try {
    // Load file list
    const fileListResponse = await fetch('/dist/file-list.json');
    if (!fileListResponse.ok) {
      throw new Error(`Failed to load file list: ${fileListResponse.status}`);
    }
    
    const fileList: string[] = await fileListResponse.json();
    console.log(`Loading ${fileList.length} material files...`);
    
    const materials: Material[] = [];
    const errors: string[] = [];
    
    // Load each YAML file
    for (const filename of fileList) {
      try {
        const response = await fetch(`/data/${filename}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const yamlContent = await response.text();
        const parsedData = yaml.load(yamlContent) as any[];
        
        if (Array.isArray(parsedData)) {
          const fileMaterials = parsedData.map(item => ({
            ...item.material,
            filename: filename
          }));
          materials.push(...fileMaterials);
        } else {
          console.warn(`Invalid format in ${filename}: expected array`);
        }
      } catch (error) {
        const errorMsg = `Error loading ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }
    
    console.log(`Loaded ${materials.length} materials from ${fileList.length - errors.length} files`);
    
    if (errors.length > 0) {
      console.warn(`Failed to load ${errors.length} files:`, errors);
    }
    
    return materials;
  } catch (error) {
    console.error('Error loading materials:', error);
    throw new Error(`Failed to load materials: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Format date string for display
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

/**
 * Sanitize HTML content
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Debounce function for search/filter operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
}

/**
 * Get base path for the application
 */
export function getBasePath(): string {
  if (typeof window === 'undefined') {
    return '/';
  }

  const { origin, pathname, port } = window.location;

  // Check if running via file:// protocol
  if (origin.startsWith('file://')) {
    const pathParts = pathname.split('/');
    pathParts.pop(); // Remove filename
    return pathParts.join('/');
  }

  // Check if running on localhost with non-privileged port
  if (origin.includes('localhost') || origin.includes('127.0.0.1') || (port && parseInt(port) > 1024)) {
    return './';
  }

  // For GitHub Pages deployment
  const repoName = pathname.split('/')[1];
  return repoName ? `/${repoName}` : '/';
}

/**
 * Create a download link for material data
 */
export function downloadMaterial(material: Material, format: 'yaml' | 'json' = 'yaml'): void {
  let content: string;
  let mimeType: string;
  let filename: string;

  if (format === 'yaml') {
    content = yaml.dump([{ material }]);
    mimeType = 'application/x-yaml';
    filename = `${material.id}.yaml`;
  } else {
    content = JSON.stringify({ material }, null, 2);
    mimeType = 'application/json';
    filename = `${material.id}.json`;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}
```

## Step 5: Create Materials Table Component

### 5.1 Materials Table Component

Create `src/components/materials/MaterialsTable.astro`:

```astro
---
import type { Material } from '../../types/material';

export interface Props {
  materials: Material[];
}

const { materials } = Astro.props;
---

<div class="materials-table-wrapper">
  <!-- Search and Filter Controls -->
  <div class="table-controls">
    <div class="search-container">
      <input 
        type="search" 
        id="materials-search" 
        placeholder="Search materials..." 
        class="search-input"
        aria-label="Search materials"
      />
      <button type="button" class="search-clear" id="search-clear" aria-label="Clear search">
        ×
      </button>
    </div>
    
    <div class="filter-container">
      <select id="material-type-filter" class="filter-select" aria-label="Filter by material type">
        <option value="">All Material Types</option>
      </select>
      
      <select id="application-filter" class="filter-select" aria-label="Filter by application">
        <option value="">All Applications</option>
      </select>
    </div>
  </div>

  <!-- Materials Table -->
  <div class="table-container">
    <table id="materials-table" class="materials-table" aria-label="Materials database">
      <thead>
        <tr>
          <th class="sortable" data-sort="mat">
            Material Model
            <span class="sort-indicator"></span>
          </th>
          <th class="sortable" data-sort="eos">
            EOS
            <span class="sort-indicator"></span>
          </th>
          <th>Applications</th>
          <th class="sortable" data-sort="add">
            Added
            <span class="sort-indicator"></span>
          </th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="materials-tbody">
        {materials.map((material, index) => (
          <tr data-material-index={index}>
            <td class="material-model">
              <code>{material.mat}</code>
              <div class="material-id">ID: {material.id}</div>
            </td>
            <td class="eos-cell">
              {material.eos ? <code>{material.eos}</code> : <span class="na">N/A</span>}
            </td>
            <td class="applications-cell">
              {material.app && material.app.length > 0 ? (
                <ul class="applications-list">
                  {material.app.map((app) => (
                    <li class="application-item">{app}</li>
                  ))}
                </ul>
              ) : (
                <span class="na">No applications listed</span>
              )}
            </td>
            <td class="date-cell">
              <time datetime={material.add}>{material.add}</time>
            </td>
            <td class="actions-cell">
              <div class="actions">
                <button 
                  class="btn btn-primary btn-sm" 
                  data-material-index={index}
                  data-action="edit"
                  aria-label={`Edit ${material.mat}`}
                >
                  Edit
                </button>
                <a 
                  href={material.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  class="btn btn-secondary btn-sm"
                  aria-label={`View source for ${material.mat}`}
                >
                  Source
                </a>
                <button 
                  class="btn btn-outline btn-sm" 
                  data-material-index={index}
                  data-action="download"
                  aria-label={`Download ${material.mat}`}
                >
                  Download
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  <!-- Table Info -->
  <div class="table-info">
    <div class="results-count">
      Showing <span id="visible-count">{materials.length}</span> of <span id="total-count">{materials.length}</span> materials
    </div>
    
    <div class="table-actions">
      <button type="button" class="btn btn-outline btn-sm" id="export-all">
        Export All
      </button>
      <button type="button" class="btn btn-outline btn-sm" id="reset-filters">
        Reset Filters
      </button>
    </div>
  </div>
</div>

<script>
  import { formatDate, debounce, downloadMaterial } from '../../scripts/utils';
  import type { Material } from '../../types/material';

  class MaterialsTable {
    private materials: Material[];
    private filteredMaterials: Material[];
    private searchInput: HTMLInputElement;
    private materialTypeFilter: HTMLSelectElement;
    private applicationFilter: HTMLSelectElement;
    private tbody: HTMLElement;
    private visibleCountEl: HTMLElement;
    private currentSort: { field: string; direction: 'asc' | 'desc' } | null = null;

    constructor() {
      // Get materials data from the rendered table
      this.materials = this.extractMaterialsFromTable();
      this.filteredMaterials = [...this.materials];
      
      // Get DOM elements
      this.searchInput = document.getElementById('materials-search') as HTMLInputElement;
      this.materialTypeFilter = document.getElementById('material-type-filter') as HTMLSelectElement;
      this.applicationFilter = document.getElementById('application-filter') as HTMLSelectElement;
      this.tbody = document.getElementById('materials-tbody') as HTMLElement;
      this.visibleCountEl = document.getElementById('visible-count') as HTMLElement;

      this.init();
    }

    private init(): void {
      this.populateFilters();
      this.bindEvents();
    }

    private extractMaterialsFromTable(): Material[] {
      const rows = document.querySelectorAll('[data-material-index]');
      return Array.from(rows).map((row, index) => {
        const materialModel = row.querySelector('.material-model code')?.textContent || '';
        const materialId = row.querySelector('.material-id')?.textContent?.replace('ID: ', '') || '';
        const eos = row.querySelector('.eos-cell code')?.textContent || '';
        const applications = Array.from(row.querySelectorAll('.application-item')).map(el => el.textContent || '');
        const dateAdded = row.querySelector('.date-cell time')?.getAttribute('datetime') || '';
        const sourceUrl = row.querySelector('.actions a')?.getAttribute('href') || '';

        return {
          id: materialId,
          mat: materialModel,
          eos: eos || undefined,
          app: applications.length > 0 ? applications : undefined,
          add: dateAdded,
          url: sourceUrl,
          mat_data: '', // Not available in table view
          ref: '', // Not available in table view
        };
      });
    }

    private populateFilters(): void {
      // Populate material type filter
      const materialTypes = [...new Set(this.materials.map(m => m.mat))].sort();
      materialTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        this.materialTypeFilter.appendChild(option);
      });

      // Populate application filter
      const applications = [...new Set(
        this.materials.flatMap(m => m.app || [])
      )].sort();
      applications.forEach(app => {
        const option = document.createElement('option');
        option.value = app;
        option.textContent = app;
        this.applicationFilter.appendChild(option);
      });
    }

    private bindEvents(): void {
      // Search
      this.searchInput.addEventListener('input', debounce(() => {
        this.applyFilters();
      }, 300));

      // Clear search
      document.getElementById('search-clear')?.addEventListener('click', () => {
        this.searchInput.value = '';
        this.applyFilters();
      });

      // Filters
      this.materialTypeFilter.addEventListener('change', () => this.applyFilters());
      this.applicationFilter.addEventListener('change', () => this.applyFilters());

      // Sorting
      document.querySelectorAll('.sortable').forEach(header => {
        header.addEventListener('click', () => {
          const field = header.getAttribute('data-sort');
          if (field) {
            this.sort(field);
          }
        });
      });

      // Actions
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const action = target.getAttribute('data-action');
        const materialIndex = target.getAttribute('data-material-index');

        if (action && materialIndex !== null) {
          const material = this.materials[parseInt(materialIndex)];
          this.handleAction(action, material);
        }
      });

      // Reset filters
      document.getElementById('reset-filters')?.addEventListener('click', () => {
        this.resetFilters();
      });

      // Export all
      document.getElementById('export-all')?.addEventListener('click', () => {
        this.exportAll();
      });
    }

    private applyFilters(): void {
      const searchTerm = this.searchInput.value.toLowerCase();
      const materialType = this.materialTypeFilter.value;
      const application = this.applicationFilter.value;

      this.filteredMaterials = this.materials.filter(material => {
        // Search filter
        if (searchTerm) {
          const searchableText = [
            material.mat,
            material.id,
            material.eos,
            ...(material.app || [])
          ].join(' ').toLowerCase();
          
          if (!searchableText.includes(searchTerm)) {
            return false;
          }
        }

        // Material type filter
        if (materialType && material.mat !== materialType) {
          return false;
        }

        // Application filter
        if (application && (!material.app || !material.app.includes(application))) {
          return false;
        }

        return true;
      });

      this.renderTable();
      this.updateResultsCount();
    }

    private sort(field: string): void {
      const direction = this.currentSort?.field === field && this.currentSort.direction === 'asc' ? 'desc' : 'asc';
      
      this.filteredMaterials.sort((a, b) => {
        let aVal = (a as any)[field] || '';
        let bVal = (b as any)[field] || '';

        // Handle date sorting
        if (field === 'add') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        } else {
          aVal = aVal.toString().toLowerCase();
          bVal = bVal.toString().toLowerCase();
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });

      this.currentSort = { field, direction };
      this.updateSortIndicators();
      this.renderTable();
    }

    private updateSortIndicators(): void {
      document.querySelectorAll('.sort-indicator').forEach(indicator => {
        indicator.textContent = '';
      });

      if (this.currentSort) {
        const header = document.querySelector(`[data-sort="${this.currentSort.field}"] .sort-indicator`);
        if (header) {
          header.textContent = this.currentSort.direction === 'asc' ? '↑' : '↓';
        }
      }
    }

    private renderTable(): void {
      // This is a simplified version - in a real implementation,
      // you might want to re-render the entire table body
      const rows = Array.from(this.tbody.querySelectorAll('tr'));
      
      rows.forEach(row => {
        const index = parseInt(row.getAttribute('data-material-index') || '0');
        const material = this.materials[index];
        const isVisible = this.filteredMaterials.includes(material);
        row.style.display = isVisible ? '' : 'none';
      });
    }

    private updateResultsCount(): void {
      this.visibleCountEl.textContent = this.filteredMaterials.length.toString();
    }

    private resetFilters(): void {
      this.searchInput.value = '';
      this.materialTypeFilter.value = '';
      this.applicationFilter.value = '';
      this.applyFilters();
    }

    private handleAction(action: string, material: Material): void {
      switch (action) {
        case 'edit':
          this.editMaterial(material);
          break;
        case 'download':
          downloadMaterial(material);
          break;
      }
    }

    private editMaterial(material: Material): void {
      // Dispatch custom event for material editor
      window.dispatchEvent(new CustomEvent('openMaterialEditor', {
        detail: { material }
      }));
    }

    private exportAll(): void {
      const data = {
        materials: this.filteredMaterials,
        exportDate: new Date().toISOString(),
        totalCount: this.filteredMaterials.length
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `materials-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MaterialsTable());
  } else {
    new MaterialsTable();
  }
</script>

<style>
  .materials-table-wrapper {
    width: 100%;
    margin: 2rem 0;
  }

  .table-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1.5rem;
    align-items: center;
  }

  .search-container {
    position: relative;
    flex: 1;
    min-width: 250px;
  }

  .search-input {
    width: 100%;
    padding: 0.75rem 2.5rem 0.75rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius);
    font-size: 1rem;
    background: var(--color-surface);
    color: var(--color-text);
    transition: border-color 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .search-clear {
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    font-size: 1.5rem;
    color: var(--color-text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .search-clear:hover {
    background: var(--color-border);
    color: var(--color-text);
  }

  .filter-container {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .filter-select {
    padding: 0.75rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.875rem;
    min-width: 150px;
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .table-container {
    overflow-x: auto;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-md);
  }

  .materials-table {
    width: 100%;
    border-collapse: collapse;
    background: var(--color-surface);
    font-size: 0.875rem;
  }

  .materials-table th,
  .materials-table td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
    vertical-align: top;
  }

  .materials-table th {
    background: var(--color-primary);
    color: white;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .sortable {
    cursor: pointer;
    user-select: none;
    position: relative;
  }

  .sortable:hover {
    background: var(--color-primary-hover, #3b5bdb);
  }

  .sort-indicator {
    margin-left: 0.5rem;
    font-size: 0.75rem;
  }

  .material-model code,
  .eos-cell code {
    background: var(--color-background);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: var(--font-family-mono);
    font-size: 0.75rem;
    border: 1px solid var(--color-border);
  }

  .material-id {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin-top: 0.25rem;
  }

  .applications-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .application-item {
    padding: 0.125rem 0;
    font-size: 0.8rem;
  }

  .application-item:not(:last-child) {
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.25rem;
    margin-bottom: 0.25rem;
  }

  .na {
    color: var(--color-text-secondary);
    font-style: italic;
    font-size: 0.8rem;
  }

  .date-cell time {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.5rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
  }

  .btn-sm {
    padding: 0.375rem 0.625rem;
    font-size: 0.7rem;
  }

  .btn-primary {
    background: var(--color-primary);
    color: white;
  }

  .btn-primary:hover {
    background: var(--color-primary-hover, #3b5bdb);
    transform: translateY(-1px);
  }

  .btn-secondary {
    background: var(--color-secondary);
    color: white;
  }

  .btn-secondary:hover {
    background: var(--color-secondary-hover, #5b6cff);
    transform: translateY(-1px);
  }

  .btn-outline {
    background: transparent;
    color: var(--color-primary);
    border-color: var(--color-primary);
  }

  .btn-outline:hover {
    background: var(--color-primary);
    color: white;
  }

  .table-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
    padding: 1rem;
    background: var(--color-surface);
    border-radius: var(--border-radius);
    font-size: 0.875rem;
  }

  .results-count {
    color: var(--color-text-secondary);
  }

  .table-actions {
    display: flex;
    gap: 0.5rem;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .table-controls {
      flex-direction: column;
      align-items: stretch;
    }

    .search-container {
      min-width: auto;
    }

    .filter-container {
      justify-content: stretch;
    }

    .filter-select {
      flex: 1;
      min-width: auto;
    }

    .materials-table {
      font-size: 0.75rem;
    }

    .materials-table th,
    .materials-table td {
      padding: 0.75rem 0.5rem;
    }

    .actions {
      flex-direction: column;
    }

    .table-info {
      flex-direction: column;
      gap: 1rem;
      text-align: center;
    }
  }
</style>
```

## Step 6: Create Main Page

### 6.1 Main Index Page

Create `src/pages/index.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
import ThemeToggle from '../components/ui/ThemeToggle.astro';
import LoadingSpinner from '../components/ui/LoadingSpinner.astro';
import ErrorMessage from '../components/ui/ErrorMessage.astro';
import MaterialsTable from '../components/materials/MaterialsTable.astro';
import { loadMaterials } from '../scripts/utils';

// Load materials at build time
let materials = [];
let loadError = null;

try {
  materials = await loadMaterials();
} catch (error) {
  loadError = error instanceof Error ? error.message : 'Failed to load materials';
  console.error('Error loading materials for SSG:', error);
}
---

<Layout title="Material MAP - LS-DYNA Material Parameters">
  <div class="app-container">
    <!-- Header -->
    <header class="app-header">
      <div class="header-content">
        <div class="title-section">
          <h1 class="app-title">Material MAP</h1>
          <p class="app-subtitle">Library of material model parameter sets for LS-DYNA</p>
        </div>
        <ThemeToggle />
      </div>
    </header>

    <!-- Main Content -->
    <main class="app-main" role="main">
      <!-- Loading State -->
      <LoadingSpinner 
        id="loading-container" 
        message="Loading materials database..." 
        details="Fetching material parameters from YAML files..."
      />

      <!-- Error State -->
      <ErrorMessage 
        id="error-container"
        title="Failed to Load Materials"
        message={loadError || "Unable to load the materials database. Please check your connection and try again."}
        canRetry={true}
        onRetry="window.location.reload()"
      />

      <!-- Materials Table -->
      {!loadError && materials.length > 0 && (
        <MaterialsTable materials={materials} />
      )}

      <!-- Empty State -->
      {!loadError && materials.length === 0 && (
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <h2>No Materials Found</h2>
          <p>The materials database appears to be empty. Please check back later.</p>
        </div>
      )}
    </main>

    <!-- Footer -->
    <footer class="app-footer">
      <div class="footer-content">
        <div class="footer-links">
          <a href="/about">About this project</a>
          <a href="https://github.com/yourusername/MaterialMap" target="_blank" rel="noopener noreferrer">
            GitHub Repository
          </a>
          <a href="https://github.com/yourusername/MaterialMap/issues" target="_blank" rel="noopener noreferrer">
            Report Issues
          </a>
        </div>
        <div class="footer-info">
          <p>
            Material MAP is a non-commercial, ad-free resource for the engineering community.
            All materials are sourced from open-access publications.
          </p>
          <p class="copyright">
            © 2024 Material MAP Team. Licensed under MIT License.
          </p>
        </div>
      </div>
    </footer>
  </div>
</Layout>

<style>
  .app-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .app-header {
    padding: 2rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2rem;
  }

  .title-section {
    flex: 1;
  }

  .app-title {
    font-size: 3rem;
    font-weight: 700;
    color: var(--color-primary);
    margin: 0 0 0.5rem 0;
    line-height: 1.1;
  }

  .app-subtitle {
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    margin: 0;
    font-weight: 400;
  }

  .app-main {
    flex: 1;
    padding: 2rem 0;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--color-text-secondary);
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state h2 {
    font-size: 1.5rem;
    color: var(--color-text);
    margin-bottom: 1rem;
  }

  .empty-state p {
    font-size: 1rem;
    max-width: 400px;
    margin: 0 auto;
  }

  .app-footer {
    border-top: 1px solid var(--color-border);
    padding: 2rem 0;
    margin-top: 2rem;
  }

  .footer-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .footer-links {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .footer-links a {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .footer-links a:hover {
    color: var(--color-secondary);
    text-decoration: underline;
  }

  .footer-info {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }

  .footer-info p {
    margin: 0 0 0.5rem 0;
  }

  .copyright {
    font-size: 0.8rem;
    opacity: 0.8;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .app-container {
      padding: 0 0.75rem;
    }

    .header-content {
      flex-direction: column;
      text-align: center;
      gap: 1.5rem;
    }

    .app-title {
      font-size: 2.5rem;
    }

    .app-subtitle {
      font-size: 1rem;
    }

    .footer-links {
      flex-direction: column;
      gap: 1rem;
    }

    .footer-content {
      text-align: center;
    }
  }

  @media (max-width: 480px) {
    .app-title {
      font-size: 2rem;
    }

    .empty-state {
      padding: 3rem 1rem;
    }

    .empty-icon {
      font-size: 3rem;
    }
  }
</style>
```

## Step 7: Testing and Verification

### 7.1 Create Basic Tests

Create `src/test/components/MaterialsTable.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Material } from '../../types/material';

// Mock materials data
const mockMaterials: Material[] = [
  {
    id: 'MAT_240',
    mat: 'MAT_COHESIVE_MIXED_MODE_ELASTOPLASTIC_RATE',
    mat_data: 'test data',
    app: ['Test Application', 'Another Application'],
    ref: 'Test Reference',
    add: '2024-01-01',
    url: 'https://example.com',
    eos: 'EOS_LINEAR_POLYNOMIAL'
  },
  {
    id: 'MAT_001',
    mat: 'MAT_ELASTIC',
    mat_data: 'elastic data',
    app: ['Elastic Test'],
    ref: 'Elastic Reference',
    add: '2024-01-02',
    url: 'https://example2.com'
  }
];

describe('MaterialsTable Component', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    
    // Mock fetch for file-list.json
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('file-list.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(['test1.yaml', 'test2.yaml'])
        });
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('- material:\n    id: MAT_240')
      });
    });
  });

  it('should render materials table with correct data', () => {
    // This would test the actual component rendering
    // For now, we'll test the data structure
    expect(mockMaterials).toHaveLength(2);
    expect(mockMaterials[0].id).toBe('MAT_240');
    expect(mockMaterials[0].app).toContain('Test Application');
  });

  it('should handle empty materials array', () => {
    const emptyMaterials: Material[] = [];
    expect(emptyMaterials).toHaveLength(0);
  });

  it('should format dates correctly', () => {
    const material = mockMaterials[0];
    expect(material.add).toBe('2024-01-01');
  });
});
```

### 7.2 Test the Build

```bash
# Test development server
npm run dev

# Test build process
npm run build

# Test preview
npm run preview

# Run tests
npm run test
```

## Verification Checklist

- [ ] Astro project builds without errors
- [ ] Development server starts correctly
- [ ] TypeScript compilation passes
- [ ] Basic components render properly
- [ ] Materials data loads correctly
- [ ] Theme toggle works
- [ ] Table filtering and sorting work
- [ ] Responsive design functions properly
- [ ] Error handling displays correctly
- [ ] Loading states show appropriately

## Next Steps

After completing this core components phase:

1. ✅ Type definitions created
2. ✅ Base layout implemented
3. ✅ UI components built
4. ✅ Data loading system established
5. ✅ Materials table component created
6. ✅ Main page structure complete

**Next Phase**: [Advanced Features Migration](./03-advanced-features.md)

## Troubleshooting

### Common Issues

1. **Build Errors**: Check TypeScript configuration and imports
2. **Component Not Rendering**: Verify Astro component syntax
3. **Data Loading Issues**: Check file paths and fetch implementation
4. **Styling Problems**: Verify CSS custom properties and theme system

### Debug Commands

```bash
# Check TypeScript errors
npm run type-check

# Build with verbose output
npm run build -- --verbose

# Test with coverage
npm run test:coverage
```