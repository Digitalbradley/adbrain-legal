/**
 * Integration tests for the direct validation modules
 * 
 * Tests the entire validation flow from button click to results display
 */

describe('Direct Validation Integration', () => {
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
            <tr data-row-id="product-1">
              <td>product-1</td>
              <td>Test Product 1</td>
              <td>This is a test product description</td>
              <td>19.99</td>
              <td>https://example.com/image1.jpg</td>
              <td>https://example.com/product1</td>
            </tr>
            <tr data-row-id="product-2">
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
      <div class="tab-container">
        <div class="tab-buttons">
          <button class="tab-button active" data-tab="feedTab">Feed</button>
          <button class="tab-button" data-tab="validationTab">Validation</button>
        </div>
        <div class="tab-content">
          <div id="feedTab" class="tab-content-item active">Feed content</div>
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
        </div>
      </div>
      <div id="loadingOverlay" style="display: none;">
        <div class="loading-spinner"></div>
        <div id="loadingMessage">Loading...</div>
      </div>
      <button id="validateGMC">Validate Feed</button>
    `;
    
    // Reset mocks
    window.resetMocks();
    
    // Use real implementations instead of mocks
    window.resetMocks = function() {
      jest.clearAllMocks();
    };
    
    // Feature flags removed in Phase 4 (Cleanup)
    
    // Mock setTimeout
    jest.useFakeTimers();
  });

  // Test the complete validation flow
  test('should validate feed data and display results when button is clicked', () => {
    // Initialize the core module
    window.DirectValidationCore.initialize();
    
    // Verify that the event listener was added
    const validateButton = document.getElementById('validateGMC');
    expect(validateButton).not.toBeNull();
    
    // Simulate button click
    validateButton.click();
    
    // Verify loading indicator is shown
    const loadingOverlay = document.getElementById('loadingOverlay');
    expect(loadingOverlay.style.display).toBe('flex');
    
    // Fast-forward timers
    jest.runAllTimers();
    
    // Verify loading indicator is hidden
    expect(loadingOverlay.style.display).toBe('none');
    
    // Verify validation tab is active
    const feedTab = document.getElementById('feedTab');
    const validationTab = document.getElementById('validationTab');
    expect(feedTab.classList.contains('active')).toBe(false);
    expect(validationTab.classList.contains('active')).toBe(true);
    
    // Verify history table is updated
    const historyTableBody = document.getElementById('historyTableBody');
    expect(historyTableBody.innerHTML).not.toBe('');
    expect(historyTableBody.querySelector('tr')).not.toBeNull();
  });

  // Test validation with issues
  test('should identify and display validation issues', () => {
    // Replace the table with data that will trigger validation issues
    document.querySelector('#previewContent tbody').innerHTML = `
      <tr data-row-id="product-1">
        <td>product-1</td>
        <td>Short</td>
        <td>Short desc</td>
        <td>19.99</td>
        <td>https://example.com/image1.jpg</td>
        <td>https://example.com/product1</td>
      </tr>
    `;
    
    // Initialize the core module
    window.DirectValidationCore.initialize();
    
    // Simulate button click
    document.getElementById('validateGMC').click();
    
    // Fast-forward timers
    jest.runAllTimers();
    
    // Verify history table shows issues
    const historyTableBody = document.getElementById('historyTableBody');
    const historyRow = historyTableBody.querySelector('tr');
    expect(historyRow).not.toBeNull();
    expect(historyRow.innerHTML).toContain('Issues Found');
    
    // Find and click the "View Details" button
    const viewDetailsBtn = historyRow.querySelector('.view-details-btn');
    expect(viewDetailsBtn).not.toBeNull();
    viewDetailsBtn.click();
    
    // Verify validation panel is created
    const validationPanel = document.querySelector('.validation-panel');
    expect(validationPanel).not.toBeNull();
    expect(validationPanel.innerHTML).toContain('Title too short');
    expect(validationPanel.innerHTML).toContain('Description too short');
  });

  // Test row navigation from validation panel
  test('should navigate to feed row when clicking on row link', () => {
    // Replace the table with data that will trigger validation issues
    document.querySelector('#previewContent tbody').innerHTML = `
      <tr data-row-id="product-1">
        <td>product-1</td>
        <td>Short</td>
        <td>Short desc</td>
        <td>19.99</td>
        <td>https://example.com/image1.jpg</td>
        <td>https://example.com/product1</td>
      </tr>
    `;
    
    // Mock the switchToFeedTab method to track calls
    const originalSwitchToFeedTab = window.DirectValidationTabs.switchToFeedTab;
    window.DirectValidationTabs.switchToFeedTab = jest.fn(originalSwitchToFeedTab);
    
    // Initialize the core module
    window.DirectValidationCore.initialize();
    
    // Simulate button click
    document.getElementById('validateGMC').click();
    
    // Fast-forward timers
    jest.runAllTimers();
    
    // Find and click the "View Details" button
    const viewDetailsBtn = document.querySelector('.view-details-btn');
    viewDetailsBtn.click();
    
    // Find and click a row link
    const rowLink = document.querySelector('.row-link');
    expect(rowLink).not.toBeNull();
    
    // Create a mock event
    const mockEvent = { preventDefault: jest.fn() };
    
    // Simulate click on row link
    rowLink.onclick(mockEvent);
    
    // Verify preventDefault was called
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    
    // Verify switchToFeedTab was called
    expect(window.DirectValidationTabs.switchToFeedTab).toHaveBeenCalled();
    
    // Restore original function
    window.DirectValidationTabs.switchToFeedTab = originalSwitchToFeedTab;
  });

  // Feature flag tests removed in Phase 4 (Cleanup)

  // Test error handling
  test('should handle errors gracefully', () => {
    // Mock getTableData to throw an error
    const originalGetTableData = window.DirectValidationData.getTableData;
    window.DirectValidationData.getTableData = jest.fn(() => {
      throw new Error('Test error');
    });
    
    // Mock console.error
    const consoleErrorSpy = jest.spyOn(console, 'error');
    
    // Initialize the core module
    window.DirectValidationCore.initialize();
    
    // Simulate button click
    document.getElementById('validateGMC').click();
    
    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Test error'));
    
    // Verify loading indicator is hidden
    expect(document.getElementById('loadingOverlay').style.display).toBe('none');
    
    // Restore original function
    window.DirectValidationData.getTableData = originalGetTableData;
  });

  // Test empty feed data handling
  test('should show alert when feed data is empty', () => {
    // Mock getTableData to return empty array
    const originalGetTableData = window.DirectValidationData.getTableData;
    window.DirectValidationData.getTableData = jest.fn(() => []);
    
    // Mock window.alert
    const originalAlert = window.alert;
    window.alert = jest.fn();
    
    // Initialize the core module
    window.DirectValidationCore.initialize();
    
    // Simulate button click
    document.getElementById('validateGMC').click();
    
    // Verify alert was shown
    expect(window.alert).toHaveBeenCalledWith('Please load a feed first before validating.');
    
    // Verify loading indicator was not shown
    expect(document.getElementById('loadingOverlay').style.display).toBe('none');
    
    // Restore original functions
    window.DirectValidationData.getTableData = originalGetTableData;
    window.alert = originalAlert;
  });
});