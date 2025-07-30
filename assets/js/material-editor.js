/**
 * Material Editor System for GitHub PR-based editing
 * Implements the collaborative editing workflow described in the structure document
 */

// Core Material Editor Class
class MaterialEditor {
    constructor() {
        this.currentMaterial = null;
        this.originalMaterial = null;
        this.changeSet = null;
        this.validationEngine = new ValidationEngine();
        this.changeTracker = new ChangeTracker();
        this.githubIntegration = new GitHubIntegration();
        this.uiManager = new UIManager(this);
        
        this.initializeEditor();
    }

    initializeEditor() {
        this.loadStoredChanges();
        this.setupEventListeners();
        this.initializeUI();
    }

    // Material identification and loading
    generateMaterialId(filename, index) {
        return `${filename}:${index}`;
    }

    generateMaterialHash(material) {
        // Create a hash from material data for verification
        const dataString = JSON.stringify(material, Object.keys(material).sort());
        return this.simpleHash(dataString);
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    // Edit session management
    async startEditSession(materialId, materialData, filename, index) {
        try {
            // Create snapshot of current material
            this.originalMaterial = JSON.parse(JSON.stringify(materialData));
            this.currentMaterial = JSON.parse(JSON.stringify(materialData));
            
            // Generate change set metadata
            this.changeSet = {
                metadata: {
                    id: this.generateChangeId(),
                    timestamp: new Date().toISOString(),
                    author: await this.githubIntegration.getCurrentUser(),
                    description: ''
                },
                target: {
                    file: filename,
                    materialIndex: index,
                    materialId: materialId,
                    originalHash: this.generateMaterialHash(materialData)
                },
                changes: {
                    type: 'MODIFY',
                    fields: [],
                    before: this.originalMaterial,
                    after: this.currentMaterial
                },
                validation: {
                    status: 'VALID',
                    errors: [],
                    warnings: []
                }
            };

            // Store in session storage
            this.saveToSession();
            
            // Initialize UI for editing
            this.uiManager.showEditMode(this.currentMaterial, this.changeSet);
            
            return this.changeSet.metadata.id;
            
        } catch (error) {
            console.error('Failed to start edit session:', error);
            throw new Error(`Failed to initialize editing: ${error.message}`);
        }
    }

    generateChangeId() {
        return `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Change tracking and validation
    updateMaterial(fieldPath, newValue) {
        try {
            // Update the current material
            this.setNestedValue(this.currentMaterial, fieldPath, newValue);
            
            // Track the change
            const change = this.changeTracker.trackChange(
                fieldPath, 
                this.getNestedValue(this.originalMaterial, fieldPath),
                newValue
            );
            
            // Update change set
            this.updateChangeSet(change);
            
            // Validate changes
            this.validateChanges();
            
            // Update UI
            this.uiManager.updatePreview(this.currentMaterial);
            this.uiManager.updateDiff(this.changeSet.changes.fields);
            this.uiManager.updateValidation(this.changeSet.validation);
            
            // Save to session
            this.saveToSession();
            
        } catch (error) {
            console.error('Failed to update material:', error);
            this.uiManager.showError(`Update failed: ${error.message}`);
        }
    }

    updateChangeSet(change) {
        // Find existing change for this field or add new one
        const existingIndex = this.changeSet.changes.fields.findIndex(
            field => field.fieldPath === change.fieldPath
        );
        
        if (existingIndex >= 0) {
            this.changeSet.changes.fields[existingIndex] = change;
        } else {
            this.changeSet.changes.fields.push(change);
        }
        
        // Update the after state
        this.changeSet.changes.after = JSON.parse(JSON.stringify(this.currentMaterial));
    }

    validateChanges() {
        const validation = this.validationEngine.validateMaterial(this.currentMaterial);
        this.changeSet.validation = validation;
        return validation;
    }

    // Session management
    saveToSession() {
        try {
            sessionStorage.setItem('materialEditor_changeSet', JSON.stringify(this.changeSet));
            sessionStorage.setItem('materialEditor_currentMaterial', JSON.stringify(this.currentMaterial));
            sessionStorage.setItem('materialEditor_originalMaterial', JSON.stringify(this.originalMaterial));
        } catch (error) {
            console.warn('Failed to save to session storage:', error);
        }
    }

    loadStoredChanges() {
        try {
            const storedChangeSet = sessionStorage.getItem('materialEditor_changeSet');
            const storedCurrent = sessionStorage.getItem('materialEditor_currentMaterial');
            const storedOriginal = sessionStorage.getItem('materialEditor_originalMaterial');
            
            if (storedChangeSet && storedCurrent && storedOriginal) {
                this.changeSet = JSON.parse(storedChangeSet);
                this.currentMaterial = JSON.parse(storedCurrent);
                this.originalMaterial = JSON.parse(storedOriginal);
                
                // Resume editing session
                this.uiManager.showEditMode(this.currentMaterial, this.changeSet);
                return true;
            }
        } catch (error) {
            console.warn('Failed to load stored changes:', error);
            this.clearSession();
        }
        return false;
    }

    clearSession() {
        sessionStorage.removeItem('materialEditor_changeSet');
        sessionStorage.removeItem('materialEditor_currentMaterial');
        sessionStorage.removeItem('materialEditor_originalMaterial');
        
        this.changeSet = null;
        this.currentMaterial = null;
        this.originalMaterial = null;
    }

    // GitHub submission
    async submitChanges(userDescription) {
        try {
            if (!this.changeSet || this.changeSet.changes.fields.length === 0) {
                throw new Error('No changes to submit');
            }

            // Final validation
            const validation = this.validateChanges();
            if (validation.status === 'INVALID') {
                throw new Error('Cannot submit invalid changes');
            }

            // Update description
            this.changeSet.metadata.description = userDescription;

            // Show submission progress
            this.uiManager.showSubmissionProgress();

            // Submit to GitHub
            const prUrl = await this.githubIntegration.submitChanges(this.changeSet);

            // Clear session on successful submission
            this.clearSession();

            // Show success
            this.uiManager.showSubmissionSuccess(prUrl);

            return prUrl;

        } catch (error) {
            console.error('Failed to submit changes:', error);
            this.uiManager.showSubmissionError(error.message);
            throw error;
        }
    }

    // Utility methods
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            if (current && typeof current === 'object') {
                // Handle array indices
                if (key.includes('[') && key.includes(']')) {
                    const [arrayKey, indexStr] = key.split('[');
                    const index = parseInt(indexStr.replace(']', ''));
                    return current[arrayKey] && current[arrayKey][index];
                }
                return current[key];
            }
            return undefined;
        }, obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (key.includes('[') && key.includes(']')) {
                const [arrayKey, indexStr] = key.split('[');
                const index = parseInt(indexStr.replace(']', ''));
                
                if (!current[arrayKey]) current[arrayKey] = [];
                if (!current[arrayKey][index]) current[arrayKey][index] = {};
                
                return current[arrayKey][index];
            }
            
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);

        if (lastKey.includes('[') && lastKey.includes(']')) {
            const [arrayKey, indexStr] = lastKey.split('[');
            const index = parseInt(indexStr.replace(']', ''));
            
            if (!target[arrayKey]) target[arrayKey] = [];
            target[arrayKey][index] = value;
        } else {
            target[lastKey] = value;
        }
    }

    setupEventListeners() {
        // Handle page unload
        window.addEventListener('beforeunload', (e) => {
            if (this.changeSet && this.changeSet.changes.fields.length > 0) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            this.uiManager.updateConnectionStatus(true);
        });

        window.addEventListener('offline', () => {
            this.uiManager.updateConnectionStatus(false);
        });
    }

    // Public API methods
    cancelEdit() {
        if (this.changeSet && this.changeSet.changes.fields.length > 0) {
            if (confirm('Are you sure you want to cancel? All changes will be lost.')) {
                this.clearSession();
                this.uiManager.showViewMode();
            }
        } else {
            this.clearSession();
            this.uiManager.showViewMode();
        }
    }

    hasUnsavedChanges() {
        return this.changeSet && this.changeSet.changes.fields.length > 0;
    }

    getChangesSummary() {
        if (!this.changeSet) return null;
        
        return {
            totalChanges: this.changeSet.changes.fields.length,
            validationStatus: this.changeSet.validation.status,
            errors: this.changeSet.validation.errors.length,
            warnings: this.changeSet.validation.warnings.length
        };
    }
}

// Export for use in other modules
window.MaterialEditor = MaterialEditor;