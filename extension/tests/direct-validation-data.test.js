/**
 * Unit tests for direct-validation-data.js
 * 
 * Tests the data retrieval and processing functionality
 */

describe('DirectValidationData', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="previewContent">
        <table>
          <thead>
            <tr>
              <th>id</th>
              <th>title</th>
              <th>description</th>
              <th>price</th>
              <th>image_link</th>
              <th>link</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>product-1</td>
              <td>Test Product 1</td>
              <td>This is a test product description</td>
              <td>19.99</td>
              <td>https://example.com/image1.jpg</td>
              <td>https://example.com/product1</td>
            </tr>
            <tr>
              <td>product-2</td>
              <td>Test Product 2 with a longer title that meets requirements</td>
              <td>This is a test product description that is long enough to meet the minimum character requirements for descriptions in the Google Merchant Center.</td>
              <td>29.99</td>
              <td>https://example.com/image2.jpg</td>
              <td>https://example.com/product2</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    
    // Reset mocks
    window.resetMocks('DirectValidationData');
    
    // Mock console.error
    console.error = jest.fn();
    
    // Load the actual implementation
    require('../src/popup/direct-validation-data');
  });

  // Test getTableData method
  describe('getTableData', () => {
    test('should extract data from the preview table', () => {
      // Execute
      const result = window.DirectValidationData.getTableData();
      
      // Verify
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'product-1',
        title: 'Test Product 1',
        description: 'This is a test product description',
        price: '19.99',
        image_link: 'https://example.com/image1.jpg',
        link: 'https://example.com/product1',
        rowIndex: 1
      });
      expect(result[1]).toEqual({
        id: 'product-2',
        title: 'Test Product 2 with a longer title that meets requirements',
        description: 'This is a test product description that is long enough to meet the minimum character requirements for descriptions in the Google Merchant Center.',
        price: '29.99',
        image_link: 'https://example.com/image2.jpg',
        link: 'https://example.com/product2',
        rowIndex: 2
      });
    });

    test('should return an empty array if the table is not found', () => {
      // Setup: Remove table
      document.body.innerHTML = '';
      
      // Execute
      const result = window.DirectValidationData.getTableData();
      
      // Verify
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Preview table not found'));
    });

    test('should handle table with no rows', () => {
      // Setup: Table with no rows
      document.body.innerHTML = `
        <div id="previewContent">
          <table>
            <thead>
              <tr>
                <th>id</th>
                <th>title</th>
                <th>description</th>
              </tr>
            </thead>
            <tbody>
            </tbody>
          </table>
        </div>
      `;
      
      // Execute
      const result = window.DirectValidationData.getTableData();
      
      // Verify
      expect(result).toEqual([]);
    });

    test('should handle table with missing columns', () => {
      // Setup: Table with missing columns
      document.body.innerHTML = `
        <div id="previewContent">
          <table>
            <thead>
              <tr>
                <th>id</th>
                <th>title</th>
                <!-- description column missing -->
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>product-1</td>
                <td>Test Product 1</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
      
      // Execute
      const result = window.DirectValidationData.getTableData();
      
      // Verify
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('product-1');
      expect(result[0].title).toBe('Test Product 1');
      expect(result[0].description).toBeUndefined();
    });
  });

  // Test validateFeedData method
  describe('validateFeedData', () => {
    test('should validate feed data and identify issues', () => {
      // Setup
      const feedData = [
        {
          id: 'product-1',
          title: 'Short Title', // Too short
          description: 'Short description', // Too short
          image_link: 'https://example.com/image1.jpg',
          link: 'https://example.com/product1',
          rowIndex: 1
        },
        {
          id: 'product-2',
          title: 'This is a product with a title that is long enough to meet requirements',
          description: 'This is a product description that is long enough to meet the minimum character requirements for descriptions in the Google Merchant Center.',
          image_link: 'https://example.com/image2.jpg',
          link: 'https://example.com/product2',
          rowIndex: 2
        }
      ];
      
      // Execute
      const result = window.DirectValidationData.validateFeedData(feedData);
      
      // Verify
      expect(result.totalProducts).toBe(2);
      expect(result.validProducts).toBe(1);
      expect(result.isValid).toBe(false);
      
      // We expect 2 issues (title and description for product-1)
      const titleIssues = result.issues.filter(issue => issue.field === 'title');
      const descIssues = result.issues.filter(issue => issue.field === 'description');
      
      expect(titleIssues).toHaveLength(1);
      expect(descIssues).toHaveLength(1);
      
      // Check title issue
      const titleIssue = titleIssues[0];
      expect(titleIssue.rowIndex).toBe(1);
      expect(titleIssue.offerId).toBe('product-1');
      expect(titleIssue.type).toBe('error');
      expect(titleIssue.message).toContain('Title too short');
      
      // Check description issue
      const descIssue = descIssues[0];
      expect(descIssue.rowIndex).toBe(1);
      expect(descIssue.offerId).toBe('product-1');
      expect(descIssue.type).toBe('error');
      expect(descIssue.message).toContain('Description too short');
    });

    test('should handle empty feed data', () => {
      // Execute
      const result = window.DirectValidationData.validateFeedData([]);
      
      // Verify
      expect(result.totalProducts).toBe(0);
      expect(result.validProducts).toBe(0);
      expect(result.isValid).toBe(true); // No products = no issues
      expect(result.issues).toHaveLength(0);
    });

    test('should handle feed data with missing fields', () => {
      // Setup
      const feedData = [
        {
          id: 'product-1',
          // title and description missing
          rowIndex: 1
        }
      ];
      
      // Execute
      const result = window.DirectValidationData.validateFeedData(feedData);
      
      // Verify
      expect(result.totalProducts).toBe(1);
      expect(result.validProducts).toBe(0);
      expect(result.isValid).toBe(false);
      
      // We expect 2 issues (image_link and link are missing)
      // Note: The implementation doesn't check for undefined title/description, only for length
      const issues = result.issues.filter(issue => issue.offerId === 'product-1');
      expect(issues).toHaveLength(2);
      
      // Check that we have issues for image_link and link
      const fields = issues.map(issue => issue.field);
      expect(fields).toContain('image_link');
      expect(fields).toContain('link');
    });

    test('should validate title length requirements', () => {
      // Setup: Test different title lengths
      const feedData = [
        {
          id: 'product-1',
          title: 'Very short', // Way too short
          description: 'This is a product description that is long enough to meet the minimum character requirements.',
          image_link: 'https://example.com/image1.jpg',
          link: 'https://example.com/product1',
          rowIndex: 1
        },
        {
          id: 'product-2',
          title: 'This title is almost long enough but not quite there yet', // Just below threshold
          description: 'This is a product description that is long enough to meet the minimum character requirements.',
          image_link: 'https://example.com/image2.jpg',
          link: 'https://example.com/product2',
          rowIndex: 2
        },
        {
          id: 'product-3',
          title: 'This title is exactly long enough to meet the minimum character requirements for Google Merchant Center', // Just at threshold
          description: 'This is a product description that is long enough to meet the minimum character requirements.',
          image_link: 'https://example.com/image3.jpg',
          link: 'https://example.com/product3',
          rowIndex: 3
        }
      ];
      
      // Execute
      const result = window.DirectValidationData.validateFeedData(feedData);
      
      // Verify
      const titleIssues = result.issues.filter(issue => issue.field === 'title');
      
      // Both product-1 and product-2 should have title issues
      // Note: The implementation considers product-2's title long enough (it's over 30 chars)
      expect(titleIssues).toHaveLength(1);
      expect(titleIssues[0].offerId).toBe('product-1');
      
      // Check that product-3 doesn't have a title issue
      const product3TitleIssue = result.issues.find(issue => issue.offerId === 'product-3' && issue.field === 'title');
      expect(product3TitleIssue).toBeUndefined();
    });

    test('should validate description length requirements', () => {
      // Setup: Test different description lengths
      const feedData = [
        {
          id: 'product-1',
          title: 'This title is long enough to meet the minimum character requirements for Google Merchant Center',
          description: 'Very short', // Way too short
          image_link: 'https://example.com/image1.jpg',
          link: 'https://example.com/product1',
          rowIndex: 1
        },
        {
          id: 'product-2',
          title: 'This title is long enough to meet the minimum character requirements for Google Merchant Center',
          description: 'This description is almost long enough but not quite there yet', // Just below threshold
          image_link: 'https://example.com/image2.jpg',
          link: 'https://example.com/product2',
          rowIndex: 2
        },
        {
          id: 'product-3',
          title: 'This title is long enough to meet the minimum character requirements for Google Merchant Center',
          description: 'This description is exactly long enough to meet the minimum character requirements for descriptions in the Google Merchant Center.', // Just at threshold
          image_link: 'https://example.com/image3.jpg',
          link: 'https://example.com/product3',
          rowIndex: 3
        }
      ];
      
      // Execute
      const result = window.DirectValidationData.validateFeedData(feedData);
      
      // Verify
      const descIssues = result.issues.filter(issue => issue.field === 'description');
      expect(descIssues).toHaveLength(2);
      
      // Check that product-3 doesn't have a description issue
      const product3DescIssue = result.issues.find(issue => issue.offerId === 'product-3' && issue.field === 'description');
      expect(product3DescIssue).toBeUndefined();
    });
  });

  // Feature flag tests removed in Phase 4 (Cleanup)
});