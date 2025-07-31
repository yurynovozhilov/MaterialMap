// Simple test to check if modules can be loaded in Node.js environment
const fs = require('fs');
const path = require('path');

console.log('Testing Material Editor modules...\n');

const modules = [
    'assets/js/change-tracker.js',
    'assets/js/validation-engine.js', 
    'assets/js/github-integration.js',
    'assets/js/ui-manager.js',
    'assets/js/material-editor.js'
];

// Mock browser globals for Node.js
global.window = {};
global.document = {
    createElement: () => ({ style: {}, addEventListener: () => {} }),
    getElementById: () => null,
    body: { appendChild: () => {} }
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};
global.$ = () => ({
    DataTable: () => ({}),
    closest: () => ({}),
    on: () => {}
});

for (const modulePath of modules) {
    try {
        console.log(`Loading ${modulePath}...`);
        const fullPath = path.join(__dirname, modulePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Try to evaluate the module
        eval(content);
        console.log(`✓ ${modulePath} loaded successfully`);
        
    } catch (error) {
        console.log(`✗ ${modulePath} failed: ${error.message}`);
        if (error.stack) {
            console.log(`  Stack: ${error.stack.split('\n')[1]}`);
        }
    }
}

// Test class availability
console.log('\nChecking class availability:');
const classes = ['ChangeTracker', 'ValidationEngine', 'GitHubIntegration', 'UIManager', 'MaterialEditor'];

for (const className of classes) {
    if (typeof global[className] !== 'undefined') {
        console.log(`✓ ${className} is available`);
    } else {
        console.log(`✗ ${className} is not available`);
    }
}

// Try to create MaterialEditor instance
console.log('\nTesting MaterialEditor instantiation:');
try {
    if (typeof MaterialEditor !== 'undefined') {
        const editor = new MaterialEditor();
        console.log('✓ MaterialEditor instance created successfully');
    } else {
        console.log('✗ MaterialEditor class not available');
    }
} catch (error) {
    console.log(`✗ MaterialEditor instantiation failed: ${error.message}`);
}