#!/usr/bin/env node

/**
 * Test Enhanced Data Loading
 * Validates the enhanced data processing and loading functionality
 */

const fs = require('fs');
const path = require('path');
const DataProcessor = require('./generate-optimized-data.js');

class EnhancedLoadingTester {
    constructor() {
        this.testResults = [];
        this.distDir = path.join(__dirname, '..', 'dist');
    }

    async runAllTests() {
        console.log('🧪 Starting Enhanced Loading Tests...\n');

        try {
            // Test 1: Data Processing
            await this.testDataProcessing();
            
            // Test 2: File Generation
            await this.testFileGeneration();
            
            // Test 3: Data Structure Validation
            await this.testDataStructures();
            
            // Test 4: Performance Metrics
            await this.testPerformance();
            
            // Test 5: Backward Compatibility
            await this.testBackwardCompatibility();
            
            this.printResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            process.exit(1);
        }
    }

    async testDataProcessing() {
        console.log('📊 Testing data processing...');
        
        const startTime = Date.now();
        const processor = new DataProcessor();
        
        try {
            await processor.process();
            const processingTime = Date.now() - startTime;
            
            this.addResult('Data Processing', true, `Completed in ${processingTime}ms`);
        } catch (error) {
            this.addResult('Data Processing', false, error.message);
            throw error;
        }
    }

    async testFileGeneration() {
        console.log('📁 Testing file generation...');
        
        const expectedFiles = [
            'materials.json',
            'materials-min.json',
            'search-index.json',
            'categories.json',
            'file-list.json'
        ];

        let allFilesExist = true;
        const fileSizes = {};

        for (const fileName of expectedFiles) {
            const filePath = path.join(this.distDir, fileName);
            
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                fileSizes[fileName] = stats.size;
                console.log(`  ✅ ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`);
            } else {
                console.log(`  ❌ ${fileName} - Missing`);
                allFilesExist = false;
            }
        }

        this.addResult('File Generation', allFilesExist, 
            allFilesExist ? `All ${expectedFiles.length} files generated` : 'Some files missing');
    }

    async testDataStructures() {
        console.log('🔍 Testing data structures...');
        
        const tests = [
            { file: 'materials.json', validator: this.validateMaterialsJson },
            { file: 'search-index.json', validator: this.validateSearchIndex },
            { file: 'categories.json', validator: this.validateCategories }
        ];

        let allValid = true;
        const validationResults = [];

        for (const test of tests) {
            try {
                const filePath = path.join(this.distDir, test.file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                
                const result = test.validator.call(this, data);
                validationResults.push(`${test.file}: ${result.message}`);
                
                if (!result.valid) {
                    allValid = false;
                }
                
                console.log(`  ${result.valid ? '✅' : '❌'} ${test.file}: ${result.message}`);
                
            } catch (error) {
                console.log(`  ❌ ${test.file}: ${error.message}`);
                allValid = false;
            }
        }

        this.addResult('Data Structure Validation', allValid, validationResults.join('; '));
    }

    validateMaterialsJson(data) {
        if (!data.materials || !Array.isArray(data.materials)) {
            return { valid: false, message: 'Missing or invalid materials array' };
        }

        if (!data.metadata || typeof data.metadata !== 'object') {
            return { valid: false, message: 'Missing or invalid metadata' };
        }

        const requiredMetadataFields = ['totalMaterials', 'categories', 'tags', 'materialTypes', 'generatedAt'];
        for (const field of requiredMetadataFields) {
            if (!(field in data.metadata)) {
                return { valid: false, message: `Missing metadata field: ${field}` };
            }
        }

        // Validate sample material structure
        if (data.materials.length > 0) {
            const sampleMaterial = data.materials[0];
            const requiredFields = ['uniqueId', 'id', 'mat', 'metadata'];
            
            for (const field of requiredFields) {
                if (!(field in sampleMaterial)) {
                    return { valid: false, message: `Sample material missing field: ${field}` };
                }
            }
        }

        return { 
            valid: true, 
            message: `${data.materials.length} materials, ${data.metadata.categories.length} categories` 
        };
    }

    validateSearchIndex(data) {
        if (!data.materials || !Array.isArray(data.materials)) {
            return { valid: false, message: 'Missing or invalid materials array' };
        }

        if (data.materials.length > 0) {
            const sampleMaterial = data.materials[0];
            const requiredFields = ['uniqueId', 'id', 'mat', 'searchText', 'category', 'tags'];
            
            for (const field of requiredFields) {
                if (!(field in sampleMaterial)) {
                    return { valid: false, message: `Search index material missing field: ${field}` };
                }
            }
        }

        return { 
            valid: true, 
            message: `${data.materials.length} searchable materials` 
        };
    }

    validateCategories(data) {
        const requiredSections = ['categories', 'materialTypes', 'tags'];
        
        for (const section of requiredSections) {
            if (!data[section] || !Array.isArray(data[section])) {
                return { valid: false, message: `Missing or invalid ${section} array` };
            }
        }

        return { 
            valid: true, 
            message: `${data.categories.length} categories, ${data.materialTypes.length} types, ${data.tags.length} tags` 
        };
    }

    async testPerformance() {
        console.log('⚡ Testing performance...');
        
        const materialsFile = path.join(this.distDir, 'materials.json');
        const minifiedFile = path.join(this.distDir, 'materials-min.json');
        
        if (!fs.existsSync(materialsFile) || !fs.existsSync(minifiedFile)) {
            this.addResult('Performance Test', false, 'Required files missing');
            return;
        }

        const materialsSize = fs.statSync(materialsFile).size;
        const minifiedSize = fs.statSync(minifiedFile).size;
        
        const compressionRatio = ((materialsSize - minifiedSize) / materialsSize * 100).toFixed(1);
        
        // Test JSON parsing speed
        const startTime = Date.now();
        const data = JSON.parse(fs.readFileSync(materialsFile, 'utf8'));
        const parseTime = Date.now() - startTime;
        
        const performanceGood = parseTime < 100 && compressionRatio > 0;
        
        this.addResult('Performance Test', performanceGood, 
            `Parse time: ${parseTime}ms, Compression: ${compressionRatio}%`);
        
        console.log(`  📊 Full file: ${(materialsSize / 1024).toFixed(2)} KB`);
        console.log(`  📊 Minified: ${(minifiedSize / 1024).toFixed(2)} KB`);
        console.log(`  📊 Compression: ${compressionRatio}%`);
        console.log(`  📊 Parse time: ${parseTime}ms`);
    }

    async testBackwardCompatibility() {
        console.log('🔄 Testing backward compatibility...');
        
        const fileListPath = path.join(this.distDir, 'file-list.json');
        
        if (!fs.existsSync(fileListPath)) {
            this.addResult('Backward Compatibility', false, 'file-list.json missing');
            return;
        }

        try {
            const fileList = JSON.parse(fs.readFileSync(fileListPath, 'utf8'));
            
            if (!Array.isArray(fileList)) {
                this.addResult('Backward Compatibility', false, 'file-list.json is not an array');
                return;
            }

            // Check if all files in the list actually exist
            const dataDir = path.join(__dirname, '..', 'data');
            let allFilesExist = true;
            
            for (const fileName of fileList) {
                const filePath = path.join(dataDir, fileName);
                if (!fs.existsSync(filePath)) {
                    allFilesExist = false;
                    break;
                }
            }

            this.addResult('Backward Compatibility', allFilesExist, 
                `file-list.json contains ${fileList.length} files, all exist: ${allFilesExist}`);
                
        } catch (error) {
            this.addResult('Backward Compatibility', false, error.message);
        }
    }

    addResult(testName, passed, details) {
        this.testResults.push({
            name: testName,
            passed,
            details
        });
    }

    printResults() {
        console.log('\n📋 Test Results Summary:');
        console.log('========================\n');
        
        let passedCount = 0;
        let totalCount = this.testResults.length;
        
        for (const result of this.testResults) {
            const status = result.passed ? '✅ PASS' : '❌ FAIL';
            console.log(`${status} ${result.name}`);
            if (result.details) {
                console.log(`     ${result.details}`);
            }
            
            if (result.passed) passedCount++;
        }
        
        console.log(`\n📊 Results: ${passedCount}/${totalCount} tests passed`);
        
        if (passedCount === totalCount) {
            console.log('🎉 All tests passed! Enhanced loading is ready.');
        } else {
            console.log('⚠️  Some tests failed. Please review the issues above.');
            process.exit(1);
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new EnhancedLoadingTester();
    tester.runAllTests().catch(console.error);
}

module.exports = EnhancedLoadingTester;