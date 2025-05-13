/**
 * utility_modules.js - Exports all utility library modules
 *
 * This file serves as a central point for importing and exporting all utility library modules.
 * It helps avoid circular dependencies by providing a single entry point for these modules.
 */

// Import utility modules
// Note: For now, we'll comment out the lib imports since they're not accessible from the current path
// These will need to be properly imported in the final implementation
// import '../../lib/ui/loading.js';
// import '../../lib/ui/errors.js';
// import '../../lib/ui/tables.js';
// Use script tags in HTML instead of import statements
// No need to import loading-indicator.js here

// Create a utility modules object
const utilityModules = {
  // References will be populated by the individual modules
};

// Make globally available for backward compatibility
window.UtilityModules = utilityModules;

// Log that the module has loaded
console.log('[DEBUG] utility_modules.js loaded');

// No default export needed for regular scripts