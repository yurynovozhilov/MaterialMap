/**
 * Tests for ValidationEngine class
 */

const fs = require('fs');
const path = require('path');

// Load the ValidationEngine class
const validationEngineCode = fs.readFileSync(
  path.join(process.cwd(), 'assets/js/validation-engine.js'),
  'utf8'
);

// Evaluate the code to make the class available
eval(validationEngineCode);

describe('ValidationEngine', () => {
  let validationEngine;

  beforeEach(() => {
    validationEngine = new ValidationEngine();
  });

  describe('Happy Path - ValidationEngine validates required fields', () => {
    test('should validate material with all required fields', async () => {
      const validMaterial = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference for material validation',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(validMaterial);
      
      expect(result.status).toBe('VALID');
      expect(result.errors).toHaveLength(0);
    });

    test('should initialize with correct validation rules', () => {
      expect(validationEngine.rules.required).toEqual(['id', 'mat', 'ref', 'add']);
      expect(validationEngine.rules.types.id).toBe('string');
      expect(validationEngine.rules.types.app).toBe('array');
    });
  });

  describe('Happy Path - ValidationEngine validates field types', () => {
    test('should validate string fields correctly', async () => {
      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference for field type validation',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      expect(result.status).toBe('VALID');
      expect(result.errors.filter(e => e.field === 'types')).toHaveLength(0);
    });

    test('should validate array fields correctly', async () => {
      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        app: ['Testing', 'Validation'],
        ref: 'Test reference for array validation',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      expect(result.status).toBe('VALID');
      expect(result.errors.filter(e => e.field === 'app')).toHaveLength(0);
    });
  });

  describe('Input Verification - ValidationEngine handles invalid material data', () => {
    test('should reject null or undefined material', async () => {
      const result1 = await validationEngine.validateMaterial(null);
      const result2 = await validationEngine.validateMaterial(undefined);
      
      expect(result1.status).toBe('INVALID');
      expect(result2.status).toBe('INVALID');
      expect(result1.errors[0].field).toBe('structure');
      expect(result2.errors[0].field).toBe('structure');
    });

    test('should reject non-object material', async () => {
      const result1 = await validationEngine.validateMaterial('invalid');
      const result2 = await validationEngine.validateMaterial(123);
      
      expect(result1.status).toBe('INVALID');
      expect(result2.status).toBe('INVALID');
      expect(result1.errors[0].message).toContain('Material must be an object');
    });

    test('should identify missing required fields', async () => {
      const incompleteMaterial = {
        id: 'MAT_001'
        // missing mat, ref, add
      };

      const result = await validationEngine.validateMaterial(incompleteMaterial);
      
      expect(result.status).toBe('INVALID');
      expect(result.errors.length).toBeGreaterThan(0);
      
      const missingFields = result.errors
        .filter(e => e.message.includes('required'))
        .map(e => e.field);
      
      expect(missingFields).toContain('mat');
      expect(missingFields).toContain('ref');
      expect(missingFields).toContain('add');
    });
  });

  describe('Input Verification - ValidationEngine validates URL patterns', () => {
    test('should accept valid HTTP URLs', async () => {
      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference with URL validation',
        url: 'http://example.com/test',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      // Should not have URL pattern errors
      const urlErrors = result.errors.filter(e => 
        e.field === 'url' && e.message.includes('pattern')
      );
      expect(urlErrors).toHaveLength(0);
    });

    test('should accept valid HTTPS URLs', async () => {
      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference with HTTPS URL validation',
        url: 'https://secure.example.com/material',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      const urlErrors = result.errors.filter(e => 
        e.field === 'url' && e.message.includes('pattern')
      );
      expect(urlErrors).toHaveLength(0);
    });

    test('should reject invalid URL patterns', async () => {
      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference with invalid URL',
        url: 'invalid-url',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      const urlErrors = result.errors.filter(e => 
        e.field === 'url' && e.message.includes('pattern')
      );
      expect(urlErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Input Verification - ValidationEngine handles empty fields', () => {
    test('should reject empty string for required fields', async () => {
      const material = {
        id: '',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference for empty field validation',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      expect(result.status).toBe('INVALID');
      const idErrors = result.errors.filter(e => e.field === 'id');
      expect(idErrors.length).toBeGreaterThan(0);
    });

    test('should handle empty arrays appropriately', async () => {
      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        app: [], // empty array
        ref: 'Test reference for empty array validation',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      // Should have constraint error for minimum items
      const appErrors = result.errors.filter(e => 
        e.field === 'app' && e.message.includes('minimum')
      );
      expect(appErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Branching - ChangeTracker calculates operation types', () => {
    test('should identify field pattern validation', async () => {
      const invalidIdMaterial = {
        id: 'INVALID_ID', // doesn't match MAT_\\d+ pattern
        mat: 'MAT_ELASTIC',
        ref: 'Test reference for pattern validation',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(invalidIdMaterial);
      
      const patternErrors = result.errors.filter(e => 
        e.field === 'id' && e.message.includes('pattern')
      );
      expect(patternErrors.length).toBeGreaterThan(0);
    });

    test('should validate date patterns', async () => {
      const invalidDateMaterial = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference for date pattern validation',
        add: 'invalid-date'
      };

      const result = await validationEngine.validateMaterial(invalidDateMaterial);
      
      const dateErrors = result.errors.filter(e => 
        e.field === 'add' && e.message.includes('pattern')
      );
      expect(dateErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Exception Handling - ValidationEngine throws on invalid data', () => {
    test('should handle validation exceptions gracefully', async () => {
      // Mock a method to throw an error
      const originalValidateStructure = validationEngine.validateStructure;
      validationEngine.validateStructure = jest.fn(() => {
        throw new Error('Mocked validation error');
      });

      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference for exception handling',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      expect(result.status).toBe('INVALID');
      expect(result.errors[0].field).toBe('general');
      expect(result.errors[0].message).toContain('Validation failed');
      expect(result.errors[0].message).toContain('Mocked validation error');

      // Restore original method
      validationEngine.validateStructure = originalValidateStructure;
    });

    test('should handle async URL validation errors', async () => {
      // Mock URL validation to throw
      const originalValidateUrls = validationEngine.validateUrls;
      validationEngine.validateUrls = jest.fn(async () => {
        throw new Error('URL validation failed');
      });

      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference for URL validation error',
        url: 'https://example.com',
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      expect(result.status).toBe('INVALID');
      expect(result.errors[0].message).toContain('URL validation failed');

      // Restore original method
      validationEngine.validateUrls = originalValidateUrls;
    });

    test('should differentiate between errors and warnings', async () => {
      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: 'Test reference',
        add: '2024-01-01'
      };

      // Mock to add a warning
      const originalValidateContent = validationEngine.validateContent;
      validationEngine.validateContent = jest.fn((material, validation) => {
        validation.warnings.push({
          field: 'test',
          message: 'Test warning',
          severity: 'warning'
        });
      });

      const result = await validationEngine.validateMaterial(material);
      
      expect(result.status).toBe('WARNING');
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toBe('Test warning');

      // Restore original method
      validationEngine.validateContent = originalValidateContent;
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long field values', async () => {
      const longString = 'a'.repeat(2000); // Exceeds maxLength constraints
      const material = {
        id: 'MAT_001',
        mat: 'MAT_ELASTIC',
        ref: longString,
        add: '2024-01-01'
      };

      const result = await validationEngine.validateMaterial(material);
      
      const lengthErrors = result.errors.filter(e => 
        e.field === 'ref' && e.message.includes('length')
      );
      expect(lengthErrors.length).toBeGreaterThan(0);
    });

    test('should validate material patterns correctly', async () => {
      const validMaterial = {
        id: 'MAT_123',
        mat: 'MAT_ELASTIC_PLASTIC',
        eos: 'EOS_LINEAR_POLYNOMIAL',
        ref: 'Valid material pattern test',
        add: '2024-12-31'
      };

      const result = await validationEngine.validateMaterial(validMaterial);
      
      expect(result.status).toBe('VALID');
      expect(result.errors.filter(e => e.message.includes('pattern'))).toHaveLength(0);
    });
  });
});