/**
 * Tests for the content_type_validator.js fixes
 * 
 * This file tests the fixes made to the content_type_validator.js file
 * for the validation UI improvement plan.
 */

// Import the ContentTypeValidator
// Note: In a real test environment, you would use proper imports
// but for this test we'll assume the ContentTypeValidator is globally available

describe('ContentTypeValidator Fixes', () => {
  // Test GTIN validator with scientific notation
  describe('GTIN Validator', () => {
    test('should accept standard digit format', () => {
      const validator = window.ContentTypeValidator.validators.gtin;
      
      expect(validator.validate('12345678')).toBe(true); // 8 digits
      expect(validator.validate('123456789012')).toBe(true); // 12 digits
      expect(validator.validate('1234567890123')).toBe(true); // 13 digits
      expect(validator.validate('12345678901234')).toBe(true); // 14 digits
    });
    
    test('should accept scientific notation format', () => {
      const validator = window.ContentTypeValidator.validators.gtin;
      
      expect(validator.validate('8.85176E+12')).toBe(true); // Scientific notation for 13 digits
      expect(validator.validate('1.23456E+7')).toBe(true); // Scientific notation for 8 digits
      expect(validator.validate('1.23456789012E+12')).toBe(true); // Scientific notation for 14 digits
    });
    
    test('should reject invalid formats', () => {
      const validator = window.ContentTypeValidator.validators.gtin;
      
      expect(validator.validate('123456')).toBe(false); // Too few digits
      expect(validator.validate('123456789012345')).toBe(false); // Too many digits
      expect(validator.validate('abcdefgh')).toBe(false); // Not numeric
      expect(validator.validate('1.23E+6')).toBe(false); // Scientific notation for 7 digits (invalid)
    });
    
    test('should fix scientific notation format', () => {
      const validator = window.ContentTypeValidator.validators.gtin;
      
      expect(validator.fix('8.85176E+12')).toBe('885176000000000'); // Scientific notation fixed to digits
    });
  });
  
  // Test availability validator with in_stock format
  describe('Availability Validator', () => {
    test('should accept standard formats', () => {
      const validator = window.ContentTypeValidator.validators.availability;
      
      expect(validator.validate('in stock')).toBe(true);
      expect(validator.validate('out of stock')).toBe(true);
      expect(validator.validate('preorder')).toBe(true);
      expect(validator.validate('backorder')).toBe(true);
    });
    
    test('should accept formats with underscores', () => {
      const validator = window.ContentTypeValidator.validators.availability;
      
      expect(validator.validate('in_stock')).toBe(true);
      expect(validator.validate('out_of_stock')).toBe(true);
    });
    
    test('should be case-insensitive', () => {
      const validator = window.ContentTypeValidator.validators.availability;
      
      expect(validator.validate('IN_STOCK')).toBe(true);
      expect(validator.validate('Out_Of_Stock')).toBe(true);
    });
    
    test('should reject invalid formats', () => {
      const validator = window.ContentTypeValidator.validators.availability;
      
      expect(validator.validate('available')).toBe(false);
      expect(validator.validate('sold out')).toBe(false);
    });
  });
  
  // Test condition validator
  describe('Condition Validator', () => {
    test('should accept standard formats', () => {
      const validator = window.ContentTypeValidator.validators.condition;
      
      expect(validator.validate('new')).toBe(true);
      expect(validator.validate('used')).toBe(true);
      expect(validator.validate('refurbished')).toBe(true);
    });
    
    test('should be case-insensitive', () => {
      const validator = window.ContentTypeValidator.validators.condition;
      
      expect(validator.validate('NEW')).toBe(true);
      expect(validator.validate('Used')).toBe(true);
      expect(validator.validate('REFURBISHED')).toBe(true);
    });
    
    test('should reject invalid formats', () => {
      const validator = window.ContentTypeValidator.validators.condition;
      
      expect(validator.validate('like-new')).toBe(false);
      expect(validator.validate('open box')).toBe(false);
    });
  });
});