/**
 * Tests for Content Type Validator
 */

// Import the module under test
import { ContentTypeValidator, SEVERITY, THRESHOLDS } from '../src/popup/content_type_validator';

describe('ContentTypeValidator', () => {
  // Setup before each test
  beforeEach(() => {
    
    // Spy on console methods to prevent noise in test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Make ContentTypeValidator available globally for backward compatibility in tests
    global.ContentTypeValidator = ContentTypeValidator;
  });
  
  afterEach(() => {
    // Restore console methods
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
    
    // Clear all mocks
    jest.clearAllMocks();
  });
  
  // Test validators
  describe('validators', () => {
    test('id validator should accept alphanumeric IDs with underscores and hyphens', () => {
      const validator = ContentTypeValidator.validators.id;
      
      expect(validator.validate('product123')).toBe(true);
      expect(validator.validate('product_123')).toBe(true);
      expect(validator.validate('product-123')).toBe(true);
      expect(validator.validate('PRODUCT_123')).toBe(true);
      
      expect(validator.validate('product 123')).toBe(false);
      expect(validator.validate('product#123')).toBe(false);
      expect(validator.validate('product@123')).toBe(false);
    });
    
    test('title validator should reject URLs', () => {
      const validator = ContentTypeValidator.validators.title;
      
      expect(validator.validate('Product Title')).toBe(true);
      expect(validator.validate('Product Title with Numbers 123')).toBe(true);
      
      expect(validator.validate('http://example.com')).toBe(false);
      expect(validator.validate('https://example.com/product')).toBe(false);
      expect(validator.validate('ftp://example.com/product')).toBe(false);
    });
    
    test('description validator should reject URLs', () => {
      const validator = ContentTypeValidator.validators.description;
      
      expect(validator.validate('Product description')).toBe(true);
      expect(validator.validate('Product description with numbers 123')).toBe(true);
      
      expect(validator.validate('http://example.com')).toBe(false);
      expect(validator.validate('https://example.com/product')).toBe(false);
      expect(validator.validate('ftp://example.com/product')).toBe(false);
    });
    
    test('link validator should accept only valid URLs', () => {
      const validator = ContentTypeValidator.validators.link;
      
      expect(validator.validate('http://example.com')).toBe(true);
      expect(validator.validate('https://example.com/product')).toBe(true);
      
      expect(validator.validate('example.com')).toBe(false);
      expect(validator.validate('www.example.com')).toBe(false);
      expect(validator.validate('Product link')).toBe(false);
    });
    
    test('image_link validator should accept only valid URLs', () => {
      const validator = ContentTypeValidator.validators.image_link;
      
      expect(validator.validate('http://example.com/image.jpg')).toBe(true);
      expect(validator.validate('https://example.com/images/product.png')).toBe(true);
      
      expect(validator.validate('example.com/image.jpg')).toBe(false);
      expect(validator.validate('www.example.com/image.jpg')).toBe(false);
      expect(validator.validate('image.jpg')).toBe(false);
    });
    
    test('price validator should accept only valid price formats', () => {
      const validator = ContentTypeValidator.validators.price;
      
      expect(validator.validate('100.00 USD')).toBe(true);
      expect(validator.validate('99 EUR')).toBe(true);
      expect(validator.validate('1234.56 GBP')).toBe(true);
      
      expect(validator.validate('100.00')).toBe(false);
      expect(validator.validate('$100.00')).toBe(false);
      expect(validator.validate('100.00 usd')).toBe(false);
      expect(validator.validate('USD 100.00')).toBe(false);
    });
    
    test('availability validator should accept only valid availability values', () => {
      const validator = ContentTypeValidator.validators.availability;
      
      expect(validator.validate('in stock')).toBe(true);
      expect(validator.validate('out of stock')).toBe(true);
      expect(validator.validate('preorder')).toBe(true);
      expect(validator.validate('backorder')).toBe(true);
      expect(validator.validate('IN STOCK')).toBe(true);
      
      // Test for formats with underscores
      expect(validator.validate('in_stock')).toBe(true);
      expect(validator.validate('out_of_stock')).toBe(true);
      expect(validator.validate('IN_STOCK')).toBe(true);
      
      expect(validator.validate('available')).toBe(false);
      expect(validator.validate('sold out')).toBe(false);
      expect(validator.validate('coming soon')).toBe(false);
    });
    
    test('condition validator should accept only valid condition values', () => {
      const validator = ContentTypeValidator.validators.condition;
      
      expect(validator.validate('new')).toBe(true);
      expect(validator.validate('used')).toBe(true);
      expect(validator.validate('refurbished')).toBe(true);
      expect(validator.validate('NEW')).toBe(true);
      
      expect(validator.validate('like new')).toBe(false);
      expect(validator.validate('open box')).toBe(false);
      expect(validator.validate('damaged')).toBe(false);
    });
    test('gtin validator should accept valid GTIN formats', () => {
      const validator = ContentTypeValidator.validators.gtin;
      
      // Standard digit formats
      expect(validator.validate('12345678')).toBe(true); // 8 digits
      expect(validator.validate('123456789012')).toBe(true); // 12 digits
      expect(validator.validate('1234567890123')).toBe(true); // 13 digits
      expect(validator.validate('12345678901234')).toBe(true); // 14 digits
      
      // Scientific notation formats
      expect(validator.validate('8.85176E+12')).toBe(true); // Scientific notation for 13 digits
      expect(validator.validate('1.23456E+7')).toBe(true); // Scientific notation for 8 digits
      expect(validator.validate('1.23456789012E+12')).toBe(true); // Scientific notation for 14 digits
      
      // Invalid formats
      expect(validator.validate('123456')).toBe(false); // Too few digits
      expect(validator.validate('123456789012345')).toBe(false); // Too many digits
      expect(validator.validate('abcdefgh')).toBe(false); // Not numeric
      expect(validator.validate('1.23E+6')).toBe(false); // Scientific notation for 7 digits (invalid)
    });
  });
  
  // Test validate method
  describe('validate', () => {
    test('should return empty array for valid data', () => {
      const row = {
        id: 'product123',
        title: 'Product Title',
        description: 'Product description',
        link: 'https://example.com/product',
        image_link: 'https://example.com/image.jpg',
        price: '100.00 USD',
        availability: 'in stock',
        condition: 'new'
      };
      
      const headers = ['id', 'title', 'description', 'link', 'image_link', 'price', 'availability', 'condition'];
      
      const issues = ContentTypeValidator.validate(row, headers);
      
      expect(issues).toEqual([]);
    });
    
    test('should return issues for invalid data', () => {
      const row = {
        id: 'product 123', // Invalid: contains space
        title: 'https://example.com/product', // Invalid: URL in title
        description: 'Product description',
        link: 'example.com', // Invalid: not a proper URL
        image_link: 'https://example.com/image.jpg',
        price: '100.00', // Invalid: missing currency code
        availability: 'available', // Invalid: not in allowed list
        condition: 'like new' // Invalid: not in allowed list
      };
      
      const headers = ['id', 'title', 'description', 'link', 'image_link', 'price', 'availability', 'condition'];
      
      const issues = ContentTypeValidator.validate(row, headers);
      
      expect(issues.length).toBe(6);
      expect(issues.some(issue => issue.field === 'id')).toBe(true);
      expect(issues.some(issue => issue.field === 'title')).toBe(true);
      expect(issues.some(issue => issue.field === 'link')).toBe(true);
      expect(issues.some(issue => issue.field === 'price')).toBe(true);
      expect(issues.some(issue => issue.field === 'availability')).toBe(true);
      expect(issues.some(issue => issue.field === 'condition')).toBe(true);
    });
    
    test('should ignore fields not in validators', () => {
      const row = {
        id: 'product123',
        title: 'Product Title',
        custom_field: 'Custom value',
        another_field: 'Another value'
      };
      
      const headers = ['id', 'title', 'custom_field', 'another_field'];
      
      const issues = ContentTypeValidator.validate(row, headers);
      
      expect(issues).toEqual([]);
    });
    
    test('should ignore empty values', () => {
      const row = {
        id: 'product123',
        title: '',
        description: null,
        link: undefined,
        image_link: 'https://example.com/image.jpg'
      };
      
      const headers = ['id', 'title', 'description', 'link', 'image_link'];
      
      const issues = ContentTypeValidator.validate(row, headers);
      
      expect(issues).toEqual([]);
    });
  });
  
  // Test formatIssues method
  describe('formatIssues', () => {
    test('should format issues into a readable string', () => {
      const issues = [
        { field: 'id', value: 'product 123', message: 'should be alphanumeric (may include underscores and hyphens)' },
        { field: 'title', value: 'https://example.com', message: 'should not be a URL' },
        { field: 'link', value: 'example.com', message: 'should be a valid URL (starting with http:// or https://)' }
      ];
      
      const formatted = ContentTypeValidator.formatIssues(issues);
      
      expect(formatted).toBe(
        'id should be alphanumeric (may include underscores and hyphens), ' +
        'title should not be a URL, ' +
        'link should be a valid URL (starting with http:// or https://)'
      );
    });
    
    test('should handle empty issues array', () => {
      const formatted = ContentTypeValidator.formatIssues([]);
      
      expect(formatted).toBe('');
    });
  });
});