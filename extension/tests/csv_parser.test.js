// tests/csv_parser.test.js
import { CSVParser } from '../src/popup/csv_parser';

// Mock ContentTypeValidator
const mockContentTypeValidator = {
  validate: jest.fn()
};

describe('CSVParser', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockContentTypeValidator.validate.mockReset();
  });

  describe('constructor', () => {
    test('should initialize with default required headers', () => {
      const parser = new CSVParser();
      expect(parser.requiredHeaders).toEqual(['id', 'title', 'description', 'link', 'image_link']);
    });

    test('should initialize with custom required headers', () => {
      const customHeaders = ['id', 'custom_field', 'another_field'];
      const parser = new CSVParser({ requiredHeaders: customHeaders });
      expect(parser.requiredHeaders).toEqual(customHeaders);
    });
  });

  describe('parse method', () => {
    let parser;
    
    beforeEach(() => {
      parser = new CSVParser();
      // Spy on console methods to prevent noise in test output
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore console methods
      console.log.mockRestore();
      console.warn.mockRestore();
      console.error.mockRestore();
    });

    test('should parse valid CSV data', () => {
      const csvText = 'id,title,description,link,image_link\n1,Product 1,Description 1,http://example.com,http://example.com/image.jpg';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(errors).toHaveLength(0);
      expect(warnings).toHaveLength(0);
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual({
        id: '1',
        title: 'Product 1',
        description: 'Description 1',
        link: 'http://example.com',
        image_link: 'http://example.com/image.jpg'
      });
    });

    test('should handle empty CSV data', () => {
      const { data, errors, warnings } = parser.parse('');
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('empty_feed');
      expect(data).toHaveLength(0);
    });

    test('should handle CSV with missing required headers', () => {
      const csvText = 'id,title,link\n1,Product 1,http://example.com';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('missing_headers_warning');
      expect(warnings[0].missingHeaders).toContain('description');
      expect(warnings[0].missingHeaders).toContain('image_link');
    });

    test('should handle CSV with inconsistent column counts - too few columns', () => {
      const csvText = 'id,title,description,link,image_link\n1,Product 1,Description 1,http://example.com';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('too_few_columns');
      expect(warnings[0].expected).toBe(5);
      expect(warnings[0].found).toBe(4);
    });

    test('should handle CSV with inconsistent column counts - too many columns', () => {
      const csvText = 'id,title,description,link,image_link\n1,Product 1,Description 1,http://example.com,http://example.com/image.jpg,extra';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('too_many_columns');
      expect(warnings[0].expected).toBe(5);
      expect(warnings[0].found).toBe(6);
    });

    test('should handle CSV with unclosed quotes', () => {
      const csvText = 'id,title,description,link,image_link\n1,"Product 1,Description 1,http://example.com,http://example.com/image.jpg';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('unclosed_quote');
    });

    test('should handle CSV with empty required fields', () => {
      const csvText = 'id,title,description,link,image_link\n1,,Description 1,http://example.com,http://example.com/image.jpg';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('empty_required_fields');
      expect(warnings[0].fields).toContain('title');
    });

    test('should integrate with content type validator', () => {
      const csvText = 'id,title,description,link,image_link\n1,Product 1,Description 1,http://example.com,http://example.com/image.jpg';
      
      // Mock the validator to return issues
      mockContentTypeValidator.validate.mockReturnValue([
        { field: 'title', message: 'Title is too generic' }
      ]);
      
      const { data, errors, warnings } = parser.parse(csvText, mockContentTypeValidator);
      
      expect(mockContentTypeValidator.validate).toHaveBeenCalled();
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('content_type_issues');
    });

    test('should handle content type validator errors', () => {
      const csvText = 'id,title,description,link,image_link\n1,Product 1,Description 1,http://example.com,http://example.com/image.jpg';
      
      // Mock the validator to throw an error
      mockContentTypeValidator.validate.mockImplementation(() => {
        throw new Error('Validation error');
      });
      
      const { data, errors, warnings } = parser.parse(csvText, mockContentTypeValidator);
      
      expect(mockContentTypeValidator.validate).toHaveBeenCalled();
      expect(warnings).toHaveLength(1);
      expect(warnings[0].type).toBe('content_type_error');
    });

    test('should handle multiple rows of data', () => {
      const csvText = 'id,title,description,link,image_link\n' +
        '1,Product 1,Description 1,http://example.com/1,http://example.com/image1.jpg\n' +
        '2,Product 2,Description 2,http://example.com/2,http://example.com/image2.jpg\n' +
        '3,Product 3,Description 3,http://example.com/3,http://example.com/image3.jpg';
      
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(errors).toHaveLength(0);
      expect(warnings).toHaveLength(0);
      expect(data).toHaveLength(3);
      expect(data[0].id).toBe('1');
      expect(data[1].id).toBe('2');
      expect(data[2].id).toBe('3');
    });

    test('should handle CSV with only headers and no data rows', () => {
      const csvText = 'id,title,description,link,image_link';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('no_data_rows');
      expect(data).toHaveLength(0);
    });

    test('should handle CSV with whitespace in values', () => {
      const csvText = 'id,title,description,link,image_link\n1, Product 1 , Description 1 ,http://example.com, http://example.com/image.jpg ';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(errors).toHaveLength(0);
      expect(warnings).toHaveLength(0);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Product 1');
      expect(data[0].description).toBe('Description 1');
      expect(data[0].link).toBe('http://example.com');
      expect(data[0].image_link).toBe('http://example.com/image.jpg');
    });

    test('should handle CSV with quoted values', () => {
      const csvText = 'id,title,description,link,image_link\n1,"Product, with comma","Description, with comma",http://example.com,http://example.com/image.jpg';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(errors).toHaveLength(0);
      expect(warnings).toHaveLength(0);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Product, with comma');
      expect(data[0].description).toBe('Description, with comma');
    });

    test('should handle CSV with escaped quotes', () => {
      const csvText = 'id,title,description,link,image_link\n1,"Product ""quoted"" text","Description ""quoted"" text",http://example.com,http://example.com/image.jpg';
      const { data, errors, warnings } = parser.parse(csvText);
      
      expect(errors).toHaveLength(0);
      expect(warnings).toHaveLength(0);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Product "quoted" text');
      expect(data[0].description).toBe('Description "quoted" text');
    });
  });
});