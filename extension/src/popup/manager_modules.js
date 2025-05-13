/**
 * manager_modules.js - Exports all manager-related modules
 * 
 * This file serves as a central point for importing and exporting all manager-related modules.
 * It helps avoid circular dependencies by providing a single entry point for these modules.
 */

// Use global manager modules
// No need to import them since they're already available globally
const FeedCoordinator = window.FeedCoordinator;
const SettingsManager = window.SettingsManager;
const BulkActionsManager = window.BulkActionsManager;

// Log that the manager modules have been imported
console.log('[DEBUG] manager_modules.js: Imported manager modules');
console.log('[DEBUG] manager_modules.js: FeedCoordinator type:', typeof FeedCoordinator);
console.log('[DEBUG] manager_modules.js: SettingsManager type:', typeof SettingsManager);
console.log('[DEBUG] manager_modules.js: BulkActionsManager type:', typeof BulkActionsManager);

// Create a manager modules object
const managerModules = {
  FeedCoordinator,
  SettingsManager,
  BulkActionsManager
};

// Make globally available for backward compatibility
window.ManagerModules = managerModules;

// Also make each module available directly on the window object
window.FeedCoordinator = FeedCoordinator;
window.SettingsManager = SettingsManager;
window.BulkActionsManager = BulkActionsManager;

// Log that the manager modules have been made globally available
console.log('[DEBUG] manager_modules.js: Manager modules made globally available');

// No export statements needed for regular scripts