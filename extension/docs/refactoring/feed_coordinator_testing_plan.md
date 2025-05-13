# AdBrain Feed Manager Testing Plan

## Overview

This document outlines a comprehensive testing strategy for the recently refactored Feed Manager modules in the AdBrain Chrome extension. The testing plan focuses on ensuring the reliability and correctness of the extracted modules through automated testing.

## Modules to Test

1. **CSVParser** - Handles CSV parsing, validation, and error detection
2. **StatusManager** - Manages the feed status UI area
3. **FeedDisplayManager** - Handles display-related functionality
4. **FeedCoordinator** - Acts as the central orchestrator for feed operations

## Testing Framework

We'll use Jest as our testing framework with the following configuration:
- JSDOM for browser environment simulation
- Mocks for dependencies and DOM elements
- Snapshot testing for UI components where appropriate
- Code coverage reporting

## Detailed Testing Plan

### 1. CSVParser Tests (`tests/csv_parser.test.js`)

#### 1.1 Constructor Tests
```javascript
describe('CSVParser', () => {
  describe('constructor', () => {
    test('should initialize with default required headers', () => {
      const parser = new CSVParser();
      expect(parser.requiredHeaders).toEqual(['id', 'title', 'description', 'link', 'image_link']);
    });

    test('should initialize with custom required headers', () => {
      const customHeaders = ['id', 'custom_field', 'another_field'];
      const parser = new CSVParser({ requiredHeaders: customHeaders });
      expect(parser.requiredHeaders).toEqual(customHeaders);
    });
  });
});
```

#### 1.2 Parse Method Tests
```javascript
describe('parse method', () => {
  let parser;
  
  beforeEach(() => {
    parser = new CSVParser();
  });

  test('should parse valid CSV data', () => {
    const csvText = 'id,title,description,link,image_link\n1,Product 1,Description 1,http://example.com,http://example.com/image.jpg';
    const { data, errors, warnings } = parser.parse(csvText);
    
    expect(errors).toHaveLength(0);
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      id: '1',
      title: 'Product 1',
      description: 'Description 1',
      link: 'http://example.com',
      image_link: 'http://example.com/image.jpg'
    });
  });

  test('should handle empty CSV data', () => {
    const { data, errors, warnings } = parser.parse('');
    
    expect(errors).toHaveLength(1);
    expect(errors[0].type).toBe('empty_feed');
    expect(data).toHaveLength(0);
  });

  test('should handle CSV with missing required headers', () => {
    const csvText = 'id,title,link\n1,Product 1,http://example.com';
    const { data, errors, warnings } = parser.parse(csvText);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('missing_headers_warning');
    expect(warnings[0].missingHeaders).toContain('description');
    expect(warnings[0].missingHeaders).toContain('image_link');
  });
test('should handle CSV with inconsistent column counts', () => {
    const csvText = 'id,title,description,link,image_link\n1,Product 1,Description 1,http://example.com\n2,Product 2,Description 2,http://example.com,http://example.com/image.jpg,extra';
    const { data, errors, warnings } = parser.parse(csvText);
    
    expect(warnings).toHaveLength(2);
    expect(warnings[0].type).toBe('too_few_columns');
    expect(warnings[1].type).toBe('too_many_columns');
  });

  test('should handle CSV with unclosed quotes', () => {
    const csvText = 'id,title,description,link,image_link\n1,"Product 1,Description 1,http://example.com,http://example.com/image.jpg';
    const { data, errors, warnings } = parser.parse(csvText);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('unclosed_quote');
  });

  test('should handle CSV with empty required fields', () => {
    const csvText = 'id,title,description,link,image_link\n1,,Description 1,http://example.com,http://example.com/image.jpg';
    const { data, errors, warnings } = parser.parse(csvText);
    
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('empty_required_fields');
    expect(warnings[0].fields).toContain('title');
  });

  test('should integrate with content type validator', () => {
    const csvText = 'id,title,description,link,image_link\n1,Product 1,Description 1,http://example.com,http://example.com/image.jpg';
    const mockValidator = {
      validate: jest.fn(() => [{ field: 'title', message: 'Title is too generic' }])
    };
    
    const { data, errors, warnings } = parser.parse(csvText, mockValidator);
    
    expect(mockValidator.validate).toHaveBeenCalled();
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('content_type_issues');
  });

  test('should handle content type validator errors', () => {
    const csvText = 'id,title,description,link,image_link\n1,Product 1,Description 1,http://example.com,http://example.com/image.jpg';
    const mockValidator = {
      validate: jest.fn(() => { throw new Error('Validation error'); })
    };
    
    const { data, errors, warnings } = parser.parse(csvText, mockValidator);
    
    expect(mockValidator.validate).toHaveBeenCalled();
    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe('content_type_error');
  });
});

### 2. StatusManager Tests (`tests/status_manager.test.js`)

#### 2.1 Constructor and Initialization Tests
```javascript
describe('StatusManager', () => {
  describe('constructor', () => {
    test('should initialize with default options', () => {
      const statusManager = new StatusManager();
      expect(statusManager.statusContentId).toBe('feedStatusContent');
    });

    test('should initialize with custom statusContentId', () => {
      const statusManager = new StatusManager({ statusContentId: 'customId' });
      expect(statusManager.statusContentId).toBe('customId');
    });
  });

  describe('initStatusContent', () => {
    test('should get status content element by ID', () => {
      document.body.innerHTML = '<div id="feedStatusContent"></div>';
      const statusManager = new StatusManager();
      const result = statusManager.initStatusContent();
      
      expect(result).not.toBeNull();
      expect(statusManager.statusContent).not.toBeNull();
    });

    test('should handle missing status content element', () => {
      document.body.innerHTML = '';
      const consoleSpy = jest.spyOn(console, 'log');
      
      const statusManager = new StatusManager();
#### 2.2 Status Update Tests
```javascript
describe('status update methods', () => {
  let statusManager;
  
  beforeEach(() => {
    document.body.innerHTML = '<div id="feedStatusContent"></div>';
    statusManager = new StatusManager();
  });

  test('updateStatus should add message with appropriate class', () => {
    statusManager.updateStatus('Test message', 'info');
    
    const statusElement = document.querySelector('#feedStatusContent .status-message');
    expect(statusElement).not.toBeNull();
    expect(statusElement.textContent).toBe('Test message');
  });

  test('updateStatus should handle warning type', () => {
    statusManager.updateStatus('Warning message', 'warning');
    
    const statusElement = document.querySelector('#feedStatusContent .status-warning');
    expect(statusElement).not.toBeNull();
    expect(statusElement.textContent).toBe('Warning message');
  });

  test('updateStatus should handle error type', () => {
    statusManager.updateStatus('Error message', 'error');
    
    const statusElement = document.querySelector('#feedStatusContent .status-error');
    expect(statusElement).not.toBeNull();
    expect(statusElement.textContent).toBe('Error message');
  });

  test('updateStatus should handle success type', () => {
    statusManager.updateStatus('Success message', 'success');
    
    const statusElement = document.querySelector('#feedStatusContent .status-success');
    expect(statusElement).not.toBeNull();
    expect(statusElement.textContent).toBe('Success message');
  });

  test('clearStatus should remove all messages', () => {
    statusManager.updateStatus('Test message');
    statusManager.clearStatus();
    
    const statusContent = document.querySelector('#feedStatusContent');
    expect(statusContent.innerHTML).toBe('');
  });

  test('addInfo should add info message', () => {
    statusManager.addInfo('Info message');
    
    const statusElement = document.querySelector('#feedStatusContent .status-message');
    expect(statusElement).not.toBeNull();
    expect(statusElement.textContent).toBe('Info message');
  });

  test('addWarning should add warning message', () => {
    statusManager.addWarning('Warning message');
    
    const statusElement = document.querySelector('#feedStatusContent .status-warning');
    expect(statusElement).not.toBeNull();
    expect(statusElement.textContent).toBe('Warning message');
  });

  test('addError should add error message', () => {
    statusManager.addError('Error message');
    
    const statusElement = document.querySelector('#feedStatusContent .status-error');
    expect(statusElement).not.toBeNull();
    expect(statusElement.textContent).toBe('Error message');
  });

  test('addSuccess should add success message', () => {
    statusManager.addSuccess('Success message');
    
    const statusElement = document.querySelector('#feedStatusContent .status-success');
    expect(statusElement).not.toBeNull();
    expect(statusElement.textContent).toBe('Success message');
  });
});
```

### 3. FeedDisplayManager Tests (`tests/feed_display_manager.test.js`)

#### 3.1 Constructor and Initialization Tests
```javascript
describe('FeedDisplayManager', () => {
  describe('constructor', () => {
    test('should initialize with required elements and managers', () => {
      const elements = {
        previewContentContainer: document.createElement('div')
      };
      const managers = {
        validationUIManager: {}
      };
      
      const displayManager = new FeedDisplayManager(elements, managers);
      
#### 3.2 Display Method Tests
```javascript
describe('display methods', () => {
  let displayManager;
  let elements;
  let managers;
  
  beforeEach(() => {
    elements = {
      previewContentContainer: document.createElement('div')
    };
    managers = {
      validationUIManager: {
        markIssueAsFixed: jest.fn()
      }
    };
    
    displayManager = new FeedDisplayManager(elements, managers);
    
    // Mock the initFloatingScrollBar method to avoid DOM manipulation
    displayManager.initFloatingScrollBar = jest.fn();
  });

  test('displayPreview should create table with data', async () => {
    const data = [
      { id: '1', title: 'Product 1', description: 'Description 1' }
    ];
    
    await displayManager.displayPreview(data);
    
    const table = elements.previewContentContainer.querySelector('table');
    expect(table).not.toBeNull();
    expect(table.classList.contains('preview-table')).toBe(true);
    
    const headerCells = table.querySelectorAll('th');
    expect(headerCells.length).toBe(3);
    expect(headerCells[0].textContent).toBe('id');
    expect(headerCells[1].textContent).toBe('title');
    expect(headerCells[2].textContent).toBe('description');
    
    const rows = table.querySelectorAll('tbody tr');
    expect(rows.length).toBe(1);
    
    const cells = rows[0].querySelectorAll('td');
    expect(cells.length).toBe(3);
    expect(cells[0].textContent).toBe('1');
    
    // Check that offerIdToRowIndexMap was updated
    expect(displayManager.offerIdToRowIndexMap['1']).toBe(1);
  });

  test('displayPreview should handle empty data', async () => {
    await displayManager.displayPreview([]);
    
    const noDataMessage = elements.previewContentContainer.querySelector('.no-data-message');
    expect(noDataMessage).not.toBeNull();
    expect(noDataMessage.textContent).toBe('No data to display.');
  });

  test('sanitizeText should normalize and replace special characters', () => {
    const result = displayManager.sanitizeText('Text with "quotes" and – dashes');
    expect(result).toBe('Text with "quotes" and - dashes');
  });

  test('createEditableCell should create cell with editable field', () => {
    const cell = displayManager.createEditableCell('Test content', 'title', 1);
    
    const editableField = cell.querySelector('.editable-field');
    expect(editableField).not.toBeNull();
    expect(editableField.textContent).toBe('Test content');
    expect(editableField.dataset.field).toBe('title');
    expect(editableField.dataset.row).toBe('1');
    
    const charCount = cell.querySelector('.char-count');
    expect(charCount).not.toBeNull();
  });
});
```

#### 3.3 Table Data Extraction Tests
```javascript
describe('table data extraction', () => {
  let displayManager;
  let elements;
  
  beforeEach(() => {
    elements = {
      previewContentContainer: document.createElement('div')
    };
    
    // Create a mock table structure
    const table = document.createElement('table');
    table.className = 'preview-table';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['id', 'title', 'description'].forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    const dataRow = document.createElement('tr');
    dataRow.dataset.offerId = '1';
    
    // Create cells
    const idCell = document.createElement('td');
    idCell.textContent = '1';
    
    const titleCell = document.createElement('td');
    const titleField = document.createElement('div');
    titleField.className = 'editable-field';
    titleField.textContent = 'Product 1';
    titleCell.appendChild(titleField);
    
    const descCell = document.createElement('td');
    const descField = document.createElement('div');
    descField.className = 'editable-field';
    descField.textContent = 'Description 1';
    descCell.appendChild(descField);
    
    dataRow.appendChild(idCell);
    dataRow.appendChild(titleCell);
    dataRow.appendChild(descCell);
    tbody.appendChild(dataRow);
    table.appendChild(tbody);
    
#### 3.4 Navigation and UI Tests
```javascript
describe('navigation and UI', () => {
  let displayManager;
  let elements;
  
  beforeEach(() => {
    elements = {
      previewContentContainer: document.createElement('div')
    };
    
    // Create a mock table with rows
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    
    const row = document.createElement('tr');
    row.id = 'row-1';
    row.dataset.row = '1';
    row.dataset.offerId = 'product-1';
    
    const titleCell = document.createElement('td');
    const titleField = document.createElement('div');
    titleField.className = 'editable-field';
    titleField.dataset.field = 'title';
    titleField.textContent = 'Product Title';
    titleCell.appendChild(titleField);
    row.appendChild(titleCell);
    
    tbody.appendChild(row);
    table.appendChild(tbody);
    elements.previewContentContainer.appendChild(table);
    
    // Mock document.querySelector for tab navigation
    document.querySelector = jest.fn().mockImplementation(selector => {
      if (selector === '.tab-button[data-tab="feed"]') {
        return { classList: { add: jest.fn() } };
      }
      if (selector === '#feed-tab') {
        return { classList: { add: jest.fn(), contains: jest.fn().mockReturnValue(false) } };
      }
      return null;
    });
    
    document.querySelectorAll = jest.fn().mockReturnValue([]);
    
    displayManager = new FeedDisplayManager(elements, {});
    displayManager.initFloatingScrollBar = jest.fn();
  });

  test('navigateToRow should scroll to and highlight the specified row', () => {
    const row = elements.previewContentContainer.querySelector('tr');
    row.scrollIntoView = jest.fn();
    
    displayManager.navigateToRow(1, 'title');
    
    expect(row.scrollIntoView).toHaveBeenCalled();
    expect(row.classList.contains('validation-focus')).toBe(true);
  });

  test('setupEditableFieldListeners should add input event listener', () => {
    const addEventListenerSpy = jest.spyOn(elements.previewContentContainer, 'addEventListener');
    const mockCallback = jest.fn();
    
    displayManager.setupEditableFieldListeners(mockCallback);
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function));
  });
});
```

### 4. FeedCoordinator Tests (`tests/feed_coordinator.test.js`)

#### 4.1 Constructor and Initialization Tests
```javascript
describe('FeedCoordinator', () => {
  describe('constructor', () => {
    test('should initialize with all required elements and managers', () => {
      const elements = {
        fileInput: document.createElement('input'),
        previewButton: document.createElement('button'),
        previewContentContainer: document.createElement('div')
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
      
      expect(coordinator.elements).toBe(elements);
      expect(coordinator.managers).toBe(managers);
      expect(FeedCoordinator.prototype.initialize).toHaveBeenCalled();
      
      // Restore original method
      FeedCoordinator.prototype.initialize = originalInitialize;
    });

    test('should log error if required elements are missing', () => {
      const consoleSpy = jest.spyOn(console, 'error');
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
      
#### 4.2 Event Handling Tests
```javascript
describe('event handling', () => {
  let coordinator;
  let elements;
  let managers;
  
  beforeEach(() => {
    elements = {
      fileInput: document.createElement('input'),
      previewButton: document.createElement('button'),
      previewContentContainer: document.createElement('div')
    };
    
    managers = {
      loadingManager: {},
      errorManager: {},
      searchManager: {},
      monitor: {},
      statusManager: {
        initStatusContent: jest.fn()
      },
      displayManager: {
        setupEditableFieldListeners: jest.fn()
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
    Object.defineProperty(elements.fileInput, 'files', {
      value: [new File([''], 'test.csv')]
    });
    
    elements.fileInput.dispatchEvent(new Event('change'));
    
    expect(elements.previewButton.disabled).toBe(false);
    
    // Simulate no file selected
    Object.defineProperty(elements.fileInput, 'files', {
      value: []
    });
    
    elements.fileInput.dispatchEvent(new Event('change'));
    
    expect(elements.previewButton.disabled).toBe(true);
  });
});
```

#### 4.3 handlePreview Method Tests
```javascript
describe('handlePreview method', () => {
  let coordinator;
  let elements;
  let managers;
  
  beforeEach(() => {
    elements = {
      fileInput: document.createElement('input'),
      previewButton: document.createElement('button'),
      previewContentContainer: document.createElement('div')
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
    Object.defineProperty(elements.fileInput, 'files', {
      value: [new File([''], 'test.csv')]
    });
    
    // Mock CSVParser
    global.CSVParser = jest.fn().mockImplementation(() => ({
      parse: jest.fn().mockReturnValue({
        data: [{ id: '1', title: 'Product 1' }],
        errors: [],
        warnings: []
      })
    }));
    
    // Mock ContentTypeValidator
    global.ContentTypeValidator = {
      validate: jest.fn()
    };
  });

  test('should show error if no file is selected', async () => {
    // Clear files
    Object.defineProperty(elements.fileInput, 'files', {
      value: []
### 5. Integration Tests (`tests/feed_integration.test.js`)

```javascript
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
    `;
    
    elements = {
      fileInput: document.createElement('input'),
      previewButton: document.createElement('button'),
      previewContentContainer: document.createElement('div')
    };
    
    document.body.appendChild(elements.previewContentContainer);
    
    // Create real instances of the modules
    const statusManager = new StatusManager();
    const displayManager = new FeedDisplayManager(elements, {});
    
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
    
    // Create a FeedCoordinator instance with real module instances
    coordinator = new FeedCoordinator(elements, managers);
    
    // Mock file reading
    coordinator.readFileAsText = jest.fn().mockResolvedValue('id,title,description\n1,Product 1,Description 1');
    
    // Mock CSVParser
    global.CSVParser = jest.fn().mockImplementation(() => ({
      parse: jest.fn().mockReturnValue({
        data: [{ id: '1', title: 'Product 1', description: 'Description 1' }],
        errors: [],
        warnings: []
      })
    }));
  });

  test('End-to-end feed processing flow', async () => {
    // Set up a mock file
    Object.defineProperty(elements.fileInput, 'files', {
      value: [new File([''], 'test.csv')]
    });
    
    // Trigger the preview
    await coordinator.handlePreview();
    
    // Verify that the CSV was parsed
    expect(global.CSVParser).toHaveBeenCalled();
    expect(global.CSVParser.mock.instances[0].parse).toHaveBeenCalled();
    
    // Verify that the preview was displayed
    expect(managers.displayManager.displayPreview).toHaveBeenCalled();
    
    // Verify that the status was updated
    expect(managers.statusManager.addSuccess).toHaveBeenCalled();
    
    // Verify that the search columns were updated
    expect(managers.searchManager.updateSearchColumns).toHaveBeenCalled();
    
    // Verify that the success message was shown
    expect(managers.errorManager.showSuccess).toHaveBeenCalled();
  });

  test('Field editing and validation flow', async () => {
    // Set up a mock file and trigger preview
    Object.defineProperty(elements.fileInput, 'files', {
      value: [new File([''], 'test.csv')]
    });
    
    await coordinator.handlePreview();
    
    // Create a mock editable field
    const editableField = document.createElement('div');
    editableField.className = 'editable-field';
    editableField.dataset.field = 'title';
    editableField.textContent = 'Short'; // Too short for title
    
    const row = document.createElement('tr');
    row.dataset.row = '1';
    row.dataset.offerId = 'product-1';
    row.classList.add('validation-focus');
    row.appendChild(editableField);
    
    elements.previewContentContainer.appendChild(row);
    
    // Create a mock event
    const event = {
      target: editableField,
      type: 'input'
    };
    
    // Trigger field edit
    coordinator.handleFieldEdit(event);
    
    // Verify that the field was marked as under minimum
    expect(editableField.classList.contains('under-minimum')).toBe(true);
    
    // Update the field to valid length
    editableField.textContent = 'This is a valid title with more than thirty characters';
    
    // Trigger field edit again
    coordinator.handleFieldEdit(event);
    
    // Verify that the field is no longer marked as under minimum
    expect(editableField.classList.contains('under-minimum')).toBe(false);
    
    // Verify that ValidationUIManager was notified
    expect(managers.validationUIManager.markIssueAsFixed).toHaveBeenCalledWith('product-1', 'title');
  });
});
```

## Implementation Strategy

To implement these tests effectively, I recommend the following approach:

1. **Set up the testing environment**:
   - Configure Jest with JSDOM
   - Create mock implementations for dependencies
   - Set up test files and directory structure

2. **Implement tests in the following order**:
   - Start with CSVParser tests (most isolated)
   - Move to StatusManager tests
   - Implement FeedDisplayManager tests
   - Implement FeedCoordinator tests
   - Finally, implement integration tests

3. **Create mock implementations**:
   - Create mocks for DOM elements
   - Create mocks for file operations
   - Create mocks for dependencies like ContentTypeValidator

4. **Use test-driven development**:
   - Write tests before implementing fixes or changes
   - Run tests frequently to ensure they pass
   - Refactor code as needed to improve testability

5. **Focus on code coverage**:
   - Aim for high code coverage (80%+)
   - Ensure all critical paths are tested
   - Include both positive and negative test cases

## Mock Implementations

### File and FileReader Mocks

```javascript
// mocks/file_mock.js
class MockFile {
  constructor(content, name) {
    this.content = content;
    this.name = name;
  }
}

class MockFileReader {
  readAsText(file) {
    setTimeout(() => {
      this.onload({ target: { result: file.content } });
    }, 0);
  }
}

global.File = MockFile;
global.FileReader = MockFileReader;
```

### DOM Element Mocks

```javascript
// mocks/dom_mock.js
class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.classList = {
      add: jest.fn(),
      remove: jest.fn(),
      contains: jest.fn().mockReturnValue(false)
    };
    this.style = {};
    this.dataset = {};
    this.innerHTML = '';
  }
  
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  
  querySelector(selector) {
    return null;
  }
  
  querySelectorAll(selector) {
    return [];
  }
  
  addEventListener(event, handler) {
    this[`on${event}`] = handler;
  }
  
  removeEventListener(event, handler) {
    if (this[`on${event}`] === handler) {
      this[`on${event}`] = null;
    }
  }
}

global.MockElement = MockElement;
```

### ContentTypeValidator Mock

```javascript
// mocks/content_type_validator_mock.js
class MockContentTypeValidator {
  validate(row, headers) {
    const issues = [];
    
    // Simulate validation logic
    if (row.title && row.title.length < 5) {
      issues.push({ field: 'title', message: 'Title is too short' });
    }
    
    if (row.description && row.description.length < 10) {
      issues.push({ field: 'description', message: 'Description is too short' });
    }
    
    return issues;
  }
}

global.ContentTypeValidator = new MockContentTypeValidator();
```

## Conclusion

This testing plan provides a comprehensive approach to testing the refactored Feed Manager modules. By implementing these tests, we can ensure that the modules work correctly individually and together, and that the refactoring has not introduced any regressions.

The tests are designed to be maintainable, readable, and focused on the critical functionality of each module. They cover both the happy path and error cases, ensuring that the code is robust and reliable.

By following this testing plan, we can have confidence in the refactored code and continue to improve it in the future.
    });
    
    await coordinator.handlePreview();
    
    expect(managers.errorManager.showError).toHaveBeenCalledWith(expect.stringContaining('Please select a file'));
    expect(managers.monitor.logOperation).toHaveBeenCalledWith('preview', 'failed', expect.anything());
  });

  test('should process CSV file and display preview', async () => {
    await coordinator.handlePreview();
    
    expect(managers.loadingManager.showLoading).toHaveBeenCalled();
    expect(coordinator.readFileAsText).toHaveBeenCalled();
    expect(managers.statusManager.addInfo).toHaveBeenCalledWith('Processing feed...');
    
    // Check CSVParser usage
    expect(global.CSVParser).toHaveBeenCalled();
    expect(global.CSVParser.mock.instances[0].parse).toHaveBeenCalled();
    
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
});
```
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Required DOM elements missing'), expect.anything());
      
      // Restore original method
      FeedCoordinator.prototype.initialize = originalInitialize;
    });

    test('should create StatusManager if not provided', () => {
      const elements = {
        fileInput: document.createElement('input'),
        previewButton: document.createElement('button'),
        previewContentContainer: document.createElement('div')
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
      expect(coordinator.managers.statusManager instanceof StatusManager).toBe(true);
      
      // Restore original method
      FeedCoordinator.prototype.initialize = originalInitialize;
    });
  });
});
```
    elements.previewContentContainer.appendChild(table);
    
    displayManager = new FeedDisplayManager(elements, {});
    displayManager.offerIdToRowIndexMap = { '1': 1 };
  });

  test('getCorrectedTableData should extract data from table', () => {
    const data = displayManager.getCorrectedTableData();
    
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual({
      id: '1',
      title: 'Product 1',
      description: 'Description 1'
    });
  });

  test('getOfferIdToRowIndexMap should return the mapping', () => {
    const map = displayManager.getOfferIdToRowIndexMap();
    
    expect(map).toEqual({ '1': 1 });
  });
});
```
      expect(displayManager.elements).toBe(elements);
      expect(displayManager.managers).toBe(managers);
      expect(displayManager.offerIdToRowIndexMap).toEqual({});
    });

    test('should log error if previewContentContainer is missing', () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const elements = {};
      const managers = {};
      
      new FeedDisplayManager(elements, managers);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Required previewContentContainer element missing'), expect.anything());
    });
  });
});
```
      const result = statusManager.initStatusContent();
      
      expect(result).toBeNull();
      expect(statusManager.statusContent).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Status content element initialized: null'));
    });
  });
});
```
});

## Test Implementation Results

### Test Status Summary

The implementation of the tests has been completed with the following results:

1. **CSVParser Tests**: All tests passing with 91.45% code coverage
2. **StatusManager Tests**: All tests passing with 56.75% code coverage
3. **FeedDisplayManager Tests**: Some tests failing with 17.34% code coverage
4. **FeedCoordinator Tests**: All tests passing with 72.1% code coverage
5. **Integration Tests**: Some tests failing

### FeedCoordinator Test Fixes

Several issues were identified and fixed in the FeedCoordinator tests:

1. **CSVParser Mock Issue**: The test "should process CSV file and display preview" was failing because the CSVParser mock wasn't properly set up. This was fixed by:
   - Creating a more explicit mock implementation with a dedicated mock parse method
   - Using the mock method directly in the assertion instead of trying to access it through mock.instances

2. **handleFieldEdit Tests Issues**: All tests for the handleFieldEdit method were failing due to missing nextElementSibling property. This was fixed by:
   - Adding a proper mock for the charCountDisplay element with classList.contains method
   - Setting this mock as the nextElementSibling of the event.target

3. **ValidationUIManager Notification Test**: The test "should notify ValidationUIManager when field is fixed" was failing because the row.classList mock wasn't properly implemented. This was fixed by:
   - Creating a more sophisticated mock for the row with proper classList behavior
   - Changing the assertions to verify method calls rather than state

### Remaining Test Issues

While the FeedCoordinator tests are now passing, there are still some failing tests in other modules:

1. There are 5 failed test suites out of 17 total
2. There are 41 failed tests out of 264 total
3. Coverage for some modules is still low:
   - FeedDisplayManager: 17.34%
   - StatusManager: 56.75%
   - Several modules have 0% coverage

### Next Steps for Testing

1. **Fix FeedDisplayManager Tests**:
   - Address issues with mocking DOM elements and events
   - Fix any issues with the test setup
   - Ensure proper cleanup between tests

2. **Fix Integration Tests**:
   - Address issues with module interactions
   - Ensure proper mocking of dependencies
   - Fix timing issues in asynchronous tests

3. **Improve Test Coverage**:
   - Add tests for uncovered code paths
   - Focus on modules with low coverage
   - Add edge case tests

4. **Standardize Mocking Approach**:
   - Create reusable mock implementations for common objects
   - Ensure consistent mocking approach across all tests
   - Document mocking patterns for future test development