/**
 * Manages validation issues, including tracking, formatting, and marking issues as fixed.
 * This class handles the business logic related to validation issues.
 */
class ValidationIssueManager {
    /**
     * @param {object} managers - Other manager instances.
     * @param {FeedManager} managers.feedManager - For accessing feed data.
     * @param {ErrorManager} managers.errorManager - For displaying errors.
     */
    constructor(managers) {
        this.managers = managers;
        this.offerIdToValidatorRowIndexMap = {}; // Map offerId to the rowIndex provided by the validator
        
        if (!this.managers.feedManager) {
            console.warn("ValidationIssueManager: FeedManager not provided, issue management might be limited.");
        }
        
        if (!this.managers.errorManager) {
            console.warn("ValidationIssueManager: ErrorManager not provided.");
            // Use placeholder if missing
            this.managers.errorManager = { showError: (msg) => alert(`Error: ${msg}`) };
        }
    }

    /**
     * Populates the offerId to validator row index map based on validation issues.
     * @param {Array} issues - The validation issues to map.
     */
    populateOfferIdMap(issues) {
        this.offerIdToValidatorRowIndexMap = {}; // Clear map for new results
        
        if (issues && Array.isArray(issues)) {
            issues.forEach(issue => {
                // Assuming 'offerId' exists in the issue object from the validator
                const offerId = issue.offerId || issue['Offer ID']; // Adjust if key name differs
                if (offerId && issue.rowIndex !== undefined) {
                    // Store the mapping. If multiple issues exist for the same offerId,
                    // they should share the same validator rowIndex.
                    this.offerIdToValidatorRowIndexMap[offerId] = issue.rowIndex;
                } else {
                    console.warn(`[ValidationIssueManager] Issue missing offerId or rowIndex, cannot map:`, issue);
                }
            });
        }
        
        console.log('[ValidationIssueManager] Populated offerIdToValidatorRowIndexMap:', this.offerIdToValidatorRowIndexMap);
    }

    /**
     * Checks the feed preview table for fields that don't meet requirements
     * and adds them to the validation results if they're not already there.
     * Also removes validation issues for fields that now meet requirements.
     * @param {object} results - The validation results object to update
     */
    addMissingValidationIssues(results) {
        if (!this.managers.feedManager) {
            console.warn('[ValidationIssueManager] Cannot check for missing validation issues: FeedManager not available');
            return;
        }
        
        console.log('[ValidationIssueManager] Checking for missing validation issues in feed preview table');
        
        // Get all editable fields from the feed preview table
        const container = this.managers.feedManager.elements.previewContentContainer;
        if (!container) {
            console.warn('[ValidationIssueManager] Cannot check for missing validation issues: previewContentContainer not available');
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
        
        console.log('[ValidationIssueManager] Offer validation map:', offerValidationMap);
        
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
                console.log(`[ValidationIssueManager] Removing validation issue for Offer ID ${offerId}, Field ${fieldType} as it's now valid`);
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
                        console.log(`[ValidationIssueManager] Added missing validation issue: ${message}`);
                    }
                    
                    // Update the mapping
                    this.offerIdToValidatorRowIndexMap[offerId] = offerData.rowIndex;
                }
            });
        });
        
        console.log(`[ValidationIssueManager] Updated validation results now have ${results.issues.length} issues`);
    }

    /**
     * Marks an issue as fixed for a specific offer ID and field.
     * @param {string} offerId - The offer ID of the issue to mark as fixed.
     * @param {string} fieldName - The field name of the issue to mark as fixed.
     * @param {object} validationResults - The validation results object to update.
     * @param {HTMLElement} activeValidationPanel - The active validation panel element.
     * @returns {boolean} - Whether the issue was successfully marked as fixed.
     */
    markIssueAsFixed(offerId, fieldName, validationResults, activeValidationPanel) {
        console.log(`[ValidationIssueManager] Received fix notification for Offer ID: ${offerId}, Field: ${fieldName}`);
        
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
                        console.log(`[ValidationIssueManager] Field "${fieldName}" for Offer ID ${offerId} does not meet requirements (${currentLength}/${minLength}). Not removing issue.`);
                        return false;
                    }
                    
                    console.log(`[ValidationIssueManager] Verified field "${fieldName}" for Offer ID ${offerId} meets requirements (${currentLength}/${minLength}). Proceeding with issue removal.`);
                }
            }
        }

        // Look up the validator's row index using the offerId
        const validatorRowIndex = this.offerIdToValidatorRowIndexMap[offerId];

        if (validatorRowIndex === undefined) {
            console.warn(`[ValidationIssueManager] Could not find validator row index for Offer ID: ${offerId}. Cannot remove issue item.`);
            return false;
        }

        console.log(`[ValidationIssueManager] Mapped Offer ID ${offerId} to Validator Row Index: ${validatorRowIndex}`);
        
        // Update the stored validation results
        const feedId = activeValidationPanel?.dataset.feedId;
        if (feedId && validationResults[feedId]) {
            const results = validationResults[feedId];
            if (results && results.issues) {
                // Remove the issue from the stored results
                results.issues = results.issues.filter(issue => {
                    const issueOfferId = issue.offerId || issue['Offer ID'];
                    return !(issueOfferId === offerId && issue.field === fieldName);
                });
                console.log(`[ValidationIssueManager] Updated stored validation results for feed ${feedId}. Now has ${results.issues.length} issues.`);
                return true;
            }
        }
        
        return false;
    }
}

// Make globally available (consider modules later)
window.ValidationIssueManager = ValidationIssueManager;