/**
 * app.js - Main entry point for ES modules
 *
 * This file serves as the entry point for ES modules in the AdBrain Feed Manager extension.
 * It imports the necessary modules and makes them available to the rest of the application.
 * It also initializes the application using the new modular architecture.
 */

// Use global utility modules
const utilityModules = window.UtilityModules;
console.log('[DEBUG] app.js: Using global utility modules');

// Use global debug module
const debug = window.debug;
console.log('[DEBUG] app.js: Using global debug module');

// Use global debounce function
const debounce = window.debounce;
console.log('[DEBUG] app.js: Using global debounce function');

// Use global StatusManager
const StatusManager = window.StatusManager;
console.log('[DEBUG] app.js: Using global StatusManager');

// Use global validation libraries
const validationLibraries = window.ValidationLibraries;
console.log('[DEBUG] app.js: Using global validation libraries');

// Use global mock modules
const mockModules = window.MockModules;
console.log('[DEBUG] app.js: Using global mock modules');

// Use global content type validator and feed display manager
const ContentTypeValidator = window.ContentTypeValidator;
console.log('[DEBUG] app.js: Using global ContentTypeValidator');

const FeedDisplayManager = window.FeedDisplayManager;
console.log('[DEBUG] app.js: Using global FeedDisplayManager');

// Use global search manager
const SearchManager = window.SearchManager;
console.log('[DEBUG] app.js: Using global SearchManager');

// Use global validation modules
const validationModules = window.ValidationModules;
console.log('[DEBUG] app.js: Using global validation modules');

// Use global manager modules
const managerModules = window.ManagerModules;
console.log('[DEBUG] app.js: Using global manager modules');

// Use global remaining modules
const remainingModules = window.RemainingModules;
console.log('[DEBUG] app.js: Using global remaining modules');

// Use global direct validation modules
const directValidationModules = window.DirectValidationModules;
console.log('[DEBUG] app.js: Using global direct validation modules');

// Use global variables for popup message handler and event handlers
console.log('[DEBUG] app.js: Using global PopupMessageHandler');
console.log('[DEBUG] app.js: Using global PopupEventHandlers');

// Use global variables for our modular components
const DOMManager = window.DOMManager;
console.log('[DEBUG] app.js: Using global DOMManager');

const ManagerFactory = window.ManagerFactory;
console.log('[DEBUG] app.js: Using global ManagerFactory');

const InitializationManager = window.InitializationManager;
console.log('[DEBUG] app.js: Using global InitializationManager');

// Extract individual validation modules for easier access
// Use global validation modules directly
const ValidationFirebaseHandler = window.ValidationFirebaseHandler;
const ValidationIssueManager = window.ValidationIssueManager;
const ValidationPanelManager = window.ValidationPanelManager;
const ValidationUIManager = window.ValidationUIManager;

// Use global manager modules directly
const FeedCoordinator = window.FeedCoordinator;
const SettingsManager = window.SettingsManager;
const BulkActionsManager = window.BulkActionsManager;

console.log('[DEBUG] app.js: Extracted ValidationFirebaseHandler:', typeof ValidationFirebaseHandler);
console.log('[DEBUG] app.js: Extracted ValidationIssueManager:', typeof ValidationIssueManager);
console.log('[DEBUG] app.js: Extracted ValidationPanelManager:', typeof ValidationPanelManager);
console.log('[DEBUG] app.js: Extracted ValidationUIManager:', typeof ValidationUIManager);
console.log('[DEBUG] app.js: Extracted FeedCoordinator:', typeof FeedCoordinator);
console.log('[DEBUG] app.js: Extracted SettingsManager:', typeof SettingsManager);
console.log('[DEBUG] app.js: Extracted BulkActionsManager:', typeof BulkActionsManager);

// Create the modules object
// Use a different name for the local variable to avoid redeclaration issues
const moduleExports = {
  // Basic modules
  debug,
  StatusManager,
  debounce,
  
  // Feature modules
  FeedDisplayManager,
  ContentTypeValidator,
  SearchManager,
  
  // Include validation modules from validationModules
  ValidationFirebaseHandler,
  ValidationIssueManager,
  ValidationPanelManager,
  ValidationUIManager,
  
  // Include manager modules from managerModules
  FeedCoordinator,
  SettingsManager,
  BulkActionsManager,
  
  // Include module groups
  utilityModules,
  validationLibraries,
  mockModules,
  remainingModules,
  directValidationModules,
  
  // Include new modular components
  DOMManager,
  ManagerFactory,
  InitializationManager
};

// Log the moduleExports object
console.log('[DEBUG] app.js: moduleExports created with keys:', Object.keys(moduleExports));

// Log that app.js has loaded
console.log('[DEBUG] app.js: ES Module entry point loaded - Phase 5.4');

// Immediately assign to window to ensure it's available
// This needs to happen before any async operations
window.AppModules = moduleExports;

// No need to explicitly assign validation modules to window here
// They are already assigned in validation_modules.js
console.log('[DEBUG] app.js: Validation modules should be available on window via validation_modules.js');
// No need to explicitly assign manager modules to window here
// They are already assigned in manager_modules.js
console.log('[DEBUG] app.js: Manager modules should be available on window via manager_modules.js');

// Log the window.AppModules object
console.log('[DEBUG] app.js: window.AppModules assigned with keys:', Object.keys(window.AppModules));

// Function to initialize the application
function initializeApplication() {
  console.log('[DEBUG] app.js: Initializing application');
  
  try {
    // Create a DOMManager instance
    const domManager = new DOMManager();
    
    // Create a ManagerFactory instance
    const managerFactory = new ManagerFactory(domManager);
    
    // Create an InitializationManager instance
    const initializationManager = new InitializationManager(domManager, managerFactory);
    
    // Initialize the application
    initializationManager.initialize().then(success => {
      if (success) {
        console.log('[DEBUG] app.js: Application initialized successfully');
        
        // Store instances globally for backward compatibility
        window.feedCoordinator = managerFactory.get('feedCoordinator');
        console.log('[DEBUG] app.js: FeedCoordinator instance stored globally');
        
        // Also set feedManager for backward compatibility
        window.feedManager = managerFactory.get('feedCoordinator');
        console.log('[DEBUG] app.js: FeedManager instance stored globally (backward compatibility)');
        
        window.validationUIManager = managerFactory.get('validationUIManager');
        console.log('[DEBUG] app.js: ValidationUIManager instance stored globally');
        
        // Initialize StatusManager
        const statusContentEl = document.getElementById('feedStatusContent');
        console.log('[DEBUG] Status content element initialized:', statusContentEl);
        if (statusContentEl) {
          window.statusManager = new StatusManager(statusContentEl);
          console.log('[StatusManager] Initialized');
        } else {
          console.error('[DEBUG] Status content element not found');
          
          // Try again after a short delay
          setTimeout(() => {
            const statusContentEl = document.getElementById('feedStatusContent');
            console.log('[DEBUG] Status content element after delay:', statusContentEl);
            if (statusContentEl) {
              window.statusManager = new StatusManager(statusContentEl);
            } else {
              console.error('[DEBUG] Status content element still not found after initialization');
            }
          }, 500);
        }
        
        console.log('[DEBUG] app.js: StatusManager initialization complete');
      } else {
        console.error('[DEBUG] app.js: Application initialization failed');
      }
    }).catch(error => {
      console.error('Application initialization failed:', error);
    });
    
    return true;
  } catch (error) {
    console.error('Application initialization failed:', error);
    return false;
  }
}

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('[DEBUG] app.js: DOMContentLoaded event fired');
  
  // Check if AppModules is available
  if (window.AppModules) {
    console.log('[DEBUG] app.js: AppModules available in DOMContentLoaded:', Object.keys(window.AppModules));
  } else {
    console.error('[DEBUG] app.js: AppModules not available in DOMContentLoaded');
  }
  
  // Initialize the application
  initializeApplication();
});

// Run delayed tests
setTimeout(() => {
  console.log('[DEBUG] Running delayed PopupManager test...');
  
  // Check if initialization was successful
  if (window.isConfigInitialized) {
    console.log('[DEBUG] Application is initialized (window.isConfigInitialized is true)');
  } else {
    console.error('[DEBUG] Application is not initialized (window.isConfigInitialized is false)');
  }
  
  // Check if FeedCoordinator is available
  if (window.feedCoordinator) {
    console.log('[DEBUG] FeedCoordinator instance is available globally');
  } else {
    console.error('[DEBUG] FeedCoordinator instance is not available globally');
  }
  
  // Check if ValidationUIManager is available
  if (window.validationUIManager) {
    console.log('[DEBUG] ValidationUIManager instance is available globally');
  } else {
    console.error('[DEBUG] ValidationUIManager instance is not available globally');
  }
  
  // Check if FeedManager is available (backward compatibility)
  if (window.feedManager) {
    console.log('[DEBUG] FeedManager instance is available globally (backward compatibility)');
  } else {
    console.error('[DEBUG] FeedManager instance is not available globally (backward compatibility)');
  }
}, 2000);

// No default export needed for regular scripts