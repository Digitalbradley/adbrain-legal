/**
 * Tests for ValidationFirebaseHandler
 */

// Import the module under test
// Note: In a real implementation, we would import the module directly
// but for this test, we'll use the global class defined in setup.js

describe('ValidationFirebaseHandler', () => {
  let firebaseHandler;
  let mockManagers;
  
  // Setup before each test
  beforeEach(() => {
    // Create mock managers
    mockManagers = {
      authManager: {
        getAuthState: jest.fn(() => ({
          firebaseAuthenticated: true,
          firebaseUserId: 'mock-user-id',
          isProUser: true
        }))
      },
      errorManager: {
        showError: jest.fn()
      },
      monitor: {
        logOperation: jest.fn(),
        logError: jest.fn()
      }
    };
    
    // Create a fresh instance for each test
    firebaseHandler = new ValidationFirebaseHandler(mockManagers);
    
    // Override isFirestoreAvailable to return true
    firebaseHandler.isFirestoreAvailable = jest.fn(() => true);
  });
  
  // Test constructor
  describe('constructor', () => {
    test('should initialize with provided managers', () => {
      expect(firebaseHandler.managers).toBe(mockManagers);
    });
    
    test('should warn if authManager is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      new ValidationFirebaseHandler({});
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('AuthManager not provided'));
    });
    
    test('should warn if errorManager is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      new ValidationFirebaseHandler({ authManager: {} });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ErrorManager not provided'));
    });
  });
  
  // Test saveValidationToFirestore method
  describe('saveValidationToFirestore', () => {
    test('should save validation results to Firestore', async () => {
      const feedId = 'test-feed-id';
      const results = {
        isValid: true,
        totalProducts: 10,
        validProducts: 10,
        issues: []
      };
      
      const docId = await firebaseHandler.saveValidationToFirestore(feedId, results);
      
      expect(docId).toBe('mock-doc-id');
      expect(mockManagers.monitor.logOperation).toHaveBeenCalledWith(
        'save_validation_history', 
        'success', 
        expect.any(Object)
      );
    });
    
    test('should return null if authManager is not available', async () => {
      firebaseHandler.managers.authManager = null;
      
      const result = await firebaseHandler.saveValidationToFirestore('test-feed-id', {});
      
      expect(result).toBeNull();
    });
    
    test('should return null if user is not authenticated with Firebase', async () => {
      mockManagers.authManager.getAuthState.mockReturnValue({
        firebaseAuthenticated: false
      });
      
      const result = await firebaseHandler.saveValidationToFirestore('test-feed-id', {});
      
      expect(result).toBeNull();
    });
    
    test('should handle errors gracefully', async () => {
      // Mock firebase.firestore to throw an error
      const originalFirestore = firebase.firestore;
      firebase.firestore = jest.fn(() => {
        throw new Error('Test error');
      });
      
      const result = await firebaseHandler.saveValidationToFirestore('test-feed-id', {});
      
      expect(result).toBeNull();
      expect(mockManagers.errorManager.showError).toHaveBeenCalledWith(
        'Failed to save validation history.'
      );
      expect(mockManagers.monitor.logError).toHaveBeenCalled();
      
      // Restore original firebase.firestore
      firebase.firestore = originalFirestore;
    });
  });
  
  // Test loadValidationHistoryFromFirestore method
  describe('loadValidationHistoryFromFirestore', () => {
    let mockHistoryTableBody;
    
    beforeEach(() => {
      mockHistoryTableBody = {
        innerHTML: '',
        appendChild: jest.fn()
      };
    });
    
    test('should load validation history from Firestore', async () => {
      const historyEntries = await firebaseHandler.loadValidationHistoryFromFirestore(
        mockHistoryTableBody, 
        25, 
        'newest'
      );
      
      expect(historyEntries).toHaveLength(3);
      expect(mockManagers.monitor.logOperation).toHaveBeenCalledWith(
        'load_validation_history', 
        'success', 
        expect.any(Object)
      );
    });
    
    test('should apply 7-day filter for non-pro users', async () => {
      // Mock a non-pro user
      mockManagers.authManager.getAuthState.mockReturnValue({
        firebaseAuthenticated: true,
        firebaseUserId: 'mock-user-id',
        isProUser: false
      });
      
      // Spy on the updateHistoryUIForProStatus method
      const updateUISpy = jest.spyOn(firebaseHandler, 'updateHistoryUIForProStatus');
      
      const historyEntries = await firebaseHandler.loadValidationHistoryFromFirestore(
        mockHistoryTableBody,
        25,
        'newest'
      );
      
      // Verify the 7-day filter was applied (only 2 entries for non-pro users)
      expect(updateUISpy).toHaveBeenCalledWith(false);
      expect(historyEntries).toHaveLength(2);
      
      updateUISpy.mockRestore();
    });
    
    test('should not apply 7-day filter for pro users', async () => {
      // Mock a pro user
      mockManagers.authManager.getAuthState.mockReturnValue({
        firebaseAuthenticated: true,
        firebaseUserId: 'mock-user-id',
        isProUser: true
      });
      
      // Spy on the updateHistoryUIForProStatus method
      const updateUISpy = jest.spyOn(firebaseHandler, 'updateHistoryUIForProStatus');
      
      const historyEntries = await firebaseHandler.loadValidationHistoryFromFirestore(
        mockHistoryTableBody,
        25,
        'newest'
      );
      
      // Verify the 7-day filter was NOT applied (3 entries for pro users)
      expect(updateUISpy).toHaveBeenCalledWith(true);
      expect(historyEntries).toHaveLength(3);
      
      updateUISpy.mockRestore();
    });
    
    test('should return null if history table body is not provided', async () => {
      const result = await firebaseHandler.loadValidationHistoryFromFirestore(null);
      
      expect(result).toBeNull();
    });
    
    test('should return null if validation history is disabled by feature flag', async () => {
      // Temporarily modify the feature flag
      const originalFeatures = window.FEATURES;
      window.FEATURES = { ...window.FEATURES, ENABLE_VALIDATION_HISTORY: false };
      
      const result = await firebaseHandler.loadValidationHistoryFromFirestore(mockHistoryTableBody);
      
      expect(result).toBeNull();
      
      // Restore original features
      window.FEATURES = originalFeatures;
    });
    
    test('should return null if authManager is not available', async () => {
      firebaseHandler.managers.authManager = null;
      
      const result = await firebaseHandler.loadValidationHistoryFromFirestore(mockHistoryTableBody);
      
      expect(result).toBeNull();
      expect(mockHistoryTableBody.innerHTML).toContain('Error: Auth service unavailable');
    });
    
    test('should return null if user is not authenticated with Firebase', async () => {
      mockManagers.authManager.getAuthState.mockReturnValue({
        firebaseAuthenticated: false
      });
      
      const result = await firebaseHandler.loadValidationHistoryFromFirestore(mockHistoryTableBody);
      
      expect(result).toBeNull();
      expect(mockHistoryTableBody.innerHTML).toContain('Sign in with Firebase');
    });
    
    test('should handle errors gracefully', async () => {
      // Mock firebase.firestore to throw an error
      const originalFirestore = firebase.firestore;
      firebase.firestore = jest.fn(() => {
        throw new Error('Test error');
      });
      
      const result = await firebaseHandler.loadValidationHistoryFromFirestore(mockHistoryTableBody);
      
      expect(result).toBeNull();
      expect(mockHistoryTableBody.innerHTML).toContain('Error loading history');
      expect(mockManagers.errorManager.showError).toHaveBeenCalled();
      expect(mockManagers.monitor.logError).toHaveBeenCalled();
      
      // Restore original firebase.firestore
      firebase.firestore = originalFirestore;
    });
  });
  
  // Test fetchHistoryEntry method
  describe('fetchHistoryEntry', () => {
    test('should fetch a specific history entry from Firestore', async () => {
      const historyData = await firebaseHandler.fetchHistoryEntry('mock-history-1');
      
      expect(historyData).toBeDefined();
      expect(historyData.id).toBe('mock-history-1');
      expect(historyData.feedId).toBe('mock-feed-1');
    });
    
    test('should throw an error if authManager is not available', async () => {
      firebaseHandler.managers.authManager = null;
      
      await expect(firebaseHandler.fetchHistoryEntry('mock-history-1'))
        .rejects.toThrow('AuthManager not available');
    });
    
    test('should throw an error if user is not authenticated with Firebase', async () => {
      mockManagers.authManager.getAuthState.mockReturnValue({
        firebaseAuthenticated: false
      });
      
      await expect(firebaseHandler.fetchHistoryEntry('mock-history-1'))
        .rejects.toThrow('User not authenticated with Firebase');
    });
  });
  
  // Test mock data methods
  describe('mock data methods', () => {
    test('loadMockValidationHistory should return mock history data', () => {
      const mockHistoryTableBody = { innerHTML: '' };
      
      const result = firebaseHandler.loadMockValidationHistory(mockHistoryTableBody, 2, 'newest');
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBeDefined();
      expect(result[0].feedId).toBeDefined();
    });
    
    test('getMockHistoryEntry should return a specific mock history entry', () => {
      const result = firebaseHandler.getMockHistoryEntry('mock-history-1');
      
      expect(result).toBeDefined();
      expect(result.id).toBe('mock-history-1');
    });
    
    test('getMockHistoryData should return an array of mock history entries', () => {
      const result = firebaseHandler.getMockHistoryData();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
  
  // Test updateHistoryUIForProStatus method
  describe('updateHistoryUIForProStatus', () => {
    beforeEach(() => {
      // Create a mock DOM element for the upgrade prompt
      document.body.innerHTML = `
        <div id="historyLimitPrompt" style="display: none;">
          <p>Free accounts can only access the last 7 days of history.</p>
          <button class="upgrade-button">Upgrade to Pro</button>
        </div>
      `;
      
      // Mock document.getElementById to return the actual element
      document.getElementById = jest.fn(id => {
        if (id === 'historyLimitPrompt') {
          return document.querySelector('#historyLimitPrompt');
        }
        return null;
      });
    });
    
    afterEach(() => {
      // Clean up
      document.body.innerHTML = '';
      // Restore the original mock
      document.getElementById = jest.fn(() => null);
    });
    
    test('should show upgrade prompt for non-pro users', () => {
      firebaseHandler.updateHistoryUIForProStatus(false);
      
      const upgradePrompt = document.getElementById('historyLimitPrompt');
      expect(upgradePrompt.style.display).toBe('block');
      
      // Check if date range indicator is added
      const dateRangeIndicator = upgradePrompt.querySelector('.date-range-indicator');
      expect(dateRangeIndicator).not.toBeNull();
      expect(dateRangeIndicator.textContent).toContain('Free account limitation');
    });
    
    test('should hide upgrade prompt for pro users', () => {
      firebaseHandler.updateHistoryUIForProStatus(true);
      
      const upgradePrompt = document.getElementById('historyLimitPrompt');
      expect(upgradePrompt.style.display).toBe('none');
    });
    
    test('should handle missing upgrade prompt element', () => {
      // Remove the upgrade prompt element
      document.body.innerHTML = '';
      
      // Reset the getElementById mock to return null
      document.getElementById = jest.fn(() => null);
      
      // Mock console.warn
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // This should not throw an error
      firebaseHandler.updateHistoryUIForProStatus(false);
      
      // Verify warning was logged
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('History limit prompt element'));
      
      // Restore console.warn
      consoleWarnSpy.mockRestore();
    });
  });
  
  // Test utility methods
  describe('utility methods', () => {
    test('isFirestoreAvailable should check if Firestore is available', () => {
      // Restore the original implementation for this test
      firebaseHandler.isFirestoreAvailable = ValidationFirebaseHandler.prototype.isFirestoreAvailable;
      
      // Test when firebase is defined
      expect(firebaseHandler.isFirestoreAvailable()).toBe(true);
      
      // Test when firebase is undefined
      const originalFirebase = global.firebase;
      global.firebase = undefined;
      expect(firebaseHandler.isFirestoreAvailable()).toBe(false);
      
      // Restore firebase
      global.firebase = originalFirebase;
    });
    
    test('tryAccessFirestoreViaBackground should attempt to access Firestore via background page', async () => {
      await firebaseHandler.tryAccessFirestoreViaBackground();
      
      // This should not throw an error
      expect(chrome.runtime.getBackgroundPage).toHaveBeenCalled();
    });
  });
});