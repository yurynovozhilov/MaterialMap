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

## Quick Start

Open `index.html` in your browser or visit the live site.

## Documentation

For detailed information, please see:
- [Security Information](docs/SECURITY.md)
- [Error Handling Improvements](docs/ERROR_HANDLING_IMPROVEMENTS.md)
- [Material Editor System](docs/MATERIAL_EDITOR.md)

## Project Structure

```
├── index.html              # Main application entry point
├── assets/                 # Static resources
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   └── html/              # Additional HTML pages
├── config/                # Configuration files
├── data/                  # Material model YAML files
├── dist/                  # Generated files
└── docs/                  # Documentation
```

## Contributing

Contributions are welcome! Users can contribute by submitting new references with material models or correcting existing data.

## License

This project is licensed under the [Creative Commons Attribution-NonCommercial (CC BY-NC) License](https://creativecommons.org/licenses/by-nc/4.0/). This license allows non-commercial copying and modification of the content with attribution to the original project.

## Disclaimer

All data provided on the Material MAP website is to be used at the user's own risk.