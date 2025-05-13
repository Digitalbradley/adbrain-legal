/**
 * validation_libraries.js - Exports all validation library modules
 *
 * This file serves as a central point for importing and exporting all validation library modules.
 * It helps avoid circular dependencies by providing a single entry point for these modules.
 */

// Import validation libraries
// Note: For now, we'll comment out the lib imports since they're not accessible from the current path
// These will need to be properly imported in the final implementation
// import '../../lib/validation/rules.js';
// import '../../lib/validation/analyzer.js';
// import '../../lib/validation/custom_rule_validator.js';
// import '../../lib/gmc/validator.js';

// Create a validation libraries object
const validationLibraries = {
  // References will be populated by the individual modules
};

// Make globally available for backward compatibility
window.ValidationLibraries = validationLibraries;

// Log that the module has loaded
console.log('[DEBUG] validation_libraries.js loaded');

// Export the validation libraries
export default validationLibraries;