/**
 * remaining_modules.js - Exports all remaining modules
 *
 * This file serves as a central point for importing and exporting all remaining modules
 * that don't fit into other categories.
 */

// No need to import remaining modules
// They are already loaded via script tags in the HTML

// Create a remaining modules object
const remainingModules = {
  // References will be populated by the individual modules
};

// Make globally available for backward compatibility
window.RemainingModules = remainingModules;

// Log that the module has loaded
console.log('[DEBUG] remaining_modules.js loaded');

// No default export needed for regular scripts