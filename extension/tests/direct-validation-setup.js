/**
 * Setup file for Direct Validation module tests
 * 
 * This file sets up the testing environment for the direct validation modules:
 * - Sets up the DOM environment
 * - Mocks browser APIs and DOM elements
 */

// Import testing libraries
require('@testing-library/jest-dom');

// Feature flags have been removed in Phase 4 (Cleanup)
// Initialize empty feature flags object for backward compatibility
window.DIRECT_VALIDATION_FLAGS = {};

// Mock DOM elements
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
  <div id="feedTab" class="tab-content active"></div>
  <div id="validationTab" class="tab-content"></div>
  <button id="feedTabButton" class="tab-button active" data-tab="feedTab">Feed</button>
  <button id="validationTabButton" class="tab-button" data-tab="validationTab">Validation</button>
  <button id="validateGMC">Validate Feed</button>
  <div id="loadingOverlay" style="display: none;">
    <div class="loading-spinner"></div>
    <div id="loadingMessage">Loading...</div>
  </div>
  <div id="validationHistoryTable">
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Feed ID</th>
          <th>Status</th>
          <th>Issues</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="historyTableBody"></tbody>
    </table>
  </div>
`;

// Mock console methods to reduce noise during tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Helper to restore console
global.restoreConsole = function() {
  global.console = originalConsole;
};

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

// Mock document methods that might not be fully implemented in jsdom
const originalGetElementById = document.getElementById;
document.getElementById = jest.fn(id => {
  const element = document.querySelector(`#${id}`);
  if (element) {
    // Add missing methods and properties for testing
    if (!element.addEventListener) {
      element.addEventListener = jest.fn();
    }
    if (!element.click) {
      element.click = jest.fn(() => {
        // Simulate click event
        const clickHandler = element.addEventListener.mock.calls.find(call => call[0] === 'click');
        if (clickHandler && clickHandler[1]) {
          clickHandler[1]();
        }
      });
    }
    return element;
  }
  return null;
});

// Create mock modules to avoid dependencies between tests
window.mockModules = function(currentModule) {
  // Mock DirectValidationLoading
  if (currentModule !== 'DirectValidationLoading') {
    window.DirectValidationLoading = {
      showLoading: jest.fn(),
      hideLoading: jest.fn()
    };
  }
  
  // Mock DirectValidationData
  if (currentModule !== 'DirectValidationData') {
    window.DirectValidationData = {
      getTableData: jest.fn(() => [
        { id: 'product-1', title: 'Test Product 1', description: 'This is a test product description', price: '19.99', image_link: 'https://example.com/image1.jpg', link: 'https://example.com/product1', rowIndex: 1 },
        { id: 'product-2', title: 'Test Product 2 with a longer title that meets requirements', description: 'This is a test product description that is long enough to meet the minimum character requirements for descriptions in the Google Merchant Center.', price: '29.99', image_link: 'https://example.com/image2.jpg', link: 'https://example.com/product2', rowIndex: 2 }
      ]),
      validateFeedData: jest.fn(data => ({
        feedId: 'test-feed-id',
        timestamp: new Date(),
        totalProducts: data.length,
        validProducts: 1,
        issues: [
          { rowIndex: 1, field: 'title', type: 'error', message: 'Title too short (14 chars). Minimum 30 characters recommended.', offerId: 'product-1' }
        ],
        isValid: false
      }))
    };
  }
  
  // Mock DirectValidationUI
  if (currentModule !== 'DirectValidationUI') {
    window.DirectValidationUI = {
      displayValidationResults: jest.fn(),
      formatIssuesList: jest.fn(() => '<ul><li>Issue 1</li><li>Issue 2</li></ul>'),
      setupRowNavigation: jest.fn(),
      displayValidationDetailsPopup: jest.fn(),
      makeDraggable: jest.fn()
    };
  }
  
  // Mock DirectValidationHistory
  if (currentModule !== 'DirectValidationHistory') {
    window.DirectValidationHistory = {
      updateValidationHistory: jest.fn(),
      createValidationHistoryTable: jest.fn(),
      updateValidationHistoryWithElement: jest.fn(),
      loadValidationHistory: jest.fn(),
      createHistoryRow: jest.fn(),
      setupViewDetailsButton: jest.fn()
    };
  }
  
  // Mock DirectValidationTabs
  if (currentModule !== 'DirectValidationTabs') {
    window.DirectValidationTabs = {
      switchToValidationTab: jest.fn(),
      switchToFeedTab: jest.fn()
    };
  }
  
  // Mock DirectValidationCore
  if (currentModule !== 'DirectValidationCore') {
    window.DirectValidationCore = {
      handleDirectValidation: jest.fn(),
      initialize: jest.fn()
    };
  }
};

// Helper to reset mocks between tests
window.resetMocks = function(currentModule) {
  jest.clearAllMocks();
  window.mockModules(currentModule);
};

// Initialize mocks - by default, mock all modules
window.mockModules();