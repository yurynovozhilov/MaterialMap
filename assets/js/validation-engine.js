/**
 * Validation Engine - Validates material data and changes
 */

class ValidationEngine {
    constructor() {
        this.rules = this.initializeValidationRules();
        this.urlCache = new Map(); // Cache for URL validation results
    }

    initializeValidationRules() {
        return {
            // Required fields
            required: ['id', 'mat', 'ref', 'add'],
            
            // Field type validation
            types: {
                'id': 'string',
                'mat': 'string',
                'eos': 'string',
                'mat_add': 'string',
                'mat_thermal': 'string',
                'mat_data': 'string',
                'eos_data': 'string',
                'mat_add_data': 'string',
                'app': 'array',
                'ref': 'string',
                'url': 'string',
                'add': 'date'
            },
            
            // Field patterns
            patterns: {
                'id': /^MAT_\d+$/,
                'mat': /^MAT_[A-Z_]+$/,
                'eos': /^EOS_[A-Z_]+$/,
                'url': /^https?:\/\/.+/,
                'add': /^\d{4}-\d{2}-\d{2}$/
            },
            
            // Field constraints
            constraints: {
                'id': { minLength: 5, maxLength: 20 },
                'mat': { minLength: 5, maxLength: 50 },
                'ref': { minLength: 10, maxLength: 1000 },
                'url': { minLength: 10, maxLength: 500 },
                'app': { minItems: 1, maxItems: 10 }
            }
        };
    }

    async validateMaterial(material) {
        const validation = {
            status: 'VALID',
            errors: [],
            warnings: []
        };

        try {
            // Structural validation
            this.validateStructure(material, validation);
            
            // Field validation
            this.validateFields(material, validation);
            
            // Content validation
            this.validateContent(material, validation);
            
            // URL validation (async)
            await this.validateUrls(material, validation);
            
            // YAML syntax validation
            this.validateYamlSyntax(material, validation);
            
            // Determine final status
            if (validation.errors.length > 0) {
                validation.status = 'INVALID';
            } else if (validation.warnings.length > 0) {
                validation.status = 'WARNING';
            }
            
        } catch (error) {
            validation.status = 'INVALID';
            validation.errors.push({
                field: 'general',
                message: `Validation failed: ${error.message}`,
                severity: 'error'
            });
        }

        return validation;
    }

    validateStructure(material, validation) {
        if (!material || typeof material !== 'object') {
            validation.errors.push({
                field: 'structure',
                message: 'Material must be an object',
                severity: 'error'
            });
            return;
        }

        // Check required fields
        this.rules.required.forEach(field => {
            if (!material.hasOwnProperty(field) || material[field] === undefined || material[field] === null) {
                validation.errors.push({
                    field: field,
                    message: `Required field '${field}' is missing`,
                    severity: 'error'
                });
            }
        });

        // Check for unknown fields
        const knownFields = Object.keys(this.rules.types);
        Object.keys(material).forEach(field => {
            if (!knownFields.includes(field)) {
                validation.warnings.push({
                    field: field,
                    message: `Unknown field '${field}' - will be preserved but not validated`,
                    severity: 'warning'
                });
            }
        });
    }

    validateFields(material, validation) {
        Object.keys(this.rules.types).forEach(field => {
            if (material.hasOwnProperty(field) && material[field] !== undefined && material[field] !== null) {
                this.validateFieldType(field, material[field], validation);
                this.validateFieldPattern(field, material[field], validation);
                this.validateFieldConstraints(field, material[field], validation);
            }
        });
    }

    validateFieldType(field, value, validation) {
        const expectedType = this.rules.types[field];
        let actualType = typeof value;
        
        if (Array.isArray(value)) {
            actualType = 'array';
        } else if (value instanceof Date) {
            actualType = 'date';
        }

        if (expectedType === 'date' && typeof value === 'string') {
            // Allow string dates if they match the pattern
            if (this.rules.patterns[field] && this.rules.patterns[field].test(value)) {
                return; // Valid date string
            }
        }

        if (actualType !== expectedType) {
            validation.errors.push({
                field: field,
                message: `Field '${field}' should be ${expectedType}, got ${actualType}`,
                severity: 'error'
            });
        }
    }

    validateFieldPattern(field, value, validation) {
        const pattern = this.rules.patterns[field];
        if (pattern && typeof value === 'string') {
            if (!pattern.test(value)) {
                validation.errors.push({
                    field: field,
                    message: `Field '${field}' does not match required pattern`,
                    severity: 'error'
                });
            }
        }
    }

    validateFieldConstraints(field, value, validation) {
        const constraints = this.rules.constraints[field];
        if (!constraints) return;

        if (typeof value === 'string') {
            if (constraints.minLength && value.length < constraints.minLength) {
                validation.errors.push({
                    field: field,
                    message: `Field '${field}' is too short (minimum ${constraints.minLength} characters)`,
                    severity: 'error'
                });
            }
            if (constraints.maxLength && value.length > constraints.maxLength) {
                validation.errors.push({
                    field: field,
                    message: `Field '${field}' is too long (maximum ${constraints.maxLength} characters)`,
                    severity: 'error'
                });
            }
        }

        if (Array.isArray(value)) {
            if (constraints.minItems && value.length < constraints.minItems) {
                validation.errors.push({
                    field: field,
                    message: `Field '${field}' must have at least ${constraints.minItems} items`,
                    severity: 'error'
                });
            }
            if (constraints.maxItems && value.length > constraints.maxItems) {
                validation.warnings.push({
                    field: field,
                    message: `Field '${field}' has many items (${value.length}), consider consolidating`,
                    severity: 'warning'
                });
            }
        }
    }

    validateContent(material, validation) {
        // Validate mat_data content
        if (material.mat_data) {
            this.validateMatData(material.mat_data, validation);
        }

        // Validate applications
        if (material.app && Array.isArray(material.app)) {
            this.validateApplications(material.app, validation);
        }

        // Validate reference format
        if (material.ref) {
            this.validateReference(material.ref, validation);
        }

        // Validate date format
        if (material.add) {
            this.validateDate(material.add, validation);
        }
    }

    validateMatData(matData, validation) {
        if (typeof matData !== 'string') return;

        // Check for basic LS-DYNA format
        const lines = matData.split('\n');
        let hasTitle = false;
        let hasData = false;

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // Check for title line
            if (trimmed.includes('*MAT_') && trimmed.includes('_TITLE')) {
                hasTitle = true;
            }
            
            // Check for data lines (not comments)
            if (trimmed && !trimmed.startsWith('$') && !trimmed.startsWith('*') && /\d/.test(trimmed)) {
                hasData = true;
            }
            
            // Check line length (LS-DYNA standard is 80 characters)
            if (line.length > 80) {
                validation.warnings.push({
                    field: 'mat_data',
                    message: `Line ${index + 1} exceeds 80 characters (LS-DYNA standard)`,
                    severity: 'warning'
                });
            }
        });

        if (!hasTitle) {
            validation.warnings.push({
                field: 'mat_data',
                message: 'Material data should include a *MAT_*_TITLE line',
                severity: 'warning'
            });
        }

        if (!hasData) {
            validation.errors.push({
                field: 'mat_data',
                message: 'Material data appears to contain no numerical data',
                severity: 'error'
            });
        }
    }

    validateApplications(applications, validation) {
        applications.forEach((app, index) => {
            if (typeof app !== 'string') {
                validation.errors.push({
                    field: `app[${index}]`,
                    message: 'Application must be a string',
                    severity: 'error'
                });
            } else if (app.trim().length === 0) {
                validation.errors.push({
                    field: `app[${index}]`,
                    message: 'Application cannot be empty',
                    severity: 'error'
                });
            } else if (app.length > 100) {
                validation.warnings.push({
                    field: `app[${index}]`,
                    message: 'Application description is very long',
                    severity: 'warning'
                });
            }
        });

        // Check for duplicates
        const uniqueApps = new Set(applications.map(app => app.toLowerCase().trim()));
        if (uniqueApps.size !== applications.length) {
            validation.warnings.push({
                field: 'app',
                message: 'Duplicate applications detected',
                severity: 'warning'
            });
        }
    }

    validateReference(reference, validation) {
        if (typeof reference !== 'string') return;

        // Basic academic reference format checks
        const hasYear = /\(\d{4}\)/.test(reference) || /\d{4}/.test(reference);
        const hasAuthors = /[A-Z][a-z]+,?\s+[A-Z]/.test(reference);
        const hasTitle = reference.length > 50; // Assume titles are reasonably long

        if (!hasYear) {
            validation.warnings.push({
                field: 'ref',
                message: 'Reference should include publication year',
                severity: 'warning'
            });
        }

        if (!hasAuthors) {
            validation.warnings.push({
                field: 'ref',
                message: 'Reference should include author names',
                severity: 'warning'
            });
        }

        if (!hasTitle) {
            validation.warnings.push({
                field: 'ref',
                message: 'Reference appears to be incomplete',
                severity: 'warning'
            });
        }
    }

    validateDate(dateValue, validation) {
        let date;
        
        if (typeof dateValue === 'string') {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                validation.errors.push({
                    field: 'add',
                    message: 'Date must be in YYYY-MM-DD format',
                    severity: 'error'
                });
                return;
            }
            date = new Date(dateValue);
        } else if (dateValue instanceof Date) {
            date = dateValue;
        } else {
            validation.errors.push({
                field: 'add',
                message: 'Date must be a string in YYYY-MM-DD format or Date object',
                severity: 'error'
            });
            return;
        }

        if (isNaN(date.getTime())) {
            validation.errors.push({
                field: 'add',
                message: 'Invalid date value',
                severity: 'error'
            });
            return;
        }

        // Check if date is in the future
        const now = new Date();
        if (date > now) {
            validation.warnings.push({
                field: 'add',
                message: 'Date is in the future',
                severity: 'warning'
            });
        }

        // Check if date is too old (before 1990)
        const minDate = new Date('1990-01-01');
        if (date < minDate) {
            validation.warnings.push({
                field: 'add',
                message: 'Date is very old, please verify',
                severity: 'warning'
            });
        }
    }

    async validateUrls(material, validation) {
        if (!material.url) return;

        const url = material.url;
        
        // Check cache first
        if (this.urlCache.has(url)) {
            const cached = this.urlCache.get(url);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes cache
                if (!cached.valid) {
                    validation.warnings.push({
                        field: 'url',
                        message: cached.error || 'URL may not be accessible',
                        severity: 'warning'
                    });
                }
                return;
            }
        }

        try {
            // Basic URL format validation
            new URL(url);
            
            // Check if it's HTTPS (preferred for academic sources)
            if (!url.startsWith('https://')) {
                validation.warnings.push({
                    field: 'url',
                    message: 'HTTPS URLs are preferred for security',
                    severity: 'warning'
                });
            }

            // Try to validate URL accessibility (with timeout)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
                const response = await fetch(url, {
                    method: 'HEAD',
                    signal: controller.signal,
                    mode: 'no-cors' // Avoid CORS issues
                });
                
                clearTimeout(timeoutId);
                
                // Cache successful result
                this.urlCache.set(url, {
                    valid: true,
                    timestamp: Date.now()
                });
                
            } catch (fetchError) {
                clearTimeout(timeoutId);
                
                // Cache failed result
                this.urlCache.set(url, {
                    valid: false,
                    error: 'URL accessibility could not be verified',
                    timestamp: Date.now()
                });
                
                validation.warnings.push({
                    field: 'url',
                    message: 'URL accessibility could not be verified',
                    severity: 'warning'
                });
            }
            
        } catch (urlError) {
            validation.errors.push({
                field: 'url',
                message: 'Invalid URL format',
                severity: 'error'
            });
        }
    }

    validateYamlSyntax(material, validation) {
        try {
            // Try to serialize back to YAML to check for any issues
            const yamlString = this.materialToYaml(material);
            
            // Try to parse it back
            if (typeof jsyaml !== 'undefined') {
                jsyaml.load(yamlString);
            }
            
        } catch (yamlError) {
            validation.errors.push({
                field: 'yaml',
                message: `YAML serialization error: ${yamlError.message}`,
                severity: 'error'
            });
        }
    }

    materialToYaml(material) {
        // Convert material object to YAML string
        const yamlObj = { material: material };
        
        if (typeof jsyaml !== 'undefined') {
            return jsyaml.dump([yamlObj], {
                indent: 2,
                lineWidth: 80,
                noRefs: true
            });
        }
        
        // Fallback to JSON if YAML library not available
        return JSON.stringify([yamlObj], null, 2);
    }

    // Validation utilities
    getValidationSummary(validation) {
        return {
            status: validation.status,
            totalIssues: validation.errors.length + validation.warnings.length,
            errors: validation.errors.length,
            warnings: validation.warnings.length,
            criticalErrors: validation.errors.filter(e => 
                ['id', 'mat', 'mat_data'].includes(e.field)
            ).length
        };
    }

    getFieldValidation(validation, fieldPath) {
        const errors = validation.errors.filter(e => e.field === fieldPath);
        const warnings = validation.warnings.filter(w => w.field === fieldPath);
        
        return {
            hasErrors: errors.length > 0,
            hasWarnings: warnings.length > 0,
            errors: errors,
            warnings: warnings
        };
    }
}

// Export for use in other modules
window.ValidationEngine = ValidationEngine;