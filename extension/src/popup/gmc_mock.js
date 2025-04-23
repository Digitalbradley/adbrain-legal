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
function initializeGMCMock() {
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
                this.isAuthenticated = true;
                this.testMode = true;
            }
            
            /**
             * Simulates authentication with Google Merchant Center
             * @returns {Promise<Object>} A promise that resolves to a success object
             */
            authenticate() { 
                try {
                    console.log("Mock GMCApi: authenticate called");
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
                return { isAuthenticated: true }; 
            }
            
            /**
             * Validates a feed against Google Merchant Center requirements
             * @param {Array} feedData - The feed data to validate
             * @returns {Promise<Object>} A promise that resolves to validation results
             */
            async validateFeed(feedData) {
                try {
                    console.log('Mock GMCApi: validateFeed called with', feedData);
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
                        if (item.title && item.title.length < 30) {
                            mockIssues.push({
                                rowIndex: rowIndex,
                                offerId: offerId,
                                field: 'title',
                                type: 'warning',
                                message: `Title too short (${item.title.length} chars). Minimum 30 characters recommended.`
                            });
                        }
                        
                        // Check description length (example validation)
                        if (item.description && item.description.length < 90) {
                            mockIssues.push({
                                rowIndex: rowIndex,
                                offerId: offerId,
                                field: 'description',
                                type: 'warning',
                                message: `Description too short (${item.description.length} chars). Minimum 90 characters recommended.`
                            });
                        }
                    });
                    
                    return {
                        isValid: mockIssues.length === 0,
                        totalProducts: totalCount,
                        validProducts: validCount - mockIssues.length,
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
                if (!feedData || feedData.length === 0) {
                    console.warn('[GMCValidator] No feed data provided for validation.');
                    return {
                        isValid: true,
                        totalProducts: 0,
                        validProducts: 0,
                        issues: []
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