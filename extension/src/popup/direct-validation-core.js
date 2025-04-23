/**
 * Direct Validation Core Module
 *
 * This module serves as the entry point and orchestrator for the direct validation functionality.
 * It initializes event listeners and coordinates between other modules.
 */
(function() {
    console.log('[DIRECT DEBUG] Direct validation core module IIFE started');
    /**
     * Handles direct validation when the Validate Feed button is clicked
     */
    function handleDirectValidation() {
        console.log('[DIRECT] Validate Feed button clicked');
        
        // Get the feed data from the table
        const feedData = window.DirectValidationData.getTableData();
        
        if (!feedData || !feedData.length) {
            alert('Please load a feed first before validating.');
            return;
        }
        
        console.log('[DIRECT] Validating feed data with', feedData.length, 'rows');
        
        // Show loading indicator
        window.DirectValidationLoading.showLoading('Validating feed...');
        
        // Simulate validation process
        setTimeout(() => {
            console.log('[DIRECT DEBUG] About to call validateFeedData with feedData:', feedData);
            
            // Perform basic validation
            const validationResults = window.DirectValidationData.validateFeedData(feedData);
            console.log('[DIRECT DEBUG] Validation results returned:', validationResults);
            
            // Hide loading indicator
            window.DirectValidationLoading.hideLoading();
            
            // Display validation results
            console.log('[DIRECT DEBUG] About to display validation results');
            window.DirectValidationUI.displayValidationResults(validationResults);
            
            console.log('[DIRECT] Validation complete');
        }, 1000); // Simulate processing time
    }
    
    /**
     * Initializes event listeners for the direct validation functionality
     */
    function initializeEventListeners() {
        console.log('[DIRECT DEBUG] initializeEventListeners called');
        console.log('[DIRECT] Adding direct event listener to Validate Feed button');
        
        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', function() {
            console.log('[DIRECT DEBUG] DOMContentLoaded event fired in initializeEventListeners');
            const validateButton = document.getElementById('validateGMC');
            console.log('[DIRECT DEBUG] validateButton element:', validateButton);
            
            if (validateButton) {
                console.log('[DIRECT] Found Validate Feed button, adding click listener');
                validateButton.addEventListener('click', handleDirectValidation);
            } else {
                console.error('[DIRECT] Validate Feed button not found');
            }
        });
    }
    
    /**
     * Initializes the direct validation functionality
     */
    function initialize() {
        console.log('[DIRECT DEBUG] initialize function called');
        console.log('[DIRECT] Initializing direct validation core module');
        
        // Check if all required modules are available
        console.log('[DIRECT DEBUG] Checking for required modules');
        console.log('[DIRECT DEBUG] DirectValidationData available:', !!window.DirectValidationData);
        if (!window.DirectValidationData) {
            console.error('[DIRECT] DirectValidationData module not found');
            return;
        }
        
        console.log('[DIRECT DEBUG] DirectValidationUI available:', !!window.DirectValidationUI);
        if (!window.DirectValidationUI) {
            console.error('[DIRECT] DirectValidationUI module not found');
            return;
        }
        
        console.log('[DIRECT DEBUG] DirectValidationHistory available:', !!window.DirectValidationHistory);
        if (!window.DirectValidationHistory) {
            console.error('[DIRECT] DirectValidationHistory module not found');
            return;
        }
        
        console.log('[DIRECT DEBUG] DirectValidationTabs available:', !!window.DirectValidationTabs);
        if (!window.DirectValidationTabs) {
            console.error('[DIRECT] DirectValidationTabs module not found');
            return;
        }
        
        console.log('[DIRECT DEBUG] DirectValidationLoading available:', !!window.DirectValidationLoading);
        if (!window.DirectValidationLoading) {
            console.error('[DIRECT] DirectValidationLoading module not found');
            return;
        }
        
        // Initialize event listeners
        initializeEventListeners();
        
        console.log('[DIRECT] Direct validation core module initialized');
    }
    
    // Export functions to global scope
    window.DirectValidationCore = {
        handleDirectValidation: handleDirectValidation,
        initialize: initialize
    };
    
    // Initialize the module
    document.addEventListener('DOMContentLoaded', function() {
        console.log('[DIRECT DEBUG] DOMContentLoaded event fired for initialize');
        console.log('[DIRECT DEBUG] DirectValidationCore available:', !!window.DirectValidationCore);
        window.DirectValidationCore.initialize();
    });
    
    console.log('[DIRECT] Core module loaded');
    
    // Add a direct click handler to the button as a fallback
    setTimeout(() => {
        console.log('[DIRECT DEBUG] Adding fallback click handler after timeout');
        const validateButton = document.getElementById('validateGMC');
        if (validateButton) {
            console.log('[DIRECT DEBUG] Found validate button in fallback, adding click handler');
            validateButton.addEventListener('click', function() {
                console.log('[DIRECT DEBUG] Validate button clicked via fallback handler');
                if (window.DirectValidationCore && window.DirectValidationCore.handleDirectValidation) {
                    window.DirectValidationCore.handleDirectValidation();
                } else {
                    console.error('[DIRECT DEBUG] DirectValidationCore or handleDirectValidation not available in fallback');
                }
            });
        } else {
            console.error('[DIRECT DEBUG] Validate button not found in fallback');
        }
    }, 1000);
})();