/**
 * Manages the UI related to displaying validation results,
 * including the floating panel and the history tab.
 */
class ValidationUIManager {
    /**
     * @param {object} elements - DOM element references.
     * @param {HTMLElement} elements.historyTableBody - tbody element for validation history.
     * @param {object} managers - Other manager instances.
     * @param {FeedManager} managers.feedManager - For navigating to rows.
     * @param {ErrorManager} managers.errorManager
     * @param {AuthManager} managers.authManager - For accessing user state.
     */
    constructor(elements, managers) {
        this.elements = elements;
        this.managers = managers; // Includes feedManager, errorManager, authManager, etc.
        this.activeValidationPanel = null; // Track the currently open panel
        // Store validation results locally within this manager if needed, or access via PopupManager
        this.validationResults = {};
        this.offerIdToValidatorRowIndexMap = {}; // Map offerId to the rowIndex provided by the validator

        if (!this.elements.historyTableBody) {
            console.error("ValidationUIManager: History table body element not provided.");
        }
         if (!this.managers.feedManager) {
            console.warn("ValidationUIManager: FeedManager not provided, row navigation might be limited.");
        }
         if (!this.managers.errorManager) {
            console.warn("ValidationUIManager: ErrorManager not provided.");
            // Use placeholder if missing
            this.managers.errorManager = { showError: (msg) => alert(`Error: ${msg}`) };
        }
        if (!this.managers.authManager) {
           console.error("ValidationUIManager: AuthManager not provided. Cannot save history.");
           // Optionally throw an error or disable history saving features
        }
    }

   /**
    * Initiates the GMC validation process.
    * Checks authentication, fetches feed data, calls the validator, and displays results.
    */
   async triggerGMCValidation() {
       const { loadingManager, errorManager, gmcValidator, feedManager, monitor, gmcApi } = this.managers; // Destructure needed managers/apis

       if (!gmcValidator || !feedManager || !loadingManager || !errorManager || !monitor || !gmcApi) {
            console.error("ValidationUIManager: Missing required manager dependencies for validation.");
            errorManager.showError("Cannot validate feed: Internal setup error.");
            return;
       }

       loadingManager.showLoading('Validating feed with Google Merchant Center...');
       try {
           monitor.logOperation('gmc_validation', 'started');

           // Ensure authenticated (using the passed gmcApi instance)
           if (!gmcApi.isAuthenticated) {
               // Attempt re-authentication if needed (might need access to PopupManager's verify method or similar)
               // For now, just show error if not authenticated. A better approach might involve event bubbling.
                console.log('GMC Validation: Not authenticated. Attempting re-auth via gmcApi...');
                const authSuccess = await gmcApi.authenticate(); // Assuming gmcApi has authenticate
                if (!authSuccess) {
                   throw new Error('Authentication required to validate with GMC.');
                }
                // If auth succeeded, the status bar should update elsewhere (e.g., via StatusBarManager observing gmcApi)
           }

           // Switch to validation tab (using passed element reference)
           if (this.elements.validationTab) {
               // Basic tab switching logic - assumes sibling structure or specific classes
               const tabContainer = this.elements.validationTab.closest('.tab-content');
               if (tabContainer) {
                   tabContainer.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                   tabContainer.parentElement.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                   this.elements.validationTab.classList.add('active');
                   const correspondingButton = tabContainer.parentElement.querySelector(`.tab-button[data-tab="validation"]`);
                   if (correspondingButton) correspondingButton.classList.add('active');
               } else {
                   console.warn("Could not find tab container for validation tab switching.");
               }
           } else {
                console.warn("Validation tab element not provided to ValidationUIManager.");
           }


           // Generate feedId
           const feedId = `GMC-VAL-${Date.now().toString().slice(-6)}`;

           // Get feed data via FeedManager
           const feedData = feedManager.getCorrectedTableData();
           if (!feedData?.length) {
               errorManager.showError('No feed data available to validate.');
               monitor.logOperation('gmc_validation', 'failed', { reason: 'no_data' });
               return; // Exit early
           }

           // --- Run GMC Validation ---
           console.log(`ValidationUIManager: Calling gmcValidator.validate for ${feedData.length} items...`);
           const gmcResults = await gmcValidator.validate(feedData);
           console.log('ValidationUIManager: GMC Validation Results:', gmcResults);
           let finalIssues = gmcResults.issues || [];
           let finalIsValid = gmcResults.isValid; // Start with GMC validity

           // --- Run Custom Rule Validation (if Pro) ---
           const authState = this.managers.authManager.getAuthState();
           const customRuleValidator = this.managers.customRuleValidator; // Get instance

           if (authState.isProUser && customRuleValidator) {
               console.log("User is Pro, applying custom rules...");
               loadingManager.showLoading('Applying custom rules...'); // Update loading message
               try {
                   await customRuleValidator.fetchCustomRules(); // Load rules first
                   const customIssues = await customRuleValidator.validate(feedData);
                   console.log('ValidationUIManager: Custom Rule Results:', customIssues);

                   if (customIssues && customIssues.length > 0) {
                       // Merge issues (simple concatenation for now, could add deduplication later)
                       finalIssues = finalIssues.concat(customIssues);
                       // If custom rules find issues, the overall result might become invalid
                       finalIsValid = finalIsValid && (customIssues.length === 0);
                        monitor.logOperation('custom_validation', 'completed', { issues: customIssues.length });
                   } else {
                        monitor.logOperation('custom_validation', 'completed', { issues: 0 });
                   }
               } catch (customError) {
                    console.error("ValidationUIManager: Custom rule validation failed:", customError);
                    errorManager.showError(`Custom rule validation failed: ${customError.message}`); // Show non-blocking error
                    monitor.logOperation('custom_validation', 'failed', { error: customError.message });
                    // Proceed with only GMC results if custom validation fails
               }
           } else {
                console.log("Skipping custom rules (User not Pro or validator not available).");
           }

           // --- Combine Results and Display ---
           loadingManager.showLoading('Processing results...'); // Update loading message
           const finalResults = {
               ...gmcResults, // Keep other properties like totalProducts, validProducts from GMC results
               isValid: finalIsValid,
               issues: finalIssues
           };

           // Display combined results
           this.displayValidationResults(feedId, finalResults);

           monitor.logOperation('combined_validation', 'completed', { issues: finalIssues.length });
           errorManager.showSuccess('Validation complete.', 3000);

       } catch (error) {
           monitor.logError(error, 'triggerGMCValidation');
           console.error('ValidationUIManager: GMC Validation failed:', error);
           errorManager.showError(`GMC Validation failed: ${error.message}`);
           monitor.logOperation('gmc_validation', 'failed', { error: error.message });
       } finally {
           loadingManager.hideLoading();
       }
   }


   /**
    * Creates and displays the floating validation panel with results.
     * Also updates the validation history table.
     * @param {string} feedId - A unique ID for this validation run.
     * @param {object} results - The validation results object from GMCApi/GMCValidator.
     *                           Format: { isValid, totalProducts, validProducts, issues: [{ rowIndex, field, type, message }] }
     */
    displayValidationResults(feedId, results) {
        if (!results) {
            this.managers.errorManager.showError("Cannot display validation results: No data provided.");
            return;
        }
        console.log(`Displaying validation results for ${feedId}`, results);

        // Store results
        this.validationResults[feedId] = results;

        // Populate the offerId -> validatorRowIndex map
        this.offerIdToValidatorRowIndexMap = {}; // Clear map for new results
        if (results.issues && Array.isArray(results.issues)) {
            results.issues.forEach(issue => {
                // Assuming 'offerId' exists in the issue object from the validator
                const offerId = issue.offerId || issue['Offer ID']; // Adjust if key name differs
                if (offerId && issue.rowIndex !== undefined) {
                    // Store the mapping. If multiple issues exist for the same offerId,
                    // they should share the same validator rowIndex.
                    this.offerIdToValidatorRowIndexMap[offerId] = issue.rowIndex;
                } else {
                    console.warn(`[ValidationUIManager] Issue missing offerId or rowIndex, cannot map:`, issue);
                }
            });
        }
        console.log('[ValidationUIManager] Populated offerIdToValidatorRowIndexMap:', this.offerIdToValidatorRowIndexMap); // ADDED LOG

        // Check for missing validation issues from the feed preview table
        this.addMissingValidationIssues(results);

        // Update history tab
        this.updateValidationHistory(feedId, results);

        // --- Save to Firestore ---
        // Call the save method asynchronously (don't need to wait for it here)
        this.saveValidationToFirestore(feedId, results)
            .then(docId => {
                if (docId) {
                    console.log(`[ValidationUIManager] Initiated save to Firestore for ${feedId}, Doc ID: ${docId}`);
                } else {
                    console.log(`[ValidationUIManager] Skipped saving validation history for ${feedId} (e.g., user not logged into Firebase).`);
                }
            })
            .catch(error => {
                // Error is already logged within saveValidationToFirestore
                console.error(`[ValidationUIManager] Background save to Firestore failed for ${feedId}:`, error);
            });
        // -------------------------


        // Show floating panel - REMOVED automatic call. Panel is now shown only via history button.
        // this.handleViewDetails(feedId, results);
    }

    /**
     * Checks the feed preview table for fields that don't meet requirements
     * and adds them to the validation results if they're not already there.
     * Also removes validation issues for fields that now meet requirements.
     * @param {object} results - The validation results object to update
     */
    addMissingValidationIssues(results) {
        if (!this.managers.feedManager) {
            console.warn('[ValidationUIManager] Cannot check for missing validation issues: FeedManager not available');
            return;
        }
        
        console.log('[ValidationUIManager] Checking for missing validation issues in feed preview table');
        
        // Get all editable fields from the feed preview table
        const container = this.managers.feedManager.elements.previewContentContainer;
        if (!container) {
            console.warn('[ValidationUIManager] Cannot check for missing validation issues: previewContentContainer not available');
            return;
        }
        
        // Create a map of all offer IDs and their validation status
        const offerValidationMap = {};
        
        // First, process all fields to determine their validation status
        const allEditableFields = container.querySelectorAll('.editable-field');
        allEditableFields.forEach(field => {
            const fieldType = field.dataset.field;
            if (fieldType === 'title' || fieldType === 'description') {
                const content = field.textContent || '';
                const currentLength = content.length;
                
                // Define validation rules based on field type
                const isDescription = fieldType === 'description';
                const minLength = isDescription ? 90 : 30; // Title min is 30
                const maxLength = isDescription ? 5000 : 150; // Title max is 150
                
                // Get the row and offer ID
                const row = field.closest('tr');
                if (!row) return;
                
                const rowIndex = row.dataset.row;
                const offerId = row.dataset.offerId;
                
                if (!offerId || !rowIndex) return;
                
                // Initialize the offer in the map if it doesn't exist
                if (!offerValidationMap[offerId]) {
                    offerValidationMap[offerId] = {
                        rowIndex: parseInt(rowIndex),
                        fields: {}
                    };
                }
                
                // Store the validation status for this field
                offerValidationMap[offerId].fields[fieldType] = {
                    content: content,
                    length: currentLength,
                    isValid: currentLength >= minLength && currentLength <= maxLength,
                    minLength: minLength,
                    maxLength: maxLength
                };
            }
        });
        
        console.log('[ValidationUIManager] Offer validation map:', offerValidationMap);
        
        // Now, filter out issues for fields that are now valid
        results.issues = results.issues.filter(issue => {
            const offerId = issue.offerId || issue['Offer ID'];
            const fieldType = issue.field;
            
            // If we don't have validation info for this offer or field, keep the issue
            if (!offerId || !fieldType || !offerValidationMap[offerId] || !offerValidationMap[offerId].fields[fieldType]) {
                return true;
            }
            
            // If the field is now valid, remove the issue
            const isValid = offerValidationMap[offerId].fields[fieldType].isValid;
            if (isValid) {
                console.log(`[ValidationUIManager] Removing validation issue for Offer ID ${offerId}, Field ${fieldType} as it's now valid`);
                return false;
            }
            
            // Otherwise, keep the issue
            return true;
        });
        
        // Now, add missing issues for fields that are invalid
        Object.entries(offerValidationMap).forEach(([offerId, offerData]) => {
            Object.entries(offerData.fields).forEach(([fieldType, fieldData]) => {
                if (!fieldData.isValid) {
                    // Check if this issue is already in the results
                    const existingIssue = results.issues.find(issue => {
                        const issueOfferId = issue.offerId || issue['Offer ID'];
                        return issueOfferId === offerId && issue.field === fieldType;
                    });
                    
                    if (!existingIssue) {
                        // Add this issue to the results
                        const message = fieldData.length < fieldData.minLength
                            ? `Mock Warning: ${fieldType === 'title' ? 'Title' : 'Description'} may be too short for row ${offerData.rowIndex}.`
                            : `Mock Warning: ${fieldType === 'title' ? 'Title' : 'Description'} may be too long for row ${offerData.rowIndex}.`;
                        
                        const newIssue = {
                            rowIndex: offerData.rowIndex,
                            field: fieldType,
                            type: 'warning',
                            message: message,
                            offerId: offerId
                        };
                        
                        results.issues.push(newIssue);
                        console.log(`[ValidationUIManager] Added missing validation issue: ${message}`);
                    }
                    
                    // Update the mapping
                    this.offerIdToValidatorRowIndexMap[offerId] = offerData.rowIndex;
                }
            });
        });
        
        console.log(`[ValidationUIManager] Updated validation results now have ${results.issues.length} issues`);
    }

   /**
    * Saves the validation results to Firestore under the current user's history.
    * @param {string} feedId - The ID assigned to this validation run.
    * @param {object} results - The validation results object.
    * @returns {Promise<string|null>} - The Firestore document ID if successful, null otherwise.
    */
   async saveValidationToFirestore(feedId, results) {
       if (!this.managers.authManager) {
           console.error("Cannot save validation history: AuthManager not available.");
           return null;
       }
       // Ensure Firestore SDK is available (it should be loaded by background.js)
       if (typeof firebase === 'undefined' || !firebase.firestore) {
           console.error("Cannot save validation history: Firestore SDK not available.");
           // Attempt to access via background page as a fallback? Risky.
            try {
                const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
                if (!bg || !bg.firebase || !bg.firebase.firestore) {
                    throw new Error("Firestore not found on background page either.");
                }
                // If found, reassign firebase locally for this function scope
                window.firebase = bg.firebase; // Make it available globally in this context if needed elsewhere? Careful.
                console.warn("Firestore SDK accessed via background page.");
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
   * @param {number} [limit=25] - The maximum number of history entries to retrieve.
   * @param {string} [sortBy='newest'] - Sort order ('newest' or 'oldest').
   */
  async loadValidationHistoryFromFirestore(limit = 25, sortBy = 'newest') {
      const historyTableBody = this.elements.historyTableBody;
      if (!historyTableBody) {
          console.error('Cannot load history: History table body not found.');
          return;
      }
      // Clear existing history rows before loading new ones
      historyTableBody.innerHTML = '<tr><td colspan="5">Loading history...</td></tr>';

      if (!this.managers.authManager) {
          console.error("Cannot load validation history: AuthManager not available.");
           historyTableBody.innerHTML = '<tr><td colspan="5">Error: Auth service unavailable.</td></tr>';
          return;
      }
       // Ensure Firestore SDK is available
      if (typeof firebase === 'undefined' || !firebase.firestore) {
           console.error("Cannot load validation history: Firestore SDK not available.");
            historyTableBody.innerHTML = '<tr><td colspan="5">Error: Database service unavailable.</td></tr>';
           // Attempt to access via background page as a fallback?
           try {
               const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
               if (!bg || !bg.firebase || !bg.firebase.firestore) {
                   throw new Error("Firestore not found on background page either.");
               }
               window.firebase = bg.firebase;
               console.warn("Firestore SDK accessed via background page for history loading.");
           } catch (bgError) {
               console.error("Error accessing Firestore SDK via background page:", bgError);
               this.managers.errorManager?.showError("Internal Error: Cannot connect to database service.");
               historyTableBody.innerHTML = '<tr><td colspan="5">Error: Cannot connect to database service.</td></tr>';
               return;
           }
      }

      const authState = this.managers.authManager.getAuthState();
      if (!authState.firebaseAuthenticated || !authState.firebaseUserId) {
          console.log("Cannot load validation history: User not authenticated with Firebase.");
          historyTableBody.innerHTML = '<tr><td colspan="5">Sign in with Firebase to view validation history.</td></tr>';
          return;
      }

      const userId = authState.firebaseUserId;
      console.log(`Loading validation history for user ${userId}...`);
      const isPro = authState.isProUser; // Check pro status

      // Show/hide upgrade prompt
      // Ensure this runs within the popup's context where the element exists
      const upgradePrompt = document.getElementById('historyLimitPrompt');
      if (upgradePrompt) {
          upgradePrompt.style.display = isPro ? 'none' : 'block'; // Show if not pro
      } else {
          console.warn("History limit prompt element (#historyLimitPrompt) not found.");
      }


      try {
          const db = firebase.firestore();
          const sortDirection = sortBy === 'oldest' ? 'asc' : 'desc'; // Determine sort direction
          console.log(`Sorting history by timestamp ${sortDirection}`);

          let query = db.collection('users').doc(userId).collection('validationHistory')
                        .orderBy('timestamp', sortDirection); // Apply sort direction

          // Apply 7-day filter for non-pro users
          if (!isPro) {
              const sevenDaysAgo = new Date();
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
              historyTableBody.innerHTML = '<tr><td colspan="5">No validation history found.</td></tr>';
              return;
          }

          console.log(`Retrieved ${querySnapshot.size} history entries for user ${userId}.`);

          // Determine how to add rows based on sort order
          const addRowMethod = sortBy === 'oldest'
              ? (row) => historyTableBody.appendChild(row) // Append for oldest first
              : (row) => historyTableBody.insertBefore(row, historyTableBody.firstChild); // Prepend for newest first

          querySnapshot.forEach(doc => {
              const historyData = doc.data();
              const docId = doc.id; // Use Firestore document ID as the unique ID

               // Reconstruct a minimal 'results' object needed for display logic
               // Note: The full 'issues' array isn't stored by default, only the summary.
               const pseudoResults = {
                   isValid: historyData.isValid,
                   issues: [], // Placeholder - full issues not retrieved from this query
                   // Use summary data for issue count display
                   issueCount: historyData.summary?.totalIssues ?? historyData.summary?.errorCount ?? 0 // Best guess for count
               };

               // Use the new helper method to create the row element
               const rowElement = this.createHistoryTableRowElement(docId, historyData, pseudoResults);
               // Add the row using the determined method (append/prepend)
               if(rowElement) {
                  addRowMethod(rowElement);
               }
          });

           this.managers.monitor?.logOperation('load_validation_history', 'success', { userId: userId, count: querySnapshot.size, sortBy: sortBy });

      } catch (error) {
          console.error(`Error loading validation history for user ${userId}:`, error);
          historyTableBody.innerHTML = '<tr><td colspan="5">Error loading history. Please try again.</td></tr>';
          this.managers.errorManager?.showError("Failed to load validation history.");
          this.managers.monitor?.logError(error, 'loadValidationHistoryFromFirestore');
      }
  }

  /**
   * Creates a table row element for a single validation history entry.
   * @param {string} historyId - The unique ID for this history entry (Firestore doc ID or local feedId).
   * @param {object} historyData - The data retrieved from Firestore or current run data.
   * @param {object} displayResults - A minimal results object for display logic (isValid, issueCount).
   * @returns {HTMLTableRowElement|null} The created table row element, or null on error.
   */
  createHistoryTableRowElement(historyId, historyData, displayResults) {
       // Removed check for historyTableBody as we just return the element

       const row = document.createElement('tr');
       // Use Firestore timestamp if available, otherwise current time as fallback
       const timestamp = historyData.timestamp?.toDate ? historyData.timestamp.toDate().toLocaleString() : new Date().toLocaleString();
       const issueCount = displayResults.issueCount; // Use calculated count
       row.setAttribute('data-history-id', historyId); // Use history ID

       row.innerHTML = `
           <td>${timestamp}</td>
           <td>${historyData.feedId || 'N/A'}</td>
           <td><span class="status-badge ${displayResults.isValid ? 'success' : 'error'}">${displayResults.isValid ? 'Valid' : 'Invalid'}</span></td>
           <td>${issueCount}</td>
           <td><button class="view-details-btn modern-button small" data-history-id="${historyId}" ${issueCount === 0 ? 'disabled' : ''}>${issueCount > 0 ? 'View Summary' : 'No Issues'}</button></td>`; // Changed button text

       // TODO: Update button functionality - currently tries to load full results which aren't stored.
       // Need to decide how to display history details (e.g., show summary, or load full issues on demand if stored elsewhere).
       // Add click handler for the "View Summary" button
       const viewDetailsBtn = row.querySelector('.view-details-btn');
       if (viewDetailsBtn) {
           // Keep button disabled only if issueCount is 0
           viewDetailsBtn.disabled = (issueCount === 0);
           viewDetailsBtn.title = issueCount > 0 ? "View validation summary" : "No issues found";

           if (issueCount > 0) {
               viewDetailsBtn.onclick = (event) => {
                   event.preventDefault(); // Prevent any default link behavior
                   const clickedButton = event.currentTarget;
                   const historyId = clickedButton.dataset.historyId;
                   if (historyId) {
                       console.log(`View Summary clicked for history ID: ${historyId}`);
                       // Call a new method to display the summary, passing the ID
                       this.displayHistorySummary(historyId);
                   } else {
                       console.error("Could not get history ID from button.");
                       this.managers.errorManager?.showError("Could not retrieve summary details.");
                   }
               };
           }
       }
       // Return the created row element instead of adding it here
       return row;
  }


   /**
    * Fetches a specific validation history entry from Firestore and displays its summary.
    * @param {string} historyId - The Firestore document ID of the history entry.
    */
   async displayHistorySummary(historyId) {
       console.log(`Fetching summary for history ID: ${historyId}`);
       this.managers.loadingManager?.showLoading('Loading summary...'); // Use optional chaining

       // Ensure AuthManager and Firestore are available
       if (!this.managers.authManager) {
           console.error("Cannot load history summary: AuthManager not available.");
           this.managers.errorManager?.showError("Authentication service unavailable.");
           this.managers.loadingManager?.hideLoading();
           return;
       }
       if (typeof firebase === 'undefined' || !firebase.firestore) {
           console.error("Cannot load history summary: Firestore SDK not available.");
            // Attempt to access via background page as a fallback?
            try {
                const bg = await new Promise(resolve => chrome.runtime.getBackgroundPage(resolve));
                if (!bg || !bg.firebase || !bg.firebase.firestore) {
                    throw new Error("Firestore not found on background page either.");
                }
                window.firebase = bg.firebase;
                console.warn("Firestore SDK accessed via background page for history summary.");
            } catch (bgError) {
                console.error("Error accessing Firestore SDK via background page:", bgError);
                this.managers.errorManager?.showError("Internal Error: Cannot connect to database service.");
                this.managers.loadingManager?.hideLoading();
                return;
            }
       }

       const authState = this.managers.authManager.getAuthState();
       if (!authState.firebaseAuthenticated || !authState.firebaseUserId) {
           console.log("Cannot load history summary: User not authenticated with Firebase.");
           this.managers.errorManager?.showError("Please sign in with Firebase to view history.");
           this.managers.loadingManager?.hideLoading();
           return;
       }

       const userId = authState.firebaseUserId;

       try {
           const db = firebase.firestore();
           const docRef = db.collection('users').doc(userId).collection('validationHistory').doc(historyId);
           const docSnap = await docRef.get();

           if (docSnap.exists) {
               const historyData = docSnap.data();
               console.log("History data retrieved:", historyData);

               // Create and display the summary panel
               this.createAndShowSummaryPanel(historyId, historyData);

           } else {
               console.error(`History document not found: ${historyId}`);
               this.managers.errorManager?.showError("Could not find the selected validation history entry.");
           }
       } catch (error) {
           console.error(`Error fetching history document ${historyId}:`, error);
           this.managers.errorManager?.showError("Failed to load validation summary.");
           this.managers.monitor?.logError(error, 'displayHistorySummary');
       } finally {
           this.managers.loadingManager?.hideLoading();
       }
   }

   /**
    * Creates and displays a simple panel showing the summary of a historical validation run.
    * @param {string} historyId - The Firestore document ID.
    * @param {object} historyData - The data fetched from the Firestore document.
    */
   createAndShowSummaryPanel(historyId, historyData) {
       // Close any existing panel first (validation details or another summary)
       this.activeValidationPanel?.remove();
       this.activeValidationPanel = null;

       const panel = document.createElement('div');
       panel.className = 'floating-validation-panel summary-panel'; // Add specific class
       panel.dataset.historyId = historyId;

       const summary = historyData.summary || {};
       const timestamp = historyData.timestamp?.toDate ? historyData.timestamp.toDate().toLocaleString() : 'N/A';
       const isValidText = historyData.isValid ? 'Valid' : 'Invalid';
       const isValidClass = historyData.isValid ? 'valid' : 'invalid';

       panel.innerHTML = `
           <div class="panel-header">
               <h3>Validation Summary</h3>
               <button class="close-panel" title="Close Panel">&times;</button>
           </div>
           <div class="validation-summary">
               <span class="timestamp">Run Time: ${timestamp}</span>
               <span class="feed-id">Feed ID: ${historyData.feedId || 'N/A'}</span>
               <span class="validation-status ${isValidClass}">${isValidText}</span>
           </div>
           <div class="summary-details">
               <h4>Run Metrics:</h4>
               <ul>
                   <li>Total Products Processed: ${historyData.totalProducts ?? 'N/A'}</li>
                   <li>Valid Products: ${historyData.validProducts ?? 'N/A'}</li>
               </ul>
               <h4>Issue Summary:</h4>
               <ul>
                   <li>Total Issues Found: ${summary.totalIssues ?? 'N/A'}</li>
                   <li>Errors: ${summary.errorCount ?? 'N/A'}</li>
                   <li>Warnings: ${summary.warningCount ?? 'N/A'}</li>
                   <li>Title Issues: ${summary.titleIssues ?? 'N/A'}</li>
                   <li>Description Issues: ${summary.descriptionIssues ?? 'N/A'}</li>
                   <li>Other Field Issues: ${summary.otherIssues ?? 'N/A'}</li>
               </ul>
               <p class="note">Note: Detailed issue list is not available for historical runs in this view.</p>
           </div>
       `;

       const closeBtn = panel.querySelector('.close-panel');
       if (closeBtn) {
           closeBtn.onclick = () => {
               panel.remove();
               if (this.activeValidationPanel === panel) this.activeValidationPanel = null;
           };
       }

       this.makeDraggable(panel); // Reuse draggable functionality
       document.body.appendChild(panel);

       // Position the panel (example)
       panel.style.display = 'block';
       panel.style.opacity = '1';
       panel.style.right = '20px';
       panel.style.top = '150px';

       this.activeValidationPanel = panel; // Track the summary panel
   }


   // --- Methods moved from PopupManager ---

   handleViewDetails(feedId, validationData) {
        // Close existing panel first
        this.activeValidationPanel?.remove();
        this.activeValidationPanel = null;

        // Create validation panel using the results
        const panel = this.createValidationPanel(feedId, validationData);
        if (!panel) return; // Exit if panel creation failed

        // Add row navigation interactivity to the new panel
        this.setupRowNavigation(panel);

        // Make sure panel is visible and positioned
        panel.style.display = 'block';
        panel.style.opacity = '1';
        panel.style.right = '20px'; // Example positioning
        panel.style.top = '150px'; // Example positioning

        this.activeValidationPanel = panel; // Track the new panel
    }

    createValidationPanel(feedId, data) {
        if (!data || data.issues === undefined) { // Check for issues array specifically
            console.error('Invalid validation data provided to createValidationPanel:', data);
            this.managers.errorManager.showError('Could not display validation results: Invalid data.'); return null;
        }
        const issueCount = data.issues.length;
        const panel = document.createElement('div');
        panel.className = 'floating-validation-panel'; panel.dataset.feedId = feedId;

        // Use helper to group issues for filtering counts
        const issuesByRow = this.groupIssuesByRow(data.issues);

        panel.innerHTML = `
            <div class="panel-header">
                <h3>GMC Validation Issues</h3>
                <button class="close-panel" title="Close Panel">&times;</button>
            </div>
            <div class="validation-summary">
                <span class="issue-count ${issueCount > 0 ? 'has-issues' : ''}">${issueCount} Issues Found</span>
                <span class="feed-id">Feed ID: ${feedId}</span>
                <span class="validation-status ${data.isValid ? 'valid' : 'invalid'}">${data.isValid ? 'Feed Valid' : 'Feed Invalid'}</span>
            </div>
            <div class="issues-container">
                <!-- Basic Filters Example (can be enhanced) -->
                <!--
                <div class="quick-filters">
                    <button class="filter-btn active" data-filter="all">All (${issueCount})</button>
                    <button class="filter-btn" data-filter="error">Errors (${data.issues.filter(i=>i.type==='error').length})</button>
                    <button class="filter-btn" data-filter="warning">Warnings (${data.issues.filter(i=>i.type==='warning').length})</button>
                </div>
                -->
                ${this.formatValidationIssues(data.issues, issuesByRow)}
            </div>`;
        const closeBtn = panel.querySelector('.close-panel');
        if (closeBtn) {
            closeBtn.onclick = () => {
                panel.remove(); if (this.activeValidationPanel === panel) this.activeValidationPanel = null;
            };
        }
        this.makeDraggable(panel);
        document.body.appendChild(panel);
        return panel;
    }

    formatValidationIssues(issues, issuesByRow) {
        // (Copied updated version from previous step)
        if (!issues || !issues.length) return '<p class="no-issues">No issues found according to Google Merchant Center!</p>';
        if (!issuesByRow) issuesByRow = this.groupIssuesByRow(issues); // Recalculate if not passed

        return `
            <div class="issues-list gmc-issues">
                <h4>GMC Validation Issues</h4>
                ${Object.entries(issuesByRow).map(([rowIndex, rowIssues]) => `
                    <div class="issue-group">
                        <div class="issue-group-header">
                            <strong>Row ${rowIndex}</strong>
                            ${rowIndex !== 'unknown' ? `<a href="#" class="row-link" data-row="${rowIndex}" title="Scroll to row ${rowIndex}">Go to Row</a>` : ''}
                        </div>
                        ${rowIssues.map(issue => {
                            const offerId = issue.offerId || issue['Offer ID'] || ''; // Get offerId, handle potential missing value
                            return `
                            <div class="issue-item ${issue.type || 'error'}"
                                 data-row="${rowIndex}"
                                 data-field="${issue.field || 'general'}"
                                 data-offer-id="${offerId}">
                                <span class="issue-severity">${issue.type || 'error'}</span>
                                <span class="issue-message">${issue.message || 'Unknown issue'}</span>
                                ${issue.field && issue.field !== 'general' ? `<span class="issue-field">(Field: ${issue.field})</span>` : ''}
                            </div>`; // End the template literal here
                           }).join('')}
                    </div>
                `).join('')}
            </div>`;
    }

     setupRowNavigation(panel) {
        if (!panel) return;
        panel.querySelectorAll('.row-link').forEach(link => {
            link.onclick = (e) => { // Use onclick for simplicity, prevents multiple listeners
                e.preventDefault();
                const rowIndex = parseInt(link.dataset.row);
                if (!isNaN(rowIndex)) {
                    // --- ADDED: Get the field name to focus ---
                    const issueGroup = link.closest('.issue-group');
                    const firstIssueItem = issueGroup?.querySelector('.issue-item');
                    const fieldToFix = firstIssueItem?.dataset.field || null; // Get field from first issue, or null
                    console.log(`[ValidationUIManager] Go to Row clicked. Row: ${rowIndex}, Field to focus: ${fieldToFix}`); // ADDED LOG
                    // --- END ADDED ---

                    // Delegate navigation to FeedManager if available
                    if (this.managers.feedManager && typeof this.managers.feedManager.navigateToRow === 'function') {
                         this.managers.feedManager.navigateToRow(rowIndex, fieldToFix); // Pass fieldToFix
                    } else {
                         // Fallback or alternative navigation logic if FeedManager doesn't handle it
                         console.warn('FeedManager not available for navigation. Scrolling generically.');
                         this.navigateToRow(rowIndex); // Call local/fallback version
                    }
                }
            };
        });
    }

    // Fallback navigateToRow method removed (lines 251-267) - Navigation is delegated to FeedManager


   /**
    * Updates the validation history table with the results of the *current* validation run.
    * This is called immediately after a validation finishes.
    * @param {string} feedId - A unique ID for this validation run.
    * @param {object} results - The validation results object from GMCApi/GMCValidator.
    */
   updateValidationHistory(feedId, results) {
       // This method now ONLY adds the *current* run. Loading is separate.
       if (!this.elements.historyTableBody) { console.error('Validation history table body not found'); return; }
       if (!results) { console.error('No results provided to updateValidationHistory'); return; }

       // If the table currently shows "No history" or "Loading", remove that row first.
       const placeholderRow = this.elements.historyTableBody.querySelector('td[colspan="5"]');
       if (placeholderRow && (placeholderRow.textContent.includes('No validation history found') || placeholderRow.textContent.includes('Loading history'))) {
           this.elements.historyTableBody.innerHTML = '';
       }

       // Use the new helper method to add the row
       // We pass the full 'results' here because we have them for the current run
       // The 'historyData' object can be minimal as addHistoryTableRow primarily uses 'results' for the current run display
       const displayResults = {
           isValid: results.isValid !== undefined ? results.isValid : (results.issues?.length === 0),
           issueCount: results.issues?.length || 0
       };
       // Use the renamed helper method to create the row element
       const rowElement = this.createHistoryTableRowElement(feedId, { feedId: feedId, timestamp: new Date() }, displayResults);
       // Always prepend the *current* run's row to the top
       if (rowElement && this.elements.historyTableBody) {
          this.elements.historyTableBody.insertBefore(rowElement, this.elements.historyTableBody.firstChild);
       }


       // --- Keep the logic for the "View Issues" button for the *current* run ---
       const currentRunRow = rowElement; // Use the element we just created
       if (currentRunRow) {
           const viewDetailsBtn = currentRunRow.querySelector('.view-details-btn');
           const issueCount = results.issues?.length || 0;
           if (viewDetailsBtn) {
                viewDetailsBtn.disabled = issueCount === 0; // Re-enable button logic for current run
                viewDetailsBtn.textContent = issueCount > 0 ? 'View Issues' : 'No Issues'; // Correct text
                viewDetailsBtn.title = issueCount > 0 ? 'View issue details for this run' : 'No issues found in this run';
                viewDetailsBtn.onclick = () => { // Use onclick for simplicity
                    // Retrieve results using feedId (assuming they are stored locally for the session)
                    const storedResults = this.validationResults[feedId];
                    if (storedResults) this.handleViewDetails(feedId, storedResults);
                    else { console.error(`Could not find stored results for feedId: ${feedId}`); this.managers.errorManager.showError('Could not retrieve validation details.'); }
                };
           }
       }
       // -----------------------------------------------------------------------
   }

    makeDraggable(element) {
        // (Copied from popup.js - unchanged)
        const header = element.querySelector('.panel-header');
        if (!header) return;
        let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;

        // Get initial transform values if they exist
        const initialTransform = window.getComputedStyle(element).transform;
        if (initialTransform && initialTransform !== 'none') {
            const matrix = new DOMMatrixReadOnly(initialTransform);
            xOffset = matrix.m41; // e value for translate X
            yOffset = matrix.m42; // f value for translate Y
        } else {
             // Fallback if no initial transform (might happen if centered differently)
             // Center it based on viewport if not already positioned
             const rect = element.getBoundingClientRect();
             xOffset = (window.innerWidth / 2) - (rect.width / 2);
             yOffset = (window.innerHeight / 2) - (rect.height / 2);
             element.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
             element.style.left = '0px'; // Reset direct positioning
             element.style.top = '0px';
        }


        const mouseDownHandler = (e) => {
            if (e.target !== header && !header.contains(e.target)) return; // Allow clicking buttons inside header
            isDragging = true;
            initialX = e.clientX - xOffset; // Store initial mouse position relative to current element offset
            initialY = e.clientY - yOffset;
            element.style.cursor = 'grabbing'; header.style.cursor = 'grabbing'; e.preventDefault();
        };

        const mouseMoveHandler = (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX; // Calculate new offset based on mouse movement
                currentY = e.clientY - initialY;
                xOffset = currentX; // Update offset for next move event
                yOffset = currentY;
                element.style.transform = `translate(${currentX}px, ${currentY}px)`; // Apply transform
            }
        };

        const mouseUpHandler = () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = ''; header.style.cursor = 'grab';
            }
        };
        header.addEventListener('mousedown', mouseDownHandler);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        header.style.cursor = 'grab';
        // Store handlers to remove them later if the element is destroyed
        element._dragHandlers = { mouseDownHandler, mouseMoveHandler, mouseUpHandler };
    }

    // --- Helper methods for formatting/filtering ---

    groupIssuesByRow(issues) {
        // (Copied from popup.js - unchanged)
        if (!issues) return {};
        return issues.reduce((groups, issue) => {
            const rowIndex = issue.rowIndex || 'unknown';
            if (!groups[rowIndex]) groups[rowIndex] = [];
            groups[rowIndex].push(issue);
            return groups;
        }, {});
    }

    countIssuesByType(issues, type, exclusive = false) {
        // (Copied from popup.js - unchanged)
        if (!issues) return 0;
        if (!exclusive) return issues.filter(issue => issue.field === type).length;
        const issuesByRow = this.groupIssuesByRow(issues);
        return Object.values(issuesByRow).filter(rowIssues => rowIssues.length === 1 && rowIssues[0].field === type).length;
    }

    countRowsWithBothIssues(issuesByRow) {
        // (Copied from popup.js - unchanged)
         if (!issuesByRow) return 0;
        return Object.values(issuesByRow).filter(rowIssues => rowIssues.length > 1 && rowIssues.some(i => i.field === 'title') && rowIssues.some(i => i.field === 'description')).length;
    }

    /**
     * Removes a specific issue from the currently active validation panel UI.
     * Called by FeedManager when a field edit potentially resolves an issue.
     * @param {string} offerId - The unique offer ID of the product whose issue was fixed.
     * @param {string} fieldName - The data-field name of the issue that was fixed.
     */
    markIssueAsFixed(offerId, fieldName) {
        if (!this.activeValidationPanel) {
             console.log(`[ValidationUIManager] markIssueAsFixed called for Offer ID ${offerId}, Field ${fieldName}, but no panel is active.`);
             return;
        }

        console.log(`[ValidationUIManager] Received fix notification for Offer ID: ${offerId}, Field: ${fieldName}`);

        // First, verify that the field actually meets requirements
        const container = this.managers.feedManager?.elements.previewContentContainer;
        if (container) {
            const row = container.querySelector(`tr[data-offer-id="${offerId}"]`);
            if (row) {
                const field = row.querySelector(`.editable-field[data-field="${fieldName}"]`);
                if (field) {
                    const content = field.textContent || '';
                    const currentLength = content.length;
                    
                    // Define validation rules based on field type
                    const isDescription = fieldName === 'description';
                    const minLength = isDescription ? 90 : 30; // Title min is 30
                    const maxLength = isDescription ? 5000 : 150; // Title max is 150
                    
                    // Only proceed if the field actually meets requirements
                    if (currentLength < minLength || currentLength > maxLength) {
                        console.log(`[ValidationUIManager] Field "${fieldName}" for Offer ID ${offerId} does not meet requirements (${currentLength}/${minLength}). Not removing issue.`);
                        return;
                    }
                    
                    console.log(`[ValidationUIManager] Verified field "${fieldName}" for Offer ID ${offerId} meets requirements (${currentLength}/${minLength}). Proceeding with issue removal.`);
                }
            }
        }

        // Look up the validator's row index using the offerId
        const validatorRowIndex = this.offerIdToValidatorRowIndexMap[offerId];

        if (validatorRowIndex === undefined) {
            console.warn(`[ValidationUIManager] Could not find validator row index for Offer ID: ${offerId}. Cannot remove issue item.`);
            return;
        }

        console.log(`[ValidationUIManager] Mapped Offer ID ${offerId} to Validator Row Index: ${validatorRowIndex}`);

        // Try multiple selector approaches to find the issue
        // First try with data-field attribute
        let selector = `.issue-item[data-row="${validatorRowIndex}"][data-field="${fieldName}"]`;
        let issueItemsToRemove = this.activeValidationPanel.querySelectorAll(selector);
        
        // If no items found, try with the field name in the issue message
        if (issueItemsToRemove.length === 0) {
            console.log(`[ValidationUIManager] No issues found with exact field match, trying message content search`);
            const allIssueItems = this.activeValidationPanel.querySelectorAll(`.issue-item[data-row="${validatorRowIndex}"]`);
            
            // Manual filtering since :contains is not standard
            issueItemsToRemove = Array.from(allIssueItems).filter(item => {
                const messageEl = item.querySelector('.issue-message');
                return messageEl && messageEl.textContent.toLowerCase().includes(fieldName.toLowerCase());
            });
        }
        
        // If still no items found, try with just the row
        if (issueItemsToRemove.length === 0) {
            console.log(`[ValidationUIManager] Trying broader selector for row ${validatorRowIndex}`);
            selector = `.issue-item[data-row="${validatorRowIndex}"]`;
            issueItemsToRemove = this.activeValidationPanel.querySelectorAll(selector);
        }
        
        console.log(`[ValidationUIManager] Searching for issue items with selector: ${selector}`);
        
        if (issueItemsToRemove.length > 0) {
             console.log(`[ValidationUIManager] Found ${issueItemsToRemove.length} issue items to remove.`);
             let issueItemGroup = null; // Store the parent group
             issueItemsToRemove.forEach(item => {
                 if (!issueItemGroup) {
                    issueItemGroup = item.closest('.issue-group'); // Find the parent group once
                 }
                 item.remove(); // Remove each matching issue item block
             });

            // Check if the parent group has any remaining issue items
            const remainingIssues = issueItemGroup?.querySelectorAll('.issue-item'); // Use correct class
            if (issueItemGroup && (!remainingIssues || remainingIssues.length === 0)) {
                // If no issues left in this group, remove the whole group (header + issues)
                issueItemGroup.remove();
            }

            // Update the total issue count in the summary
            const totalIssues = this.activeValidationPanel.querySelectorAll('.issue-item').length; // Use correct class
            const issueCountEl = this.activeValidationPanel.querySelector('.validation-summary .issue-count');
            if (issueCountEl) {
                issueCountEl.textContent = `${totalIssues} Issues Found`;
                issueCountEl.classList.toggle('has-issues', totalIssues > 0);
            }

            // If no issues left at all, show a success message
            if (totalIssues === 0) {
                 const issuesContainer = this.activeValidationPanel.querySelector('.issues-container');
                 if(issuesContainer) {
                    issuesContainer.innerHTML = '<p class="no-issues">All issues resolved! 🎉</p>';
                 }
            }
            
            // Also update the stored validation results
            if (this.activeValidationPanel.dataset.feedId) {
                const feedId = this.activeValidationPanel.dataset.feedId;
                const results = this.validationResults[feedId];
                if (results && results.issues) {
                    // Remove the issue from the stored results
                    results.issues = results.issues.filter(issue => {
                        const issueOfferId = issue.offerId || issue['Offer ID'];
                        return !(issueOfferId === offerId && issue.field === fieldName);
                    });
                    console.log(`[ValidationUIManager] Updated stored validation results for feed ${feedId}. Now has ${results.issues.length} issues.`);
                }
            }
        } else {
            console.warn(`[ValidationUIManager] Could not find issue item to remove with selector: ${selector}`);
        }
    }

}

// Make globally available (consider modules later)
window.ValidationUIManager = ValidationUIManager;