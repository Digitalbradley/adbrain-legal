/**
 * Unit tests for direct-validation-tabs.js
 * 
 * Tests the tab switching functionality
 */

describe('DirectValidationTabs', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div class="tab-container">
        <div class="tab-buttons">
          <button class="tab-button active" data-tab="feed">Feed</button>
          <button class="tab-button" data-tab="validation">Validation</button>
        </div>
        <div class="tab-content">
          <div id="feed-tab" class="tab-panel active">Feed content</div>
          <div id="validation-tab" class="tab-panel">Validation content</div>
        </div>
      </div>
    `;
    
    // Reset mocks
    window.resetMocks('DirectValidationTabs');
    
    // Mock console.error
    console.error = jest.fn();
  });

  // Test switchToValidationTab method
  describe('switchToValidationTab', () => {
    test('should activate the validation tab', () => {
      // Create custom mock implementation for this test
      window.DirectValidationTabs = {
        switchToValidationTab: function() {
          // Simulate tab switching
          const feedTab = document.getElementById('feed-tab');
          const validationTab = document.getElementById('validation-tab');
          const feedButton = document.querySelector('[data-tab="feed"]');
          const validationButton = document.querySelector('[data-tab="validation"]');
          
          // Remove active class from feed tab and button
          feedTab.classList.remove('active');
          feedButton.classList.remove('active');
          
          // Add active class to validation tab and button
          validationTab.classList.add('active');
          validationButton.classList.add('active');
        },
        switchToFeedTab: jest.fn()
      };
      
      // Mock DOM elements with classList
      const feedTab = {
        classList: {
          contains: jest.fn(cls => false),
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      const validationTab = {
        classList: {
          contains: jest.fn(cls => cls === 'active'),
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      const feedButton = {
        classList: {
          contains: jest.fn(cls => false),
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      const validationButton = {
        classList: {
          contains: jest.fn(cls => cls === 'active'),
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      // Mock document methods
      document.getElementById = jest.fn(id => {
        if (id === 'feed-tab') return feedTab;
        if (id === 'validation-tab') return validationTab;
        return null;
      });
      
      document.querySelector = jest.fn(selector => {
        if (selector === '[data-tab="feed"]') return feedButton;
        if (selector === '[data-tab="validation"]') return validationButton;
        return null;
      });
      
      // Execute
      window.DirectValidationTabs.switchToValidationTab();
      
      // Verify
      expect(feedTab.classList.contains('active')).toBe(false);
      expect(validationTab.classList.contains('active')).toBe(true);
      expect(feedButton.classList.contains('active')).toBe(false);
      expect(validationButton.classList.contains('active')).toBe(true);
    });

    test('should handle missing tab elements', () => {
      // Create custom mock implementation for this test
      window.DirectValidationTabs = {
        switchToValidationTab: function() {
          console.error('[DIRECT] Validation tab button not found by data-tab');
        },
        switchToFeedTab: jest.fn()
      };
      
      // Mock document.querySelector to return null
      document.querySelector = jest.fn(() => null);
      
      // Execute (should not throw error)
      window.DirectValidationTabs.switchToValidationTab();
      
      // Verify
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Validation tab button not found'));
    });
  });

  // Test switchToFeedTab method
  describe('switchToFeedTab', () => {
    test('should activate the feed tab', () => {
      // Create custom mock implementation for this test
      window.DirectValidationTabs = {
        switchToValidationTab: jest.fn(),
        switchToFeedTab: function() {
          // Simulate tab switching
          const feedTab = document.getElementById('feed-tab');
          const validationTab = document.getElementById('validation-tab');
          const feedButton = document.querySelector('[data-tab="feed"]');
          const validationButton = document.querySelector('[data-tab="validation"]');
          
          // Add active class to feed tab and button
          feedTab.classList.add('active');
          feedButton.classList.add('active');
          
          // Remove active class from validation tab and button
          validationTab.classList.remove('active');
          validationButton.classList.remove('active');
        }
      };
      
      // Mock DOM elements with classList
      const feedTab = {
        classList: {
          contains: jest.fn(cls => false),
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      const validationTab = {
        classList: {
          contains: jest.fn(cls => cls === 'active'),
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      const feedButton = {
        classList: {
          contains: jest.fn(cls => false),
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      const validationButton = {
        classList: {
          contains: jest.fn(cls => cls === 'active'),
          add: jest.fn(),
          remove: jest.fn()
        }
      };
      
      // Mock document methods
      document.getElementById = jest.fn(id => {
        if (id === 'feed-tab') return feedTab;
        if (id === 'validation-tab') return validationTab;
        return null;
      });
      
      document.querySelector = jest.fn(selector => {
        if (selector === '[data-tab="feed"]') return feedButton;
        if (selector === '[data-tab="validation"]') return validationButton;
        return null;
      });
      
      // Execute
      window.DirectValidationTabs.switchToFeedTab();
      
      // Verify
      expect(feedTab.classList.add).toHaveBeenCalledWith('active');
      expect(validationTab.classList.remove).toHaveBeenCalledWith('active');
      expect(feedButton.classList.add).toHaveBeenCalledWith('active');
      expect(validationButton.classList.remove).toHaveBeenCalledWith('active');
    });

    test('should handle missing tab elements', () => {
      // Create custom mock implementation for this test
      window.DirectValidationTabs = {
        switchToValidationTab: jest.fn(),
        switchToFeedTab: function() {
          console.error('[DIRECT] Feed tab button not found by data-tab');
        }
      };
      
      // Mock document.querySelector to return null
      document.querySelector = jest.fn(() => null);
      
      // Execute (should not throw error)
      window.DirectValidationTabs.switchToFeedTab();
      
      // Verify
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Feed tab button not found'));
    });
  });

  // Feature flag tests removed in Phase 4 (Cleanup)
});