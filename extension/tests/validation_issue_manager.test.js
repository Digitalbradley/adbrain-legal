/**
 * Tests for ValidationIssueManager
 */

// Import the module under test
// Note: In a real implementation, we would import the module directly
// but for this test, we'll use the global class defined in setup.js

describe('ValidationIssueManager', () => {
  let issueManager;
  let mockManagers;
  
  // Setup before each test
  beforeEach(() => {
    // Create mock managers
    mockManagers = {
      feedManager: {
        elements: {
          previewContentContainer: {
            querySelectorAll: jest.fn(() => []),
            querySelector: jest.fn(() => null)
          }
        }
      },
      errorManager: {
        showError: jest.fn()
      }
    };
    
    // Create a fresh instance for each test
    issueManager = new ValidationIssueManager(mockManagers);
  });
  
  // Test constructor
  describe('constructor', () => {
    test('should initialize with provided managers', () => {
      expect(issueManager.managers).toBe(mockManagers);
      expect(issueManager.offerIdToValidatorRowIndexMap).toEqual({});
    });
    
    test('should warn if feedManager is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      new ValidationIssueManager({});
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('FeedManager not provided'));
    });
    
    test('should warn if errorManager is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      new ValidationIssueManager({ feedManager: {} });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ErrorManager not provided'));
    });
  });
  
  // Test populateOfferIdMap method
  describe('populateOfferIdMap', () => {
    test('should populate the map with offer IDs and row indices', () => {
      const issues = [
        { offerId: 'offer-1', rowIndex: 1 },
        { offerId: 'offer-2', rowIndex: 2 },
        { 'Offer ID': 'offer-3', rowIndex: 3 } // Test alternative key name
      ];
      
      issueManager.populateOfferIdMap(issues);
      
      expect(issueManager.offerIdToValidatorRowIndexMap).toEqual({
        'offer-1': 1,
        'offer-2': 2,
        'offer-3': 3
      });
    });
    
    test('should warn about issues missing offerId or rowIndex', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      
      const issues = [
        { offerId: 'offer-1' }, // Missing rowIndex
        { rowIndex: 2 } // Missing offerId
      ];
      
      issueManager.populateOfferIdMap(issues);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Issue missing offerId or rowIndex'),
        expect.anything()
      );
      expect(issueManager.offerIdToValidatorRowIndexMap).toEqual({});
    });
    
    test('should handle null or non-array issues', () => {
      // Test with null
      issueManager.populateOfferIdMap(null);
      expect(issueManager.offerIdToValidatorRowIndexMap).toEqual({});
      
      // Test with non-array
      issueManager.populateOfferIdMap({});
      expect(issueManager.offerIdToValidatorRowIndexMap).toEqual({});
    });
  });
  
  // Test addMissingValidationIssues method
  describe('addMissingValidationIssues', () => {
    test('should add missing validation issues for fields that do not meet requirements', () => {
      // Mock the feed preview table with editable fields
      const mockFields = [
        {
          dataset: { field: 'title' },
          textContent: 'Short title', // Too short
          closest: jest.fn(() => ({
            dataset: { row: '1', offerId: 'offer-1' }
          }))
        },
        {
          dataset: { field: 'description' },
          textContent: 'Short description', // Too short
          closest: jest.fn(() => ({
            dataset: { row: '2', offerId: 'offer-2' }
          }))
        }
      ];
      
      mockManagers.feedManager.elements.previewContentContainer.querySelectorAll.mockReturnValue(mockFields);
      
      // Create a results object with no issues
      const results = {
        issues: []
      };
      
      issueManager.addMissingValidationIssues(results);
      
      // Should have added 2 issues (one for title, one for description)
      expect(results.issues.length).toBe(2);
      expect(results.issues[0].field).toBe('title');
      expect(results.issues[0].offerId).toBe('offer-1');
      expect(results.issues[1].field).toBe('description');
      expect(results.issues[1].offerId).toBe('offer-2');
    });
    
    test('should remove validation issues for fields that now meet requirements', () => {
      // Mock the feed preview table with editable fields
      const mockFields = [
        {
          dataset: { field: 'title' },
          textContent: 'This is a long enough title that meets the requirements', // Valid
          closest: jest.fn(() => ({
            dataset: { row: '1', offerId: 'offer-1' }
          }))
        }
      ];
      
      mockManagers.feedManager.elements.previewContentContainer.querySelectorAll.mockReturnValue(mockFields);
      
      // Create a results object with an issue for the title
      const results = {
        issues: [
          {
            offerId: 'offer-1',
            field: 'title',
            type: 'warning',
            message: 'Title too short'
          }
        ]
      };
      
      issueManager.addMissingValidationIssues(results);
      
      // The issue should have been removed
      expect(results.issues.length).toBe(0);
    });
    
    test('should do nothing if feedManager is not available', () => {
      issueManager.managers.feedManager = null;
      
      const results = {
        issues: []
      };
      
      issueManager.addMissingValidationIssues(results);
      
      // No changes should have been made
      expect(results.issues.length).toBe(0);
    });
    
    test('should do nothing if previewContentContainer is not available', () => {
      issueManager.managers.feedManager.elements.previewContentContainer = null;
      
      const results = {
        issues: []
      };
      
      issueManager.addMissingValidationIssues(results);
      
      // No changes should have been made
      expect(results.issues.length).toBe(0);
    });
  });
  
  // Test markIssueAsFixed method
  describe('markIssueAsFixed', () => {
    test('should mark an issue as fixed if it meets requirements', () => {
      // Set up the offerIdToValidatorRowIndexMap
      issueManager.offerIdToValidatorRowIndexMap = {
        'offer-1': 1
      };
      
      // Mock the feed preview table with an editable field that meets requirements
      const mockField = {
        textContent: 'This is a long enough title that meets the requirements', // Valid
        dataset: { field: 'title' }
      };
      
      const mockRow = {
        querySelector: jest.fn(() => mockField),
        dataset: { offerId: 'offer-1' }
      };
      
      mockManagers.feedManager.elements.previewContentContainer.querySelector.mockReturnValue(mockRow);
      
      // Create validation results with an issue
      const validationResults = {
        'feed-1': {
          issues: [
            {
              offerId: 'offer-1',
              field: 'title',
              type: 'warning',
              message: 'Title too short'
            }
          ]
        }
      };
      
      // Create a mock active validation panel
      const activeValidationPanel = {
        dataset: { feedId: 'feed-1' }
      };
      
      const result = issueManager.markIssueAsFixed('offer-1', 'title', validationResults, activeValidationPanel);
      
      expect(result).toBe(true);
      expect(validationResults['feed-1'].issues.length).toBe(0);
    });
    
    test('should not mark an issue as fixed if it does not meet requirements', () => {
      // Set up the offerIdToValidatorRowIndexMap
      issueManager.offerIdToValidatorRowIndexMap = {
        'offer-1': 1
      };
      
      // Mock the feed preview table with an editable field that does not meet requirements
      const mockField = {
        textContent: 'Short', // Too short
        dataset: { field: 'title' }
      };
      
      const mockRow = {
        querySelector: jest.fn(() => mockField),
        dataset: { offerId: 'offer-1' }
      };
      
      mockManagers.feedManager.elements.previewContentContainer.querySelector.mockReturnValue(mockRow);
      
      // Create validation results with an issue
      const validationResults = {
        'feed-1': {
          issues: [
            {
              offerId: 'offer-1',
              field: 'title',
              type: 'warning',
              message: 'Title too short'
            }
          ]
        }
      };
      
      // Create a mock active validation panel
      const activeValidationPanel = {
        dataset: { feedId: 'feed-1' }
      };
      
      const result = issueManager.markIssueAsFixed('offer-1', 'title', validationResults, activeValidationPanel);
      
      expect(result).toBe(false);
      expect(validationResults['feed-1'].issues.length).toBe(1);
    });
    
    test('should return false if validator row index is not found', () => {
      // Empty offerIdToValidatorRowIndexMap
      issueManager.offerIdToValidatorRowIndexMap = {};
      
      const validationResults = {};
      const activeValidationPanel = {};
      
      const result = issueManager.markIssueAsFixed('offer-1', 'title', validationResults, activeValidationPanel);
      
      expect(result).toBe(false);
    });
    
    test('should return false if validation results for the feed are not found', () => {
      // Set up the offerIdToValidatorRowIndexMap
      issueManager.offerIdToValidatorRowIndexMap = {
        'offer-1': 1
      };
      
      // Create an empty validation results object
      const validationResults = {};
      
      // Create a mock active validation panel
      const activeValidationPanel = {
        dataset: { feedId: 'feed-1' }
      };
      
      const result = issueManager.markIssueAsFixed('offer-1', 'title', validationResults, activeValidationPanel);
      
      expect(result).toBe(false);
    });
    
    test('should return false if issues array is not found', () => {
      // Set up the offerIdToValidatorRowIndexMap
      issueManager.offerIdToValidatorRowIndexMap = {
        'offer-1': 1
      };
      
      // Create validation results without an issues array
      const validationResults = {
        'feed-1': {}
      };
      
      // Create a mock active validation panel
      const activeValidationPanel = {
        dataset: { feedId: 'feed-1' }
      };
      
      const result = issueManager.markIssueAsFixed('offer-1', 'title', validationResults, activeValidationPanel);
      
      expect(result).toBe(false);
    });
  });
});