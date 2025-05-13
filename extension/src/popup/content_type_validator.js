/**
 * Content Type Validator Module
 *
 * Provides validation for different content types in feed data.
 * This module is used by the FeedManager to validate that data in each column
 * matches the expected format (e.g., URLs in link fields, text in title fields).
 *
 * Version 2.0 - Enhanced with more comprehensive validation rules
 */

// Debug flag - set to true to enable detailed logging
const DEBUG = true;

/**
 * Log debug messages if debug mode is enabled
 * @param {string} message - The message to log
 * @param {any} data - Optional data to log
 */
function debugLog(message, data) {
  if (DEBUG) {
    if (data !== undefined) {
      console.log(`[ContentTypeValidator] ${message}`, data);
    } else {
      console.log(`[ContentTypeValidator] ${message}`);
    }
  }
}

// Log that the module is being loaded
debugLog('Module loading...');

/**
 * Validation severity levels
 */
const SEVERITY = {
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Validation thresholds for different field types
 */
const THRESHOLDS = {
  title: {
    min: 30,
    max: 150,
    ideal: 70
  },
  description: {
    min: 100,
    max: 5000,
    ideal: 300
  },
  id: {
    min: 1,
    max: 50
  },
  price: {
    min: 0.01,
    max: 100000
  }
};

/**
 * Regular expressions for validation
 */
const REGEX = {
  url: /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  secureUrl: /^https:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  price: /^[0-9]+(\.[0-9]{1,2})?\s[A-Z]{3}$/,
  alphanumeric: /^[A-Za-z0-9_-]+$/,
  numeric: /^[0-9]+(\.[0-9]+)?$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
  html: /<[^>]*>/,
  specialChars: /[<>{}[\]\\\/]/
};

/**
 * Supported currencies with their symbols and decimal places
 */
const CURRENCIES = {
  USD: { symbol: '$', decimals: 2 },
  EUR: { symbol: '€', decimals: 2 },
  GBP: { symbol: '£', decimals: 2 },
  JPY: { symbol: '¥', decimals: 0 },
  CAD: { symbol: 'C$', decimals: 2 },
  AUD: { symbol: 'A$', decimals: 2 },
  CNY: { symbol: '¥', decimals: 2 },
  INR: { symbol: '₹', decimals: 2 }
};

/**
 * Content type validators for different column types.
 * Each validator has:
 * - validate function: returns true if valid, false if invalid
 * - message: human-readable message for when validation fails
 * - severity: error, warning, or info
 * - fix: optional function to suggest a fix for the issue
 */
const contentTypeValidators = {
  id: {
    validate: (value) => {
      // Must be alphanumeric with optional underscores and hyphens
      if (!REGEX.alphanumeric.test(value)) {
        return false;
      }
      
      // Check length
      if (value.length < THRESHOLDS.id.min || value.length > THRESHOLDS.id.max) {
        return false;
      }
      
      return true;
    },
    message: `should be alphanumeric (may include underscores and hyphens) and between ${THRESHOLDS.id.min}-${THRESHOLDS.id.max} characters`,
    severity: SEVERITY.ERROR,
    fix: (value) => {
      // Remove special characters and spaces
      return value.replace(/[^A-Za-z0-9_-]/g, '').substring(0, THRESHOLDS.id.max);
    }
  },
  
  title: {
    validate: (value) => {
      // Should not be a URL
      if (value.startsWith('http') || value.includes('://')) {
        return false;
      }
      
      // Should not contain HTML
      if (REGEX.html.test(value)) {
        return false;
      }
      
      // Should not contain problematic special characters
      if (REGEX.specialChars.test(value)) {
        return false;
      }
      
      // Length check is a warning, not an error, so we still return true
      return true;
    },
    message: 'should not be a URL or contain HTML or special characters',
    severity: SEVERITY.ERROR,
    fix: (value) => {
      // Remove HTML and special characters
      return value.replace(/<[^>]*>/g, '').replace(/[<>{}[\]\\\/]/g, '');
    },
    
    // Additional validators for title
    additionalValidators: [
      {
        // Check minimum length
        validate: (value) => value.length >= THRESHOLDS.title.min,
        message: `should be at least ${THRESHOLDS.title.min} characters long for better visibility`,
        severity: SEVERITY.WARNING,
        fix: null // No automatic fix for short titles
      },
      {
        // Check maximum length
        validate: (value) => value.length <= THRESHOLDS.title.max,
        message: `should not exceed ${THRESHOLDS.title.max} characters`,
        severity: SEVERITY.WARNING,
        fix: (value) => value.substring(0, THRESHOLDS.title.max)
      },
      {
        // Check for all caps
        validate: (value) => !(value === value.toUpperCase() && value.length > 5),
        message: 'should not be ALL CAPS (appears like shouting)',
        severity: SEVERITY.INFO,
        fix: (value) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
      }
    ]
  },
  
  description: {
    validate: (value) => {
      // Should not be a URL
      if (value.startsWith('http') || value.includes('://')) {
        return false;
      }
      
      // Should not contain problematic special characters
      if (REGEX.specialChars.test(value)) {
        return false;
      }
      
      // Length check is a warning, not an error, so we still return true
      return true;
    },
    message: 'should not be a URL or contain special characters',
    severity: SEVERITY.ERROR,
    fix: (value) => {
      // Remove special characters
      return value.replace(/[<>{}[\]\\\/]/g, '');
    },
    
    // Additional validators for description
    additionalValidators: [
      {
        // Check minimum length
        validate: (value) => value.length >= THRESHOLDS.description.min,
        message: `should be at least ${THRESHOLDS.description.min} characters long for better visibility`,
        severity: SEVERITY.WARNING,
        fix: null // No automatic fix for short descriptions
      },
      {
        // Check maximum length
        validate: (value) => value.length <= THRESHOLDS.description.max,
        message: `should not exceed ${THRESHOLDS.description.max} characters`,
        severity: SEVERITY.WARNING,
        fix: (value) => value.substring(0, THRESHOLDS.description.max)
      },
      {
        // Check for HTML (allowed but flagged as info)
        validate: (value) => !REGEX.html.test(value),
        message: 'contains HTML tags which may not be supported by all platforms',
        severity: SEVERITY.INFO,
        fix: (value) => value.replace(/<[^>]*>/g, '')
      }
    ]
  },
  
  link: {
    validate: (value) => {
      // Must be a valid URL
      if (!value.startsWith('http') || !value.includes('://')) {
        return false;
      }
      
      // More comprehensive URL validation
      if (!REGEX.url.test(value)) {
        return false;
      }
      
      return true;
    },
    message: 'should be a valid URL (starting with http:// or https://)',
    severity: SEVERITY.ERROR,
    fix: (value) => {
      // Try to fix common URL issues
      if (!value.startsWith('http')) {
        return 'https://' + value;
      }
      return value;
    },
    
    // Additional validators for link
    additionalValidators: [
      {
        // Check for secure URL (HTTPS)
        validate: (value) => value.startsWith('https://'),
        message: 'should use HTTPS for security (instead of HTTP)',
        severity: SEVERITY.WARNING,
        fix: (value) => value.replace(/^http:\/\//i, 'https://')
      }
    ]
  },
  
  image_link: {
    validate: (value) => {
      // Must be a valid URL
      if (!value.startsWith('http') || !value.includes('://')) {
        return false;
      }
      
      // More comprehensive URL validation
      if (!REGEX.url.test(value)) {
        return false;
      }
      
      return true;
    },
    message: 'should be a valid URL (starting with http:// or https://)',
    severity: SEVERITY.ERROR,
    fix: (value) => {
      // Try to fix common URL issues
      if (!value.startsWith('http')) {
        return 'https://' + value;
      }
      return value;
    },
    
    // Additional validators for image_link
    additionalValidators: [
      {
        // Check for secure URL (HTTPS)
        validate: (value) => value.startsWith('https://'),
        message: 'should use HTTPS for security (instead of HTTP)',
        severity: SEVERITY.WARNING,
        fix: (value) => value.replace(/^http:\/\//i, 'https://')
      },
      {
        // Check for common image extensions
        validate: (value) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(value),
        message: 'URL does not end with a common image extension (.jpg, .png, etc.)',
        severity: SEVERITY.INFO,
        fix: null // No automatic fix for image extensions
      }
    ]
  },
  
  price: {
    validate: (value) => {
      // Must match price format (number followed by currency code)
      if (!REGEX.price.test(value)) {
        return false;
      }
      
      // Extract the numeric part and currency code
      const parts = value.split(' ');
      const amount = parseFloat(parts[0]);
      const currency = parts[1];
      
      // Check if currency is supported
      if (!CURRENCIES[currency]) {
        return false;
      }
      
      // Check if amount is within reasonable range
      if (amount < THRESHOLDS.price.min || amount > THRESHOLDS.price.max) {
        return false;
      }
      
      // Check if decimal places match currency requirements
      const decimalPlaces = (parts[0].split('.')[1] || '').length;
      if (decimalPlaces !== CURRENCIES[currency].decimals) {
        return false;
      }
      
      return true;
    },
    message: `should be a number followed by a currency code (e.g., "100.00 USD") with correct decimal places`,
    severity: SEVERITY.ERROR,
    fix: (value) => {
      // Try to fix common price format issues
      const numericMatch = value.match(/(\d+(\.\d+)?)/);
      const currencyMatch = value.match(/[A-Z]{3}/);
      
      if (numericMatch && currencyMatch) {
        const amount = parseFloat(numericMatch[0]);
        const currency = currencyMatch[0];
        
        if (CURRENCIES[currency]) {
          // Format with correct decimal places
          return amount.toFixed(CURRENCIES[currency].decimals) + ' ' + currency;
        } else {
          // Default to USD if currency not recognized
          return amount.toFixed(2) + ' USD';
        }
      }
      
      return value;
    }
  },
  
  availability: {
    validate: (value) => {
      const validValues = ['in stock', 'out of stock', 'preorder', 'backorder'];
      return validValues.includes(value.toLowerCase());
    },
    message: 'should be one of: "in stock", "out of stock", "preorder", "backorder"',
    severity: SEVERITY.ERROR,
    fix: (value) => {
      // Try to fix common availability issues
      const lowerValue = value.toLowerCase();
      
      if (lowerValue.includes('stock')) {
        return lowerValue.includes('out') ? 'out of stock' : 'in stock';
      }
      
      if (lowerValue.includes('pre') || lowerValue.includes('order')) {
        return 'preorder';
      }
      
      if (lowerValue.includes('back')) {
        return 'backorder';
      }
      
      // Default to in stock if can't determine
      return 'in stock';
    }
  },
  
  condition: {
    validate: (value) => {
      const validValues = ['new', 'used', 'refurbished'];
      return validValues.includes(value.toLowerCase());
    },
    message: 'should be one of: "new", "used", "refurbished"',
    severity: SEVERITY.ERROR,
    fix: (value) => {
      // Try to fix common condition issues
      const lowerValue = value.toLowerCase();
      
      if (lowerValue.includes('new') || lowerValue.includes('brand')) {
        return 'new';
      }
      
      if (lowerValue.includes('used') || lowerValue.includes('second') || lowerValue.includes('open')) {
        return 'used';
      }
      
      if (lowerValue.includes('refurb') || lowerValue.includes('renew') || lowerValue.includes('recondition')) {
        return 'refurbished';
      }
      
      // Default to new if can't determine
      return 'new';
    }
  },
  
  gtin: {
    validate: (value) => {
      // GTIN can be 8, 12, 13, or 14 digits
      return /^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(value);
    },
    message: 'should be a valid GTIN (8, 12, 13, or 14 digits)',
    severity: SEVERITY.WARNING,
    fix: (value) => {
      // Extract digits only
      const digits = value.replace(/\D/g, '');
      
      // If we have a valid length, return it
      if ([8, 12, 13, 14].includes(digits.length)) {
        return digits;
      }
      
      // Otherwise, can't fix
      return value;
    }
  },
  
  mpn: {
    validate: (value) => {
      // MPN should be alphanumeric and not too long
      return REGEX.alphanumeric.test(value) && value.length <= 70;
    },
    message: 'should be alphanumeric (may include underscores and hyphens) and not exceed 70 characters',
    severity: SEVERITY.WARNING,
    fix: (value) => {
      // Remove special characters and limit length
      return value.replace(/[^A-Za-z0-9_-]/g, '').substring(0, 70);
    }
  },
  
  brand: {
    validate: (value) => {
      // Brand should not be too short or contain special characters
      return value.length >= 2 && !REGEX.specialChars.test(value);
    },
    message: 'should be at least 2 characters and not contain special characters',
    severity: SEVERITY.WARNING,
    fix: (value) => {
      // Remove special characters
      return value.replace(/[<>{}[\]\\\/]/g, '');
    }
  }
};

/**
 * Validates content types for a row of data.
 * 
 * @param {Object} row - The row data object with field names as keys
 * @param {Array<string>} headers - Array of header names
 * @returns {Array} - Array of content type issues, empty if no issues
 */
function validateContentTypes(row, headers) {
  debugLog('Validating content types for row', row);
  const contentTypeIssues = [];
  
  headers.forEach(header => {
    if (header && contentTypeValidators[header]) {
      const value = row[header];
      
      // Skip empty values
      if (!value) {
        return;
      }
      
      const validator = contentTypeValidators[header];
      
      // Run the main validator
      if (!validator.validate(value)) {
        contentTypeIssues.push({
          field: header,
          value: value,
          message: validator.message,
          severity: validator.severity,
          fixedValue: validator.fix ? validator.fix(value) : null
        });
      }
      
      // Run additional validators if they exist
      if (validator.additionalValidators) {
        validator.additionalValidators.forEach(additionalValidator => {
          if (!additionalValidator.validate(value)) {
            contentTypeIssues.push({
              field: header,
              value: value,
              message: additionalValidator.message,
              severity: additionalValidator.severity,
              fixedValue: additionalValidator.fix ? additionalValidator.fix(value) : null
            });
          }
        });
      }
    }
  });
  
  debugLog(`Found ${contentTypeIssues.length} content type issues`, contentTypeIssues);
  return contentTypeIssues;
}

/**
 * Formats content type issues into a human-readable message.
 * 
 * @param {Array} issues - Array of content type issues
 * @returns {string} - Formatted message
 */
function formatContentTypeIssues(issues) {
  return issues.map(issue => {
    const severityPrefix = issue.severity === SEVERITY.ERROR ? '[ERROR] ' : 
                          issue.severity === SEVERITY.WARNING ? '[WARNING] ' : 
                          '[INFO] ';
    return `${severityPrefix}${issue.field} ${issue.message}`;
  }).join(', ');
}

/**
 * Groups issues by severity
 * 
 * @param {Array} issues - Array of content type issues
 * @returns {Object} - Object with issues grouped by severity
 */
function groupIssuesBySeverity(issues) {
  const grouped = {
    [SEVERITY.ERROR]: [],
    [SEVERITY.WARNING]: [],
    [SEVERITY.INFO]: []
  };
  
  issues.forEach(issue => {
    grouped[issue.severity].push(issue);
  });
  
  return grouped;
}

/**
 * Gets suggested fixes for issues
 * 
 * @param {Array} issues - Array of content type issues
 * @returns {Object} - Object with field names as keys and fixed values as values
 */
function getSuggestedFixes(issues) {
  const fixes = {};
  
  issues.forEach(issue => {
    if (issue.fixedValue) {
      fixes[issue.field] = issue.fixedValue;
    }
  });
  
  return fixes;
}

/**
 * Validates a specific field against its validator
 * 
 * @param {string} field - The field name
 * @param {string} value - The field value
 * @returns {Array} - Array of issues, empty if no issues
 */
function validateField(field, value) {
  const issues = [];
  
  if (contentTypeValidators[field]) {
    const validator = contentTypeValidators[field];
    
    // Skip empty values
    if (!value) {
      return issues;
    }
    
    // Run the main validator
    if (!validator.validate(value)) {
      issues.push({
        field: field,
        value: value,
        message: validator.message,
        severity: validator.severity,
        fixedValue: validator.fix ? validator.fix(value) : null
      });
    }
    
    // Run additional validators if they exist
    if (validator.additionalValidators) {
      validator.additionalValidators.forEach(additionalValidator => {
        if (!additionalValidator.validate(value)) {
          issues.push({
            field: field,
            value: value,
            message: additionalValidator.message,
            severity: additionalValidator.severity,
            fixedValue: additionalValidator.fix ? additionalValidator.fix(value) : null
          });
        }
      });
    }
  }
  
  return issues;
}

/**
 * Adds a custom validator for a field
 * 
 * @param {string} field - The field name
 * @param {Object} validator - The validator object
 * @returns {boolean} - True if successful, false otherwise
 */
function addCustomValidator(field, validator) {
  // Ensure validator has required properties
  if (!validator.validate || typeof validator.validate !== 'function' || 
      !validator.message || !validator.severity) {
    debugLog('Invalid validator', validator);
    return false;
  }
  
  // Create the field if it doesn't exist
  if (!contentTypeValidators[field]) {
    contentTypeValidators[field] = {
      validate: validator.validate,
      message: validator.message,
      severity: validator.severity,
      fix: validator.fix,
      additionalValidators: []
    };
  } else {
    // Add as an additional validator if the field exists
    if (!contentTypeValidators[field].additionalValidators) {
      contentTypeValidators[field].additionalValidators = [];
    }
    
    contentTypeValidators[field].additionalValidators.push(validator);
  }
  
  debugLog(`Added custom validator for ${field}`, validator);
  return true;
}

/**
 * Export the module functionality
 */
const ContentTypeValidator = {
  validators: contentTypeValidators,
  validate: validateContentTypes,
  validateField: validateField,
  formatIssues: formatContentTypeIssues,
  groupIssuesBySeverity: groupIssuesBySeverity,
  getSuggestedFixes: getSuggestedFixes,
  addCustomValidator: addCustomValidator,
  SEVERITY,
  THRESHOLDS
};

/**
 * Add a direct test function to verify the validator is working
 */
ContentTypeValidator.testWarningDisplay = function() {
  debugLog('Running direct test of ContentTypeValidator');
  
  // Create a test ErrorManager if it doesn't exist
  if (!window.testErrorManager) {
    debugLog('Creating test ErrorManager');
    window.testErrorManager = new ErrorManager();
  }
  
  // Test with some sample data
  const testRow = {
    id: 'test123',
    title: 'https://example.com/this-is-a-url-in-title',
    description: 'This is a normal description',
    link: 'not-a-valid-url',
    image_link: 'https://example.com/image.jpg',
    price: 'invalid price format',
    availability: 'unknown status',
    condition: 'like-new'
  };
  
  const headers = ['id', 'title', 'description', 'link', 'image_link', 'price', 'availability', 'condition'];
  
  // Run validation
  const issues = ContentTypeValidator.validate(testRow, headers);
  debugLog('Test validation found issues:', issues);
  
  // Display warning
  if (issues.length > 0) {
    const warningMessage = `TEST WARNING: Content type issues detected: ${ContentTypeValidator.formatIssues(issues)}`;
    debugLog('Displaying test warning:', warningMessage);
    window.testErrorManager.showWarning(warningMessage, 20000);
  }
};

// For backward compatibility, make it globally available
window.ContentTypeValidator = ContentTypeValidator;

debugLog('Module loaded and available globally');

// Run a self-test on load to verify the module is working correctly
window.addEventListener('DOMContentLoaded', () => {
  debugLog('Running self-test on DOMContentLoaded');
  setTimeout(() => {
    if (window.ContentTypeValidator) {
      debugLog('Self-test - Module is available in window object');
      
      // Create a test row with content type issues
      const testRow = {
        id: 'test123',
        title: 'https://example.com/this-is-a-url-in-title',
        description: 'This is a normal description',
        link: 'not-a-valid-url',
        image_link: 'https://example.com/image.jpg',
        price: 'invalid price format',
        availability: 'unknown status',
        condition: 'like-new'
      };
      
      const headers = ['id', 'title', 'description', 'link', 'image_link', 'price', 'availability', 'condition'];
      
      // Run validation
      const issues = ContentTypeValidator.validate(testRow, headers);
      debugLog('Self-test validation found issues:', issues);
      
      if (issues.length > 0) {
        debugLog('Self-test passed - Found issues as expected');
        
        // Group issues by severity
        const groupedIssues = ContentTypeValidator.groupIssuesBySeverity(issues);
        debugLog('Grouped issues:', groupedIssues);
        
        // Get suggested fixes
        const fixes = ContentTypeValidator.getSuggestedFixes(issues);
        debugLog('Suggested fixes:', fixes);
      } else {
        console.error('Self-test failed - No issues found when issues were expected');
      }
    } else {
      console.error('Self-test failed - Module not available in window object');
    }
  }, 1000); // Wait 1 second to ensure all scripts are loaded
});

// Make globally available for backward compatibility
window.ContentTypeValidator = ContentTypeValidator;