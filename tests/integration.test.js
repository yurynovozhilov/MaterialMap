/**
 * Integration tests for Material MAP components
 */

const fs = require('fs');
const path = require('path');

// Load all required modules
const changeTrackerCode = fs.readFileSync(
  path.join(process.cwd(), 'assets/js/change-tracker.js'),
  'utf8'
);
const validationEngineCode = fs.readFileSync(
  path.join(process.cwd(), 'assets/js/validation-engine.js'),
  'utf8'
);

// Evaluate the code to make classes available
eval(changeTrackerCode);
eval(validationEngineCode);

describe('Integration Tests', () => {
  let changeTracker;
  let validationEngine;

  beforeEach(() => {
    changeTracker = new ChangeTracker();
    validationEngine = new ValidationEngine();
  });

  describe('Material Editing Workflow', () => {
    test('should track changes and validate material data together', async () => {
      // Start with a valid material
      const originalMaterial = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Original reference for integration testing',
        add: '2024-01-01'
      };

      // Validate original material
      const originalValidation = await validationEngine.validateMaterial(originalMaterial);
      expect(originalValidation.errors).toHaveLength(0);

      // Make some changes
      const modifiedMaterial = { ...originalMaterial };
      modifiedMaterial.id = 'MAT_002';
      modifiedMaterial.ref = 'Updated reference for integration testing';
      modifiedMaterial.app = ['Testing', 'Integration'];

      // Track the changes
      const idChange = changeTracker.trackChange('id', originalMaterial.id, modifiedMaterial.id);
      const refChange = changeTracker.trackChange('ref', originalMaterial.ref, modifiedMaterial.ref);
      const appChange = changeTracker.trackChange('app', originalMaterial.app, modifiedMaterial.app);

      // Verify changes were tracked
      expect(idChange).not.toBeNull();
      expect(refChange).not.toBeNull();
      expect(appChange).not.toBeNull();
      expect(changeTracker.hasChanges()).toBe(true);

      // Validate modified material
      const modifiedValidation = await validationEngine.validateMaterial(modifiedMaterial);
      expect(modifiedValidation.errors).toHaveLength(0);

      // Check change summary
      const summary = changeTracker.getChangesSummary();
      expect(summary.total).toBe(3);
      expect(summary.byOperation.UPDATE).toBe(2); // id and ref
      expect(summary.byOperation.ADD).toBe(1); // app
    });

    test('should handle validation errors during change tracking', async () => {
      const validMaterial = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Valid material for error testing',
        add: '2024-01-01'
      };

      // Introduce an invalid change
      const invalidId = 'INVALID_FORMAT';
      const idChange = changeTracker.trackChange('id', validMaterial.id, invalidId);

      // The change should be tracked regardless of validity
      expect(idChange).not.toBeNull();
      expect(idChange.operation).toBe('UPDATE');

      // But validation should catch the error
      const invalidMaterial = { ...validMaterial, id: invalidId };
      const validation = await validationEngine.validateMaterial(invalidMaterial);
      
      expect(validation.status).toBe('INVALID');
      expect(validation.errors.some(e => e.field === 'id')).toBe(true);
    });
  });

  describe('Data Processing Pipeline', () => {
    test('should process YAML material data through full pipeline', async () => {
      // Simulate YAML material data
      const yamlMaterialData = {
        id: 'MAT_123',
        mat: 'MAT_PLASTIC_KINEMATIC',
        mat_data: '$# Material data\n*MAT_PLASTIC_KINEMATIC\n$#    MID        RO         E        PR      SIGY     ETAN      BETA\n        1      7.85     2e+11      0.30     2.5e8    2e+09       0.0',
        app: ['Automotive', 'Crash Testing'],
        ref: 'Johnson, G.R. and Cook, W.H. (1983). A constitutive model and data for metals subjected to large strains, high strain rates and high temperatures.',
        url: 'https://doi.org/10.1016/0734-743X(83)90026-4',
        add: '2024-03-15'
      };

      // Step 1: Validate the material
      const validation = await validationEngine.validateMaterial(yamlMaterialData);
      expect(validation.status).toBe('VALID');

      // Step 2: Track editing changes
      const editedData = { ...yamlMaterialData };
      editedData.app.push('Research');
      editedData.ref = editedData.ref + ' Updated for current standards.';

      const appChange = changeTracker.trackChange('app', yamlMaterialData.app, editedData.app);
      const refChange = changeTracker.trackChange('ref', yamlMaterialData.ref, editedData.ref);

      expect(appChange.operation).toBe('UPDATE');
      expect(refChange.operation).toBe('UPDATE');

      // Step 3: Re-validate after changes
      const reValidation = await validationEngine.validateMaterial(editedData);
      expect(reValidation.status).toBe('VALID');

      // Step 4: Generate change report
      const summary = changeTracker.getChangesSummary();
      expect(summary.total).toBe(2);
      expect(summary.byOperation.UPDATE).toBe(2);
    });

    test('should handle multiple sequential edits', async () => {
      let currentMaterial = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Base reference',
        add: '2024-01-01'
      };

      // Simulate multiple editing sessions
      const editSessions = [
        { field: 'ref', value: 'First edit - added details' },
        { field: 'app', value: ['Application1'] },
        { field: 'app', value: ['Application1', 'Application2'] },
        { field: 'url', value: 'https://example.com/first' },
        { field: 'url', value: 'https://example.com/updated' }
      ];

      for (const edit of editSessions) {
        const oldValue = currentMaterial[edit.field];
        currentMaterial[edit.field] = edit.value;
        
        const change = changeTracker.trackChange(edit.field, oldValue, edit.value);
        expect(change).not.toBeNull();

        // Validate after each edit
        const validation = await validationEngine.validateMaterial(currentMaterial);
        expect(validation.errors).toHaveLength(0);
      }

      // Final state check
      const finalSummary = changeTracker.getChangesSummary();
      expect(finalSummary.total).toBe(4); // ref, app (2 changes), url (overwrites previous)
      expect(changeTracker.hasChanges()).toBe(true);

      // Check specific field changes
      expect(changeTracker.getChangesForField('ref')).toBeDefined();
      expect(changeTracker.getChangesForField('app')).toBeDefined();
      expect(changeTracker.getChangesForField('url')).toBeDefined();
    });
  });

  describe('Error Recovery Scenarios', () => {
    test('should recover from validation failures gracefully', async () => {
      const startMaterial = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Starting material',
        add: '2024-01-01'
      };

      // Make an invalid change
      const badChange = changeTracker.trackChange('id', startMaterial.id, 'BAD_ID_FORMAT');
      expect(badChange).not.toBeNull();

      // Validation should fail
      const badMaterial = { ...startMaterial, id: 'BAD_ID_FORMAT' };
      const badValidation = await validationEngine.validateMaterial(badMaterial);
      expect(badValidation.status).toBe('INVALID');

      // Correct the change
      const goodChange = changeTracker.trackChange('id', 'BAD_ID_FORMAT', 'MAT_002');
      expect(goodChange).not.toBeNull();

      // Validation should now pass
      const goodMaterial = { ...startMaterial, id: 'MAT_002' };
      const goodValidation = await validationEngine.validateMaterial(goodMaterial);
      expect(goodValidation.errors.filter(e => e.field === 'id')).toHaveLength(0);
    });

    test('should handle complex object changes', async () => {
      const complexMaterial = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Complex material test',
        add: '2024-01-01',
        metadata: {
          author: 'Test Author',
          version: '1.0',
          tags: ['test', 'example']
        }
      };

      // Change nested object
      const newMetadata = {
        author: 'Updated Author',
        version: '1.1',
        tags: ['test', 'example', 'updated']
      };

      const metadataChange = changeTracker.trackChange('metadata', complexMaterial.metadata, newMetadata);
      expect(metadataChange).not.toBeNull();
      expect(metadataChange.operation).toBe('UPDATE');

      // Verify the change was properly cloned
      expect(metadataChange.oldValue).not.toBe(complexMaterial.metadata);
      expect(metadataChange.newValue).not.toBe(newMetadata);
      expect(metadataChange.newValue.author).toBe('Updated Author');
    });
  });

  describe('Performance and Memory', () => {
    test('should handle large materials efficiently', async () => {
      const largeMaterial = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Large material test with extensive data',
        add: '2024-01-01',
        mat_data: 'x'.repeat(10000), // Large data block
        app: Array.from({ length: 100 }, (_, i) => `Application${i}`)
      };

      const startTime = Date.now();
      
      // Validate large material
      const validation = await validationEngine.validateMaterial(largeMaterial);
      expect(validation).toBeDefined();

      // Track changes to large material
      const newData = 'y'.repeat(10000);
      const dataChange = changeTracker.trackChange('mat_data', largeMaterial.mat_data, newData);
      expect(dataChange).not.toBeNull();

      const endTime = Date.now();
      
      // Should complete in reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test('should cleanup resources properly', () => {
      // Generate many changes
      for (let i = 0; i < 100; i++) {
        changeTracker.trackChange(`field${i}`, `old${i}`, `new${i}`);
      }

      expect(changeTracker.changes.size).toBe(100);
      expect(changeTracker.changeHistory.length).toBe(100);

      // Clear all changes
      changeTracker.clearChanges();

      expect(changeTracker.changes.size).toBe(0);
      expect(changeTracker.hasChanges()).toBe(false);
    });
  });
});