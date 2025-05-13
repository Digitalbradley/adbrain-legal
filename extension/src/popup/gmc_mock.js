/**
 * GMC Mock Implementation
 * 
 * This module provides mock implementations of GMCApi and GMCValidator classes
 * for testing and development purposes.
 */

/**
 * Initializes mock GMC implementations in the window object.
 * This includes GMCApi and GMCValidator classes.
 */
function initializeGMCMock(options = {}) {
    // Default options
    const defaultOptions = {
        simulateAuthError: false,
        simulateValidationError: false,
        simulateNetworkError: false,
        simulateEmptyFeed: false
    };
    
    // Merge provided options with defaults
    const mockOptions = { ...defaultOptions, ...options };
    
    console.log("Initializing GMC Mock with options:", mockOptions);
    console.log("Initializing GMC Mock...");
    
    // Create mock GMCApi class if it doesn't exist
    if (typeof GMCApi === 'undefined') {
        console.log("Creating mock GMCApi class");
        window.GMCApi = class GMCApi {
            /**
             * Creates a new mock GMCApi instance
             */
            constructor() {
                console.log("Mock GMCApi created");
                this.isAuthenticated = !mockOptions.simulateAuthError;
                this.testMode = true;
                this.simulateValidationError = mockOptions.simulateValidationError;
                this.simulateNetworkError = mockOptions.simulateNetworkError;
                this.simulateEmptyFeed = mockOptions.simulateEmptyFeed;
            }
            
            /**
             * Simulates authentication with Google Merchant Center
             * @returns {Promise<Object>} A promise that resolves to a success object
             */
            authenticate() {
                try {
                    console.log("Mock GMCApi: authenticate called");
                    
                    if (this.simulateNetworkError) {
                        console.error("Mock GMCApi: Simulating network error");
                        return Promise.reject(new Error("Network error: Unable to connect to Google Merchant Center"));
                    }
                    
                    if (!this.isAuthenticated) {
                        console.error("Mock GMCApi: Simulating authentication error");
                        return Promise.reject(new Error("Authentication error: Unable to authenticate with Google Merchant Center"));
                    }
                    
                    return Promise.resolve({ success: true });
                } catch (error) {
                    console.error("Mock GMCApi: authenticate error", error);
                    return Promise.reject(error);
                }
            }
            
            /**
             * Simulates logout from Google Merchant Center
             */
            logout() { 
                try {
                    console.log("Mock GMCApi: logout called"); 
                } catch (error) {
                    console.error("Mock GMCApi: logout error", error);
                }
            }
            
            /**
             * Returns the current authentication state
             * @returns {Object} The authentication state
             */
            getAuthState() {
                return { isAuthenticated: this.isAuthenticated };
            }
            
            /**
             * Validates a feed against Google Merchant Center requirements
             * @param {Array} feedData - The feed data to validate
             * @returns {Promise<Object>} A promise that resolves to validation results
             */
            async validateFeed(feedData) {
                try {
                    console.log('Mock GMCApi: validateFeed called with', feedData);
                    
                    // Simulate network error
                    if (this.simulateNetworkError) {
                        console.error("Mock GMCApi: Simulating network error during validation");
                        throw new Error("Network error: Unable to connect to Google Merchant Center during validation");
                    }
                    
                    // Simulate validation error
                    if (this.simulateValidationError) {
                        console.error("Mock GMCApi: Simulating validation error");
                        throw new Error("Validation error: Unable to process feed data");
                    }
                    
                    // Simulate empty feed
                    if (this.simulateEmptyFeed || !feedData || feedData.length === 0) {
                        console.warn("Mock GMCApi: Empty feed detected");
                        return {
                            isValid: false,
                            totalProducts: 0,
                            validProducts: 0,
                            issues: [{
                                rowIndex: 0,
                                offerId: 'none',
                                field: 'general',
                                type: 'error',
                                message: 'Empty feed: No products found in the feed.'
                            }]
                        };
                    }
                    
                    // Simulate a delay
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Generate mock validation results
                    const mockIssues = [];
                    const totalCount = feedData.length;
                    let validCount = totalCount;
                    
                    // Add some mock issues for demonstration
                    feedData.forEach((item, index) => {
                        const rowIndex = index + 1;
                        const offerId = item.id || `mock-id-${rowIndex}`;
                        
                        // Check title length (example validation)
                        if (!item.title || item.title.length < 30) {
                            mockIssues.push({
                                rowIndex: rowIndex,
                                offerId: offerId,
                                field: 'title',
                                type: item.title ? 'warning' : 'error',
                                message: item.title ?
                                    `Title too short (${item.title.length} chars). Minimum 30 characters recommended.` :
                                    'Title is missing. This is a required field.'
                            });
                        }
                        
                        // Check description length (example validation)
                        if (!item.description || item.description.length < 90) {
                            mockIssues.push({
                                rowIndex: rowIndex,
                                offerId: offerId,
                                field: 'description',
                                type: item.description ? 'warning' : 'error',
                                message: item.description ?
                                    `Description too short (${item.description.length} chars). Minimum 90 characters recommended.` :
                                    'Description is missing. This is a required field.'
                            });
                        }
                    });
                    
                    return {
                        isValid: mockIssues.length === 0,
                        totalProducts: totalCount,
                        validProducts: validCount - mockIssues.filter(issue => issue.type === 'error').length,
                        issues: mockIssues
                    };
                } catch (error) {
                    console.error("Mock GMCApi: validateFeed error", error);
                    throw new Error(`Failed to validate feed: ${error.message}`);
                }
            }
        };
    }
    
    // Create mock GMCValidator class if it doesn't exist
    if (typeof GMCValidator === 'undefined') {
        console.log("Creating mock GMCValidator class");
        window.GMCValidator = class GMCValidator {
            /**
             * Creates a new mock GMCValidator instance
             * @param {GMCApi} gmcApi - The GMCApi instance to use for validation
             */
            constructor(gmcApi) {
                console.log("Mock GMCValidator created");
                this.gmcApi = gmcApi;
            }
            
            /**
             * Validates feed data using the GMCApi
             * @param {Array} feedData - The feed data to validate
             * @returns {Promise<Object>} A promise that resolves to validation results
             */
            async validate(feedData) {
                console.log('[GMCValidator] Initiating API validation...');
                
                // Handle empty feed case
                if (!feedData || feedData.length === 0) {
                    console.warn('[GMCValidator] No feed data provided for validation.');
                    return {
                        isValid: false,
                        totalProducts: 0,
                        validProducts: 0,
                        issues: [{
                            rowIndex: 0,
                            offerId: 'none',
                            field: 'general',
                            type: 'error',
                            message: 'Empty feed: No products found in the feed.'
                        }]
                    };
                }

                try {
                    // Call the GMCApi's validateFeed method
                    const results = await this.gmcApi.validateFeed(feedData);
                    console.log('[GMCValidator] Received API validation results:', results);
                    return results;
                } catch (error) {
                    console.error('[GMCValidator] API Validation failed:', error);
                    // Re-throw the error so the UI layer can handle it
                    throw new Error(`GMC API validation failed: ${error.message}`);
                }
            }
        };
    }
}

// Make function available globally
window.initializeGMCMock = initializeGMCMock;

// Add helper functions to simulate different error conditions
window.simulateGMCAuthError = function() {
    initializeGMCMock({ simulateAuthError: true });
};

window.simulateGMCValidationError = function() {
    initializeGMCMock({ simulateValidationError: true });
};

window.simulateGMCNetworkError = function() {
    initializeGMCMock({ simulateNetworkError: true });
};

window.simulateEmptyFeed = function() {
    initializeGMCMock({ simulateEmptyFeed: true });
};

// Reset to normal behavior
window.resetGMCMock = function() {
    initializeGMCMock();
};