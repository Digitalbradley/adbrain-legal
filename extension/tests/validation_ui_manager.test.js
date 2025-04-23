/**
 * Tests for ValidationUIManager
 */

// Import the module under test
// Note: In a real implementation, we would import the module directly
// but for this test, we'll use the global class defined in setup.js

describe('ValidationUIManager', () => {
  let uiManager;
  let mockElements;
  let mockManagers;
  
  // Setup before each test
  beforeEach(() => {
    // Create mock elements
    mockElements = {
      historyTableBody: {
        innerHTML: '',
        appendChild: jest.fn(),
        insertBefore: jest.fn(),
        querySelector: jest.fn(() => null)
      },
      validationTab: {
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        },
        closest: jest.fn(() => ({
          querySelectorAll: jest.fn(() => []),
          parentElement: {
            querySelectorAll: jest.fn(() => []),
            querySelector: jest.fn(() => ({
              classList: {
                add: jest.fn()
              }
            }))
          }
        }))
      }
    };
    
    // Create mock managers
    mockManagers = {
      feedManager: {
        getCorrectedTableData: jest.fn(() => [
          { id: 'product-1', title: 'Product 1', description: 'Description 1' }
        ])
      },
      errorManager: {
        showError: jest.fn(),
        showSuccess: jest.fn()
      },
      authManager: {
        getAuthState: jest.fn(() => ({
          firebaseAuthenticated: true,
          firebaseUserId: 'mock-user-id',
          isProUser: true
        }))
      },
      loadingManager: {
        showLoading: jest.fn(),
        hideLoading: jest.fn()
      },
      monitor: {
        logOperation: jest.fn(),
        logError: jest.fn()
      },
      gmcValidator: {
        validate: jest.fn(() => Promise.resolve({
          isValid: true,
          totalProducts: 1,
          validProducts: 1,
          issues: []
        }))
      },
      gmcApi: {
        isAuthenticated: true,
        authenticate: jest.fn(() => Promise.resolve(true))
      },
      customRuleValidator: {
        fetchCustomRules: jest.fn(() => Promise.resolve()),
        validate: jest.fn(() => Promise.resolve([]))
      }
    };
    
    // Mock the extracted modules
    ValidationFirebaseHandler.prototype.saveValidationToFirestore = jest.fn(() => Promise.resolve('mock-doc-id'));
    ValidationFirebaseHandler.prototype.loadValidationHistoryFromFirestore = jest.fn(() => Promise.resolve([
      { id: 'mock-history-1', timestamp: new Date(), feedId: 'mock-feed-1' }
    ]));
    ValidationFirebaseHandler.prototype.fetchHistoryEntry = jest.fn(() => Promise.resolve({
      id: 'mock-history-1',
      timestamp: new Date(),
      feedId: 'mock-feed-1',
      issues: []
    }));
    
    ValidationPanelManager.prototype.handleViewDetails = jest.fn();
    ValidationPanelManager.prototype.createAndShowSummaryPanel = jest.fn();
    
    ValidationIssueManager.prototype.populateOfferIdMap = jest.fn();
    ValidationIssueManager.prototype.addMissingValidationIssues = jest.fn();
    ValidationIssueManager.prototype.markIssueAsFixed = jest.fn(() => true);
    
    // Create a fresh instance for each test
    uiManager = new ValidationUIManager(mockElements, mockManagers);
  });
  
  // Test constructor
  describe('constructor', () => {
    test('should initialize with provided elements and managers', () => {
      expect(uiManager.elements).toBe(mockElements);
      expect(uiManager.managers).toBe(mockManagers);
      expect(uiManager.validationResults).toEqual({});
    });
    
    test('should initialize extracted modules', () => {
      expect(uiManager.firebaseHandler).toBeInstanceOf(ValidationFirebaseHandler);
      expect(uiManager.panelManager).toBeInstanceOf(ValidationPanelManager);
      expect(uiManager.issueManager).toBeInstanceOf(ValidationIssueManager);
    });
    
    test('should warn if historyTableBody is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      new ValidationUIManager({}, mockManagers);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('History table body element not provided'));
    });
    
    test('should warn if feedManager is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      new ValidationUIManager(mockElements, {});
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('FeedManager not provided'));
    });
    
    test('should warn if errorManager is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      new ValidationUIManager(mockElements, { feedManager: {} });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ErrorManager not provided'));
    });
    
    test('should warn if authManager is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      new ValidationUIManager(mockElements, { feedManager: {}, errorManager: {} });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AuthManager not provided'));
    });
  });
  
  // Test triggerGMCValidation method
  describe('triggerGMCValidation', () => {
    test('should validate feed data and display results', async () => {
      await uiManager.triggerGMCValidation();
      
      expect(mockManagers.loadingManager.showLoading).toHaveBeenCalled();
      expect(mockManagers.gmcValidator.validate).toHaveBeenCalled();
      expect(uiManager.issueManager.populateOfferIdMap).toHaveBeenCalled();
      expect(uiManager.issueManager.addMissingValidationIssues).toHaveBeenCalled();
      expect(mockManagers.errorManager.showSuccess).toHaveBeenCalled();
      expect(mockManagers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should authenticate with GMC if not already authenticated', async () => {
      // Set GMC as not authenticated
      mockManagers.gmcApi.isAuthenticated = false;
      
      await uiManager.triggerGMCValidation();
      
      expect(mockManagers.gmcApi.authenticate).toHaveBeenCalled();
    });
    
    test('should run custom rule validation for Pro users', async () => {
      await uiManager.triggerGMCValidation();
      
      expect(mockManagers.customRuleValidator.fetchCustomRules).toHaveBeenCalled();
      expect(mockManagers.customRuleValidator.validate).toHaveBeenCalled();
    });
    
    test('should not run custom rule validation for non-Pro users', async () => {
      // Set user as non-Pro
      mockManagers.authManager.getAuthState.mockReturnValue({
        isProUser: false
      });
      
      await uiManager.triggerGMCValidation();
      
      expect(mockManagers.customRuleValidator.fetchCustomRules).not.toHaveBeenCalled();
      expect(mockManagers.customRuleValidator.validate).not.toHaveBeenCalled();
    });
    
    test('should handle errors gracefully', async () => {
      // Make gmcValidator.validate throw an error
      mockManagers.gmcValidator.validate.mockRejectedValue(new Error('Test error'));
      
      await uiManager.triggerGMCValidation();
      
      expect(mockManagers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      expect(mockManagers.monitor.logError).toHaveBeenCalled();
      expect(mockManagers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should show error if required managers are missing', async () => {
      // Remove required managers
      uiManager.managers.gmcValidator = null;
      
      await uiManager.triggerGMCValidation();
      
      expect(mockManagers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('Internal setup error'));
    });
    
    test('should show error if no feed data is available', async () => {
      // Make getCorrectedTableData return empty array
      mockManagers.feedManager.getCorrectedTableData.mockReturnValue([]);
      
      await uiManager.triggerGMCValidation();
      
      expect(mockManagers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('No feed data available'));
    });
  });
  
  // Test switchToValidationTab method
  describe('switchToValidationTab', () => {
    test('should switch to the validation tab', () => {
      uiManager.switchToValidationTab();
      
      expect(mockElements.validationTab.classList.add).toHaveBeenCalledWith('active');
    });
    
    test('should handle missing validation tab element', () => {
      uiManager.elements.validationTab = null;
      
      // Should not throw an error
      uiManager.switchToValidationTab();
    });
  });
  
  // Test runCustomRuleValidation method
  describe('runCustomRuleValidation', () => {
    test('should run custom rule validation and update results', async () => {
      const customRuleValidator = {
        fetchCustomRules: jest.fn(() => Promise.resolve()),
        validate: jest.fn(() => Promise.resolve([
          { rowIndex: 1, field: 'title', type: 'warning', message: 'Custom rule warning' }
        ]))
      };
      
      const feedData = [{ id: 'product-1' }];
      const finalIssues = [];
      let finalIsValid = true;
      
      // The method returns the updated validity status
      finalIsValid = await uiManager.runCustomRuleValidation(customRuleValidator, feedData, finalIssues, finalIsValid);
      
      expect(customRuleValidator.fetchCustomRules).toHaveBeenCalled();
      expect(customRuleValidator.validate).toHaveBeenCalledWith(feedData);
      expect(finalIssues).toHaveLength(1);
      expect(finalIsValid).toBe(false);
    });
    
    test('should handle errors gracefully', async () => {
      const customRuleValidator = {
        fetchCustomRules: jest.fn(() => Promise.reject(new Error('Test error'))),
        validate: jest.fn()
      };
      
      const feedData = [{ id: 'product-1' }];
      const finalIssues = [];
      let finalIsValid = true;
      
      await uiManager.runCustomRuleValidation(customRuleValidator, feedData, finalIssues, finalIsValid);
      
      expect(mockManagers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      expect(mockManagers.monitor.logOperation).toHaveBeenCalledWith(
        'custom_validation',
        'failed',
        expect.any(Object)
      );
    });
  });
  
  // Test displayValidationResults method
  describe('displayValidationResults', () => {
    test('should display validation results and update history', () => {
      const feedId = 'test-feed-id';
      const results = {
        isValid: true,
        totalProducts: 10,
        validProducts: 10,
        issues: []
      };
      
      uiManager.displayValidationResults(feedId, results);
      
      expect(uiManager.validationResults[feedId]).toBe(results);
      expect(uiManager.issueManager.populateOfferIdMap).toHaveBeenCalledWith(results.issues);
      expect(uiManager.issueManager.addMissingValidationIssues).toHaveBeenCalledWith(results);
    });
    
    test('should show error if results are not provided', () => {
      uiManager.displayValidationResults('test-feed-id', null);
      
      expect(mockManagers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('No data provided'));
    });
  });
  
  // Test saveResultsToFirestore method
  describe('saveResultsToFirestore', () => {
    test('should save results to Firestore', async () => {
      const feedId = 'test-feed-id';
      const results = {
        isValid: true,
        totalProducts: 10,
        validProducts: 10,
        issues: []
      };
      
      await uiManager.saveResultsToFirestore(feedId, results);
      
      expect(uiManager.firebaseHandler.saveValidationToFirestore).toHaveBeenCalledWith(feedId, results);
    });
    
    test('should handle errors gracefully', async () => {
      // Make saveValidationToFirestore throw an error
      uiManager.firebaseHandler.saveValidationToFirestore.mockRejectedValue(new Error('Test error'));
      
      const feedId = 'test-feed-id';
      const results = {
        isValid: true,
        totalProducts: 10,
        validProducts: 10,
        issues: []
      };
      
      await uiManager.saveResultsToFirestore(feedId, results);
      
      // Should not throw an error
    });
  });
  
  // Test loadValidationHistoryFromFirestore method
  describe('loadValidationHistoryFromFirestore', () => {
    test('should load validation history from Firestore', async () => {
      await uiManager.loadValidationHistoryFromFirestore();
      
      expect(uiManager.firebaseHandler.loadValidationHistoryFromFirestore).toHaveBeenCalled();
      expect(mockElements.historyTableBody.innerHTML).toBe('');
    });
    
    test('should handle errors gracefully', async () => {
      // Make loadValidationHistoryFromFirestore throw an error
      const originalMethod = uiManager.firebaseHandler.loadValidationHistoryFromFirestore;
      uiManager.firebaseHandler.loadValidationHistoryFromFirestore = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await uiManager.loadValidationHistoryFromFirestore();
      } catch (error) {
        // Ignore the error, we're testing the error handling
      }
      
      expect(mockElements.historyTableBody.innerHTML).toContain('Error loading history');
      expect(mockManagers.errorManager.showError).toHaveBeenCalled();
      expect(mockManagers.monitor.logError).toHaveBeenCalled();
      
      // Restore the original method
      uiManager.firebaseHandler.loadValidationHistoryFromFirestore = originalMethod;
    });
    
    test('should handle empty or null history entries', async () => {
      // Make loadValidationHistoryFromFirestore return null
      uiManager.firebaseHandler.loadValidationHistoryFromFirestore.mockResolvedValue(null);
      
      await uiManager.loadValidationHistoryFromFirestore();
      
      // Should not throw an error
    });
  });
  
  // Test populateHistoryTable method
  describe('populateHistoryTable', () => {
    test('should populate the history table with entries', () => {
      const historyEntries = [
        { id: 'mock-history-1', timestamp: new Date(), feedId: 'mock-feed-1', summary: { totalIssues: 0 } },
        { id: 'mock-history-2', timestamp: new Date(), feedId: 'mock-feed-2', summary: { totalIssues: 1 } }
      ];
      
      // Mock createHistoryTableRowElement
      uiManager.createHistoryTableRowElement = jest.fn(() => document.createElement('tr'));
      
      uiManager.populateHistoryTable(historyEntries, 'newest');
      
      expect(uiManager.createHistoryTableRowElement).toHaveBeenCalledTimes(2);
      expect(mockElements.historyTableBody.insertBefore).toHaveBeenCalledTimes(2);
    });
    
    test('should use different add methods based on sort order', () => {
      const historyEntries = [
        { id: 'mock-history-1', timestamp: new Date(), feedId: 'mock-feed-1', summary: { totalIssues: 0 } }
      ];
      
      // Mock createHistoryTableRowElement
      uiManager.createHistoryTableRowElement = jest.fn(() => document.createElement('tr'));
      
      // Test with 'newest' sort order
      uiManager.populateHistoryTable(historyEntries, 'newest');
      expect(mockElements.historyTableBody.insertBefore).toHaveBeenCalled();
      expect(mockElements.historyTableBody.appendChild).not.toHaveBeenCalled();
      
      // Reset mocks
      jest.clearAllMocks();
      
      // Test with 'oldest' sort order
      uiManager.populateHistoryTable(historyEntries, 'oldest');
      expect(mockElements.historyTableBody.appendChild).toHaveBeenCalled();
      expect(mockElements.historyTableBody.insertBefore).not.toHaveBeenCalled();
    });
  });
  
  // Test createHistoryTableRowElement method
  describe('createHistoryTableRowElement', () => {
    test('should create a history table row element', () => {
      const historyId = 'mock-history-1';
      const historyData = {
        timestamp: new Date(),
        feedId: 'mock-feed-1'
      };
      const displayResults = {
        isValid: true,
        totalIssues: 0,
        errorCount: 0,
        warningCount: 0
      };
      
      const row = uiManager.createHistoryTableRowElement(historyId, historyData, displayResults);
      
      expect(row).toBeDefined();
      expect(row.dataset.historyId).toBe(historyId);
      expect(row.innerHTML).toContain('mock-feed-1');
    });
    
    test('should handle different validity states', () => {
      // Test with valid results
      const validRow = uiManager.createHistoryTableRowElement('mock-history-1', { timestamp: new Date() }, { isValid: true });
      expect(validRow.innerHTML).toContain('Valid');
      
      // Test with invalid results
      const invalidRow = uiManager.createHistoryTableRowElement('mock-history-2', { timestamp: new Date() }, { isValid: false });
      expect(invalidRow.innerHTML).toContain('Issues Found');
    });
    
    test('should format issue counts correctly', () => {
      const row = uiManager.createHistoryTableRowElement('mock-history-1', { timestamp: new Date() }, {
        isValid: false,
        totalIssues: 5,
        errorCount: 2,
        warningCount: 3
      });
      
      expect(row.innerHTML).toContain('5 (2 errors, 3 warnings)');
    });
  });
  
  // Test displayHistorySummary method
  describe('displayHistorySummary', () => {
    test('should display a summary of a validation history entry', async () => {
      await uiManager.displayHistorySummary('mock-history-1');
      
      expect(mockManagers.loadingManager.showLoading).toHaveBeenCalled();
      expect(uiManager.firebaseHandler.fetchHistoryEntry).toHaveBeenCalledWith('mock-history-1');
      expect(uiManager.panelManager.createAndShowSummaryPanel).toHaveBeenCalled();
      expect(mockManagers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should handle errors gracefully', async () => {
      // Make fetchHistoryEntry throw an error
      uiManager.firebaseHandler.fetchHistoryEntry.mockRejectedValue(new Error('Test error'));
      
      await uiManager.displayHistorySummary('mock-history-1');
      
      expect(mockManagers.errorManager.showError).toHaveBeenCalled();
      expect(mockManagers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should show error if history data is not found', async () => {
      // Make fetchHistoryEntry return null
      uiManager.firebaseHandler.fetchHistoryEntry.mockResolvedValue(null);
      
      await uiManager.displayHistorySummary('mock-history-1');
      
      expect(mockManagers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('Could not find history data'));
    });
  });
  
  // Test getHistoryData method
  describe('getHistoryData', () => {
    test('should get history data from memory if available', async () => {
      // Add history data to memory
      uiManager.validationResults = {
        'feed-1': {
          historyId: 'mock-history-1',
          data: 'test-data'
        }
      };
      
      const result = await uiManager.getHistoryData('mock-history-1');
      
      expect(result).toBe(uiManager.validationResults['feed-1']);
      expect(uiManager.firebaseHandler.fetchHistoryEntry).not.toHaveBeenCalled();
    });
    
    test('should fetch history data from Firestore if not in memory', async () => {
      const result = await uiManager.getHistoryData('mock-history-1');
      
      expect(uiManager.firebaseHandler.fetchHistoryEntry).toHaveBeenCalledWith('mock-history-1');
      expect(result).toBeDefined();
    });
    
    test('should handle errors gracefully', async () => {
      // Make fetchHistoryEntry throw an error
      uiManager.firebaseHandler.fetchHistoryEntry.mockRejectedValue(new Error('Test error'));
      
      const result = await uiManager.getHistoryData('mock-history-1');
      
      expect(result).toBeNull();
    });
  });
  
  // Test updateValidationHistory method
  describe('updateValidationHistory', () => {
    test('should update the validation history table with a new validation run', () => {
      // Mock clearPlaceholderRows
      uiManager.clearPlaceholderRows = jest.fn();
      
      // Mock createHistoryTableRowElement
      uiManager.createHistoryTableRowElement = jest.fn(() => {
        const row = document.createElement('tr');
        row.querySelector = jest.fn(() => document.createElement('button'));
        return row;
      });
      
      // Mock setupViewIssuesButton
      uiManager.setupViewIssuesButton = jest.fn();
      
      const feedId = 'test-feed-id';
      const results = {
        isValid: true,
        issues: []
      };
      
      uiManager.updateValidationHistory(feedId, results);
      
      expect(uiManager.clearPlaceholderRows).toHaveBeenCalled();
      expect(uiManager.createHistoryTableRowElement).toHaveBeenCalled();
      expect(mockElements.historyTableBody.insertBefore).toHaveBeenCalled();
      expect(uiManager.setupViewIssuesButton).toHaveBeenCalled();
    });
    
    test('should do nothing if historyTableBody is not available', () => {
      uiManager.elements.historyTableBody = null;
      
      uiManager.updateValidationHistory('test-feed-id', { isValid: true, issues: [] });
      
      // Should not throw an error
    });
    
    test('should do nothing if results are not provided', () => {
      uiManager.updateValidationHistory('test-feed-id', null);
      
      // Should not throw an error
    });
  });
  
  // Test clearPlaceholderRows method
  describe('clearPlaceholderRows', () => {
    test('should clear placeholder rows from the history table', () => {
      // Mock querySelector to return a placeholder row
      mockElements.historyTableBody.querySelector.mockReturnValue({
        textContent: 'No validation history found'
      });
      
      uiManager.clearPlaceholderRows();
      
      expect(mockElements.historyTableBody.innerHTML).toBe('');
    });
    
    test('should not clear non-placeholder rows', () => {
      // Mock querySelector to return a non-placeholder row
      mockElements.historyTableBody.querySelector.mockReturnValue({
        textContent: 'Not a placeholder'
      });
      
      // Set some content in the table
      mockElements.historyTableBody.innerHTML = '<tr><td>Test</td></tr>';
      
      uiManager.clearPlaceholderRows();
      
      expect(mockElements.historyTableBody.innerHTML).toBe('<tr><td>Test</td></tr>');
    });
  });
  
  // Test setupViewIssuesButton method
  describe('setupViewIssuesButton', () => {
    test('should set up the view issues button for a row', () => {
      // Create a mock row element with a view details button
      const mockButton = {
        disabled: false,
        textContent: '',
        title: '',
        onclick: null
      };
      
      const mockRow = {
        querySelector: jest.fn(() => mockButton)
      };
      
      // Add validation results to memory
      uiManager.validationResults = {
        'test-feed-id': {
          isValid: true,
          issues: []
        }
      };
      
      uiManager.setupViewIssuesButton(mockRow, 'test-feed-id', { issues: [] });
      
      expect(mockButton.disabled).toBe(true);
      expect(mockButton.textContent).toBe('No Issues');
      
      // Test with issues
      uiManager.setupViewIssuesButton(mockRow, 'test-feed-id', { issues: [{ id: 'issue-1' }] });
      
      expect(mockButton.disabled).toBe(false);
      expect(mockButton.textContent).toBe('View Issues');
      
      // Trigger the onclick handler
      mockButton.onclick();
      
      expect(uiManager.panelManager.handleViewDetails).toHaveBeenCalledWith('test-feed-id', uiManager.validationResults['test-feed-id']);
    });
    
    test('should handle missing validation results', () => {
      // Create a mock row element with a view details button
      const mockButton = {
        disabled: false,
        textContent: '',
        title: '',
        onclick: null
      };
      
      const mockRow = {
        querySelector: jest.fn(() => mockButton)
      };
      
      // Empty validation results
      uiManager.validationResults = {};
      
      uiManager.setupViewIssuesButton(mockRow, 'test-feed-id', { issues: [{ id: 'issue-1' }] });
      
      // Trigger the onclick handler
      mockButton.onclick();
      
      expect(mockManagers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('Could not retrieve validation details'));
    });
  });
  
  // Test markIssueAsFixed method
  describe('markIssueAsFixed', () => {
    test('should delegate to the issue manager', () => {
      uiManager.markIssueAsFixed('offer-1', 'title');
      
      expect(uiManager.issueManager.markIssueAsFixed).toHaveBeenCalledWith(
        'offer-1',
        'title',
        uiManager.validationResults,
        uiManager.panelManager.activeValidationPanel
      );
    });
  });
});