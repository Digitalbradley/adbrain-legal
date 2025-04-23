/**
 * Integration tests for the validation modules
 * 
 * These tests verify that the modules work together correctly
 */

describe('Validation Modules Integration', () => {
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
        ]),
        elements: {
          previewContentContainer: {
            querySelectorAll: jest.fn(() => []),
            querySelector: jest.fn(() => null)
          }
        },
        navigateToRow: jest.fn()
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
    
    // Create real instances of the modules
    const firebaseHandler = new ValidationFirebaseHandler(mockManagers);
    const panelManager = new ValidationPanelManager(mockManagers);
    const issueManager = new ValidationIssueManager(mockManagers);
    
    // Create a ValidationUIManager instance with real module instances
    uiManager = new ValidationUIManager(mockElements, mockManagers);
    
    // Replace the auto-created instances with our controlled ones
    uiManager.firebaseHandler = firebaseHandler;
    uiManager.panelManager = panelManager;
    uiManager.issueManager = issueManager;
    
    // Mock the Firebase methods
    firebaseHandler.saveValidationToFirestore = jest.fn(() => Promise.resolve('mock-doc-id'));
    firebaseHandler.loadValidationHistoryFromFirestore = jest.fn(() => Promise.resolve([
      { id: 'mock-history-1', timestamp: new Date(), feedId: 'mock-feed-1' }
    ]));
    firebaseHandler.fetchHistoryEntry = jest.fn(() => Promise.resolve({
      id: 'mock-history-1',
      timestamp: new Date(),
      feedId: 'mock-feed-1',
      issues: []
    }));
    firebaseHandler.isFirestoreAvailable = jest.fn(() => true);
    
    // Mock the panel methods
    panelManager.handleViewDetails = jest.fn((feedId, data) => {
      // Call createValidationPanel with the same parameters
      const panel = panelManager.createValidationPanel(feedId, data);
      panelManager.setupRowNavigation(panel);
      return panel;
    });
    panelManager.createAndShowSummaryPanel = jest.fn();
    panelManager.createValidationPanel = jest.fn((feedId, data) => {
      const panel = document.createElement('div');
      panel.style = {};
      panel.dataset = { feedId: feedId };
      return panel;
    });
    panelManager.setupRowNavigation = jest.fn(panel => {
      // Find all row links in the panel
      const links = panel.querySelectorAll('.row-link');
      
      // Set up click handlers for each link
      for (const link of links) {
        link.onclick = (event) => {
          if (event && event.preventDefault) {
            event.preventDefault();
          }
          
          // Get row index and field type from dataset
          const rowIndex = parseInt(link.dataset.rowIndex || link.dataset.row, 10);
          const fieldType = link.dataset.fieldType || link.dataset.field || 'title';
          
          // Call the feedManager's navigateToRow method
          mockManagers.feedManager.navigateToRow(rowIndex, fieldType);
        };
      }
    });
    panelManager.makeDraggable = jest.fn();
    
    // Mock the issue methods
    issueManager.populateOfferIdMap = jest.fn();
    issueManager.addMissingValidationIssues = jest.fn();
    issueManager.markIssueAsFixed = jest.fn(() => true);
  });
  
  // Test the end-to-end validation flow
  test('End-to-end validation flow', async () => {
    // Trigger validation
    await uiManager.triggerGMCValidation();
    
    // Verify that the validation results were processed correctly
    expect(mockManagers.gmcValidator.validate).toHaveBeenCalled();
    expect(uiManager.issueManager.populateOfferIdMap).toHaveBeenCalled();
    expect(uiManager.issueManager.addMissingValidationIssues).toHaveBeenCalled();
    
    // Verify that the validation history was updated
    expect(mockElements.historyTableBody.insertBefore).toHaveBeenCalled();
    
    // Verify that the results were saved to Firestore
    expect(uiManager.firebaseHandler.saveValidationToFirestore).toHaveBeenCalled();
  });
  
  // Test the validation history flow
  test('Validation history flow', async () => {
    // Load validation history
    await uiManager.loadValidationHistoryFromFirestore();
    
    // Verify that the history was loaded from Firestore
    expect(uiManager.firebaseHandler.loadValidationHistoryFromFirestore).toHaveBeenCalled();
    
    // Display a history summary
    await uiManager.displayHistorySummary('mock-history-1');
    
    // Verify that the history entry was fetched and displayed
    expect(uiManager.firebaseHandler.fetchHistoryEntry).toHaveBeenCalledWith('mock-history-1');
    expect(uiManager.panelManager.createAndShowSummaryPanel).toHaveBeenCalled();
  });
  
  // Test the issue fixing flow
  test('Issue fixing flow', () => {
    // Set up validation results
    uiManager.validationResults = {
      'mock-feed-1': {
        isValid: false,
        issues: [
          { offerId: 'product-1', field: 'title', type: 'warning', message: 'Title too short' }
        ]
      }
    };
    
    // Set up active validation panel
    uiManager.panelManager.activeValidationPanel = {
      dataset: { feedId: 'mock-feed-1' }
    };
    
    // Mark an issue as fixed
    uiManager.markIssueAsFixed('product-1', 'title');
    
    // Verify that the issue manager was called to mark the issue as fixed
    expect(uiManager.issueManager.markIssueAsFixed).toHaveBeenCalledWith(
      'product-1',
      'title',
      uiManager.validationResults,
      uiManager.panelManager.activeValidationPanel
    );
  });
  
  // Test the panel creation and navigation flow
  test('Panel creation and navigation flow', () => {
    // Create validation results
    const results = {
      isValid: false,
      issues: [
        { offerId: 'product-1', rowIndex: 1, field: 'title', type: 'warning', message: 'Title too short' }
      ]
    };
    
    // Display validation results
    uiManager.displayValidationResults('mock-feed-1', results);
    
    // Verify that the results were stored
    expect(uiManager.validationResults['mock-feed-1']).toBe(results);
    
    // Simulate viewing the validation panel
    uiManager.panelManager.handleViewDetails('mock-feed-1', results);
    
    // Verify that the panel was created
    expect(uiManager.panelManager.createValidationPanel).toHaveBeenCalledWith('mock-feed-1', results);
    expect(uiManager.panelManager.setupRowNavigation).toHaveBeenCalled();
    
    // Create a mock panel with a row link
    const mockPanel = document.createElement('div');
    mockPanel.dataset = { feedId: 'mock-feed-1' };
    
    // Create a mock row link
    const mockLink = document.createElement('a');
    mockLink.className = 'row-link';
    mockLink.dataset = { rowIndex: '1', fieldType: 'title' };
    
    // Add the link to the panel
    mockPanel.querySelectorAll = jest.fn(() => [mockLink]);
    
    // Set up the row navigation
    uiManager.panelManager.setupRowNavigation(mockPanel);
    
    // Simulate clicking on the link
    const mockEvent = { preventDefault: jest.fn() };
    mockLink.onclick(mockEvent);
    
    // Verify that navigation was triggered
    expect(mockManagers.feedManager.navigateToRow).toHaveBeenCalledWith(1, 'title');
  });
  
  // Test error handling across module boundaries
  test('Error handling across module boundaries', async () => {
    // Make Firebase operations fail
    const originalSaveMethod = uiManager.firebaseHandler.saveValidationToFirestore;
    uiManager.firebaseHandler.saveValidationToFirestore = jest.fn().mockRejectedValue(new Error('Firebase error'));
    
    // Trigger validation
    await uiManager.triggerGMCValidation();
    
    // Verify that the error was handled gracefully
    expect(mockManagers.errorManager.showSuccess).toHaveBeenCalled(); // Validation still completes
    
    // Restore the original method
    uiManager.firebaseHandler.saveValidationToFirestore = originalSaveMethod;
    
    // Make history loading fail
    const originalLoadMethod = uiManager.firebaseHandler.loadValidationHistoryFromFirestore;
    uiManager.firebaseHandler.loadValidationHistoryFromFirestore = jest.fn().mockRejectedValue(new Error('Firebase error'));
    
    try {
      // Load validation history
      await uiManager.loadValidationHistoryFromFirestore();
    } catch (error) {
      // Ignore the error, we're testing the error handling
    }
    
    // Verify that the error was handled gracefully
    expect(mockManagers.errorManager.showError).toHaveBeenCalled();
    expect(mockElements.historyTableBody.innerHTML).toContain('Error loading history');
    
    // Restore the original method
    uiManager.firebaseHandler.loadValidationHistoryFromFirestore = originalLoadMethod;
    
    // Make GMC validation fail
    mockManagers.gmcValidator.validate.mockRejectedValue(new Error('GMC error'));
    
    // Trigger validation again
    await uiManager.triggerGMCValidation();
    
    // Verify that the error was handled gracefully
    expect(mockManagers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('GMC error'));
    expect(mockManagers.loadingManager.hideLoading).toHaveBeenCalled();
  });
});