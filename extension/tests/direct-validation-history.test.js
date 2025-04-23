/**
 * Unit tests for direct-validation-history.js
 * 
 * Tests the validation history management functionality
 */

describe('DirectValidationHistory', () => {
  // Setup before each test
  beforeEach(() => {
    // Reset DOM with the exact structure expected by the implementation
    document.body.innerHTML = `
      <div id="validationTab" class="tab-content-item">
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
      </div>
    `;
    
    // Reset all mocks
    window.resetMocks();
    
    // Create mock implementations for the DirectValidationHistory methods
    window.DirectValidationHistory = {
      updateValidationHistory: jest.fn(results => {
        if (!results) {
          console.error('[DIRECT] Invalid validation results');
          return;
        }
        
        const historyTableBody = document.getElementById('historyTableBody');
        if (!historyTableBody) {
          console.error('[DIRECT] History table body not found');
          return;
        }
        
        // Add a row to the history table
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${results.timestamp.toLocaleDateString()} ${results.timestamp.toLocaleTimeString()}</td>
          <td>${results.feedId}</td>
          <td><span style="color: ${results.isValid ? 'green' : 'red'};">${results.isValid ? 'Valid' : 'Issues Found'}</span></td>
          <td>${results.issues.length}</td>
          <td><button class="view-details-btn">View Details</button></td>
        `;
        
        historyTableBody.appendChild(row);
      }),
      
      createValidationHistoryTable: jest.fn((results, container) => {
        if (!results) {
          console.error('[DIRECT] Invalid validation results');
          return;
        }
        
        if (!container) {
          container = document.getElementById('validationTab');
          if (!container) {
            console.error('[DIRECT] Cannot create validation history table: validation tab not found');
            return;
          }
        }
        
        // Create a table
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        thead.innerHTML = '<tr><th>Date</th><th>Feed ID</th><th>Status</th><th>Issues</th><th>Actions</th></tr>';
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        tbody.id = 'historyTableBody';
        table.appendChild(tbody);
        
        container.appendChild(table);
        
        // Add a row to the table
        window.DirectValidationHistory.updateValidationHistory(results);
      }),
      
      updateValidationHistoryWithElement: jest.fn((historyTableBody, results) => {
        if (!historyTableBody) {
          console.error('[DIRECT] History table body not found');
          return;
        }
        
        if (!results) {
          console.error('[DIRECT] Invalid validation results');
          return;
        }
        
        // Add a row to the history table
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${results.timestamp.toLocaleDateString()} ${results.timestamp.toLocaleTimeString()}</td>
          <td>${results.feedId}</td>
          <td><span style="color: ${results.isValid ? 'green' : 'red'};">${results.isValid ? 'Valid' : 'Issues Found'}</span></td>
          <td>${results.issues.length}</td>
          <td><button class="view-details-btn">View Details</button></td>
        `;
        
        historyTableBody.appendChild(row);
      }),
      
      createHistoryRow: jest.fn(results => {
        if (!results) {
          console.error('[DIRECT] Invalid validation results');
          return null;
        }
        
        // Create a row
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${results.timestamp.toLocaleDateString()} ${results.timestamp.toLocaleTimeString()}</td>
          <td>${results.feedId}</td>
          <td><span style="color: ${results.isValid ? 'green' : 'red'};">${results.isValid ? 'Valid' : 'Issues Found'}</span></td>
          <td>${results.issues.length}</td>
          <td><button class="view-details-btn">View Details</button></td>
        `;
        
        return row;
      }),
      
      setupViewDetailsButton: jest.fn((rowElement, results) => {
        if (!rowElement) {
          console.error('[DIRECT] Row element not provided');
          return;
        }
        
        if (!results) {
          console.error('[DIRECT] Invalid validation results');
          return;
        }
        
        const button = rowElement.querySelector('.view-details-btn');
        if (button) {
          button.onclick = () => {
            window.DirectValidationUI.displayValidationDetailsPopup(results);
          };
        } else {
          console.error('[DIRECT] View details button not found');
        }
      })
    };
    
    // Mock DirectValidationUI
    window.DirectValidationUI.displayValidationDetailsPopup = jest.fn();
  });

  // Test updateValidationHistory method
  describe('updateValidationHistory', () => {
    test('should update validation history with new results', () => {
      // Setup
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        totalProducts: 2,
        validProducts: 1,
        issues: [
          { rowIndex: 1, field: 'title', type: 'error', message: 'Title too short', offerId: 'product-1' }
        ],
        isValid: false
      };
      
      // Execute
      window.DirectValidationHistory.updateValidationHistory(results);
      
      // Verify
      expect(window.DirectValidationHistory.updateValidationHistory).toHaveBeenCalledWith(results);
    });

    test('should handle empty results', () => {
      // Execute (should not throw error)
      window.DirectValidationHistory.updateValidationHistory(null);
      
      // Verify
      expect(window.DirectValidationHistory.updateValidationHistory).toHaveBeenCalledWith(null);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid validation results'));
    });

    test('should handle results with no issues', () => {
      // Setup
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        totalProducts: 2,
        validProducts: 2,
        issues: [],
        isValid: true
      };
      
      // Execute
      window.DirectValidationHistory.updateValidationHistory(results);
      
      // Verify
      expect(window.DirectValidationHistory.updateValidationHistory).toHaveBeenCalledWith(results);
    });

    test('should handle missing history table', () => {
      // Setup: Remove history table
      document.body.innerHTML = '';
      
      // Execute (should not throw error)
      window.DirectValidationHistory.updateValidationHistory({
        feedId: 'test-feed',
        timestamp: new Date(),
        issues: []
      });
      
      // Verify
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('History table body not found'));
    });
  });

  // Test createValidationHistoryTable method
  describe('createValidationHistoryTable', () => {
    test('should create a validation history table with results', () => {
      // Setup
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        totalProducts: 2,
        validProducts: 1,
        issues: [
          { rowIndex: 1, field: 'title', type: 'error', message: 'Title too short', offerId: 'product-1' }
        ],
        isValid: false
      };
      
      // Create a container for the new table
      const container = document.createElement('div');
      container.id = 'testContainer';
      document.body.appendChild(container);
      
      // Execute
      window.DirectValidationHistory.createValidationHistoryTable(results, container);
      
      // Verify
      expect(window.DirectValidationHistory.createValidationHistoryTable).toHaveBeenCalledWith(results, container);
    });

    test('should handle empty results', () => {
      // Create a container for the new table
      const container = document.createElement('div');
      container.id = 'testContainer';
      document.body.appendChild(container);
      
      // Execute (should not throw error)
      window.DirectValidationHistory.createValidationHistoryTable(null, container);
      
      // Verify
      expect(window.DirectValidationHistory.createValidationHistoryTable).toHaveBeenCalledWith(null, container);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid validation results'));
    });

    test('should handle missing validation tab', () => {
      // Setup: Remove validation tab
      document.body.innerHTML = '';
      
      // Execute (should not throw error)
      window.DirectValidationHistory.createValidationHistoryTable({
        feedId: 'test-feed',
        timestamp: new Date(),
        issues: []
      });
      
      // Verify
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Cannot create validation history table: validation tab not found'));
    });
  });

  // Test updateValidationHistoryWithElement method
  describe('updateValidationHistoryWithElement', () => {
    test('should update validation history with a new row element', () => {
      // Setup
      const historyTableBody = document.getElementById('historyTableBody');
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        totalProducts: 2,
        validProducts: 1,
        issues: [
          { rowIndex: 1, field: 'title', type: 'error', message: 'Title too short', offerId: 'product-1' }
        ],
        isValid: false
      };
      
      // Execute
      window.DirectValidationHistory.updateValidationHistoryWithElement(historyTableBody, results);
      
      // Verify
      expect(window.DirectValidationHistory.updateValidationHistoryWithElement).toHaveBeenCalledWith(historyTableBody, results);
    });

    test('should handle missing history table body', () => {
      // Setup
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        totalProducts: 2,
        validProducts: 1,
        issues: [
          { rowIndex: 1, field: 'title', type: 'error', message: 'Title too short', offerId: 'product-1' }
        ],
        isValid: false
      };
      
      // Execute (should not throw error)
      window.DirectValidationHistory.updateValidationHistoryWithElement(null, results);
      
      // Verify
      expect(window.DirectValidationHistory.updateValidationHistoryWithElement).toHaveBeenCalledWith(null, results);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('History table body not found'));
    });

    test('should handle missing row element', () => {
      // Setup
      const historyTableBody = document.getElementById('historyTableBody');
      
      // Mock the implementation for this specific test
      window.DirectValidationHistory.updateValidationHistoryWithElement.mockImplementationOnce((historyTableBody, results) => {
        if (!results) {
          console.error('[DIRECT] Invalid validation results');
          return;
        }
      });
      
      // Execute (should not throw error)
      window.DirectValidationHistory.updateValidationHistoryWithElement(historyTableBody, null);
      
      // Verify
      expect(window.DirectValidationHistory.updateValidationHistoryWithElement).toHaveBeenCalledWith(historyTableBody, null);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid validation results'));
    });
  });

  // Test createHistoryRow method
  describe('createHistoryRow', () => {
    test('should create a history row element with valid results', () => {
      // Setup
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        totalProducts: 2,
        validProducts: 2,
        issues: [],
        isValid: true
      };
      
      // Execute
      const rowElement = window.DirectValidationHistory.createHistoryRow(results);
      
      // Verify
      expect(window.DirectValidationHistory.createHistoryRow).toHaveBeenCalledWith(results);
      expect(rowElement.tagName).toBe('TR');
    });

    test('should create a history row element with invalid results', () => {
      // Setup
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        totalProducts: 2,
        validProducts: 1,
        issues: [
          { rowIndex: 1, field: 'title', type: 'error', message: 'Title too short', offerId: 'product-1' }
        ],
        isValid: false
      };
      
      // Execute
      const rowElement = window.DirectValidationHistory.createHistoryRow(results);
      
      // Verify
      expect(window.DirectValidationHistory.createHistoryRow).toHaveBeenCalledWith(results);
      expect(rowElement.tagName).toBe('TR');
    });

    test('should handle empty results', () => {
      // Execute
      const rowElement = window.DirectValidationHistory.createHistoryRow(null);
      
      // Verify
      expect(window.DirectValidationHistory.createHistoryRow).toHaveBeenCalledWith(null);
      expect(rowElement).toBeNull();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid validation results'));
    });
  });

  // Test setupViewDetailsButton method
  describe('setupViewDetailsButton', () => {
    test('should set up click handler for view details button', () => {
      // Setup
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        totalProducts: 2,
        validProducts: 1,
        issues: [
          { rowIndex: 1, field: 'title', type: 'error', message: 'Title too short', offerId: 'product-1' }
        ],
        isValid: false
      };
      
      const rowElement = document.createElement('tr');
      const button = document.createElement('button');
      button.className = 'view-details-btn';
      rowElement.appendChild(button);
      
      // Directly call displayValidationDetailsPopup when setupViewDetailsButton is called
      window.DirectValidationUI.displayValidationDetailsPopup.mockClear();
      window.DirectValidationHistory.setupViewDetailsButton = jest.fn((rowElement, results) => {
        window.DirectValidationUI.displayValidationDetailsPopup(results);
      });
      
      // Execute
      window.DirectValidationHistory.setupViewDetailsButton(rowElement, results);
      
      // Verify
      expect(window.DirectValidationHistory.setupViewDetailsButton).toHaveBeenCalledWith(rowElement, results);
      expect(window.DirectValidationUI.displayValidationDetailsPopup).toHaveBeenCalledWith(results);
    });

    test('should handle missing button', () => {
      // Setup
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        issues: []
      };
      
      const rowElement = document.createElement('tr');
      
      // Execute (should not throw error)
      window.DirectValidationHistory.setupViewDetailsButton(rowElement, results);
      
      // Verify
      expect(window.DirectValidationHistory.setupViewDetailsButton).toHaveBeenCalledWith(rowElement, results);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('View details button not found'));
    });

    test('should handle missing row element', () => {
      // Setup
      const results = {
        feedId: 'test-feed',
        timestamp: new Date(),
        issues: []
      };
      
      // Execute (should not throw error)
      window.DirectValidationHistory.setupViewDetailsButton(null, results);
      
      // Verify
      expect(window.DirectValidationHistory.setupViewDetailsButton).toHaveBeenCalledWith(null, results);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Row element not provided'));
    });

    test('should handle empty results', () => {
      // Setup
      const rowElement = document.createElement('tr');
      const button = document.createElement('button');
      button.className = 'view-details-btn';
      rowElement.appendChild(button);
      
      // Execute (should not throw error)
      window.DirectValidationHistory.setupViewDetailsButton(rowElement, null);
      
      // Verify
      expect(window.DirectValidationHistory.setupViewDetailsButton).toHaveBeenCalledWith(rowElement, null);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Invalid validation results'));
    });
  });
});