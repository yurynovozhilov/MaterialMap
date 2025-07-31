/**
 * Change Tracker - Tracks and manages changes to material data
 */

class ChangeTracker {
    constructor() {
        this.changes = new Map();
        this.changeHistory = [];
    }

    trackChange(fieldPath, oldValue, newValue) {
        // Don't track if values are the same
        if (this.deepEqual(oldValue, newValue)) {
            // Remove existing change if values are now equal to original
            this.changes.delete(fieldPath);
            return null;
        }

        const change = {
            fieldPath: fieldPath,
            operation: this.determineOperation(oldValue, newValue),
            oldValue: this.cloneValue(oldValue),
            newValue: this.cloneValue(newValue),
            confidence: this.calculateConfidence(fieldPath, oldValue, newValue),
            timestamp: new Date().toISOString()
        };

        // Store the change
        this.changes.set(fieldPath, change);
        
        // Add to history
        this.changeHistory.push({
            ...change,
            id: this.generateChangeId()
        });

        return change;
    }

    determineOperation(oldValue, newValue) {
        if (oldValue === undefined || oldValue === null) {
            return 'ADD';
        } else if (newValue === undefined || newValue === null) {
            return 'DELETE';
        } else {
            return 'UPDATE';
        }
    }

    calculateConfidence(fieldPath, oldValue, newValue) {
        // Calculate confidence based on various factors
        let confidence = 1.0;

        // Reduce confidence for critical fields
        const criticalFields = ['id', 'mat', 'mat_data'];
        if (criticalFields.some(field => fieldPath.includes(field))) {
            confidence *= 0.8;
        }

        // Reduce confidence for large changes
        if (typeof oldValue === 'string' && typeof newValue === 'string') {
            const similarity = this.calculateStringSimilarity(oldValue, newValue);
            confidence *= similarity;
        }

        // Reduce confidence for URL changes (need verification)
        if (fieldPath.includes('url')) {
            confidence *= 0.7;
        }

        return Math.max(0.1, Math.min(1.0, confidence));
    }

    calculateStringSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;
        
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }

    getAllChanges() {
        return Array.from(this.changes.values());
    }

    getChangesByType(operation) {
        return this.getAllChanges().filter(change => change.operation === operation);
    }

    getChangesForField(fieldPath) {
        return this.changes.get(fieldPath);
    }

    hasChanges() {
        return this.changes.size > 0;
    }

    getChangesSummary() {
        const changes = this.getAllChanges();
        const summary = {
            total: changes.length,
            byOperation: {
                ADD: 0,
                UPDATE: 0,
                DELETE: 0
            },
            byConfidence: {
                high: 0,    // > 0.8
                medium: 0,  // 0.5 - 0.8
                low: 0      // < 0.5
            },
            criticalChanges: 0
        };

        changes.forEach(change => {
            summary.byOperation[change.operation]++;
            
            if (change.confidence > 0.8) {
                summary.byConfidence.high++;
            } else if (change.confidence > 0.5) {
                summary.byConfidence.medium++;
            } else {
                summary.byConfidence.low++;
            }

            // Check for critical changes
            const criticalFields = ['id', 'mat', 'mat_data'];
            if (criticalFields.some(field => change.fieldPath.includes(field))) {
                summary.criticalChanges++;
            }
        });

        return summary;
    }

    generateChangeDescription() {
        const changes = this.getAllChanges();
        if (changes.length === 0) return 'No changes';

        const summary = this.getChangesSummary();
        let description = [];

        // Add operation summary
        if (summary.byOperation.ADD > 0) {
            description.push(`Added ${summary.byOperation.ADD} field(s)`);
        }
        if (summary.byOperation.UPDATE > 0) {
            description.push(`Updated ${summary.byOperation.UPDATE} field(s)`);
        }
        if (summary.byOperation.DELETE > 0) {
            description.push(`Deleted ${summary.byOperation.DELETE} field(s)`);
        }

        // Add specific field mentions for important changes
        const importantChanges = changes.filter(change => 
            change.fieldPath.includes('ref') || 
            change.fieldPath.includes('url') || 
            change.fieldPath.includes('mat_data')
        );

        if (importantChanges.length > 0) {
            const fieldTypes = [...new Set(importantChanges.map(change => {
                if (change.fieldPath.includes('ref')) return 'reference';
                if (change.fieldPath.includes('url')) return 'URL';
                if (change.fieldPath.includes('mat_data')) return 'material data';
                return 'metadata';
            }))];
            
            description.push(`Modified: ${fieldTypes.join(', ')}`);
        }

        return description.join('; ');
    }

    // Utility methods
    deepEqual(obj1, obj2) {
        if (obj1 === obj2) return true;
        
        if (obj1 == null || obj2 == null) return obj1 === obj2;
        
        if (typeof obj1 !== typeof obj2) return false;
        
        if (typeof obj1 !== 'object') return obj1 === obj2;
        
        if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;
        
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);
        
        if (keys1.length !== keys2.length) return false;
        
        for (let key of keys1) {
            if (!keys2.includes(key)) return false;
            if (!this.deepEqual(obj1[key], obj2[key])) return false;
        }
        
        return true;
    }

    cloneValue(value) {
        if (value === null || typeof value !== 'object') return value;
        if (value instanceof Date) return new Date(value);
        if (Array.isArray(value)) return value.map(item => this.cloneValue(item));
        
        const cloned = {};
        for (let key in value) {
            if (value.hasOwnProperty(key)) {
                cloned[key] = this.cloneValue(value[key]);
            }
        }
        return cloned;
    }

    generateChangeId() {
        return `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Reset and cleanup
    clearChanges() {
        this.changes.clear();
        this.changeHistory = [];
    }

    undoLastChange() {
        if (this.changeHistory.length === 0) return null;
        
        const lastChange = this.changeHistory.pop();
        this.changes.delete(lastChange.fieldPath);
        
        return lastChange;
    }

    getChangeHistory() {
        return [...this.changeHistory];
    }
}

// Export for use in other modules
window.ChangeTracker = ChangeTracker;