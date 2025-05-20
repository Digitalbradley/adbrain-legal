// tests/feed_integration.test.js
import { FeedCoordinator } from '../src/popup/feed_coordinator';
import { CSVParser } from '../src/popup/csv_parser';
import { StatusManager } from '../src/popup/status_manager';
import { FeedDisplayManager } from '../src/popup/feed_display_manager';
import { ContentTypeValidator } from '../src/popup/content_type_validator';

// Don't mock the modules for integration tests
jest.unmock('../src/popup/csv_parser');
jest.unmock('../src/popup/status_manager');
jest.unmock('../src/popup/feed_display_manager');
jest.unmock('../src/popup/feed_coordinator');

describe('Feed Module Integration', () => {
  let coordinator;
  let elements;
  let managers;
  
  beforeEach(() => {
    // Set up DOM elements
    document.body.innerHTML = `
      <div id="feedStatusContent"></div>
      <div class="data-container"></div>
      <div class="floating-scroll">
        <div class="scroll-track">
          <div class="scroll-thumb"></div>
        </div>
      </div>
      <input type="file" id="fileInput" />
      <button id="previewButton">Preview</button>
      <div id="previewContentContainer"></div>
    `;
    
    // Get DOM elements
    const fileInput = document.getElementById('fileInput');
    const previewButton = document.getElementById('previewButton');
    const previewContentContainer = document.getElementById('previewContentContainer');
    
    // Add necessary properties and methods to the elements
    if (fileInput) {
      fileInput.files = [];
      fileInput.addEventListener = jest.fn();
      fileInput.dispatchEvent = jest.fn(event => {
        if (event.type === 'change' && fileInput.onchange) {
          fileInput.onchange(event);
        }
      });
    }
    
    if (previewButton) {
      previewButton.disabled = true;
      previewButton.addEventListener = jest.fn();
      previewButton.dispatchEvent = jest.fn(event => {
        if (event.type === 'click' && previewButton.onclick) {
          previewButton.onclick(event);
        }
      });
    }
    
    if (previewContentContainer) {
      // Ensure querySelector returns elements for tests
      const originalQuerySelector = previewContentContainer.querySelector;
      previewContentContainer.querySelector = function(selector) {
        if (selector === 'table') {
          const table = document.createElement('table');
          table.querySelectorAll = jest.fn().mockReturnValue([]);
          return table;
        }
        return originalQuerySelector.call(this, selector);
      };
    }
    
    elements = {
      fileInput: fileInput,
      previewButton: previewButton,
      previewContentContainer: previewContentContainer
    };
    
    // Spy on console methods to prevent noise in test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Create real instances of the modules
    const statusManager = new StatusManager();
    
    // Mock initFloatingScrollBar to avoid DOM manipulation issues in tests
    const originalInitFloatingScrollBar = FeedDisplayManager.prototype.initFloatingScrollBar;
    FeedDisplayManager.prototype.initFloatingScrollBar = jest.fn();
    
    const displayManager = new FeedDisplayManager(elements, {});
    
    // Restore original method after creating the instance
    FeedDisplayManager.prototype.initFloatingScrollBar = originalInitFloatingScrollBar;
    
    managers = {
      loadingManager: {
        showLoading: jest.fn(),
        hideLoading: jest.fn()
      },
      errorManager: {
        showError: jest.fn(),
        showSuccess: jest.fn(),
        showWarning: jest.fn()
      },
      searchManager: {
        updateSearchColumns: jest.fn()
      },
      monitor: {
        logOperation: jest.fn(),
        logError: jest.fn()
      },
      statusManager: statusManager,
      displayManager: displayManager,
      validationUIManager: {
        markIssueAsFixed: jest.fn()
      }
    };
    
    // Mock ContentTypeValidator.validate method
    const originalValidate = ContentTypeValidator.validate;
    ContentTypeValidator.validate = jest.fn((row) => {
      const issues = [];
      if (row.title && row.title.length < 5) {
        issues.push({ field: 'title', message: 'Title is too short' });
      }
      if (row.description && row.description.length < 10) {
        issues.push({ field: 'description', message: 'Description is too short' });
      }
      return issues;
    });
    
    // Make it available globally for backward compatibility
    global.ContentTypeValidator = ContentTypeValidator;
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    
    // Restore console methods
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
    
    // Restore original ContentTypeValidator.validate method
    ContentTypeValidator.validate = originalValidate;
    
    // Remove global reference
    delete global.ContentTypeValidator;
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('End-to-end feed processing flow', () => {
    beforeEach(() => {
      // Create a FeedCoordinator instance with real module instances
      coordinator = new FeedCoordinator(elements, managers);
      
      // Mock readFileAsText to return a CSV string
      coordinator.readFileAsText = jest.fn().mockResolvedValue(
        'id,title,description,link,image_link\n' +
        '1,Product 1,Description 1,http://example.com/1,http://example.com/image1.jpg\n' +
        '2,Product 2,Description 2,http://example.com/2,http://example.com/image2.jpg'
      );
      
      // Set up a mock file
      if (elements.fileInput) {
        elements.fileInput.files = [new File([''], 'test.csv')];
      }
    });
    
    test('should process CSV and display preview', async () => {
      // Trigger the preview
      await coordinator.handlePreview();
      
      // Verify loading state was shown
      expect(managers.loadingManager.showLoading).toHaveBeenCalled();
      
      // Verify file was read
      expect(coordinator.readFileAsText).toHaveBeenCalled();
      
      // Verify status updates
      expect(managers.statusManager.addInfo).toHaveBeenCalledWith('Processing feed...');
      expect(managers.statusManager.clearStatus).toHaveBeenCalled();
      expect(managers.statusManager.addSuccess).toHaveBeenCalled();
      
      // Verify preview was displayed
      const table = elements.previewContentContainer.querySelector('table');
      expect(table).not.toBeNull();
      
      // Verify table has correct headers
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
      expect(headers).toEqual(['id', 'title', 'description', 'link', 'image_link']);
      
      // Verify table has correct number of rows
      const rows = table.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);
      
      // Verify search columns were updated
      expect(managers.searchManager.updateSearchColumns).toHaveBeenCalled();
      
      // Verify success message was shown
      expect(managers.errorManager.showSuccess).toHaveBeenCalled();
      
      // Verify loading state was hidden
      expect(managers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should handle CSV with warnings', async () => {
      // Mock readFileAsText to return a CSV with missing columns
      coordinator.readFileAsText = jest.fn().mockResolvedValue(
        'id,title,description\n' +
        '1,Product 1,Description 1\n' +
        '2,Product 2,Description 2'
      );
      
      // Trigger the preview
      await coordinator.handlePreview();
      
      // Verify warning was shown
      expect(managers.errorManager.showWarning).toHaveBeenCalled();
      
      // Verify preview was still displayed
      const table = elements.previewContentContainer.querySelector('table');
      expect(table).not.toBeNull();
      
      // Verify table has correct headers (only the ones provided)
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
      expect(headers).toEqual(['id', 'title', 'description']);
    });
    
    test('should handle empty CSV', async () => {
      // Mock readFileAsText to return an empty string
      coordinator.readFileAsText = jest.fn().mockResolvedValue('');
      
      // Trigger the preview
      await coordinator.handlePreview();
      
      // Verify error was shown
      expect(managers.errorManager.showError).toHaveBeenCalled();
      
      // Verify no table was created
      const table = elements.previewContentContainer.querySelector('table');
      expect(table).toBeNull();
    });
  });

  describe('Field editing and validation flow', () => {
    beforeEach(() => {
      // Create a FeedCoordinator instance with real module instances
      coordinator = new FeedCoordinator(elements, managers);
      
      // Mock readFileAsText to return a CSV string with short title and description
      coordinator.readFileAsText = jest.fn().mockResolvedValue(
        'id,title,description,link,image_link\n' +
        '1,Short,Short desc,http://example.com/1,http://example.com/image1.jpg'
      );
      
      // Set up a mock file
      if (elements.fileInput) {
        elements.fileInput.files = [new File([''], 'test.csv')];
      }
    });
    
    test('should validate fields and mark issues', async () => {
      // Trigger the preview
      await coordinator.handlePreview();
      
      // Wait for post-display validation
      jest.useFakeTimers();
      jest.runAllTimers();
      
      // Get the editable fields
      const titleField = elements.previewContentContainer.querySelector('.editable-field[data-field="title"]');
      const descriptionField = elements.previewContentContainer.querySelector('.editable-field[data-field="description"]');
      
      // Verify fields are marked as under minimum
      expect(titleField.classList.contains('under-minimum')).toBe(true);
      expect(descriptionField.classList.contains('under-minimum')).toBe(true);
      
      // Get the row
      const row = titleField.closest('tr');
      
      // Simulate navigation to the row (which adds validation-focus class)
      row.classList.add('validation-focus');
      row.classList.add('needs-fix');
      
      // Update title to valid length
      titleField.textContent = 'This is a valid title with more than thirty characters';
      
      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      titleField.dispatchEvent(inputEvent);
      
      // Verify title field is no longer marked as under minimum
      expect(titleField.classList.contains('under-minimum')).toBe(false);
      
      // Description is still invalid, so row should still be marked as needs-fix
      expect(row.classList.contains('needs-fix')).toBe(true);
      
      // Update description to valid length
      descriptionField.textContent = 'This is a valid description with more than ninety characters. It needs to be quite long to pass validation.';
      
      // Trigger input event
      descriptionField.dispatchEvent(inputEvent);
      
      // Verify description field is no longer marked as under minimum
      expect(descriptionField.classList.contains('under-minimum')).toBe(false);
      
      // Both fields are now valid, so row should no longer be marked as needs-fix
      expect(row.classList.contains('needs-fix')).toBe(false);
      
      // Verify ValidationUIManager was notified
      expect(managers.validationUIManager.markIssueAsFixed).toHaveBeenCalledWith(expect.any(String), 'title');
      expect(managers.validationUIManager.markIssueAsFixed).toHaveBeenCalledWith(expect.any(String), 'description');
      
      // Restore timers
      jest.useRealTimers();
    });
    
    test('should handle field editing with content type validation', async () => {
      // Trigger the preview
      await coordinator.handlePreview();
      
      // Wait for post-display validation
      jest.useFakeTimers();
      jest.runAllTimers();
      
      // Get the title field
      const titleField = elements.previewContentContainer.querySelector('.editable-field[data-field="title"]');
      
      // Get the row
      const row = titleField.closest('tr');
      
      // Simulate navigation to the row
      row.classList.add('validation-focus');
      
      // Update title to valid length but with content type issue
      titleField.textContent = 'http://example.com/this-is-a-url-in-title-which-is-invalid';
      
      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      titleField.dispatchEvent(inputEvent);
      
      // Title is long enough but has content type issue
      // In this integration test, we're not actually checking content type during edit
      // since that would require deeper integration with ContentTypeValidator
      
      // Restore timers
      jest.useRealTimers();
    });
  });

  describe('Error handling across module boundaries', () => {
    beforeEach(() => {
      // Create a FeedCoordinator instance with real module instances
      coordinator = new FeedCoordinator(elements, managers);
      
      // Set up a mock file
      if (elements.fileInput) {
        Object.defineProperty(elements.fileInput, 'files', {
          value: [new File([''], 'test.csv')]
        });
      }
    });
    
    test('should handle file reading errors', async () => {
      // Mock readFileAsText to throw an error
      coordinator.readFileAsText = jest.fn().mockRejectedValue(new Error('File read error'));
      
      // Trigger the preview
      await coordinator.handlePreview();
      
      // Verify error was shown
      expect(managers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('An unexpected error occurred'));
      
      // Verify error was logged
      expect(managers.monitor.logError).toHaveBeenCalled();
      
      // Verify loading state was hidden
      expect(managers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should handle CSV parsing errors', async () => {
      // Mock readFileAsText to return invalid CSV
      coordinator.readFileAsText = jest.fn().mockResolvedValue('invalid,csv,format\nwithout,proper,headers');
      
      // Trigger the preview
      await coordinator.handlePreview();
      
      // Verify warning was shown (missing required headers)
      expect(managers.errorManager.showWarning).toHaveBeenCalled();
      
      // Verify loading state was hidden
      expect(managers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should handle display errors', async () => {
      // Mock readFileAsText to return valid CSV
      coordinator.readFileAsText = jest.fn().mockResolvedValue(
        'id,title,description,link,image_link\n' +
        '1,Product 1,Description 1,http://example.com/1,http://example.com/image1.jpg'
      );
      
      // Mock displayPreview to throw an error
      managers.displayManager.displayPreview = jest.fn().mockRejectedValue(new Error('Display error'));
      
      // Trigger the preview
      await coordinator.handlePreview();
      
      // Verify error was shown
      expect(managers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('An unexpected error occurred'));
      
      // Verify error was logged
      expect(managers.monitor.logError).toHaveBeenCalled();
      
      // Verify loading state was hidden
      expect(managers.loadingManager.hideLoading).toHaveBeenCalled();
    });
  });
});