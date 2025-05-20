// tests/feed_coordinator.test.js
import { FeedCoordinator } from '../src/popup/feed_coordinator';
import { CSVParser } from '../src/popup/csv_parser';
import { StatusManager } from '../src/popup/status_manager';
import { FeedDisplayManager } from '../src/popup/feed_display_manager';

// Mock the imported modules
jest.mock('../src/popup/csv_parser');
jest.mock('../src/popup/status_manager');
jest.mock('../src/popup/feed_display_manager');

describe('FeedCoordinator', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh DOM environment for each test
    document.body.innerHTML = `
      <input type="file" id="fileInput" />
      <button id="previewButton">Preview</button>
      <div id="previewContentContainer"></div>
      <div id="feedStatusContent"></div>
    `;
    
    // Create mock elements with necessary properties and methods
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'fileInput';
    
    const previewButton = document.createElement('button');
    previewButton.id = 'previewButton';
    previewButton.textContent = 'Preview';
    
    const previewContentContainer = document.createElement('div');
    previewContentContainer.id = 'previewContentContainer';
    
    // Replace the elements in the DOM
    document.body.querySelector('#fileInput').replaceWith(fileInput);
    document.body.querySelector('#previewButton').replaceWith(previewButton);
    document.body.querySelector('#previewContentContainer').replaceWith(previewContentContainer);
    
    // Add necessary properties and methods to the elements
    fileInput.files = [];
    fileInput.addEventListener = jest.fn((event, handler) => {
      fileInput[`on${event}`] = handler;
    });
    fileInput.dispatchEvent = jest.fn(event => {
      if (event.type === 'change' && fileInput.onchange) {
        fileInput.onchange(event);
      }
      return true;
    });
    
    previewButton.disabled = true;
    previewButton.addEventListener = jest.fn((event, handler) => {
      previewButton[`on${event}`] = handler;
    });
    previewButton.dispatchEvent = jest.fn(event => {
      if (event.type === 'click' && previewButton.onclick) {
        previewButton.onclick(event);
      }
      return true;
    });
    
    previewContentContainer.appendChild = jest.fn(child => {
      child.parentNode = previewContentContainer;
      return child;
    });
    previewContentContainer.querySelector = jest.fn(selector => {
      if (selector === '.editable-field') {
        const div = document.createElement('div');
        div.classList = {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn().mockReturnValue(false)
        };
        div.nextElementSibling = {
          classList: {
            contains: jest.fn().mockReturnValue(true)
          },
          style: {}
        };
        return div;
      }
      return null;
    });
    
    // Spy on console methods to prevent noise in test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock implementations for the imported classes
    CSVParser.mockImplementation(() => {
      return {
        parse: jest.fn().mockReturnValue({
          data: [{ id: '1', title: 'Product 1', description: 'Description 1' }],
          errors: [],
          warnings: []
        })
      };
    });
    
    StatusManager.mockImplementation(() => ({
      initStatusContent: jest.fn(),
      addInfo: jest.fn(),
      addWarning: jest.fn(),
      addError: jest.fn(),
      addSuccess: jest.fn(),
      clearStatus: jest.fn()
    }));
    
    FeedDisplayManager.mockImplementation(() => ({
      displayPreview: jest.fn().mockResolvedValue(undefined),
      setupEditableFieldListeners: jest.fn(),
      getOfferIdToRowIndexMap: jest.fn().mockReturnValue({ '1': 1 }),
      getCorrectedTableData: jest.fn().mockReturnValue([{ id: '1', title: 'Product 1', description: 'Description 1' }]),
      getAppliedCorrections: jest.fn().mockReturnValue([]),
      navigateToRow: jest.fn()
    }));
    
    // Mock global ContentTypeValidator
    global.ContentTypeValidator = {
      validate: jest.fn()
    };
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    
    // Restore console methods
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
    
    // Remove global mocks
    delete global.ContentTypeValidator;
  });

  describe('constructor', () => {
    test('should initialize with all required elements and managers', () => {
      const elements = {
        fileInput: document.querySelector('#fileInput'),
        previewButton: document.querySelector('#previewButton'),
        previewContentContainer: document.querySelector('#previewContentContainer')
      };
      
      const managers = {
        loadingManager: { showLoading: jest.fn(), hideLoading: jest.fn() },
        errorManager: { showError: jest.fn(), showSuccess: jest.fn() },
        searchManager: { updateSearchColumns: jest.fn() },
        monitor: { logOperation: jest.fn(), logError: jest.fn() }
      };
      
      // Mock initialize method
      const originalInitialize = FeedCoordinator.prototype.initialize;
      FeedCoordinator.prototype.initialize = jest.fn();
      
      const coordinator = new FeedCoordinator(elements, managers);
      
      expect(coordinator.elements).toBe(elements);
      expect(coordinator.managers).toBe(managers);
      expect(FeedCoordinator.prototype.initialize).toHaveBeenCalled();
      
      // Restore original method
      FeedCoordinator.prototype.initialize = originalInitialize;
    });

    test('should log error if required elements are missing', () => {
      const elements = {};
      const managers = {
        loadingManager: {},
        errorManager: {},
        searchManager: {},
        monitor: {}
      };
      
      // Mock initialize method
      const originalInitialize = FeedCoordinator.prototype.initialize;
      FeedCoordinator.prototype.initialize = jest.fn();
      
      new FeedCoordinator(elements, managers);
      
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Required DOM elements missing'), expect.anything());
      
      // Restore original method
      FeedCoordinator.prototype.initialize = originalInitialize;
    });

    test('should create StatusManager if not provided', () => {
      const elements = {
        fileInput: document.querySelector('#fileInput'),
        previewButton: document.querySelector('#previewButton'),
        previewContentContainer: document.querySelector('#previewContentContainer')
      };
      
      const managers = {
        loadingManager: {},
        errorManager: {},
        searchManager: {},
        monitor: {}
      };
      
      // Mock initialize method
      const originalInitialize = FeedCoordinator.prototype.initialize;
      FeedCoordinator.prototype.initialize = jest.fn();
      
      const coordinator = new FeedCoordinator(elements, managers);
      
      expect(coordinator.managers.statusManager).toBeDefined();
      expect(StatusManager).toHaveBeenCalled();
      
      // Restore original method
      FeedCoordinator.prototype.initialize = originalInitialize;
    });
    
    test('should create FeedDisplayManager if not provided', () => {
      const elements = {
        fileInput: document.querySelector('#fileInput'),
        previewButton: document.querySelector('#previewButton'),
        previewContentContainer: document.querySelector('#previewContentContainer')
      };
      
      const managers = {
        loadingManager: {},
        errorManager: {},
        searchManager: {},
        monitor: {}
      };
      
      // Mock initialize method
      const originalInitialize = FeedCoordinator.prototype.initialize;
      FeedCoordinator.prototype.initialize = jest.fn();
      
      const coordinator = new FeedCoordinator(elements, managers);
      
      expect(coordinator.managers.displayManager).toBeDefined();
      expect(FeedDisplayManager).toHaveBeenCalled();
      
      // Restore original method
      FeedCoordinator.prototype.initialize = originalInitialize;
    });
  });

  describe('event handling', () => {
    let coordinator;
    let elements;
    let managers;
    
    beforeEach(() => {
      // Create mock elements directly
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'fileInput';
      fileInput.files = [];
      fileInput.addEventListener = jest.fn((event, handler) => {
        fileInput[`on${event}`] = handler;
      });
      fileInput.removeEventListener = jest.fn();
      fileInput.dispatchEvent = jest.fn(event => {
        if (event.type === 'change' && fileInput.onchange) {
          fileInput.onchange(event);
        }
        return true;
      });
      
      const previewButton = document.createElement('button');
      previewButton.id = 'previewButton';
      previewButton.textContent = 'Preview';
      previewButton.disabled = true;
      previewButton.addEventListener = jest.fn((event, handler) => {
        previewButton[`on${event}`] = handler;
      });
      previewButton.removeEventListener = jest.fn();
      previewButton.dispatchEvent = jest.fn(event => {
        if (event.type === 'click' && previewButton.onclick) {
          previewButton.onclick(event);
        }
        return true;
      });
      
      const previewContentContainer = document.createElement('div');
      previewContentContainer.id = 'previewContentContainer';
      previewContentContainer.appendChild = jest.fn(child => {
        child.parentNode = previewContentContainer;
        return child;
      });
      previewContentContainer.querySelector = jest.fn(selector => {
        if (selector === '.editable-field') {
          const div = document.createElement('div');
          div.classList = {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn().mockReturnValue(false)
          };
          div.nextElementSibling = {
            classList: {
              contains: jest.fn().mockReturnValue(true)
            },
            style: {}
          };
          return div;
        }
        return null;
      });
      
      // Use these mock elements
      elements = {
        fileInput: fileInput,
        previewButton: previewButton,
        previewContentContainer: previewContentContainer
      };
      
      managers = {
        loadingManager: { showLoading: jest.fn(), hideLoading: jest.fn() },
        errorManager: { showError: jest.fn(), showSuccess: jest.fn() },
        searchManager: { updateSearchColumns: jest.fn() },
        monitor: { logOperation: jest.fn(), logError: jest.fn() },
        statusManager: {
          initStatusContent: jest.fn(),
          addInfo: jest.fn(),
          addWarning: jest.fn(),
          addError: jest.fn(),
          addSuccess: jest.fn(),
          clearStatus: jest.fn()
        },
        displayManager: {
          displayPreview: jest.fn().mockResolvedValue(undefined),
          setupEditableFieldListeners: jest.fn(),
          getOfferIdToRowIndexMap: jest.fn().mockReturnValue({ '1': 1 })
        }
      };
      
      // Mock initialize and setupEventListeners methods
      const originalInitialize = FeedCoordinator.prototype.initialize;
      const originalSetupEventListeners = FeedCoordinator.prototype.setupEventListeners;
      
      FeedCoordinator.prototype.initialize = jest.fn();
      FeedCoordinator.prototype.setupEventListeners = jest.fn();
      
      coordinator = new FeedCoordinator(elements, managers);
      
      // Restore original methods
      FeedCoordinator.prototype.initialize = originalInitialize;
      FeedCoordinator.prototype.setupEventListeners = originalSetupEventListeners;
      
      // Restore the setupEventListeners method for testing
      coordinator.setupEventListeners = originalSetupEventListeners.bind(coordinator);
    });

    test('setupEventListeners should add event listeners to fileInput and previewButton', () => {
      const addEventListenerSpyFileInput = jest.spyOn(elements.fileInput, 'addEventListener');
      const addEventListenerSpyPreviewButton = jest.spyOn(elements.previewButton, 'addEventListener');
      
      coordinator.setupEventListeners();
      
      expect(addEventListenerSpyFileInput).toHaveBeenCalledWith('change', expect.any(Function));
      expect(addEventListenerSpyPreviewButton).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('fileInput change event should update previewButton disabled state', () => {
      coordinator.setupEventListeners();
      
      // Simulate file selection
      elements.fileInput.files = [new File([''], 'test.csv')];
      
      elements.fileInput.dispatchEvent(new Event('change'));
      
      expect(elements.previewButton.disabled).toBe(false);
      
      // Simulate no file selected
      elements.fileInput.files = [];
      
      elements.fileInput.dispatchEvent(new Event('change'));
      
      expect(elements.previewButton.disabled).toBe(true);
    });
  });

  describe('handlePreview method', () => {
    let coordinator;
    let elements;
    let managers;
    
    beforeEach(() => {
      // Create mock elements directly
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.id = 'fileInput';
      fileInput.files = [];
      fileInput.addEventListener = jest.fn((event, handler) => {
        fileInput[`on${event}`] = handler;
      });
      fileInput.removeEventListener = jest.fn();
      fileInput.dispatchEvent = jest.fn(event => {
        if (event.type === 'change' && fileInput.onchange) {
          fileInput.onchange(event);
        }
        return true;
      });
      
      const previewButton = document.createElement('button');
      previewButton.id = 'previewButton';
      previewButton.textContent = 'Preview';
      previewButton.disabled = true;
      previewButton.addEventListener = jest.fn((event, handler) => {
        previewButton[`on${event}`] = handler;
      });
      previewButton.removeEventListener = jest.fn();
      previewButton.dispatchEvent = jest.fn(event => {
        if (event.type === 'click' && previewButton.onclick) {
          previewButton.onclick(event);
        }
        return true;
      });
      
      const previewContentContainer = document.createElement('div');
      previewContentContainer.id = 'previewContentContainer';
      previewContentContainer.appendChild = jest.fn(child => {
        child.parentNode = previewContentContainer;
        return child;
      });
      
      // Mock table for preview display
      const table = document.createElement('table');
      table.querySelectorAll = jest.fn().mockReturnValue([]);
      previewContentContainer.querySelector = jest.fn(selector => {
        if (selector === 'table') {
          return table;
        }
        return null;
      });
      
      // Use these mock elements
      elements = {
        fileInput: fileInput,
        previewButton: previewButton,
        previewContentContainer: previewContentContainer
      };
      
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
        statusManager: {
          initStatusContent: jest.fn(),
          addInfo: jest.fn(),
          addSuccess: jest.fn(),
          addWarning: jest.fn(),
          addError: jest.fn(),
          clearStatus: jest.fn()
        },
        displayManager: {
          displayPreview: jest.fn().mockResolvedValue(undefined),
          getOfferIdToRowIndexMap: jest.fn().mockReturnValue({ 'product-1': 1 })
        }
      };
      
      // Mock initialize and setupEventListeners methods
      const originalInitialize = FeedCoordinator.prototype.initialize;
      const originalSetupEventListeners = FeedCoordinator.prototype.setupEventListeners;
      
      FeedCoordinator.prototype.initialize = jest.fn();
      FeedCoordinator.prototype.setupEventListeners = jest.fn();
      
      coordinator = new FeedCoordinator(elements, managers);
      
      // Mock readFileAsText method
      coordinator.readFileAsText = jest.fn().mockResolvedValue('id,title\n1,Product 1');
      
      // Restore original methods
      FeedCoordinator.prototype.initialize = originalInitialize;
      FeedCoordinator.prototype.setupEventListeners = originalSetupEventListeners;
      
      // Set up a mock file
      elements.fileInput.files = [new File([''], 'test.csv')];
    });

    test('should show error if no file is selected', async () => {
      // Clear files
      elements.fileInput.files = [];
      
      await coordinator.handlePreview();
      
      expect(managers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('Please select a file'));
      expect(managers.monitor.logOperation).toHaveBeenCalledWith('preview', 'failed', expect.anything());
    });

    test('should process CSV file and display preview', async () => {
      // Reset CSVParser mock to ensure it's properly tracked
      CSVParser.mockClear();
      
      // Create a mock parser instance with a spy on parse method
      const mockParseMethod = jest.fn().mockReturnValue({
        data: [{ id: '1', title: 'Product 1', description: 'Description 1' }],
        errors: [],
        warnings: []
      });
      
      // Update the CSVParser mock implementation for this test
      CSVParser.mockImplementation(() => {
        return {
          parse: mockParseMethod
        };
      });
      
      await coordinator.handlePreview();
      
      expect(managers.loadingManager.showLoading).toHaveBeenCalled();
      expect(coordinator.readFileAsText).toHaveBeenCalled();
      expect(managers.statusManager.addInfo).toHaveBeenCalledWith('Processing feed...');
      
      // Check CSVParser usage
      expect(CSVParser).toHaveBeenCalled();
      expect(mockParseMethod).toHaveBeenCalled();
      
      // Check display manager usage
      expect(managers.statusManager.clearStatus).toHaveBeenCalled();
      expect(managers.displayManager.displayPreview).toHaveBeenCalled();
      expect(managers.statusManager.addSuccess).toHaveBeenCalled();
      
      // Check search manager update
      expect(managers.searchManager.updateSearchColumns).toHaveBeenCalled();
      
      // Check success message
      expect(managers.errorManager.showSuccess).toHaveBeenCalled();
      expect(managers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should handle CSV parsing errors', async () => {
      // Mock CSVParser to return an error
      CSVParser.mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          data: [],
          errors: [{ type: 'empty_feed', message: 'Empty feed: No rows found in the CSV file.' }],
          warnings: []
        })
      }));
      
      await coordinator.handlePreview();
      
      expect(managers.errorManager.showError).toHaveBeenCalled();
      expect(managers.statusManager.addError).toHaveBeenCalled();
      expect(managers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should handle CSV parsing warnings', async () => {
      // Mock CSVParser to return warnings
      CSVParser.mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          data: [{ id: '1', title: 'Product 1' }],
          errors: [],
          warnings: [
            { type: 'missing_headers_warning', message: 'Missing required headers', missingHeaders: ['description'] }
          ]
        })
      }));
      
      await coordinator.handlePreview();
      
      expect(managers.errorManager.showWarning).toHaveBeenCalled();
      expect(managers.displayManager.displayPreview).toHaveBeenCalled();
      expect(managers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should handle content type validation issues', async () => {
      // Mock CSVParser to return content type warnings
      CSVParser.mockImplementation(() => ({
        parse: jest.fn().mockReturnValue({
          data: [{ id: '1', title: 'Product 1' }],
          errors: [],
          warnings: [
            { 
              type: 'content_type_issues', 
              row: 1, 
              issues: [{ field: 'title', message: 'Title is too generic' }],
              message: 'Content type issues detected.'
            }
          ]
        })
      }));
      
      await coordinator.handlePreview();
      
      expect(managers.statusManager.addWarning).toHaveBeenCalled();
      expect(managers.errorManager.showWarning).toHaveBeenCalled();
      expect(managers.displayManager.displayPreview).toHaveBeenCalled();
      expect(managers.loadingManager.hideLoading).toHaveBeenCalled();
    });
    
    test('should handle unexpected errors', async () => {
      // Mock readFileAsText to throw an error
      coordinator.readFileAsText = jest.fn().mockRejectedValue(new Error('Unexpected error'));
      
      await coordinator.handlePreview();
      
      expect(managers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('An unexpected error occurred'));
      expect(managers.monitor.logError).toHaveBeenCalled();
      expect(managers.loadingManager.hideLoading).toHaveBeenCalled();
    });
  });

  describe('handleFieldEdit', () => {
    let coordinator;
    let elements;
    let managers;
    
    beforeEach(() => {
      // Create mock elements with necessary properties and methods
      const titleField = document.createElement('div');
      titleField.className = 'editable-field';
      titleField.dataset = {
        field: 'title',
        row: '1'
      };
      titleField.textContent = 'Short'; // Too short for title
      titleField.classList = {
        add: jest.fn(className => {
          if (!titleField.className.includes(className)) {
            titleField.className += ' ' + className;
          }
        }),
        remove: jest.fn(className => {
          titleField.className = titleField.className
            .split(' ')
            .filter(c => c !== className)
            .join(' ');
        }),
        contains: jest.fn(className => {
          return titleField.className.includes(className);
        })
      };
      
      const charCount = document.createElement('div');
      charCount.className = 'char-count';
      charCount.style = {};
      
      const row = document.createElement('tr');
      row.dataset = {
        row: '1',
        offerId: 'product-1'
      };
      row.classList = {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn().mockReturnValue(true) // Simulate validation-focus
      };
      row.closest = jest.fn().mockReturnValue(row);
      
      // Setup element references
      titleField.nextElementSibling = charCount;
      titleField.closest = jest.fn().mockReturnValue(row);
      
      // Create mock previewContentContainer
      const previewContentContainer = document.createElement('div');
      previewContentContainer.querySelector = jest.fn().mockReturnValue(titleField);
      
      elements = {
        fileInput: document.getElementById('fileInput'),
        previewButton: document.getElementById('previewButton'),
        previewContentContainer: previewContentContainer
      };
      
      managers = {
        loadingManager: { showLoading: jest.fn(), hideLoading: jest.fn() },
        errorManager: { showError: jest.fn(), showSuccess: jest.fn() },
        searchManager: { updateSearchColumns: jest.fn() },
        monitor: { logOperation: jest.fn(), logError: jest.fn() },
        validationUIManager: { markIssueAsFixed: jest.fn() }
      };
      
      // Mock initialize method
      const originalInitialize = FeedCoordinator.prototype.initialize;
      FeedCoordinator.prototype.initialize = jest.fn();
      
      coordinator = new FeedCoordinator(elements, managers);
      
      // Restore original method
      FeedCoordinator.prototype.initialize = originalInitialize;
    });

    test('should apply validation classes for title under minimum length', () => {
      const field = elements.previewContentContainer.querySelector('.editable-field');
      
      // Create a mock event
      const charCountDisplay = {
        classList: {
          contains: jest.fn().mockReturnValue(true)
        },
        style: {},
        textContent: ''
      };
      
      const event = {
        target: field,
        type: 'input'
      };
      
      // Set nextElementSibling to mock charCountDisplay
      event.target.nextElementSibling = charCountDisplay;
      
      // Trigger field edit
      coordinator.handleFieldEdit(event);
      
      // Verify that the field was marked as under minimum
      expect(field.classList.contains('under-minimum')).toBe(true);
    });
    
    test('should apply validation classes for title over maximum length', () => {
      const field = elements.previewContentContainer.querySelector('.editable-field');
      
      // Set content to exceed maximum length (150 characters for title)
      field.textContent = 'A'.repeat(151);
      
      // Create a mock event
      const charCountDisplay = {
        classList: {
          contains: jest.fn().mockReturnValue(true)
        },
        style: {},
        textContent: ''
      };
      
      const event = {
        target: field,
        type: 'input'
      };
      
      // Set nextElementSibling to mock charCountDisplay
      event.target.nextElementSibling = charCountDisplay;
      
      // Trigger field edit
      coordinator.handleFieldEdit(event);
      
      // Verify that the field was marked as over limit
      expect(field.classList.contains('over-limit')).toBe(true);
    });
    
    test('should apply validation classes for valid title length', () => {
      const field = elements.previewContentContainer.querySelector('.editable-field');
      
      // Set content to valid length (between 30 and 150 characters for title)
      field.textContent = 'This is a valid title with more than thirty characters';
      
      // Create a mock event
      const charCountDisplay = {
        classList: {
          contains: jest.fn().mockReturnValue(true)
        },
        style: {},
        textContent: ''
      };
      
      const event = {
        target: field,
        type: 'input'
      };
      
      // Set nextElementSibling to mock charCountDisplay
      event.target.nextElementSibling = charCountDisplay;
      
      // Trigger field edit
      coordinator.handleFieldEdit(event);
      
      // Verify that the field was marked as valid
      expect(field.classList.contains('under-minimum')).toBe(false);
      expect(field.classList.contains('over-limit')).toBe(false);
    });
    
    test('should notify ValidationUIManager when field is fixed', () => {
      const field = elements.previewContentContainer.querySelector('.editable-field');
      
      // Create a more sophisticated mock for the row with proper classList behavior
      const row = {
        dataset: {
          row: '1',
          offerId: 'product-1'
        },
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn(className => {
            // Initially return true for 'validation-focus' and 'needs-fix'
            if (className === 'validation-focus' || className === 'needs-fix') {
              return true;
            }
            // Return false for 'fix-complete' initially
            if (className === 'fix-complete') {
              return false;
            }
            return false;
          })
        },
        querySelectorAll: jest.fn().mockReturnValue([]) // Return empty array to simulate no invalid fields
      };
      
      // Mock the closest method to return our mock row
      field.closest = jest.fn().mockReturnValue(row);
      
      // Set content to valid length
      field.textContent = 'This is a valid title with more than thirty characters';
      
      // Create a mock event
      const charCountDisplay = {
        classList: {
          contains: jest.fn().mockReturnValue(true)
        },
        style: {},
        textContent: ''
      };
      
      const event = {
        target: field,
        type: 'input'
      };
      
      // Set nextElementSibling to mock charCountDisplay
      event.target.nextElementSibling = charCountDisplay;
      
      // Trigger field edit
      coordinator.handleFieldEdit(event);
      
      // Verify that ValidationUIManager was notified
      expect(managers.validationUIManager.markIssueAsFixed).toHaveBeenCalledWith('product-1', 'title');
      
      // Verify that the row classes were updated correctly
      expect(row.classList.remove).toHaveBeenCalledWith('needs-fix');
      expect(row.classList.remove).toHaveBeenCalledWith('validation-focus');
      expect(row.classList.add).toHaveBeenCalledWith('fix-complete');
    });
    
    test('should handle missing ValidationUIManager', () => {
      // Remove ValidationUIManager
      delete managers.validationUIManager;
      
      const field = elements.previewContentContainer.querySelector('.editable-field');
      const row = field.closest('tr');
      
      // Mark row as needing validation focus
      row.classList.add('validation-focus');
      
      // Set content to valid length
      field.textContent = 'This is a valid title with more than thirty characters';
      
      // Create a mock event
      const charCountDisplay = {
        classList: {
          contains: jest.fn().mockReturnValue(true)
        },
        style: {},
        textContent: ''
      };
      
      const event = {
        target: field,
        type: 'input'
      };
      
      // Set nextElementSibling to mock charCountDisplay
      event.target.nextElementSibling = charCountDisplay;
      
      // Trigger field edit
      coordinator.handleFieldEdit(event);
      
      // Verify warning was logged
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('ValidationUIManager or markIssueAsFixed method not available'));
    });
  });

  describe('utility methods', () => {
    let coordinator;
    let elements;
    let managers;
    
    beforeEach(() => {
      elements = {
        fileInput: document.getElementById('fileInput'),
        previewButton: document.getElementById('previewButton'),
        previewContentContainer: document.getElementById('previewContentContainer')
      };
      
      managers = {
        loadingManager: { showLoading: jest.fn(), hideLoading: jest.fn() },
        errorManager: { showError: jest.fn(), showSuccess: jest.fn() },
        searchManager: { updateSearchColumns: jest.fn() },
        monitor: { logOperation: jest.fn(), logError: jest.fn() },
        displayManager: {
          getCorrectedTableData: jest.fn().mockReturnValue([{ id: '1', title: 'Product 1' }]),
          getAppliedCorrections: jest.fn().mockReturnValue([]),
          navigateToRow: jest.fn()
        }
      };
      
      // Mock initialize method
      const originalInitialize = FeedCoordinator.prototype.initialize;
      FeedCoordinator.prototype.initialize = jest.fn();
      
      coordinator = new FeedCoordinator(elements, managers);
      
      // Restore original method
      FeedCoordinator.prototype.initialize = originalInitialize;
    });

    test('readFileAsText should read file content', async () => {
      // Create a mock file with content
      const fileContent = 'id,title\n1,Product 1';
      const file = new File([fileContent], 'test.csv');
      
      // Mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(function(file) {
          this.onload({ target: { result: fileContent } });
        })
      };
      
      // Replace global FileReader with mock
      const originalFileReader = global.FileReader;
      global.FileReader = jest.fn(() => mockFileReader);
      
      const result = await coordinator.readFileAsText(file);
      
      expect(result).toBe(fileContent);
      expect(mockFileReader.readAsText).toHaveBeenCalledWith(file);
      
      // Restore global FileReader
      global.FileReader = originalFileReader;
    });
    
    test('readFileAsText should handle errors', async () => {
      // Create a mock file
      const file = new File([''], 'test.csv');
      
      // Mock FileReader with error
      const mockFileReader = {
        readAsText: jest.fn(function(file) {
          this.onerror(new Error('File read error'));
        })
      };
      
      // Replace global FileReader with mock
      const originalFileReader = global.FileReader;
      global.FileReader = jest.fn(() => mockFileReader);
      
      await expect(coordinator.readFileAsText(file)).rejects.toThrow('Failed to read the file');
      
      // Restore global FileReader
      global.FileReader = originalFileReader;
    });

    test('getCorrectedTableData should delegate to displayManager', () => {
      const result = coordinator.getCorrectedTableData();
      
      expect(managers.displayManager.getCorrectedTableData).toHaveBeenCalled();
      expect(result).toEqual([{ id: '1', title: 'Product 1' }]);
    });
    
    test('getCorrectedTableData should handle missing displayManager', () => {
      // Remove displayManager
      delete managers.displayManager;
      
      const result = coordinator.getCorrectedTableData();
      
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('DisplayManager not available'));
      expect(result).toEqual([]);
    });

    test('getAppliedCorrections should delegate to displayManager', () => {
      const result = coordinator.getAppliedCorrections();
      
      expect(managers.displayManager.getAppliedCorrections).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
    
    test('navigateToRow should delegate to displayManager', () => {
      coordinator.navigateToRow(1, 'title');
      
      expect(managers.displayManager.navigateToRow).toHaveBeenCalledWith(1, 'title');
    });
  });
});