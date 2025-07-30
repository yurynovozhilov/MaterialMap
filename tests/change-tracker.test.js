/**
 * Tests for ChangeTracker class
 */

const fs = require('fs');
const path = require('path');

// Load the ChangeTracker class
const changeTrackerCode = fs.readFileSync(
  path.join(process.cwd(), 'assets/js/change-tracker.js'),
  'utf8'
);

// Evaluate the code to make the class available
eval(changeTrackerCode);

describe('ChangeTracker', () => {
  let changeTracker;

  beforeEach(() => {
    changeTracker = new ChangeTracker();
  });

  describe('Happy Path - ChangeTracker tracks field changes', () => {
    test('should track a simple field change', () => {
      const oldValue = 'MAT_001';
      const newValue = 'MAT_002';
      const fieldPath = 'id';

      const change = changeTracker.trackChange(fieldPath, oldValue, newValue);

      expect(change).not.toBeNull();
      expect(change.fieldPath).toBe(fieldPath);
      expect(change.oldValue).toBe(oldValue);
      expect(change.newValue).toBe(newValue);
      expect(change.operation).toBe('UPDATE');
      expect(change.timestamp).toBeDefined();
      expect(change.confidence).toBeGreaterThan(0);
    });

    test('should store tracked changes in the map', () => {
      const fieldPath = 'mat';
      const oldValue = 'MAT_ELASTIC';
      const newValue = 'MAT_PLASTIC';

      changeTracker.trackChange(fieldPath, oldValue, newValue);

      expect(changeTracker.hasChanges()).toBe(true);
      expect(changeTracker.changes.has(fieldPath)).toBe(true);
      expect(changeTracker.changes.get(fieldPath).newValue).toBe(newValue);
    });

    test('should maintain change history', () => {
      const change1 = changeTracker.trackChange('field1', 'old1', 'new1');
      const change2 = changeTracker.trackChange('field2', 'old2', 'new2');

      expect(changeTracker.changeHistory).toHaveLength(2);
      expect(changeTracker.changeHistory[0].id).toBeDefined();
      expect(changeTracker.changeHistory[1].id).toBeDefined();
      expect(changeTracker.changeHistory[0].fieldPath).toBe('field1');
      expect(changeTracker.changeHistory[1].fieldPath).toBe('field2');
    });
  });

  describe('Branching - ChangeTracker calculates operation types', () => {
    test('should identify ADD operation for new values', () => {
      const change = changeTracker.trackChange('newField', undefined, 'newValue');
      expect(change.operation).toBe('ADD');

      const change2 = changeTracker.trackChange('anotherField', null, 'anotherValue');
      expect(change2.operation).toBe('ADD');
    });

    test('should identify DELETE operation for removed values', () => {
      const change = changeTracker.trackChange('deletedField', 'oldValue', undefined);
      expect(change.operation).toBe('DELETE');

      const change2 = changeTracker.trackChange('nulledField', 'oldValue', null);
      expect(change2.operation).toBe('DELETE');
    });

    test('should identify UPDATE operation for modified values', () => {
      const change = changeTracker.trackChange('modifiedField', 'oldValue', 'newValue');
      expect(change.operation).toBe('UPDATE');
    });

    test('should calculate confidence based on field criticality', () => {
      // Critical field should have lower confidence
      const criticalChange = changeTracker.trackChange('id', 'MAT_001', 'MAT_002');
      const nonCriticalChange = changeTracker.trackChange('ref', 'Old ref', 'New ref');

      expect(criticalChange.confidence).toBeLessThan(nonCriticalChange.confidence);
    });

    test('should calculate confidence based on string similarity', () => {
      // Very similar strings should have higher confidence
      const similarChange = changeTracker.trackChange('test', 'MaterialTest', 'MaterialTest2');
      const differentChange = changeTracker.trackChange('test', 'MaterialTest', 'CompletelyDifferent');

      expect(similarChange.confidence).toBeGreaterThan(differentChange.confidence);
    });

    test('should reduce confidence for URL changes', () => {
      const urlChange = changeTracker.trackChange('url', 'http://old.com', 'http://new.com');
      const normalChange = changeTracker.trackChange('ref', 'Old reference', 'New reference');

      expect(urlChange.confidence).toBeLessThan(normalChange.confidence);
    });
  });

  describe('Input Verification - Change deduplication', () => {
    test('should not track identical values', () => {
      const result = changeTracker.trackChange('sameField', 'sameValue', 'sameValue');
      
      expect(result).toBeNull();
      expect(changeTracker.hasChanges()).toBe(false);
    });

    test('should remove changes when reverting to original value', () => {
      const originalValue = 'original';
      const modifiedValue = 'modified';
      const fieldPath = 'testField';

      // Make a change
      changeTracker.trackChange(fieldPath, originalValue, modifiedValue);
      expect(changeTracker.hasChanges()).toBe(true);

      // Revert the change
      const revertResult = changeTracker.trackChange(fieldPath, modifiedValue, originalValue);
      expect(revertResult).toBeNull();
      expect(changeTracker.changes.has(fieldPath)).toBe(false);
    });

    test('should handle array changes correctly', () => {
      const oldArray = ['item1', 'item2'];
      const newArray = ['item1', 'item2', 'item3'];

      const change = changeTracker.trackChange('appField', oldArray, newArray);

      expect(change).not.toBeNull();
      expect(change.operation).toBe('UPDATE');
      expect(Array.isArray(change.oldValue)).toBe(true);
      expect(Array.isArray(change.newValue)).toBe(true);
    });
  });

  describe('Query Methods', () => {
    beforeEach(() => {
      // Set up some test changes
      changeTracker.trackChange('field1', undefined, 'added');
      changeTracker.trackChange('field2', 'old', 'updated');
      changeTracker.trackChange('field3', 'deleted', undefined);
      changeTracker.trackChange('id', 'MAT_001', 'MAT_002'); // Critical field
    });

    test('should get all changes', () => {
      const allChanges = changeTracker.getAllChanges();
      expect(allChanges).toHaveLength(4);
    });

    test('should filter changes by operation type', () => {
      const addChanges = changeTracker.getChangesByType('ADD');
      const updateChanges = changeTracker.getChangesByType('UPDATE');
      const deleteChanges = changeTracker.getChangesByType('DELETE');

      expect(addChanges).toHaveLength(1);
      expect(updateChanges).toHaveLength(2);
      expect(deleteChanges).toHaveLength(1);
    });

    test('should get changes for specific field', () => {
      const fieldChange = changeTracker.getChangesForField('field2');
      
      expect(fieldChange).toBeDefined();
      expect(fieldChange.fieldPath).toBe('field2');
      expect(fieldChange.oldValue).toBe('old');
      expect(fieldChange.newValue).toBe('updated');
    });

    test('should generate changes summary', () => {
      const summary = changeTracker.getChangesSummary();

      expect(summary.total).toBe(4);
      expect(summary.byOperation.ADD).toBe(1);
      expect(summary.byOperation.UPDATE).toBe(2);
      expect(summary.byOperation.DELETE).toBe(1);
      expect(summary.byConfidence.high + summary.byConfidence.medium + summary.byConfidence.low).toBe(4);
    });
  });

  describe('String Similarity Algorithm', () => {
    test('should calculate correct similarity for identical strings', () => {
      const similarity = changeTracker.calculateStringSimilarity('test', 'test');
      expect(similarity).toBe(1.0);
    });

    test('should calculate correct similarity for completely different strings', () => {
      const similarity = changeTracker.calculateStringSimilarity('abc', 'xyz');
      expect(similarity).toBeLessThan(0.5);
    });

    test('should handle empty strings', () => {
      const similarity1 = changeTracker.calculateStringSimilarity('', '');
      const similarity2 = changeTracker.calculateStringSimilarity('test', '');
      const similarity3 = changeTracker.calculateStringSimilarity('', 'test');

      expect(similarity1).toBe(1.0);
      expect(similarity2).toBe(0);
      expect(similarity3).toBe(0);
    });

    test('should calculate Levenshtein distance correctly', () => {
      const distance1 = changeTracker.levenshteinDistance('cat', 'bat');
      const distance2 = changeTracker.levenshteinDistance('kitten', 'sitting');

      expect(distance1).toBe(1); // One character different
      expect(distance2).toBe(3); // Three operations needed
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined values correctly', () => {
      const change1 = changeTracker.trackChange('test', null, undefined);
      const change2 = changeTracker.trackChange('test2', undefined, null);

      expect(change1).toBeNull(); // Both are falsy, should be considered equal
      expect(change2).toBeNull();
    });

    test('should handle complex objects', () => {
      const oldObj = { a: 1, b: { c: 2 } };
      const newObj = { a: 1, b: { c: 3 } };

      const change = changeTracker.trackChange('complexField', oldObj, newObj);

      expect(change).not.toBeNull();
      expect(change.operation).toBe('UPDATE');
      expect(typeof change.oldValue).toBe('object');
      expect(typeof change.newValue).toBe('object');
    });

    test('should generate unique change IDs', () => {
      const change1 = changeTracker.trackChange('field1', 'old1', 'new1');
      const change2 = changeTracker.trackChange('field2', 'old2', 'new2');

      const history = changeTracker.changeHistory;
      expect(history[0].id).toBeDefined();
      expect(history[1].id).toBeDefined();
      expect(history[0].id).not.toBe(history[1].id);
    });

    test('should handle very long strings for similarity calculation', () => {
      const longString1 = 'a'.repeat(1000);
      const longString2 = 'b'.repeat(1000);

      const similarity = changeTracker.calculateStringSimilarity(longString1, longString2);
      expect(similarity).toBe(0); // Completely different
    });

    test('should maintain confidence bounds', () => {
      // Test that confidence is always between 0.1 and 1.0
      const change = changeTracker.trackChange('test', 'completely', 'different');
      
      expect(change.confidence).toBeGreaterThanOrEqual(0.1);
      expect(change.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Memory Management', () => {
    test('should handle large number of changes', () => {
      // Track many changes to test memory handling
      for (let i = 0; i < 1000; i++) {
        changeTracker.trackChange(`field${i}`, `old${i}`, `new${i}`);
      }

      expect(changeTracker.changes.size).toBe(1000);
      expect(changeTracker.changeHistory.length).toBe(1000);
      expect(changeTracker.hasChanges()).toBe(true);
    });

    test('should clear changes properly', () => {
      changeTracker.trackChange('test1', 'old1', 'new1');
      changeTracker.trackChange('test2', 'old2', 'new2');

      changeTracker.clearChanges();

      expect(changeTracker.hasChanges()).toBe(false);
      expect(changeTracker.changes.size).toBe(0);
      // Note: changeHistory might be preserved for audit purposes
    });
  });
});