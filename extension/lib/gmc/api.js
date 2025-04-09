class GMCApi { // Remove export keyword
    constructor() {
        this.API_BASE_URL = 'https://shoppingcontent.googleapis.com/content/v2.1';
        this.OAUTH_SCOPES = [ // Request both content API and user email scopes
            'https://www.googleapis.com/auth/content',
            'https://www.googleapis.com/auth/userinfo.email'
        ];
        // CLIENT_ID is defined in manifest.json, no need to duplicate here
        this.merchantId = null;
        this.accessToken = null;
        this.isAuthenticated = false;
        this.testMode = true; // <<< ADDED Test Mode Flag (set true to enable)
        this.TEST_MERCHANT_ID = 'TEST-ACCOUNT-123'; // <<< ADDED Mock Merchant ID
    }

    /**
     * Initializes the API client by attempting to load stored credentials.
     * Returns true if authentication details are loaded, false otherwise.
     */
    async initialize() {
        try {
            console.log('Initializing GMCApi...');
            // Use chrome.storage.local for storing auth data
            const data = await chrome.storage.local.get(['gmc_token', 'gmc_merchant_id']);

            if (data.gmc_token && data.gmc_merchant_id) {
                console.log('Found stored credentials.');
                // Verify token validity (optional, chrome.identity usually handles caching/refresh)
                // For simplicity, we assume the stored token is usable if present.
                // A more robust check would involve making a test API call.
                this.accessToken = data.gmc_token;
                this.merchantId = data.gmc_merchant_id;
                this.isAuthenticated = true;
                console.log('GMCApi initialized with stored credentials. Merchant ID:', this.merchantId);
                return true;
            } else {
                console.log('No stored credentials found.');
                this.isAuthenticated = false;
                return false;
            }
        } catch (error) {
            console.error('Error initializing GMC API:', error);
            this.isAuthenticated = false;
            // Don't throw here, allow the app to potentially trigger authentication
            return false;
        }
    }

    // Removed isTokenValid method - rely on chrome.identity

    /**
     * Initiates the authentication flow using chrome.identity.
     * Fetches the auth token and merchant ID, stores them, and updates state.
     * Returns true on success, throws error on failure.
     */
    async authenticate() {
        console.log('Starting GMC authentication...');
        // --- ADDED Test Mode Check ---
        if (this.testMode) {
            console.log('Running in test mode - simulating authentication.');
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
            this.accessToken = 'test-token-' + Date.now();
            this.merchantId = this.TEST_MERCHANT_ID;
            this.isAuthenticated = true;
            // Simulate storing mock credentials
            try {
                await chrome.storage.local.set({
                    gmc_token: this.accessToken,
                    gmc_merchant_id: this.merchantId
                });
                console.log('Test credentials stored in chrome.storage.local');
            } catch(e){ console.error("Failed to store test credentials", e); }
            console.log('Test authentication successful. Merchant ID:', this.merchantId);
            return true;
        }
        // --- End Test Mode Check ---

        // --- Real Authentication Flow ---
        try {
            if (!chrome || !chrome.identity) {
                throw new Error('Chrome identity API not available. Ensure extension context.');
            }

            // 1. Get Auth Token using chrome.identity
            const token = await new Promise((resolve, reject) => {
                chrome.identity.getAuthToken({
                    interactive: true,
                    scopes: this.OAUTH_SCOPES // Use defined scopes
                }, (token) => {
                    if (chrome.runtime.lastError) {
                        console.error('chrome.identity.getAuthToken error:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message || 'Authentication failed'));
                    } else if (!token) {
                        reject(new Error('Authentication failed: No token received.'));
                    } else {
                        resolve(token);
                    }
                });
            });

            console.log('Auth token received.');
            this.accessToken = token; // Store token temporarily

            // --- ADDED: Fetch email to verify token scope ---
            try {
                const emailResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!emailResponse.ok) throw new Error(`Email fetch failed: ${emailResponse.statusText}`);
                const emailData = await emailResponse.json();
                console.log('Successfully fetched email:', emailData.email); // Log email
            } catch (emailError) {
                console.error('Failed to fetch user email:', emailError);
                // Don't necessarily fail the whole auth process, but log it
            }
            // --- END ADDED ---

            // 2. Fetch Merchant ID
            const merchantData = await this.fetchMerchantInfo(token); // Pass token explicitly
            console.log('Received merchantData:', JSON.stringify(merchantData, null, 2)); // ADDED LOGGING

            if (!merchantData || !merchantData.accountIdentifiers || !merchantData.accountIdentifiers.length) { // Added check for merchantData itself
                console.error('Merchant data is missing or accountIdentifiers array is empty/missing.'); // More specific log
                throw new Error('No merchant account found. Please ensure you have access to Google Merchant Center.');
            }

            const fetchedMerchantId = merchantData.accountIdentifiers[0].merchantId;
            console.log('Merchant ID fetched:', fetchedMerchantId);

            // 3. Store Token and Merchant ID securely
            await chrome.storage.local.set({
                gmc_token: token,
                gmc_merchant_id: fetchedMerchantId
            });
            console.log('Credentials stored in chrome.storage.local');

            // 4. Update instance state
            this.merchantId = fetchedMerchantId;
            this.isAuthenticated = true;

            return true; // Indicate success

        } catch (error) {
            console.error('Authentication process failed. Original error:', error); // Log original error
            // Clear any potentially partially set state
            await this.logout(); // Ensure clean state on failure
            // Re-throw a potentially more user-friendly error, or the original if preferred
            // throw error; // Option 1: Re-throw original
            // Option 2: Throw specific error based on known conditions
            if (error.message?.includes('No merchant account found')) {
                throw error; // Re-throw the specific error message we already check for
            } else {
                throw new Error(`Authentication failed: ${error.message}`); // Throw a generic one
            }
        }
    }

    /**
     * Fetches merchant account information using a provided auth token.
     * @param {string} token - The OAuth token to use for the request.
     * @returns {Promise<object>} - The account auth info response.
     */
    async fetchMerchantInfo(token) {
        console.log('Fetching merchant info...');
        const response = await fetch(
            `${this.API_BASE_URL}/accounts/authinfo`,
            {
                headers: {
                    'Authorization': `Bearer ${token}` // Use the passed token
                }
            }
        );

        console.log(`Merchant info response status: ${response.status} ${response.statusText}`); // ADDED LOG

        if (!response.ok) {
            const errorBody = await response.text(); // Read body as text on error
            console.error(`Failed to fetch merchant info: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Failed to fetch merchant info: ${response.statusText}`);
        }

        // Try parsing JSON, but catch errors
        try {
            const merchantData = await response.json();
            // console.log('Merchant data received:', merchantData); // Moved log to authenticate
            return merchantData;
        } catch (jsonError) {
            console.error('Failed to parse merchant info JSON:', jsonError);
            const responseText = await response.text(); // Try reading as text again if json failed
            console.error('Merchant info response text:', responseText);
            throw new Error('Failed to parse merchant info response from Google.');
        }
    }

    /**
     * Clears authentication state and stored credentials.
     */
    async logout() {
        console.log('Logging out...');
        const tokenToClear = this.accessToken; // Store token before clearing state

        // Reset instance state first
        this.accessToken = null;
        this.merchantId = null;
        this.isAuthenticated = false;

        try {
            // Clear stored data (works for both real and test mode)
            await chrome.storage.local.remove(['gmc_token', 'gmc_merchant_id']);
            console.log('Stored credentials removed from chrome.storage.local.');
        } catch (error) {
            console.error('Error removing stored credentials:', error);
        }

        // If not in test mode, also try to remove cached token from identity API
        if (!this.testMode && tokenToClear && chrome.identity?.removeCachedAuthToken) {
            try {
                await new Promise((resolve) => { // No reject needed, just log warning
                    chrome.identity.removeCachedAuthToken({ token: tokenToClear }, () => {
                        if (chrome.runtime.lastError) {
                             console.warn('Error removing cached auth token:', chrome.runtime.lastError.message);
                        } else {
                             console.log('Cached token potentially removed from chrome.identity.');
                        }
                        resolve();
                    });
                });
            } catch (error) { // Catch potential promise rejection if API unavailable
                console.warn('Could not attempt to remove cached auth token:', error);
            }
        }

        console.log('GMCApi state cleared.');
    }

    /**
     * Retrieves the current access token, attempting to refresh if necessary.
     * Note: Relies on chrome.identity to handle token caching and refreshing.
     * @returns {Promise<string>} The valid access token.
     * @throws {Error} If authentication is required or token retrieval fails.
     */
    async getToken() {
        if (!this.isAuthenticated && !(await this.initialize())) {
            // If not authenticated and initialization (loading stored token) fails,
            // try to authenticate interactively.
            console.log('Not authenticated, attempting interactive authentication...');
            await this.authenticate(); // This will throw if it fails
        } else if (!this.accessToken) {
            // If authenticated but token isn't in memory (e.g., after background script restart),
            // try fetching it non-interactively first.
            console.log('Token not in memory, attempting non-interactive fetch...');
            try {
                this.accessToken = await new Promise((resolve, reject) => {
                    chrome.identity.getAuthToken({ interactive: false, scopes: this.OAUTH_SCOPES }, (token) => {
                        if (chrome.runtime.lastError || !token) {
                            reject(new Error(chrome.runtime.lastError?.message || 'Failed to get token non-interactively'));
                        } else {
                            resolve(token);
                        }
                    });
                });
                console.log('Non-interactive token fetch successful.');
            } catch (nonInteractiveError) {
                console.warn('Non-interactive token fetch failed, trying interactive:', nonInteractiveError);
                // If non-interactive fails, trigger full interactive auth
                await this.authenticate(); // This will throw if it fails
            }
        }

        if (!this.accessToken) {
            throw new Error('Authentication required.');
        }
        return this.accessToken;
    }

    // Removed getAuthUrl, handleAuthCode, exchangeCodeForToken, fetchMerchantId (integrated into authenticate)

    /**
     * Validates feed data against Google Content API using products.insert with dryRun=true.
     * Note: This makes one API call per product, which can be slow for large feeds.
     * Consider using products.custombatch for actual inserts/updates followed by status checks
     * for better performance in production scenarios.
     * @param {Array<object>} feedData - Array of product objects from the feed.
     * @returns {Promise<object>} - Validation results including isValid, counts, and issues.
     */
    async validateFeed(feedData) {
        // --- ADDED Test Mode Check ---
        if (this.testMode) {
            console.log(`Running validateFeed in test mode for ${feedData?.length || 0} products.`);
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
            return this.generateMockValidationResults(feedData); // Need to add this helper method
        }
        // --- End Test Mode Check ---

        console.log(`Attempting real feed validation for ${feedData?.length || 0} products...`); // Use optional chaining
        if (!this.merchantId) {
            await this.getToken(); // Ensure merchantId is loaded/fetched if needed
            if (!this.merchantId) throw new Error("Merchant ID not available for validation.");
        }

        const allIssues = [];
        let validCount = 0;
        const totalCount = feedData.length;
        const validationUrl = `${this.API_BASE_URL}/${this.merchantId}/products?dryRun=true`;

        // Process products sequentially to avoid overwhelming the API or browser limits
        // Consider Promise.allSettled with concurrency limits for larger feeds if needed.
        for (let i = 0; i < totalCount; i++) {
            const item = feedData[i];
            const productPayload = this.formatProductForGMC(item);
            const rowIndex = i + 1; // 1-based index for reporting

            try {
                console.log(`Validating product ${rowIndex}/${totalCount} (ID: ${item.id || 'N/A'})...`);
                // products.insert with dryRun returns the product resource, including potential issues
                const response = await this.makeAuthenticatedRequest(
                    validationUrl,
                    {
                        method: 'POST',
                        body: JSON.stringify(productPayload)
                    }
                );

                // Check for issues in the response (even with 200 OK)
                if (response && response.issues && response.issues.length > 0) {
                    console.log(`Issues found for product ${rowIndex}:`, response.issues);
                    response.issues.forEach(issue => {
                        allIssues.push({
                            rowIndex: rowIndex,
                            field: issue.attributeName || 'general', // Map API field name if possible
                            type: issue.severity || 'error', // 'error', 'warning', 'info'
                            message: issue.description || 'Unknown validation issue'
                        });
                    });
                } else if (response) {
                    // If response exists and has no issues array or it's empty
                    validCount++;
                } else {
                    // Handle unexpected null response (shouldn't happen on 200 OK for insert)
                    console.warn(`Received unexpected null response for product ${rowIndex}`);
                    allIssues.push({
                        rowIndex: rowIndex,
                        field: 'general',
                        type: 'error',
                        message: 'Received unexpected null response during validation.'
                    });
                }

            } catch (error) {
                console.error(`Validation failed for product ${rowIndex} (ID: ${item.id || 'N/A'}):`, error);
                // Add a general error for this product
                allIssues.push({
                    rowIndex: rowIndex,
                    field: 'general',
                    type: 'error',
                    message: `API request failed during validation: ${error.message}`
                });
                // Optionally, re-throw if a single failure should stop the whole process
                // throw error;
            }
        } // End loop

        console.log(`Validation completed. Valid: ${validCount}, Issues: ${allIssues.length}`);

        return {
            isValid: allIssues.filter(issue => issue.type === 'error').length === 0, // Consider only errors for overall validity
            totalProducts: totalCount,
            validProducts: validCount,
            issues: allIssues // Return all issues (errors, warnings, info)
        };
    }

    /**
     * Formats a single product item for GMC API requests.
     * Ensures required fields like targetCountry, contentLanguage, channel are present.
     * @param {object} product - The product data from the feed.
     * @returns {object} - Formatted product data.
     */
    formatProductForGMC(product) {
        // Ensure basic required fields for Content API
        return {
            offerId: product.id, // Use 'id' as 'offerId'
            title: product.title,
            description: product.description,
            link: product.link,
            imageLink: product.image_link,
            availability: product.availability,
            price: {
                value: product.price?.split(' ')[0], // Extract numeric value
                currency: product.price?.split(' ')[1] // Extract currency
            },
            brand: product.brand,
            condition: product.condition,
            gtin: product.gtin, // Include optional fields if present
            mpn: product.mpn,
            googleProductCategory: product.google_product_category,
            // --- Mandatory fields for Content API ---
            targetCountry: 'US', // Assuming US, make configurable if needed
            contentLanguage: 'en', // Assuming en, make configurable if needed
            channel: 'online' // Assuming online
        };
    }

    // Removed parseGMCResponse (needs replacement based on actual validation endpoint)
    // Add parseGMCBatchResponse if using products/batch endpoint
    parseGMCBatchResponse(response) {
        console.log("Parsing GMC Batch Response:", response);
        const issues = [];
        let validCount = 0;
        const totalCount = response.entries?.length || 0;

        response.entries?.forEach(entry => {
            if (entry.errors) {
                entry.errors.errors?.forEach(error => {
                    issues.push({
                        // batchId corresponds to the original index
                        rowIndex: entry.batchId + 1,
                        // Attempt to map error reason to a field, otherwise generic
                        field: error.reason || 'general',
                        type: 'error', // Batch API usually only reports errors
                        message: error.message
                    });
                });
            } else {
                validCount++;
            }
        });

        return {
            isValid: issues.length === 0,
            totalProducts: totalCount,
            validProducts: validCount,
            issues: issues
        };
    }


    /**
     * Makes an authenticated request to the GMC API.
     * Handles token retrieval/refresh automatically.
     * @param {string} url - The API endpoint URL.
     * @param {object} options - Fetch options (method, body, etc.).
     * @returns {Promise<object>} - The JSON response from the API.
     * @throws {Error} If the request fails or returns an error status.
     */
    async makeAuthenticatedRequest(url, options = {}) {
        const token = await this.getToken(); // Ensures we have a valid token

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`, // Use the fetched token
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            let errorBody;
            try {
                errorBody = await response.json(); // Try to parse error details
                console.error('GMC API Error Response:', errorBody);
            } catch (e) {
                errorBody = await response.text(); // Fallback to text
                console.error('GMC API Error Response (non-JSON):', errorBody);
            }
            // Construct a more informative error message
            const errorMessage = errorBody?.error?.message || response.statusText || 'Unknown API error';
            const error = new Error(`GMC API request failed: ${response.status} ${errorMessage}`);
            error.response = response; // Attach response for potential further inspection
            error.errorBody = errorBody;
            throw error;
        }

        // Handle cases where response might be empty (e.g., 204 No Content)
        if (response.status === 204) {
            return null;
        }

        return response.json();
    }

    // Product Feed Methods
    async uploadFeed(feedData) {
        // Removed testMode block
        console.log('Attempting real feed upload...');
        if (!this.merchantId) {
            await this.getToken(); // Ensure merchantId is loaded/fetched
            if (!this.merchantId) throw new Error("Merchant ID not available for feed upload.");
        }

        try {
            const response = await this.makeAuthenticatedRequest(
                `${this.API_BASE_URL}/${this.merchantId}/products/batch`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        entries: feedData.map((item, index) => ({ // Use index for batchId if item.id is not reliable
                            batchId: index, // Use index as batchId
                            merchantId: this.merchantId,
                            method: 'insert', // Or 'update' if applicable
                            product: this.formatProductForGMC(item) // Use formatter
                        }))
                    })
                }
            );
            console.log('Feed upload response:', response);
            // Consider parsing the batch response for detailed status
            return { status: 'success', message: 'Feed upload initiated.', response };
        } catch (error) {
            console.error('Feed upload failed:', error);
            throw new Error(`Failed to upload feed: ${error.message}`);
        }
    }

    async getFeedStatus(batchId) {
        // Removed testMode block
        console.log(`Attempting to get status for batch: ${batchId}`);
        if (!this.merchantId) {
            await this.getToken(); // Ensure merchantId is loaded/fetched
            if (!this.merchantId) throw new Error("Merchant ID not available for status check.");
        }
        // NOTE: Content API does not have a direct batch status endpoint.
        // You typically check individual product statuses after a batch upload.
        // This method might need rethinking based on actual requirements.
        console.warn('getFeedStatus method may need revision; Content API lacks direct batch status endpoint.');
        // Simulating a placeholder response
        return { status: 'unknown', message: 'Batch status endpoint not available in Content API.' };

        /* // Example if checking individual product status (replace batchId with productId)
        try {
            const productId = batchId; // Assuming batchId is actually a productId for this example
            const response = await this.makeAuthenticatedRequest(
                `${this.API_BASE_URL}/${this.merchantId}/productstatuses/${productId}`
            );
            return response;
        } catch (error) {
            console.error(`Failed to get status for product ${batchId}:`, error);
            throw new Error(`Failed to get product status: ${error.message}`);
        }
        */
    }

    /**
     * Generates mock validation results for testing purposes.
     * @param {Array<object>} feedData - The feed data (used for total count).
     * @returns {object} Mock validation results.
     */
    generateMockValidationResults(feedData) {
        const totalProducts = feedData?.length || 0;
        const mockIssues = [];
        let validCount = 0;
        const descriptionMinLength = 90; // Define min length for description

        // Add some sample issues based on row index
        for(let i = 0; i < totalProducts; i++) {
            const rowIndex = i + 1;
            const product = feedData[i]; // Get the product data for this row
            const offerId = product?.id || `mock-id-${rowIndex}`; // Get offerId or generate a fallback
            let hasError = false; // Track if row has an error

            // Price error check removed - price fields are not editable by users
            // Only title and description fields should have validation issues

            // Title length warning check
            // Add warning for row 1 and rows divisible by 3
            if (rowIndex === 1 || rowIndex % 3 === 0) {
                mockIssues.push({
                    rowIndex: rowIndex,
                    offerId: offerId,
                    field: 'title',
                    type: 'warning',
                    message: `Mock Warning: Title may be too short for row ${rowIndex}.`
                });
                // Warnings don't necessarily make the product invalid overall
            }

            // Description keyword error check removed for row 1 to match UI expectations

            // <<< ADDED: Description length warning check >>>
            if (product.description && product.description.length < descriptionMinLength) {
                 // Avoid adding duplicate description errors if keyword error already exists for row 1
                 if (!(rowIndex === 1 && hasError && mockIssues.some(issue => issue.rowIndex === 1 && issue.field === 'description'))) {
                     mockIssues.push({
                         rowIndex: rowIndex,
                         offerId: offerId,
                         field: 'description',
                         type: 'warning', // Make it a warning like the title
                         message: `Mock Warning: Description may be too short for row ${rowIndex} (needs ${descriptionMinLength}).`
                     });
                 }
            }
            // <<< END ADDED >>>

            if (!hasError) {
                validCount++;
            }
        }

        return {
            isValid: mockIssues.filter(issue => issue.type === 'error').length === 0,
            totalProducts: totalProducts,
            validProducts: validCount, // Count products without errors
            issues: mockIssues
        };
    }

} // End of GMCApi class

// Make it globally available (consider using modules if refactoring further)
window.GMCApi = GMCApi;