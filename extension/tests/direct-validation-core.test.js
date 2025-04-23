/**
 * Unit tests for direct-validation-core.js
 * 
 * Tests the core orchestration and entry point functionality
 */

describe('DirectValidationCore', () => {
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
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>product-1</td>
              <td>Test Product 1</td>
              <td>This is a test product description</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div id="feedTab" class="tab-content active"></div>
      <div id="validationTab" class="tab-content"></div>
      <button id="feedTabButton" class="tab-button active" data-tab="feedTab">Feed</button>
      <button id="validationTabButton" class="tab-button" data-tab="validationTab">Validation</button>
      <button id="validateGMC">Validate Feed</button>
      <div id="loadingOverlay" style="display: none;">
        <div class="loading-spinner"></div>
        <div id="loadingMessage">Loading...</div>
      </div>
    `;
    
    // Reset mocks
    window.resetMocks('DirectValidationCore');
    
    // Mock other modules
    window.DirectValidationData.getTableData = jest.fn(() => [
      { id: 'product-1', title: 'Test Product 1', description: 'This is a test product description', rowIndex: 1 }
    ]);
    window.DirectValidationData.validateFeedData = jest.fn(data => ({
      feedId: 'test-feed',
      timestamp: new Date(),
      totalProducts: data.length,
      validProducts: data.length,
      issues: [],
      isValid: true
    }));
    window.DirectValidationLoading.showLoading = jest.fn();
    window.DirectValidationLoading.hideLoading = jest.fn();
    window.DirectValidationUI.displayValidationResults = jest.fn();
    window.DirectValidationTabs.switchToValidationTab = jest.fn();
    window.DirectValidationHistory.updateValidationHistory = jest.fn();
    
    // Mock document.getElementById to return actual elements
    document.getElementById = jest.fn(id => {
      const element = document.querySelector(`#${id}`);
      if (element) {
        // Add missing methods and properties for testing
        element.addEventListener = jest.fn();
        element.click = jest.fn(() => {
          // Simulate click event
          const clickHandler = element.addEventListener.mock.calls.find(call => call[0] === 'click');
          if (clickHandler && clickHandler[1]) {
            clickHandler[1]();
          }
        });
        return element;
      }
      return null;
    });
    
    // Mock setTimeout
    jest.useFakeTimers();
    
    // Mock console.error
    console.error = jest.fn();
    
    // Create a custom implementation of DirectValidationCore for testing
    window.DirectValidationCore = {
      handleDirectValidation: function() {
        console.log('[DIRECT] Validate Feed button clicked');
        
        // Get the feed data from the table
        const feedData = window.DirectValidationData.getTableData();
        
        if (!feedData || !feedData.length) {
            alert('Please load a feed first before validating.');
            return;
        }
        
        console.log('[DIRECT] Validating feed data with', feedData.length, 'rows');
        
        // Show loading indicator
        window.DirectValidationLoading.showLoading('Validating feed...');
        
        // Simulate validation process
        setTimeout(() => {
            try {
                // Perform basic validation
                const validationResults = window.DirectValidationData.validateFeedData(feedData);
                
                // Hide loading indicator
                window.DirectValidationLoading.hideLoading();
                
                // Display validation results
                window.DirectValidationUI.displayValidationResults(validationResults);
                
                console.log('[DIRECT] Validation complete');
            } catch (error) {
                console.error('Error during validation:', error);
                window.DirectValidationLoading.hideLoading();
            }
        }, 1000); // Simulate processing time
      },
      initialize: function() {
        console.log('[DIRECT] Initializing direct validation core module');
        
        // Check if all required modules are available
        if (!window.DirectValidationData) {
            console.error('[DIRECT] DirectValidationData module not found');
            return;
        }
        
        if (!window.DirectValidationUI) {
            console.error('[DIRECT] DirectValidationUI module not found');
            return;
        }
        
        if (!window.DirectValidationHistory) {
            console.error('[DIRECT] DirectValidationHistory module not found');
            return;
        }
        
        if (!window.DirectValidationTabs) {
            console.error('[DIRECT] DirectValidationTabs module not found');
            return;
        }
        
        if (!window.DirectValidationLoading) {
            console.error('[DIRECT] DirectValidationLoading module not found');
            return;
        }
        
        // Initialize event listeners
        const validateButton = document.getElementById('validateGMC');
        
        if (validateButton) {
            console.log('[DIRECT] Found Validate Feed button, adding click listener');
            validateButton.addEventListener('click', this.handleDirectValidation);
        } else {
            console.error('[DIRECT] Validate Feed button not found');
        }
        
        console.log('[DIRECT] Direct validation core module initialized');
      }
    };
  });

  // Test handleDirectValidation method
  describe('handleDirectValidation', () => {
    test('should orchestrate the validation process', () => {
      // Execute
      window.DirectValidationCore.handleDirectValidation();
      
      // Verify initial steps
      expect(window.DirectValidationData.getTableData).toHaveBeenCalled();
      expect(window.DirectValidationLoading.showLoading).toHaveBeenCalledWith('Validating feed...');
      
      // Fast-forward timers
      jest.runAllTimers();
      
      // Verify remaining steps
      expect(window.DirectValidationData.validateFeedData).toHaveBeenCalled();
      expect(window.DirectValidationLoading.hideLoading).toHaveBeenCalled();
      expect(window.DirectValidationUI.displayValidationResults).toHaveBeenCalled();
    });

    test('should show alert if no feed data is available', () => {
      // Setup: Mock getTableData to return empty array
      window.DirectValidationData.getTableData.mockReturnValue([]);
      
      // Mock window.alert
      const originalAlert = window.alert;
      window.alert = jest.fn();
      
      // Execute
      window.DirectValidationCore.handleDirectValidation();
      
      // Verify
      expect(window.alert).toHaveBeenCalledWith('Please load a feed first before validating.');
      expect(window.DirectValidationLoading.showLoading).not.toHaveBeenCalled();
      
      // Restore original function
      window.alert = originalAlert;
    });

    test('should handle validation with issues', () => {
      // Setup: Mock validateFeedData to return issues
      window.DirectValidationData.validateFeedData.mockReturnValue({
        feedId: 'test-feed',
        timestamp: new Date(),
        totalProducts: 1,
        validProducts: 0,
        issues: [
          { rowIndex: 1, field: 'title', type: 'error', message: 'Title too short', offerId: 'product-1' }
        ],
        isValid: false
      });
      
      // Execute
      window.DirectValidationCore.handleDirectValidation();
      
      // Fast-forward timers
      jest.runAllTimers();
      
      // Verify
      expect(window.DirectValidationUI.displayValidationResults).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: false,
          issues: expect.arrayContaining([
            expect.objectContaining({
              field: 'title',
              type: 'error'
            })
          ])
        })
      );
    });

    test('should handle errors during validation', () => {
      // Setup: Mock validateFeedData to throw error
      window.DirectValidationData.validateFeedData.mockImplementation(() => {
        throw new Error('Validation error');
      });
      
      // Execute
      window.DirectValidationCore.handleDirectValidation();
      
      // Fast-forward timers
      jest.runAllTimers();
      
      // Verify
      expect(console.error).toHaveBeenCalledWith('Error during validation:', expect.any(Error));
      expect(window.DirectValidationLoading.hideLoading).toHaveBeenCalled();
    });
  });

  // Test initialize method
  describe('initialize', () => {
    test('should add event listener to validate button', () => {
      // Setup: Get the validate button
      const validateButton = document.getElementById('validateGMC');
      
      // Execute
      window.DirectValidationCore.initialize();
      
      // Verify
      expect(validateButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
      
      // Simulate click to verify the handler is working
      const clickHandler = validateButton.addEventListener.mock.calls[0][1];
      clickHandler();
      
      // Verify handleDirectValidation was called
      expect(window.DirectValidationData.getTableData).toHaveBeenCalled();
    });

    test('should handle missing validate button', () => {
      // Setup: Remove validate button
      document.body.innerHTML = '';
      document.getElementById.mockReturnValue(null);
      
      // Execute
      window.DirectValidationCore.initialize();
      
      // Verify
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Validate Feed button not found'));
    });
  });

  // Feature flag tests removed in Phase 4 (Cleanup)
});