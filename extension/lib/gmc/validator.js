/**
 * Handles validation of feed data by calling the GMCApi.
 * This class acts as a bridge between the UI and the API validation logic.
 */
class GMCValidator {
    /**
     * @param {GMCApi} gmcApi - An instance of the GMCApi class.
     */
    constructor(gmcApi) {
        if (!gmcApi) {
            throw new Error("GMCValidator requires an instance of GMCApi.");
        }
        this.gmcApi = gmcApi;
        // Removed local validationRules
    }

    /**
     * Validates the provided feed data using the GMCApi.
     * @param {Array<object>} feedData - Array of product objects.
     * @returns {Promise<object>} - Validation results from GMCApi.
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
            // Directly call the GMCApi's validateFeed method
            const results = await this.gmcApi.validateFeed(feedData);
            console.log('[GMCValidator] Received API validation results:', results);

            // The GMCApi.validateFeed should already return the data in the desired format:
            // { isValid, totalProducts, validProducts, issues }
            // where issues is an array of { rowIndex, field, type, message }
            return results;

        } catch (error) {
            console.error('[GMCValidator] API Validation failed:', error);
            // Re-throw the error so the UI layer can handle it
            throw new Error(`GMC API validation failed: ${error.message}`);
        }
    }

    // Removed unused validateFeed method (simulation)
    // Removed performLocalValidation method
    // Removed validateItem method
    // Removed isValidPrice method
    // Removed isValidUrl method
    // Removed processGMCValidation method
    // Removed generateTestFeed method

} // End of GMCValidator class

// Make it globally available (consider using modules if refactoring further)
window.GMCValidator = GMCValidator;