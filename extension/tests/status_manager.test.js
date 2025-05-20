// tests/status_manager.test.js
import { StatusManager } from '../src/popup/status_manager';

describe('StatusManager', () => {
  // Setup and teardown
  beforeEach(() => {
    // Create a fresh DOM environment for each test
    document.body.innerHTML = '<div id="feedStatusContent"></div>';
    
    // Spy on console methods to prevent noise in test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    
    // Restore console methods
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default options', () => {
      const statusManager = new StatusManager();
      expect(statusManager.statusContentId).toBe('feedStatusContent');
    });

    test('should initialize with custom statusContentId', () => {
      const statusManager = new StatusManager({ statusContentId: 'customId' });
      expect(statusManager.statusContentId).toBe('customId');
    });
    
    test('should call initStatusContent during initialization', () => {
      // Spy on the initStatusContent method
      jest.spyOn(StatusManager.prototype, 'initStatusContent');
      
      const statusManager = new StatusManager();
      
      expect(StatusManager.prototype.initStatusContent).toHaveBeenCalled();
      
      // Restore the original method
      StatusManager.prototype.initStatusContent.mockRestore();
    });
  });

  describe('initStatusContent', () => {
    test('should get status content element by ID', () => {
      const statusManager = new StatusManager();
      const result = statusManager.initStatusContent();
      
      expect(result).not.toBeNull();
      expect(statusManager.statusContent).not.toBeNull();
      expect(statusManager.statusContent.id).toBe('feedStatusContent');
    });

    test('should handle missing status content element', () => {
      // Remove the status content element
      document.body.innerHTML = '';
      
      const statusManager = new StatusManager();
      const result = statusManager.initStatusContent();
      
      expect(result).toBeNull();
      expect(statusManager.statusContent).toBeNull();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Status content element initialized: null'));
    });
    
    test('should try to find element again after delay if not found initially', () => {
      // Remove the status content element
      document.body.innerHTML = '';
      
      // Mock setTimeout to execute immediately
      jest.useFakeTimers();
      
      const statusManager = new StatusManager();
      
      // Add the element after initialization but before the timeout
      const element = document.createElement('div');
      element.id = 'feedStatusContent';
      document.body.appendChild(element);
      
      // Fast-forward timers
      jest.runAllTimers();
      
      // Check if the element was found after the delay
      expect(statusManager.statusContent).not.toBeNull();
      
      // Restore timers
      jest.useRealTimers();
    });
  });

  describe('status update methods', () => {
    let statusManager;
    
    beforeEach(() => {
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
    
    test('updateStatus should handle missing status content element', () => {
      // Remove the reference to the status content element
      statusManager.statusContent = null;
      
      // Spy on initStatusContent
      jest.spyOn(statusManager, 'initStatusContent').mockReturnValue(null);
      
      // Call updateStatus
      statusManager.updateStatus('Test message');
      
      // Verify initStatusContent was called
      expect(statusManager.initStatusContent).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Status content element not found'));
      
      // Restore the original method
      statusManager.initStatusContent.mockRestore();
    });

    test('clearStatus should remove all messages', () => {
      // Add some messages
      statusManager.updateStatus('Test message 1');
      statusManager.updateStatus('Test message 2');
      
      // Verify messages were added
      expect(document.querySelectorAll('#feedStatusContent .status-message').length).toBe(2);
      
      // Clear messages
      statusManager.clearStatus();
      
      // Verify messages were removed
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
    
    test('should append multiple messages of different types', () => {
      statusManager.addInfo('Info message');
      statusManager.addWarning('Warning message');
      statusManager.addError('Error message');
      statusManager.addSuccess('Success message');
      
      const infoElement = document.querySelector('#feedStatusContent .status-message');
      const warningElement = document.querySelector('#feedStatusContent .status-warning');
      const errorElement = document.querySelector('#feedStatusContent .status-error');
      const successElement = document.querySelector('#feedStatusContent .status-success');
      
      expect(infoElement).not.toBeNull();
      expect(warningElement).not.toBeNull();
      expect(errorElement).not.toBeNull();
      expect(successElement).not.toBeNull();
      
      expect(infoElement.textContent).toBe('Info message');
      expect(warningElement.textContent).toBe('Warning message');
      expect(errorElement.textContent).toBe('Error message');
      expect(successElement.textContent).toBe('Success message');
    });
  });
});