# Phase 1: Foundation Setup

This document covers the initial setup phase for migrating Material MAP to Astro.

## Overview

The foundation setup phase establishes the basic Astro project structure and prepares the development environment for the migration process.

## Prerequisites

- Node.js 18+ installed
- Git repository access
- Basic understanding of Astro framework
- Current Material MAP project backup

## Step 1: Initialize Astro Project

### 1.1 Create New Astro Project

```bash
# Navigate to your development directory
cd /path/to/your/projects

# Create new Astro project
npm create astro@latest material-map-astro

# Follow the prompts:
# ✔ Where should we create your new project? › material-map-astro
# ✔ How would you like to start your new project? › Empty
# ✔ Install dependencies? › Yes
# ✔ Do you plan to write TypeScript? › Yes
# ✔ Initialize a new git repository? › Yes
```

### 1.2 Navigate to Project Directory

```bash
cd material-map-astro
```

### 1.3 Verify Installation

```bash
# Start development server to verify installation
npm run dev

# Should show: Local: http://localhost:4321/
```

## Step 2: Configure Package.json

### 2.1 Update Package.json

Replace the generated `package.json` with our customized version:

```json
{
  "name": "material-map",
  "version": "2.0.0",
  "description": "Material MAP - Library of material model parameter sets for LS-DYNA",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "lint": "eslint src --ext .ts,.astro",
    "lint:fix": "eslint src --ext .ts,.astro --fix",
    "type-check": "astro check"
  },
  "dependencies": {
    "astro": "^4.0.0",
    "js-yaml": "^4.1.0",
    "@astrojs/tailwind": "^5.0.0",
    "@astrojs/sitemap": "^3.0.0",
    "@astrojs/check": "^0.3.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "eslint-plugin-astro": "^0.29.0",
    "vitest": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0",
    "jsdom": "^23.0.0",
    "@testing-library/dom": "^9.0.0",
    "@testing-library/user-event": "^14.0.0"
  },
  "keywords": [
    "material",
    "LS-DYNA",
    "engineering",
    "simulation",
    "astro",
    "static-site"
  ],
  "author": "Material MAP Team",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/MaterialMap.git"
  },
  "homepage": "https://yourusername.github.io/MaterialMap"
}
```

### 2.2 Install Dependencies

```bash
npm install
```

## Step 3: Configure Astro

### 3.1 Create Astro Configuration

Create `astro.config.mjs`:

```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://yourusername.github.io',
  base: '/MaterialMap',
  integrations: [
    tailwind({
      // Disable default base styles to maintain custom styling
      applyBaseStyles: false,
    }),
    sitemap({
      // Generate sitemap for better SEO
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    })
  ],
  output: 'static',
  build: {
    assets: 'assets',
    inlineStylesheets: 'auto',
    // Optimize for GitHub Pages
    format: 'directory'
  },
  vite: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
    },
    build: {
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            'vendor': ['js-yaml'],
            'material-editor': ['./src/scripts/material-editor.ts'],
            'github-integration': ['./src/scripts/github-integration.ts']
          }
        }
      }
    }
  },
  // Enable experimental features if needed
  experimental: {
    assets: true
  }
});
```

### 3.2 Configure TypeScript

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/components/*": ["src/components/*"],
      "@/layouts/*": ["src/layouts/*"],
      "@/scripts/*": ["src/scripts/*"],
      "@/styles/*": ["src/styles/*"],
      "@/types/*": ["src/types/*"]
    },
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": [
    "src/**/*",
    "*.config.*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "coverage"
  ]
}
```

## Step 4: Project Structure Setup

### 4.1 Create Directory Structure

```bash
# Create main directories
mkdir -p src/{components,layouts,pages,scripts,styles,types,test}

# Create component subdirectories
mkdir -p src/components/{layout,ui,materials,github}

# Create pages subdirectories
mkdir -p src/pages/api/github

# Create public directory structure
mkdir -p public/{data,dist,assets}
```

### 4.2 Verify Directory Structure

Your project should now have this structure:

```
material-map-astro/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── ui/
│   │   ├── materials/
│   │   └── github/
│   ├── layouts/
│   ├── pages/
│   │   └── api/
│   │       └── github/
│   ├── scripts/
│   ├── styles/
│   ├── types/
│   └── test/
├── public/
│   ├── data/
│   ├── dist/
│   └── assets/
├── astro.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

## Step 5: Environment Configuration

### 5.1 Create Environment Files

Create `.env.example`:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Site Configuration
SITE_URL=https://yourusername.github.io/MaterialMap
PUBLIC_SITE_URL=https://yourusername.github.io/MaterialMap

# Analytics (optional)
PUBLIC_GA_ID=G-XXXXXXXXXX

# Development
NODE_ENV=development
```

Create `.env` (copy from `.env.example` and fill in actual values):

```bash
cp .env.example .env
```

### 5.2 Update .gitignore

Create/update `.gitignore`:

```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
.astro/

# Environment variables
.env
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
coverage/
.nyc_output/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Temporary folders
tmp/
temp/
```

## Step 6: Basic Configuration Files

### 6.1 Create ESLint Configuration

Create `.eslintrc.cjs`:

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:astro/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Customize rules as needed
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error'
  },
  overrides: [
    {
      files: ['*.astro'],
      parser: 'astro-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        extraFileExtensions: ['.astro']
      }
    }
  ],
  env: {
    browser: true,
    node: true,
    es2022: true
  }
};
```

### 6.2 Create Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-astro"],
  "overrides": [
    {
      "files": "*.astro",
      "options": {
        "parser": "astro"
      }
    }
  ]
}
```

## Step 7: Initial Testing Setup

### 7.1 Create Vitest Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import { getViteConfig } from 'astro/config';

export default defineConfig(
  getViteConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          'dist/',
          'coverage/'
        ],
        thresholds: {
          global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
          }
        }
      }
    }
  })
);
```

### 7.2 Create Test Setup File

Create `src/test/setup.ts`:

```typescript
import { beforeEach, vi } from 'vitest';

// Mock global objects that might not be available in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
vi.stubGlobal('localStorage', localStorageMock);

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
vi.stubGlobal('sessionStorage', sessionStorageMock);

// Mock fetch
global.fetch = vi.fn();

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Step 8: Verification and Testing

### 8.1 Test Development Server

```bash
# Start development server
npm run dev

# Should start without errors and show:
# 🚀 astro v4.x.x started in Xms
# ┃ Local    http://localhost:4321/
# ┃ Network  use --host to expose
```

### 8.2 Test Build Process

```bash
# Test build
npm run build

# Should complete without errors and create dist/ directory
```

### 8.3 Test Type Checking

```bash
# Run TypeScript check
npm run type-check

# Should complete without errors
```

### 8.4 Test Linting

```bash
# Run linter
npm run lint

# Should complete without errors (may show warnings for empty files)
```

## Step 9: Initial Commit

### 9.1 Initialize Git (if not already done)

```bash
git init
git add .
git commit -m "Initial Astro project setup

- Initialize Astro project with TypeScript
- Configure build system and development tools
- Set up project structure for Material MAP migration
- Add testing framework and linting configuration"
```

## Troubleshooting

### Common Issues

1. **Node.js Version Issues**
   ```bash
   # Check Node.js version
   node --version
   # Should be 18+ for Astro 4.x
   ```

2. **Permission Issues**
   ```bash
   # Fix npm permissions (macOS/Linux)
   sudo chown -R $(whoami) ~/.npm
   ```

3. **Port Already in Use**
   ```bash
   # Use different port
   npm run dev -- --port 3000
   ```

4. **TypeScript Errors**
   ```bash
   # Clear TypeScript cache
   rm -rf node_modules/.cache
   npm run type-check
   ```

## Next Steps

After completing this foundation setup:

1. ✅ Astro project initialized
2. ✅ Development environment configured
3. ✅ Project structure created
4. ✅ Build system verified

**Next Phase**: [Core Components Migration](./02-core-components.md)

## Checklist

- [ ] Astro project created successfully
- [ ] Dependencies installed without errors
- [ ] TypeScript configuration working
- [ ] Development server starts correctly
- [ ] Build process completes successfully
- [ ] Linting and type checking pass
- [ ] Project structure matches specification
- [ ] Environment files configured
- [ ] Initial commit created

## Resources

- [Astro Documentation](https://docs.astro.build/)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [Vitest Documentation](https://vitest.dev/)
- [ESLint Configuration](https://eslint.org/docs/user-guide/configuring/)