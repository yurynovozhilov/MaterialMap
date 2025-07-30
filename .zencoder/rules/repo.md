---
description: Repository Information Overview
alwaysApply: true
---

# Material MAP Information

## Summary
Material MAP is a non-commercial, ad-free static website project that provides a library of material model parameter sets for LS-DYNA, sourced from open-access articles. The project aims to assist engineers in finding material model examples with proper citation information and direct links to original sources.

## Structure
- **data/**: Contains YAML files with material model parameters and metadata
- **dist/**: Contains generated file list (file-list.json)
- **.github/workflows/**: Contains GitHub Actions workflow for file list generation
- **index.html**: Main application entry point
- **scripts.js**: JavaScript code for the web application
- **styles.css**: CSS styling for the website
- **about.html**: Information page about the project

## Language & Runtime
**Language**: JavaScript (Frontend), YAML (Data)
**Runtime**: Web Browser
**Build System**: GitHub Actions workflow
**Package Manager**: None (CDN-based dependencies)

## Dependencies
**Main Dependencies**:
- js-yaml (v4.1.0) - YAML parser for JavaScript
- jQuery (v3.7.0) - JavaScript library
- DataTables (v1.13.7) - Table plugin for jQuery

## Build & Installation
```bash
# No build process required for local development
# GitHub Actions workflow automatically generates file-list.json on push to main branch
```

## GitHub Actions
**Workflow**: generate-file-list.yaml
**Trigger**: Push to main branch or manual dispatch
**Process**: 
- Sets up Node.js environment
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

## Usage
The website allows users to:
- Browse material models in a searchable table
- View detailed material parameters
- Copy material data to clipboard
- Access original research papers via direct links