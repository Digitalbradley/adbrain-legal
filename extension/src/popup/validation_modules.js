/**
 * validation_modules.js - Exports all validation-related modules
 * 
 * This file serves as a central point for importing and exporting all validation-related modules.
 * It helps avoid circular dependencies by providing a single entry point for these modules.
 */

// Use global validation modules
const ValidationFirebaseHandler = window.ValidationFirebaseHandler;
const ValidationIssueManager = window.ValidationIssueManager;
const ValidationPanelManager = window.ValidationPanelManager;
const ValidationUIManager = window.ValidationUIManager;

// Log that the validation modules have been imported
console.log('[DEBUG] validation_modules.js: Imported validation modules');
console.log('[DEBUG] validation_modules.js: ValidationFirebaseHandler type:', typeof ValidationFirebaseHandler);
console.log('[DEBUG] validation_modules.js: ValidationIssueManager type:', typeof ValidationIssueManager);
console.log('[DEBUG] validation_modules.js: ValidationPanelManager type:', typeof ValidationPanelManager);
console.log('[DEBUG] validation_modules.js: ValidationUIManager type:', typeof ValidationUIManager);

// Create a validation modules object
const validationModules = {
  ValidationFirebaseHandler,
  ValidationIssueManager,
  ValidationPanelManager,
  ValidationUIManager
};

// Make globally available for backward compatibility
window.ValidationModules = validationModules;

// Also make each module available directly on the window object
window.ValidationFirebaseHandler = ValidationFirebaseHandler;
window.ValidationIssueManager = ValidationIssueManager;
window.ValidationPanelManager = ValidationPanelManager;
window.ValidationUIManager = ValidationUIManager;

// Log that the validation modules have been made globally available
console.log('[DEBUG] validation_modules.js: Validation modules made globally available');

// No export statements needed for regular scripts