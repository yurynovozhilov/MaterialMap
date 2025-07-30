---
description: Repository Information Overview
alwaysApply: true
---

# Material MAP Information

## Summary
Material MAP is a non-commercial, ad-free static website providing a library of material model parameter sets for LS-DYNA, sourced from open-access articles. It serves as a reference library for engineers to find examples of material model parameter sets with direct links to original sources and citation information.

## Structure
- **assets/**: Contains CSS, JavaScript, and HTML components
- **config/**: Configuration files for the application
- **data/**: YAML files containing material model parameters
- **dist/**: Generated files (file-list.json)
- **docs/**: Project documentation
- **.github/**: GitHub workflows for CI/CD
- **index.html**: Main application entry point

## Language & Runtime
**Language**: JavaScript (frontend), Python (development server)
**Runtime**: Browser-based application with Node.js for build processes
**Build System**: GitHub Actions workflow
**Package Manager**: npm (for build dependencies only)

## Dependencies
**Main Dependencies**:
- js-yaml (4.1.0): YAML parsing library
- jQuery: DOM manipulation
- DataTables: Interactive table functionality

**Development Dependencies**:
- Node.js (v20): Used in GitHub Actions workflow
- Python 3: Simple development server

## Build & Installation
```bash
# For local development
python3 serve.py  # Starts a local server on port 8080

# For production build (via GitHub Actions)
npm install yamljs
node -e "const fs = require('fs'); const path = require('path'); const dataDir = path.join(__dirname, 'data'); const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.yaml')); fs.writeFileSync('dist/file-list.json', JSON.stringify(files, null, 2));"
```

## GitHub Actions
**Workflow**: generate-file-list.yaml
**Trigger**: Push to main branch or manual dispatch
**Process**: 
- Sets up Node.js environment (v20)
- Installs yamljs dependency
- Generates file-list.json from YAML files in data directory
- Commits and pushes the generated file

## Data Structure
**Format**: YAML
**Schema**:
- Each file contains material definitions with:
  - Material ID and type
  - Material data in LS-DYNA format
  - Application examples
  - Reference information and citation
  - URL to open-access source
  - Date added

## Features
**Material Editor**: Browser-based editor for material data
**GitHub Integration**: PR-based contribution system
**PWA Support**: Progressive Web App capabilities via manifest.json
**Security**: Content Security Policy implementation