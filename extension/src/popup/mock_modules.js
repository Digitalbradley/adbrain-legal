/**
 * mock_modules.js - Exports all mock implementation modules
 *
 * This file serves as a central point for importing and exporting all mock implementation modules.
 * It helps avoid circular dependencies by providing a single entry point for these modules.
 */

// No need to import mock modules
// They are already loaded via script tags in the HTML

// Create a mock modules object
const mockModules = {
  // References will be populated by the individual modules
};

// Make globally available for backward compatibility
window.MockModules = mockModules;

// Log that the module has loaded
console.log('[DEBUG] mock_modules.js loaded');

// No default export needed for regular scripts