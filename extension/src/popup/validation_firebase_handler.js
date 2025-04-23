/**
 * Handles Firebase interactions for validation functionality,
 * including saving and loading validation history.
 */
class ValidationFirebaseHandler {
    /**
     * @param {object} managers - Other manager instances.
     * @param {AuthManager} managers.authManager - For accessing user state.
     * @param {ErrorManager} managers.errorManager - For displaying errors.
     * @param {MonitorManager} managers.monitor - For logging operations.
     */
    constructor(managers) {
        this.managers = managers;
        
        if (!this.managers.authManager) {
            console.error("ValidationFirebaseHandler: AuthManager not provided. Cannot save or load history.");
        }
        
        if (!this.managers.errorManager) {
            console.warn("ValidationFirebaseHandler: ErrorManager not provided.");
            // Use placeholder if missing
            this.managers.errorManager = { showError: (msg) => alert(`Error: ${msg}`) };
        }
    }

    /**
     * Saves the validation results to Firestore under the current user's history.
     * @param {string} feedId - The ID assigned to this validation run.
     * @param {object} results - The validation results object.
     * @returns {Promise<string|null>} - The Firestore document ID if successful, null otherwise.
     */
    async saveValidationToFirestore(feedId, results) {
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        const useMockFirebase = useFeatureFlags ? window.FEATURES.USE_MOCK_FIREBASE : false;
        const verboseLogging = useFeatureFlags ? window.FEATURES.VERBOSE_LOGGING : false;
        
        if (verboseLogging) console.log(`[ValidationFirebaseHandler] Saving validation to Firestore for feed ${feedId}`);
        
        if (!this.managers.authManager) {
            console.error("Cannot save validation history: AuthManager not available.");
            return null;
        }

        // Ensure Firestore SDK is available
        if (!this.isFirestoreAvailable()) {
            try {
                // Attempt to access via background page as a fallback
                await this.tryAccessFirestoreViaBackground();
            } catch (bgError) {
                console.error("Error accessing Firestore SDK via background page:", bgError);
                this.managers.errorManager?.showError("Internal Error: Cannot connect to database service.");
                return null;
            }
        }

        const authState = this.managers.authManager.getAuthState();
        if (!authState.firebaseAuthenticated || !authState.firebaseUserId) {
            console.log("Cannot save validation history: User not authenticated with Firebase.");
            // Don't treat this as an error, just skip saving for non-Firebase users
            return null;
        }

        const userId = authState.firebaseUserId;
        console.log(`Attempting to save validation history for user ${userId}, feedId ${feedId}`);

        try {
            const db = firebase.firestore();
            const historyCollectionRef = db.collection('users').doc(userId).collection('validationHistory');

            // Prepare data according to the plan's schema
            const dataToSave = {
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                feedId: feedId, // Or perhaps a more specific identifier if available
                totalProducts: results.totalProducts || 0,
                validProducts: results.validProducts || 0,
                // Limit issues array size to avoid exceeding Firestore document limits
                // Using a smaller limit initially, adjust as needed.
                issues: results.issues ? results.issues.slice(0, 200) : [], // Store only a subset of issues
                summary: {
                    // Calculate summary based on the *full* issues list before slicing
                    titleIssues: results.issues?.filter(i => i.field === 'title').length || 0,
                    descriptionIssues: results.issues?.filter(i => i.field === 'description').length || 0,
                    otherIssues: results.issues?.filter(i => i.field && !['title', 'description'].includes(i.field)).length || 0,
                    // Add counts for different severity levels if available
                    errorCount: results.issues?.filter(i => i.type === 'error').length || 0,
                    warningCount: results.issues?.filter(i => i.type === 'warning').length || 0,
                    totalIssues: results.issues?.length || 0 // Store total count before slicing
                },
                isValid: results.isValid !== undefined ? results.isValid : (results.issues?.length === 0) // Determine overall validity
            };

            // Add a new document with an auto-generated ID
            const docRef = await historyCollectionRef.add(dataToSave);
            console.log(`Validation history saved successfully for user ${userId}. Document ID: ${docRef.id}`);
            this.managers.monitor?.logOperation('save_validation_history', 'success', { userId: userId, docId: docRef.id });
            return docRef.id;

        } catch (error) {
            console.error(`Error saving validation history for user ${userId}:`, error);
            this.managers.errorManager?.showError("Failed to save validation history.");
            this.managers.monitor?.logError(error, 'saveValidationToFirestore');
            return null;
        }
    }

    /**
     * Loads validation history from Firestore for the current user and populates the history table.
     * @param {HTMLElement} historyTableBody - The table body element to populate with history.
     * @param {number} [limit=25] - The maximum number of history entries to retrieve.
     * @param {string} [sortBy='newest'] - Sort order ('newest' or 'oldest').
     * @returns {Promise<Array|null>} - Array of history entries if successful, null otherwise.
     */
    async loadValidationHistoryFromFirestore(historyTableBody, limit = 25, sortBy = 'newest') {
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        const enableHistory = useFeatureFlags ? window.FEATURES.ENABLE_VALIDATION_HISTORY : true;
        const useMockFirebase = useFeatureFlags ? window.FEATURES.USE_MOCK_FIREBASE : false;
        const verboseLogging = useFeatureFlags ? window.FEATURES.VERBOSE_LOGGING : false;
        
        if (!enableHistory) {
            if (verboseLogging) console.log("Validation history is disabled by feature flag");
            return null;
        }
        
        if (!historyTableBody) {
            console.error('Cannot load history: History table body not found.');
            return null;
        }
        
        // Clear existing history rows before loading new ones
        historyTableBody.innerHTML = '<tr><td colspan="5">Loading history...</td></tr>';

        if (!this.managers.authManager) {
            console.error("Cannot load validation history: AuthManager not available.");
            historyTableBody.innerHTML = '<tr><td colspan="5">Error: Auth service unavailable.</td></tr>';
            return null;
        }
        
        // If using mock Firebase, provide mock history data
        if (useMockFirebase) {
            if (verboseLogging) console.log("Using mock Firebase for validation history (based on feature flag)");
            return this.loadMockValidationHistory(historyTableBody, limit, sortBy);
        }
        
        // Ensure Firestore SDK is available
        if (!this.isFirestoreAvailable()) {
            try {
                // Attempt to access via background page as a fallback
                await this.tryAccessFirestoreViaBackground();
            } catch (bgError) {
                console.error("Error accessing Firestore SDK via background page:", bgError);
                this.managers.errorManager?.showError("Internal Error: Cannot connect to database service.");
                historyTableBody.innerHTML = '<tr><td colspan="5">Error: Cannot connect to database service.</td></tr>';
                return null;
            }
        }

        const authState = this.managers.authManager.getAuthState();
        if (!authState.firebaseAuthenticated || !authState.firebaseUserId) {
            console.log("Cannot load validation history: User not authenticated with Firebase.");
            historyTableBody.innerHTML = '<tr><td colspan="5">Sign in with Firebase to view validation history.</td></tr>';
            return null;
        }

        const userId = authState.firebaseUserId;
        console.log(`Loading validation history for user ${userId}...`);
        const isPro = authState.isProUser; // Check pro status

        // Show/hide upgrade prompt and date range indicator
        this.updateHistoryUIForProStatus(isPro);

        try {
            const db = firebase.firestore();
            const sortDirection = sortBy === 'oldest' ? 'asc' : 'desc'; // Determine sort direction
            console.log(`Sorting history by timestamp ${sortDirection}`);

            let query = db.collection('users').doc(userId).collection('validationHistory')
                          .orderBy('timestamp', sortDirection); // Apply sort direction

            // Apply 7-day filter for non-pro users
            let sevenDaysAgo = null;
            if (!isPro) {
                sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                // Convert to Firestore Timestamp for comparison
                const sevenDaysAgoTimestamp = firebase.firestore.Timestamp.fromDate(sevenDaysAgo);
                console.log(`User is not Pro. Filtering history from ${sevenDaysAgo.toISOString()} onwards.`);
                query = query.where('timestamp', '>=', sevenDaysAgoTimestamp);
            } else {
                console.log("User is Pro. Loading full history (up to limit).");
            }

            // Apply limit
            query = query.limit(limit);

            // Execute the query
            const querySnapshot = await query.get();

            // Clear loading message
            historyTableBody.innerHTML = '';

            if (querySnapshot.empty) {
                console.log(`No validation history found for user ${userId}.`);
                const noHistoryMessage = !isPro && sevenDaysAgo
                    ? `No validation history found in the last 7 days (since ${sevenDaysAgo.toLocaleDateString()}).`
                    : 'No validation history found.';
                historyTableBody.innerHTML = `<tr><td colspan="5">${noHistoryMessage}</td></tr>`;
                return [];
            }

            console.log(`Retrieved ${querySnapshot.size} history entries for user ${userId}.`);

            // Convert query results to array for easier handling
            const historyEntries = [];
            querySnapshot.forEach(doc => {
                const historyData = doc.data();
                historyData.id = doc.id; // Add the document ID to the data
                historyEntries.push(historyData);
            });

            this.managers.monitor?.logOperation('load_validation_history', 'success', {
                userId: userId,
                count: querySnapshot.size,
                sortBy: sortBy,
                isPro: isPro,
                dateFiltered: !isPro
            });

            return historyEntries;

        } catch (error) {
            console.error(`Error loading validation history for user ${userId}:`, error);
            historyTableBody.innerHTML = '<tr><td colspan="5">Error loading history. Please try again.</td></tr>';
            this.managers.errorManager?.showError("Failed to load validation history.");
            this.managers.monitor?.logError(error, 'loadValidationHistoryFromFirestore');
            return null;
        }
    }

    /**
     * Fetches a specific validation history entry from Firestore.
     * @param {string} historyId - The ID of the history entry to fetch.
     * @returns {Promise<object|null>} - The history data if successful, null otherwise.
     */
    async fetchHistoryEntry(historyId) {
        console.log(`[ValidationFirebaseHandler] Fetching history entry ${historyId}`);
        
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        const useMockFirebase = useFeatureFlags ? window.FEATURES.USE_MOCK_FIREBASE : false;
        const verboseLogging = useFeatureFlags ? window.FEATURES.VERBOSE_LOGGING : false;
        
        if (verboseLogging) console.log(`Fetching history data for ID: ${historyId}`);
        
        if (useMockFirebase) {
            // Use mock data
            return this.getMockHistoryEntry(historyId);
        }
        
        // Ensure AuthManager and Firestore are available
        if (!this.managers.authManager) {
            throw new Error("AuthManager not available");
        }
        
        if (!this.isFirestoreAvailable()) {
            try {
                // Attempt to access via background page as a fallback
                await this.tryAccessFirestoreViaBackground();
            } catch (bgError) {
                throw new Error(`Firestore not found: ${bgError.message}`);
            }
        }
        
        const authState = this.managers.authManager.getAuthState();
        if (!authState.firebaseAuthenticated || !authState.firebaseUserId) {
            throw new Error("User not authenticated with Firebase");
        }
        
        const userId = authState.firebaseUserId;
        const db = firebase.firestore();
        const docRef = db.collection('users').doc(userId).collection('validationHistory').doc(historyId);
        const docSnap = await docRef.get();
        
        if (!docSnap.exists) {
            throw new Error(`History document not found: ${historyId}`);
        }
        
        const historyData = docSnap.data();
        historyData.id = docSnap.id;
        return historyData;
    }

    /**
     * Loads mock validation history data for testing purposes.
     * @param {HTMLElement} historyTableBody - The table body element to populate with history.
     * @param {number} [limit=25] - The maximum number of history entries to retrieve.
     * @param {string} [sortBy='newest'] - Sort order ('newest' or 'oldest').
     * @returns {Array} - Array of mock history entries.
     */
    loadMockValidationHistory(historyTableBody, limit = 25, sortBy = 'newest') {
        if (!historyTableBody) {
            console.error('Cannot load mock history: History table body not found.');
            return [];
        }
        
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        const verboseLogging = useFeatureFlags ? window.FEATURES.VERBOSE_LOGGING : false;
        
        if (verboseLogging) console.log(`Loading mock validation history (limit: ${limit}, sortBy: ${sortBy})`);
        
        // Create mock history data
        const mockHistory = this.getMockHistoryData();
        
        // Sort the mock history data
        if (sortBy === 'oldest') {
            mockHistory.sort((a, b) => a.timestamp - b.timestamp);
        } else {
            mockHistory.sort((a, b) => b.timestamp - a.timestamp);
        }
        
        // Limit the number of entries
        const limitedHistory = mockHistory.slice(0, limit);
        
        // Clear the history table
        historyTableBody.innerHTML = '';
        
        // Populate the history table with mock data
        if (limitedHistory.length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="5">No validation history found.</td></tr>';
            return [];
        }
        
        if (verboseLogging) console.log(`Loaded ${limitedHistory.length} mock validation history entries`);
        
        return limitedHistory;
    }

    /**
     * Gets a mock history entry by ID.
     * @param {string} historyId - The ID of the history entry to get.
     * @returns {object} - The mock history entry.
     */
    getMockHistoryEntry(historyId) {
        const mockHistory = this.getMockHistoryData();
        return mockHistory.find(h => h.id === historyId) || mockHistory[0];
    }

    /**
     * Gets mock history data.
     * @returns {Array} - Array of mock history entries.
     */
    getMockHistoryData() {
        return [
            {
                id: 'mock-history-1',
                timestamp: new Date(Date.now() - 86400000 * 2), // 2 days ago
                feedId: 'mock-feed-1',
                totalProducts: 100,
                validProducts: 90,
                issues: [
                    {
                        rowIndex: 1,
                        offerId: 'product-1',
                        field: 'title',
                        type: 'warning',
                        message: 'Title too short (20 chars). Minimum 30 characters recommended.'
                    },
                    {
                        rowIndex: 2,
                        offerId: 'product-2',
                        field: 'description',
                        type: 'error',
                        message: 'Description missing required information.'
                    }
                ],
                summary: {
                    titleIssues: 1,
                    descriptionIssues: 1,
                    otherIssues: 0,
                    errorCount: 1,
                    warningCount: 1,
                    totalIssues: 2
                },
                isValid: false
            },
            {
                id: 'mock-history-2',
                timestamp: new Date(Date.now() - 86400000), // 1 day ago
                feedId: 'mock-feed-2',
                totalProducts: 150,
                validProducts: 145,
                issues: [
                    {
                        rowIndex: 5,
                        offerId: 'product-5',
                        field: 'title',
                        type: 'warning',
                        message: 'Title may be too generic.'
                    }
                ],
                summary: {
                    titleIssues: 1,
                    descriptionIssues: 0,
                    otherIssues: 0,
                    errorCount: 0,
                    warningCount: 1,
                    totalIssues: 1
                },
                isValid: true
            },
            {
                id: 'mock-history-3',
                timestamp: new Date(), // Today
                feedId: 'mock-feed-3',
                totalProducts: 200,
                validProducts: 200,
                issues: [],
                summary: {
                    titleIssues: 0,
                    descriptionIssues: 0,
                    otherIssues: 0,
                    errorCount: 0,
                    warningCount: 0,
                    totalIssues: 0
                },
                isValid: true
            }
        ];
    }

    /**
     * Updates the history UI elements based on Pro status
     * @param {boolean} isPro - Whether the user has Pro status
     * @private
     */
    updateHistoryUIForProStatus(isPro) {
        // Show/hide upgrade prompt
        const upgradePrompt = document.getElementById('historyLimitPrompt');
        if (upgradePrompt) {
            upgradePrompt.style.display = isPro ? 'none' : 'block'; // Show if not pro
            
            // Enhance the upgrade prompt with more information
            if (!isPro) {
                // Check if we need to add the date range indicator
                if (!upgradePrompt.querySelector('.date-range-indicator')) {
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    
                    const dateRangeIndicator = document.createElement('p');
                    dateRangeIndicator.className = 'date-range-indicator';
                    dateRangeIndicator.innerHTML = `
                        <strong>Free account limitation:</strong>
                        You can only view history from ${sevenDaysAgo.toLocaleDateString()} to today.
                        <br>
                        Upgrade to Pro for unlimited history access.
                    `;
                    
                    // Insert before the button
                    const upgradeButton = upgradePrompt.querySelector('.upgrade-button');
                    if (upgradeButton) {
                        upgradePrompt.insertBefore(dateRangeIndicator, upgradeButton);
                    } else {
                        upgradePrompt.appendChild(dateRangeIndicator);
                    }
                }
            }
        } else {
            console.warn("History limit prompt element (#historyLimitPrompt) not found.");
        }
    }
    
    /**
     * Checks if Firestore is available.
     * @returns {boolean} - True if Firestore is available, false otherwise.
     */
    isFirestoreAvailable() {
        return typeof firebase !== 'undefined' && firebase.firestore;
    }

    /**
     * Attempts to access Firestore via the background page.
     * @returns {Promise<void>} - Resolves if successful, rejects if not.
     */
    async tryAccessFirestoreViaBackground() {
        const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
        if (!bg || !bg.firebase || !bg.firebase.firestore) {
            throw new Error("Firestore not found on background page either.");
        }
        // If found, reassign firebase locally for this function scope
        window.firebase = bg.firebase; // Make it available globally in this context if needed elsewhere
        console.warn("Firestore SDK accessed via background page.");
    }
}

// Make globally available (consider modules later)
window.ValidationFirebaseHandler = ValidationFirebaseHandler;