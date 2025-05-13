/**
 * direct_validation_modules.js - Exports all direct validation modules
 *
 * This file serves as a central point for importing and exporting all direct validation modules.
 * It helps avoid circular dependencies by providing a single entry point for these modules.
 */

// No need to import direct validation modules
// They are already loaded via script tags in the HTML

// Create a direct validation modules object
const directValidationModules = {
  // References will be populated by the individual modules
};

// Make globally available for backward compatibility
window.DirectValidationModules = directValidationModules;

// Log that the module has loaded
console.log('[DEBUG] direct_validation_modules.js loaded');

// No default export needed for regular scripts