// tests/mocks/feed_test_mocks.js

/**
 * Mock implementations for testing the Feed Manager modules.
 * This file provides mock implementations for File, FileReader, DOM elements, and ContentTypeValidator.
 */

// Mock File and FileReader
export class MockFile {
  constructor(content, name) {
    this.content = content;
    this.name = name;
    this.size = content.length;
    this.type = name.endsWith('.csv') ? 'text/csv' : 'text/plain';
  }
}

export class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
  }

  readAsText(file) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: file.content } });
      }
    }, 0);
  }
}

// Mock DOM Elements
export class MockElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.classList = {
      add: jest.fn(className => {
        if (!this.className) this.className = '';
        if (!this.className.includes(className)) {
          this.className += (this.className ? ' ' : '') + className;
        }
      }),
      remove: jest.fn(className => {
        if (this.className) {
          this.className = this.className
            .split(' ')
            .filter(c => c !== className)
            .join(' ');
        }
      }),
      contains: jest.fn(className => {
        return this.className && this.className.split(' ').includes(className);
      })
    };
    this.style = {};
    this.dataset = {};
    this.innerHTML = '';
    this.className = '';
    this.id = '';
  }
  
  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }
  
  querySelector(selector) {
    // Simple selector implementation for testing
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      if (this.id === id) return this;
      for (const child of this.children) {
        if (child.querySelector && typeof child.querySelector === 'function') {
          const result = child.querySelector(selector);
          if (result) return result;
        }
      }
    } else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      if (this.className && this.className.split(' ').includes(className)) return this;
      for (const child of this.children) {
        if (child.querySelector && typeof child.querySelector === 'function') {
          const result = child.querySelector(selector);
          if (result) return result;
        }
      }
    } else if (selector.includes('.')) {
      // Handle element.class selector
      const [element, className] = selector.split('.');
      if (this.tagName === element.toUpperCase() && 
          this.className && this.className.split(' ').includes(className)) {
        return this;
      }
      for (const child of this.children) {
        if (child.querySelector && typeof child.querySelector === 'function') {
          const result = child.querySelector(selector);
          if (result) return result;
        }
      }
    } else {
      // Element selector
      if (this.tagName === selector.toUpperCase()) return this;
      for (const child of this.children) {
        if (child.querySelector && typeof child.querySelector === 'function') {
          const result = child.querySelector(selector);
          if (result) return result;
        }
      }
    }
    return null;
  }
  
  querySelectorAll(selector) {
    const results = [];
    
    // Simple selector implementation for testing
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      if (this.id === id) results.push(this);
    } else if (selector.startsWith('.')) {
      const className = selector.substring(1);
      if (this.className && this.className.split(' ').includes(className)) {
        results.push(this);
      }
    } else if (selector.includes('.')) {
      // Handle element.class selector
      const [element, className] = selector.split('.');
      if (this.tagName === element.toUpperCase() && 
          this.className && this.className.split(' ').includes(className)) {
        results.push(this);
      }
    } else {
      // Element selector
      if (this.tagName === selector.toUpperCase()) results.push(this);
    }
    
    // Search children
    for (const child of this.children) {
      if (child.querySelectorAll && typeof child.querySelectorAll === 'function') {
        const childResults = child.querySelectorAll(selector);
        results.push(...childResults);
      }
    }
    
    return results;
  }
  
  addEventListener(event, handler) {
    if (!this.eventListeners) this.eventListeners = {};
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(handler);
  }
  
  removeEventListener(event, handler) {
    if (this.eventListeners && this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(h => h !== handler);
    }
  }
  
  dispatchEvent(event) {
    if (this.eventListeners && this.eventListeners[event.type]) {
      for (const handler of this.eventListeners[event.type]) {
        handler(event);
      }
    }
    
    // Bubble up if bubbles is true
    if (event.bubbles && this.parentNode && this.parentNode.dispatchEvent) {
      this.parentNode.dispatchEvent(event);
    }
    
    return !event.defaultPrevented;
  }
  
  focus() {
    // Mock focus behavior
  }
  
  scrollIntoView() {
    // Mock scrollIntoView behavior
  }
  
  closest(selector) {
    // Check if this element matches
    if (this.matches(selector)) return this;
    
    // Check parent
    if (this.parentNode && this.parentNode.closest) {
      return this.parentNode.closest(selector);
    }
    
    return null;
  }
  
  matches(selector) {
    // Simple implementation for testing
    if (selector.startsWith('#')) {
      return this.id === selector.substring(1);
    } else if (selector.startsWith('.')) {
      return this.className && this.className.split(' ').includes(selector.substring(1));
    } else if (selector.includes('.')) {
      const [element, className] = selector.split('.');
      return this.tagName === element.toUpperCase() && 
             this.className && this.className.split(' ').includes(className);
    } else {
      return this.tagName === selector.toUpperCase();
    }
  }
}

// Mock ContentTypeValidator
export class MockContentTypeValidator {
  constructor() {
    this.validators = {
      id: {
        validate: (value) => /^[A-Za-z0-9_-]+$/.test(value),
        message: 'should be alphanumeric (may include underscores and hyphens)'
      },
      title: {
        validate: (value) => !value.startsWith('http') && !value.includes('://'),
        message: 'should not be a URL'
      },
      description: {
        validate: (value) => !value.startsWith('http') && !value.includes('://'),
        message: 'should not be a URL'
      },
      link: {
        validate: (value) => value.startsWith('http') && value.includes('://'),
        message: 'should be a valid URL (starting with http:// or https://)'
      },
      image_link: {
        validate: (value) => value.startsWith('http') && value.includes('://'),
        message: 'should be a valid URL (starting with http:// or https://)'
      }
    };
  }
  
  validate(row, headers) {
    const issues = [];
    
    headers.forEach(header => {
      if (header && this.validators[header]) {
        const value = row[header];
        if (value && !this.validators[header].validate(value)) {
          issues.push({
            field: header,
            value: value,
            message: this.validators[header].message
          });
        }
      }
    });
    
    return issues;
  }
  
  formatIssues(issues) {
    return issues.map(issue => `${issue.field} ${issue.message}`).join(', ');
  }
}

// Mock Manager Factory
export function createMockManagers() {
  return {
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
      addWarning: jest.fn(),
      addError: jest.fn(),
      addSuccess: jest.fn(),
      clearStatus: jest.fn()
    },
    displayManager: {
      displayPreview: jest.fn().mockResolvedValue(undefined),
      setupEditableFieldListeners: jest.fn(),
      getOfferIdToRowIndexMap: jest.fn().mockReturnValue({ '1': 1 }),
      getCorrectedTableData: jest.fn().mockReturnValue([{ id: '1', title: 'Product 1', description: 'Description 1' }]),
      getAppliedCorrections: jest.fn().mockReturnValue([]),
      navigateToRow: jest.fn()
    },
    validationUIManager: {
      markIssueAsFixed: jest.fn()
    }
  };
}

// Helper function to create a mock CSV string
export function createMockCSV(headers, rows) {
  const headerLine = headers.join(',');
  const rowLines = rows.map(row => 
    headers.map(header => row[header] || '').join(',')
  );
  
  return [headerLine, ...rowLines].join('\n');
}