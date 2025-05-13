/**
 * Debug module to check if scripts are loaded
 *
 * This module provides debugging utilities and logs debug information
 * when imported.
 */

// Create a debug object with utility functions
const debug = {
    // Log a debug message with a timestamp
    log: function(message) {
        const timestamp = new Date().toISOString().substring(11, 23); // HH:MM:SS.sss
        console.log(`[DEBUG ${timestamp}] ${message}`);
        return message; // Return for chaining
    },
    
    // Check if an element exists in the DOM
    checkElement: function(selector) {
        const element = document.querySelector(selector);
        this.log(`Element ${selector}: ${element ? 'Found' : 'Not found'}`);
        return element;
    },
    
    // Get information about the current environment
    getEnvironmentInfo: function() {
        const info = {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            windowSize: `${window.innerWidth}x${window.innerHeight}`,
            modules: Object.keys(window).filter(key => key.includes('Manager'))
        };
        this.log(`Environment info: ${JSON.stringify(info, null, 2)}`);
        return info;
    },
    
    // Test if a module is loaded
    testModule: function(moduleName) {
        const isLoaded = window[moduleName] !== undefined;
        this.log(`Module ${moduleName}: ${isLoaded ? 'Loaded' : 'Not loaded'}`);
        return isLoaded;
    }
};

// Log that the module is loaded
debug.log('debug.js loaded');
debug.log('LoadingIndicator available: ' + !!window.LoadingIndicator);

// Log DOMContentLoaded event but don't add conflicting event listeners
document.addEventListener('DOMContentLoaded', function() {
    debug.log('DOMContentLoaded in debug.js');
    const previewButton = debug.checkElement('#previewFeed');
    if (previewButton) {
        debug.log('Found previewFeed button in debug.js');
        // Don't add a direct click listener here as it conflicts with FeedManager
        // Just log that we found the button
    }
});

// For backward compatibility
window.debug = debug;

// No default export needed for regular scripts