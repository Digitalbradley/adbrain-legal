// tests/feed_display_manager.test.js
import { FeedDisplayManager } from '../src/popup/feed_display_manager';

// Mock debounce function to execute immediately
jest.mock('../src/popup/feed_display_manager', () => {
  const originalModule = jest.requireActual('../src/popup/feed_display_manager');
  
  // Replace the debounce function with one that executes immediately
  const mockDebounce = (fn) => (...args) => fn(...args);
  
  return {
    ...originalModule,
    debounce: mockDebounce
  };
});

describe('FeedDisplayManager', () => {
  // Setup and teardown
  beforeEach(() => {
    // Create a fresh DOM environment for each test
    document.body.innerHTML = `
      <div class="data-container"></div>
      <div class="floating-scroll">
        <div class="scroll-track">
          <div class="scroll-thumb"></div>
        </div>
      </div>
    `;
    
    // Helper function to create fully mocked DOM elements
    global.createMockElement = (tagName) => {
      // Create a base mock element
      const element = {
        tagName: tagName.toUpperCase(),
        children: [],
        style: {},
        dataset: {},
        textContent: '',
        innerHTML: '',
        contentEditable: 'false',
        
        // Mock DOM methods
        appendChild: jest.fn(child => {
          element.children.push(child);
          return child;
        }),
        
        // Mock querySelector and querySelectorAll
        querySelector: jest.fn(selector => {
          // For .no-data-message
          if (selector === '.no-data-message') {
            return { textContent: 'No data to display.' };
          }
          
          // For .editable-field
          if (selector.includes('.editable-field')) {
            const field = createMockElement('div');
            field.className = 'editable-field';
            field.dataset.field = selector.includes('title') ? 'title' : 'description';
            return field;
          }
          
          // For tr
          if (selector === 'tr') {
            const tr = createMockElement('tr');
            tr.id = 'row-1';
            tr.dataset.row = '1';
            return tr;
          }
          
          // For table
          if (selector === 'table') {
            return createMockElement('table');
          }
          
          return null;
        }),
        
        querySelectorAll: jest.fn(selector => {
          if (selector === 'th') {
            return [
              { textContent: 'id' },
              { textContent: 'title' },
              { textContent: 'description' }
            ];
          }
          
          if (selector === 'tbody tr') {
            return [createMockElement('tr')];
          }
          
          if (selector === 'td') {
            return [
              { textContent: '1' },
              { textContent: 'Product 1' },
              { textContent: 'Description 1' }
            ];
          }
          
          return [];
        }),
        
        // Mock classList
        classList: {
          add: jest.fn(),
          remove: jest.fn(),
          contains: jest.fn(() => false),
          toggle: jest.fn()
        },
        
        // Mock events
        addEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
        
        // Mock other methods
        scrollIntoView: jest.fn(),
        focus: jest.fn(),
        closest: jest.fn(() => null)
      };
      
      // Add table-specific methods
      if (tagName.toLowerCase() === 'table') {
        element.className = 'preview-table';
        
        element.createTHead = jest.fn(() => {
          const thead = createMockElement('thead');
          thead.insertRow = jest.fn(() => {
            const tr = createMockElement('tr');
            tr.className = 'table-header';
            return tr;
          });
          return thead;
        });
        
        element.createTBody = jest.fn(() => {
          const tbody = createMockElement('tbody');
          tbody.insertRow = jest.fn(() => {
            const tr = createMockElement('tr');
            tr.id = 'row-1';
            tr.dataset = { row: '1', offerId: 'product-1' };
            tr.insertCell = jest.fn(() => {
              const td = createMockElement('td');
              return td;
            });
            return tr;
          });
          return tbody;
        });
      }
      
      return element;
    };
    
    // Spy on console methods to prevent noise in test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    
    // Remove global helper
    delete global.createMockElement;
    
    // Restore console methods
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with required elements and managers', () => {
      const elements = {
        previewContentContainer: createMockElement('div')
      };
      const managers = {
        validationUIManager: {}
      };
      
      const displayManager = new FeedDisplayManager(elements, managers);
      
      expect(displayManager.elements).toBe(elements);
      expect(displayManager.managers).toBe(managers);
      expect(displayManager.offerIdToRowIndexMap).toEqual({});
    });

    test('should log error if previewContentContainer is missing', () => {
      const elements = {
        previewContentContainer: null
      };
      const managers = {};
      
      const displayManager = new FeedDisplayManager(elements, managers);
      
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Required previewContentContainer element missing'), expect.anything());
    });
  });

  describe('display methods', () => {
    let displayManager;
    let elements;
    let managers;
    
    beforeEach(() => {
      elements = {
        previewContentContainer: createMockElement('div')
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
    
    test('displayPreview should handle missing container', async () => {
      // Remove the container reference
      displayManager.elements.previewContentContainer = null;
      
      await displayManager.displayPreview([{ id: '1', title: 'Product 1' }]);
      
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Preview container not found'));
    });
    
    test('displayPreview should create editable cells for title and description', async () => {
      const data = [
        { id: '1', title: 'Product 1', description: 'Description 1', link: 'http://example.com' }
      ];
      
      await displayManager.displayPreview(data);
      
      const titleCell = elements.previewContentContainer.querySelector('td .editable-field[data-field="title"]');
      const descriptionCell = elements.previewContentContainer.querySelector('td .editable-field[data-field="description"]');
      const linkCell = elements.previewContentContainer.querySelector('td:nth-child(4)');
      
      expect(titleCell).not.toBeNull();
      expect(descriptionCell).not.toBeNull();
      expect(linkCell).not.toBeNull();
      
      expect(titleCell.textContent).toBe('Product 1');
      expect(descriptionCell.textContent).toBe('Description 1');
      expect(linkCell.textContent).toBe('http://example.com');
      
      // Check that title and description are editable but link is not
      expect(titleCell.contentEditable).toBe('true');
      expect(descriptionCell.contentEditable).toBe('true');
      expect(linkCell.contentEditable).not.toBe('true');
    });
    
    test('displayPreview should run post-display validation on editable fields', async () => {
      const data = [
        { id: '1', title: 'Short', description: 'Short desc' }
      ];
      
      // Mock setTimeout to execute immediately
      jest.useFakeTimers();
      
      await displayManager.displayPreview(data);
      
      // Fast-forward timers
      jest.runAllTimers();
      
      const titleField = elements.previewContentContainer.querySelector('.editable-field[data-field="title"]');
      const descriptionField = elements.previewContentContainer.querySelector('.editable-field[data-field="description"]');
      
      expect(titleField.classList.contains('under-minimum')).toBe(true);
      expect(descriptionField.classList.contains('under-minimum')).toBe(true);
      
      // Restore timers
      jest.useRealTimers();
    });

    test('sanitizeText should normalize and replace special characters', () => {
      const result = displayManager.sanitizeText('Text with "quotes" and – dashes');
      expect(result).toBe('Text with "quotes" and - dashes');
    });
    
    test('sanitizeText should handle non-string input', () => {
      expect(displayManager.sanitizeText(null)).toBe('');
      expect(displayManager.sanitizeText(undefined)).toBe('');
      expect(displayManager.sanitizeText(123)).toBe('');
      expect(displayManager.sanitizeText({})).toBe('');
    });
  });

  describe('createEditableCell', () => {
    let displayManager;
    
    beforeEach(() => {
      const elements = {
        previewContentContainer: createMockElement('div')
      };
      const managers = {};
      
      displayManager = new FeedDisplayManager(elements, managers);
    });
    
    test('should create cell with editable field', () => {
      const cell = displayManager.createEditableCell('Test content', 'title', 1);
      
      const editableField = cell.querySelector('.editable-field');
      expect(editableField).not.toBeNull();
      expect(editableField.textContent).toBe('Test content');
      expect(editableField.dataset.field).toBe('title');
      expect(editableField.dataset.row).toBe('1');
      
      const charCount = cell.querySelector('.char-count');
      expect(charCount).not.toBeNull();
    });
    
    test('should apply validation classes based on content length for title', () => {
      // Title under minimum length (30 characters)
      const shortCell = displayManager.createEditableCell('Short title', 'title', 1);
      const shortField = shortCell.querySelector('.editable-field');
      const shortCharCount = shortCell.querySelector('.char-count');
      
      expect(shortField.classList.contains('under-minimum')).toBe(true);
      expect(shortCharCount.style.color).toBe('rgb(220, 53, 69)'); // Red
      
      // Title with valid length
      const validCell = displayManager.createEditableCell('This is a valid title with more than thirty characters', 'title', 1);
      const validField = validCell.querySelector('.editable-field');
      const validCharCount = validCell.querySelector('.char-count');
      
      expect(validField.classList.contains('under-minimum')).toBe(false);
      expect(validCharCount.style.color).toBe('rgb(40, 167, 69)'); // Green
    });
    
    test('should apply validation classes based on content length for description', () => {
      // Description under minimum length (90 characters)
      const shortCell = displayManager.createEditableCell('Short description', 'description', 1);
      const shortField = shortCell.querySelector('.editable-field');
      
      expect(shortField.classList.contains('under-minimum')).toBe(true);
      
      // Description with valid length
      const longDescription = 'This is a valid description with more than ninety characters. It needs to be quite long to pass validation. This should be enough characters.';
      const validCell = displayManager.createEditableCell(longDescription, 'description', 1);
      const validField = validCell.querySelector('.editable-field');
      
      expect(validField.classList.contains('under-minimum')).toBe(false);
    });
    
    test('should update validation state on input', () => {
      // Create a cell with short content
      const cell = displayManager.createEditableCell('Short', 'title', 1);
      const field = cell.querySelector('.editable-field');
      
      // Verify initial state
      expect(field.classList.contains('under-minimum')).toBe(true);
      
      // Update content to valid length
      field.textContent = 'This is a valid title with more than thirty characters';
      
      // Trigger input event
      const inputEvent = new Event('input', { bubbles: true });
      field.dispatchEvent(inputEvent);
      
      // Verify updated state
      expect(field.classList.contains('under-minimum')).toBe(false);
    });
  });

  describe('table data extraction', () => {
    let displayManager;
    let elements;
    
    beforeEach(() => {
      elements = {
        previewContentContainer: createMockElement('div')
      };
      
      // Create a mock table structure
      const table = createMockElement('table');
      table.className = 'preview-table';
      
      const thead = createMockElement('thead');
      const headerRow = createMockElement('tr');
      ['id', 'title', 'description'].forEach(header => {
        const th = createMockElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      
      const tbody = createMockElement('tbody');
      const dataRow = createMockElement('tr');
      dataRow.dataset.offerId = '1';
      
      // Create cells
      const idCell = createMockElement('td');
      idCell.textContent = '1';
      
      const titleCell = createMockElement('td');
      const titleField = createMockElement('div');
      titleField.className = 'editable-field';
      titleField.textContent = 'Product 1';
      titleCell.appendChild(titleField);
      
      const descCell = createMockElement('td');
      const descField = createMockElement('div');
      descField.className = 'editable-field';
      descField.textContent = 'Description 1';
      descCell.appendChild(descField);
      
      dataRow.appendChild(idCell);
      dataRow.appendChild(titleCell);
      dataRow.appendChild(descCell);
      tbody.appendChild(dataRow);
      table.appendChild(tbody);
      
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
    
    test('getCorrectedTableData should handle missing table', () => {
      // Remove the table
      elements.previewContentContainer.innerHTML = '';
      
      const data = displayManager.getCorrectedTableData();
      
      expect(data).toHaveLength(0);
      expect(console.warn).toHaveBeenCalledWith('No data table found for getCorrectedTableData');
    });

    test('getOfferIdToRowIndexMap should return the mapping', () => {
      const map = displayManager.getOfferIdToRowIndexMap();
      
      expect(map).toEqual({ '1': 1 });
    });
    
    test('getAppliedCorrections should return empty array (placeholder)', () => {
      const corrections = displayManager.getAppliedCorrections();
      
      expect(corrections).toEqual([]);
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('getAppliedCorrections() is a placeholder'));
    });
  });

  describe('navigation and UI', () => {
    let displayManager;
    let elements;
    
    beforeEach(() => {
      elements = {
        previewContentContainer: createMockElement('div')
      };
      
      // Create a mock table with rows
      const table = createMockElement('table');
      const tbody = createMockElement('tbody');
      
      const row = createMockElement('tr');
      row.id = 'row-1';
      row.dataset.row = '1';
      row.dataset.offerId = 'product-1';
      
      const titleCell = createMockElement('td');
      const titleField = createMockElement('div');
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
          return { classList: { add: jest.fn(), remove: jest.fn() } };
        }
        if (selector === '#feed-tab') {
          return { classList: { add: jest.fn(), remove: jest.fn(), contains: jest.fn().mockReturnValue(false) } };
        }
        return null;
      });
      
      document.querySelectorAll = jest.fn().mockReturnValue([]);
      
      const managers = {
        validationUIManager: {
          markIssueAsFixed: jest.fn()
        }
      };
      
      displayManager = new FeedDisplayManager(elements, managers);
      displayManager.initFloatingScrollBar = jest.fn();
    });

    test('navigateToRow should scroll to and highlight the specified row', () => {
      const row = elements.previewContentContainer.querySelector('tr');
      
      displayManager.navigateToRow(1, 'title');
      
      expect(row.scrollIntoView).toHaveBeenCalled();
      expect(row.classList.contains('validation-focus')).toBe(true);
    });
    
    test('navigateToRow should handle missing row', () => {
      displayManager.navigateToRow(999, 'title');
      
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Row with index 999 not found'));
    });
    
    test('navigateToRow should focus specific field if provided', () => {
      // Mock setTimeout to execute immediately
      jest.useFakeTimers();
      
      const field = elements.previewContentContainer.querySelector('.editable-field');
      
      displayManager.navigateToRow(1, 'title');
      
      // Fast-forward timers
      jest.runAllTimers();
      
      expect(field.focus).toHaveBeenCalled();
      
      // Restore timers
      jest.useRealTimers();
    });
    
    test('navigateToRow should handle missing field', () => {
      // Mock setTimeout to execute immediately
      jest.useFakeTimers();
      
      displayManager.navigateToRow(1, 'nonexistent');
      
      // Fast-forward timers
      jest.runAllTimers();
      
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Could not find field "nonexistent" in row 1'));
      
      // Restore timers
      jest.useRealTimers();
    });

    test('setupEditableFieldListeners should add input event listener', () => {
      const addEventListenerSpy = jest.spyOn(elements.previewContentContainer, 'addEventListener');
      const mockCallback = jest.fn();
      
      displayManager.setupEditableFieldListeners(mockCallback);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function));
    });
    
    test('setupEditableFieldListeners should call callback when editable field is changed', () => {
      const mockCallback = jest.fn();
      displayManager.setupEditableFieldListeners(mockCallback);
      
      // Create an input event on an editable field
      const field = elements.previewContentContainer.querySelector('.editable-field');
      const inputEvent = new Event('input', { bubbles: true });
      field.dispatchEvent(inputEvent);
      
      expect(mockCallback).toHaveBeenCalled();
      expect(mockCallback.mock.calls[0][0].target).toBe(field);
    });
  });
});