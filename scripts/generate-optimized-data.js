#!/usr/bin/env node

/**
 * Enhanced Data Generator for Material MAP
 * Processes YAML files into optimized JSON formats for GitHub Pages
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class DataProcessor {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.distDir = path.join(__dirname, '..', 'dist');
        this.materials = [];
        this.categories = new Set();
        this.tags = new Set();
        this.materialTypes = new Set();
    }

    async process() {
        console.log('🚀 Starting enhanced data processing...');
        
        // Ensure dist directory exists
        if (!fs.existsSync(this.distDir)) {
            fs.mkdirSync(this.distDir, { recursive: true });
        }

        // Load and process all YAML files
        await this.loadYAMLFiles();
        
        // Generate optimized outputs
        await this.generateOutputs();
        
        console.log('✅ Data processing completed successfully!');
        this.printStats();
    }

    async loadYAMLFiles() {
        const files = fs.readdirSync(this.dataDir)
            .filter(file => file.endsWith('.yaml'))
            .sort();

        console.log(`📁 Processing ${files.length} YAML files...`);

        for (const fileName of files) {
            try {
                const filePath = path.join(this.dataDir, fileName);
                const content = fs.readFileSync(filePath, 'utf8');
                const data = yaml.load(content);

                if (Array.isArray(data)) {
                    for (const item of data) {
                        this.processMaterial(item, fileName);
                    }
                }
            } catch (error) {
                console.error(`❌ Error processing ${fileName}:`, error.message);
            }
        }
    }

    processMaterial(item, sourceFile) {
        const material = item.material || item;
        
        if (!material || !material.id) {
            console.warn(`⚠️  Skipping invalid material in ${sourceFile}`);
            return;
        }

        // Generate unique identifier
        const uniqueId = `${material.id}_${sourceFile.replace(/\s+/g, '_').replace('.yaml', '')}`;
        
        // Extract categories and tags
        const category = this.extractCategory(material, item);
        const tags = this.extractTags(material, item);
        const materialType = material.mat || 'Unknown';

        // Store for sets
        this.categories.add(category);
        tags.forEach(tag => this.tags.add(tag));
        this.materialTypes.add(materialType);

        // Get applications from the correct location
        const applications = [];
        if (item.app && Array.isArray(item.app)) {
            applications.push(...item.app);
        } else if (material.app && Array.isArray(material.app)) {
            applications.push(...material.app);
        }

        // Get add date from the correct location
        let addDate = '';
        if (item.add) {
            addDate = item.add;
        } else if (material.add) {
            addDate = material.add;
        }

        // Create enhanced material object
        const enhancedMaterial = {
            // Core identification
            uniqueId,
            id: material.id,
            mat: materialType,
            
            // Optional material properties
            ...(material.mat_add && { mat_add: material.mat_add }),
            ...(material.mat_thermal && { mat_thermal: material.mat_thermal }),
            ...(material.eos && { eos: material.eos }),
            
            // Material data (compressed for storage)
            mat_data: material.mat_data ? material.mat_data.trim() : '',
            
            // Applications and metadata
            app: applications,
            ref: item.ref || material.ref || '',
            url: item.url || material.url || '',
            add: addDate,
            
            // Enhanced metadata
            metadata: {
                sourceFile,
                category,
                tags,
                materialType,
                lastProcessed: new Date().toISOString(),
                searchText: this.generateSearchText(material, item)
            }
        };

        this.materials.push(enhancedMaterial);
    }

    extractCategory(material, item) {
        // Smart category extraction based on material type and applications
        const matType = (material.mat || '').toLowerCase();
        const apps = (item.app || []).join(' ').toLowerCase();
        
        if (matType.includes('cohesive') || apps.includes('adhesive')) return 'adhesive';
        if (matType.includes('concrete') || apps.includes('concrete')) return 'concrete';
        if (matType.includes('soil') || apps.includes('soil')) return 'soil';
        if (matType.includes('johnson') || matType.includes('ceramic')) return 'ceramic';
        if (matType.includes('metal') || matType.includes('steel') || matType.includes('aluminum')) return 'metal';
        if (matType.includes('composite') || apps.includes('composite')) return 'composite';
        if (matType.includes('foam') || apps.includes('foam')) return 'foam';
        
        return 'other';
    }

    extractTags(material, item) {
        const tags = new Set();
        
        // From material type
        const matType = (material.mat || '').toLowerCase();
        if (matType.includes('johnson')) tags.add('johnson-cook');
        if (matType.includes('holmquist')) tags.add('holmquist');
        if (matType.includes('cohesive')) tags.add('cohesive');
        if (matType.includes('plastic')) tags.add('plasticity');
        
        // From applications
        (item.app || []).forEach(app => {
            const appLower = app.toLowerCase();
            if (appLower.includes('automotive')) tags.add('automotive');
            if (appLower.includes('impact')) tags.add('impact');
            if (appLower.includes('high speed') || appLower.includes('ballistic')) tags.add('high-speed');
            if (appLower.includes('armor')) tags.add('armor');
        });
        
        return Array.from(tags);
    }

    generateSearchText(material, item) {
        // Create searchable text combining all relevant fields
        const searchFields = [
            material.id,
            material.mat,
            material.mat_add,
            material.eos,
            ...(item.app || []),
            item.ref
        ].filter(Boolean);
        
        return searchFields.join(' ').toLowerCase();
    }

    async generateOutputs() {
        console.log('📝 Generating output files...');

        // 1. Full materials dataset
        const fullData = {
            materials: this.materials,
            metadata: {
                totalMaterials: this.materials.length,
                totalFiles: new Set(this.materials.map(m => m.metadata.sourceFile)).size,
                categories: Array.from(this.categories).sort(),
                tags: Array.from(this.tags).sort(),
                materialTypes: Array.from(this.materialTypes).sort(),
                generatedAt: new Date().toISOString(),
                version: '2.0.0'
            }
        };

        fs.writeFileSync(
            path.join(this.distDir, 'materials.json'),
            JSON.stringify(fullData, null, 2)
        );

        // 2. Minified version for production
        fs.writeFileSync(
            path.join(this.distDir, 'materials-min.json'),
            JSON.stringify(fullData)
        );

        // 3. Search index (optimized for search)
        const searchIndex = {
            materials: this.materials.map(m => ({
                uniqueId: m.uniqueId,
                id: m.id,
                mat: m.mat,
                searchText: m.metadata.searchText,
                category: m.metadata.category,
                tags: m.metadata.tags
            })),
            metadata: fullData.metadata
        };

        fs.writeFileSync(
            path.join(this.distDir, 'search-index.json'),
            JSON.stringify(searchIndex)
        );

        // 4. Categories and filters
        const categoriesData = {
            categories: Array.from(this.categories).map(cat => ({
                name: cat,
                count: this.materials.filter(m => m.metadata.category === cat).length
            })).sort((a, b) => b.count - a.count),
            
            materialTypes: Array.from(this.materialTypes).map(type => ({
                name: type,
                count: this.materials.filter(m => m.mat === type).length
            })).sort((a, b) => b.count - a.count),
            
            tags: Array.from(this.tags).map(tag => ({
                name: tag,
                count: this.materials.filter(m => m.metadata.tags.includes(tag)).length
            })).sort((a, b) => b.count - a.count)
        };

        fs.writeFileSync(
            path.join(this.distDir, 'categories.json'),
            JSON.stringify(categoriesData, null, 2)
        );

        // 5. Legacy file list (for backward compatibility)
        const fileList = Array.from(new Set(this.materials.map(m => m.metadata.sourceFile))).sort();
        fs.writeFileSync(
            path.join(this.distDir, 'file-list.json'),
            JSON.stringify(fileList, null, 2)
        );

        // 6. API endpoints simulation
        const apiDir = path.join(this.distDir, 'api');
        if (!fs.existsSync(apiDir)) {
            fs.mkdirSync(apiDir, { recursive: true });
        }

        // Individual material endpoints
        for (const material of this.materials) {
            const materialDir = path.join(apiDir, 'materials');
            if (!fs.existsSync(materialDir)) {
                fs.mkdirSync(materialDir, { recursive: true });
            }
            
            fs.writeFileSync(
                path.join(materialDir, `${material.uniqueId}.json`),
                JSON.stringify(material, null, 2)
            );
        }

        console.log('✅ All output files generated successfully!');
    }

    printStats() {
        console.log('\n📊 Processing Statistics:');
        console.log(`   Materials processed: ${this.materials.length}`);
        console.log(`   Categories found: ${this.categories.size}`);
        console.log(`   Tags extracted: ${this.tags.size}`);
        console.log(`   Material types: ${this.materialTypes.size}`);
        console.log(`   Source files: ${new Set(this.materials.map(m => m.metadata.sourceFile)).size}`);
        
        // File sizes
        const statsFile = path.join(this.distDir, 'materials.json');
        if (fs.existsSync(statsFile)) {
            const size = fs.statSync(statsFile).size;
            console.log(`   Full dataset size: ${(size / 1024).toFixed(2)} KB`);
        }
    }
}

// Run if called directly
if (require.main === module) {
    const processor = new DataProcessor();
    processor.process().catch(console.error);
}

module.exports = DataProcessor;