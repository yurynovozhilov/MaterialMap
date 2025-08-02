# Material MAP

A non-commercial, ad-free static website providing a library of material model parameter sets for LS-DYNA, sourced from open-access articles.

## Website Link

Visit the website: [Material MAP](https://yurynovozhilov.github.io/MaterialMap)

## About the Project

Material MAP is a static website, built to offer a reference library for material models used in LS-DYNA simulations. The primary goal is to assist engineers in finding examples of material model parameter sets, linking directly to original open-access sources along with citation information for each reference.

All site data is stored in multiple YAML files in the `data` directory, allowing easy updates and additions. The project enables users to search and explore a variety of material models conveniently.

### Key Features

- **Non-commercial**: The site is entirely ad-free and provides its content for informational purposes only.
- **Open-access links**: All data references point to open-access sources, ensuring users can access original articles freely.
- **Citation Information**: Each reference includes proper citation details to give credit to the original authors.
- **User Contribution**: Contributions are encouraged, allowing users to add new material models or improve data accuracy.
- **Collaborative Editing**: GitHub PR-based material editing system allows users to suggest improvements through a user-friendly interface.

## Project Structure

```
MaterialMap/
├── index.html              # Main application entry point
├── README.md               # Project documentation
├── manifest.json           # PWA manifest
├── .gitignore              # Git ignore rules
├── .htaccess               # Web server configuration
├── src/                    # Source code
│   ├── assets/             # Static assets
│   │   ├── css/            # Stylesheets
│   │   ├── js/             # JavaScript modules
│   │   │   ├── components/ # UI components
│   │   │   ├── services/   # Data services
│   │   │   ├── utils/      # Utility functions
│   │   │   ├── config.js   # Configuration
│   │   │   ├── main.js     # Main application logic
│   │   │   └── service-worker-new.js # Service worker
│   │   └── html/           # HTML components
│   └── config/             # Configuration files
├── data/                   # Material model data (YAML files)
├── docs/                   # Project documentation
├── tests/                  # Unit and integration tests
├── scripts/                # Development and build scripts
│   ├── serve.py            # Development server
│   ├── run-tests.sh        # Test runner
│   └── *.html              # Test pages
├── dist/                   # Generated files
│   ├── file-list.json      # List of material files
│   ├── materials.json      # Complete materials data
│   ├── materials-min.json  # Minimized materials data
│   ├── search-index.json   # Search index
│   └── categories.json     # Material categories
└── .github/                # GitHub workflows
```

## Quick Start

### Local Development

```bash
# Start development server
python3 scripts/serve.py

# Or run all tests and start server
./scripts/run-tests.sh
```

Open `http://localhost:8080` in your browser.

## Testing

### Running Tests

The project includes comprehensive unit and integration tests:

```bash
# Run all tests (including browser tests)
./scripts/run-tests.sh

# Or run individual components:
cd scripts

# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- **ValidationEngine**: Material data validation logic
- **ChangeTracker**: Change tracking and history management
- **Integration Tests**: Complete workflow testing
- **Browser Tests**: Real-world usage scenarios

### Test Pages

For manual testing in browser:
- `test-simple.html`: Basic component loading tests
- `test-editor.html`: Full material editor functionality
- `debug-editor.html`: Debug version with detailed logging

See [TEST_REPORT.md](TEST_REPORT.md) for detailed test results and coverage information.

## Documentation

For detailed information, please see:
- [Security Information](docs/SECURITY.md)
- [Error Handling Improvements](docs/ERROR_HANDLING_IMPROVEMENTS.md)
- [Material Editor System](docs/MATERIAL_EDITOR.md)

## Application Architecture

The application follows a modular architecture with these key components:

1. **Utilities**: Common functions for string manipulation, network requests, etc.
   - `path-utils.js`: Path resolution and URL handling
   - `string-utils.js`: String manipulation, HTML escaping, date formatting
   - `network-utils.js`: Enhanced fetch with retry, timeout, and error handling

2. **Components**: UI components like notifications, loading indicators, etc.
   - `notification-system.js`: Unified notification system
   - `loading-manager.js`: Loading state and progress tracking
   - `table-manager.js`: DataTable initialization and interactions

3. **Services**: Data loading, parsing, and processing services
   - `data-loader.js`: Material data loading with caching and offline support
   - `yaml-parser.js`: YAML parsing with validation

4. **Main Application**: Orchestrates the components and services
   - `main.js`: Application initialization and theme management
   - `service-worker-new.js`: Offline support and caching using Workbox

This modular approach improves maintainability, reduces duplication, and makes the codebase easier to understand and extend.

## Contributing

Contributions are welcome! Users can contribute by submitting new references with material models or correcting existing data.

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial (CC BY-NC) License](https://creativecommons.org/licenses/by-nc/4.0/). This license allows non-commercial copying and modification of the content with attribution to the original project.

## Disclaimer

All data provided on the Material MAP website is to be used at the user's own risk.