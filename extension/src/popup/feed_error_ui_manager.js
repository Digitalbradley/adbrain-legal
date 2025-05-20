/**
 * Feed Error UI Manager
 * 
 * Manages the display of feed format errors in the UI.
 * This class is responsible for:
 * 1. Displaying feed format errors in the feed status area
 * 2. Updating the UI when errors are fixed
 * 3. Integrating with the existing validation system
 * 
 * It works with the FeedFormatValidator to provide immediate feedback
 * on feed issues before GMC validation.
 */
class FeedErrorUIManager {
    /**
     * Create a new FeedErrorUIManager
     * @param {Object} elements - DOM elements
     * @param {HTMLElement} elements.feedStatusArea - The feed status area element
     * @param {HTMLElement} elements.feedStatusContent - The feed status content element
     * @param {Object} managers - Manager instances
     * @param {FeedManager} managers.feedManager - The feed manager instance
     * @param {ErrorManager} managers.errorManager - The error manager instance
     */
    constructor(elements, managers = {}) {
        this.elements = elements || {};
        this.managers = managers || {};
        
        // Store validation results
        this.validationResults = {};
        
        // Track active errors by offerId and field
        this.activeErrors = new Map();
        
        // Create validator instance
        this.validator = null;
        
        console.log('[FeedErrorUIManager] Initialized with elements:', {
            feedStatusArea: !!this.elements.feedStatusArea,
            feedStatusContent: !!this.elements.feedStatusContent
        });
        
        // Initialize validator if ContentTypeValidator and CSVParser are available
        this.initializeValidator();
    }
    
    /**
     * Initialize the FeedFormatValidator
     */
    initializeValidator() {
        // Check if required dependencies are available
        const hasContentTypeValidator = typeof window.ContentTypeValidator !== 'undefined';
        const hasCSVParser = typeof window.CSVParser !== 'undefined';
        const hasFeedFormatValidator = typeof window.FeedFormatValidator !== 'undefined';
        
        console.log('[FeedErrorUIManager] Checking dependencies:', {
            ContentTypeValidator: hasContentTypeValidator,
            CSVParser: hasCSVParser,
            FeedFormatValidator: hasFeedFormatValidator
        });
        
        if (hasFeedFormatValidator) {
            // Get dependencies (ContentTypeValidator is an object, not a class)
            const contentTypeValidator = hasContentTypeValidator ? window.ContentTypeValidator : null;
            const csvParser = hasCSVParser ? new window.CSVParser() : null;
            
            // Create validator instance
            this.validator = new window.FeedFormatValidator(contentTypeValidator, csvParser);
            console.log('[FeedErrorUIManager] FeedFormatValidator initialized');
        } else {
            console.warn('[FeedErrorUIManager] FeedFormatValidator not available');
        }
    }
    
    /**
     * Validate a CSV file and display errors
     * @param {File} file - The CSV file to validate
     * @returns {Promise<Object>} - The validation results
     */
    async validateFile(fileOrText) {
        console.log('[FeedErrorUIManager] validateFile called with:', typeof fileOrText, fileOrText instanceof File ? fileOrText.name : 'CSV text');
        console.log('[FeedErrorUIManager] Validator available:', !!this.validator);
        
        if (!this.validator) {
            console.warn('[FeedErrorUIManager] Cannot validate file: FeedFormatValidator not available');
            return { isValid: true, issues: [] };
        }
        
        try {
            // Check if fileOrText is a File object or a string
            const isFile = fileOrText instanceof File;
            console.log('[FeedErrorUIManager] Validating', isFile ? 'file:' : 'text:', isFile ? fileOrText?.name : 'CSV text length:', isFile ? '' : fileOrText?.length);
            
            // Log the first 100 characters of the CSV text for debugging
            if (!isFile && typeof fileOrText === 'string') {
                console.log('[FeedErrorUIManager] CSV text preview:', fileOrText.substring(0, 100) + '...');
            }
            
            // Validate the file or text
            let results;
            if (isFile) {
                // If it's a File object, use validateFeed
                results = await this.validator.validateFeed(fileOrText);
            } else {
                // If it's a string, create a temporary file-like object
                const tempFile = new Blob([fileOrText], { type: 'text/csv' });
                tempFile.name = 'temp.csv';
                results = await this.validator.validateFeed(tempFile);
            }
            
            console.log('[FeedErrorUIManager] Validation results:', results);
            console.log('[FeedErrorUIManager] Issues found:', results.issues?.length || 0);
            
            // Store the results
            const feedId = `FORMAT-${Date.now()}`;
            this.validationResults[feedId] = results;
            
            // Display the errors
            this.displayErrors(results.issues);
            
            // Return the results
            return results;
        } catch (error) {
            console.error('[FeedErrorUIManager] Error validating file:', error);
            return { isValid: false, issues: [{ type: 'validation_error', message: `Error validating file: ${error.message}`, severity: 'error' }] };
        }
    }
    
    /**
     * Display feed errors in the feed status area
     * @param {Array} errors - Array of error objects
     */
    displayErrors(errors) {
        console.log('[FeedErrorUIManager] displayErrors called with', errors?.length || 0, 'errors');
        console.log('[FeedErrorUIManager] feedStatusContent element:', !!this.elements.feedStatusContent);
        
        const feedStatusContent = this.elements.feedStatusContent;
        
        if (!feedStatusContent) {
            console.warn('[FeedErrorUIManager] Cannot display errors: feedStatusContent element not found');
            return;
        }
        
        // Clear existing content
        feedStatusContent.innerHTML = '';
        console.log('[FeedErrorUIManager] Cleared feedStatusContent');
        
        if (!errors || errors.length === 0) {
            // No errors, show success message
            feedStatusContent.innerHTML = '<div class="status-message success">Feed loaded successfully. No format errors detected.</div>';
            console.log('[FeedErrorUIManager] No errors to display, showing success message');
            return;
        }
        
        // Filter out ALL title and description validation errors
        const filteredErrors = errors.filter(error => {
            // Skip if marked as title/description issue
            if (error.isTitleDescriptionIssue) {
                console.log(`[FeedErrorUIManager] Skipping issue marked as title/description issue: ${error.message}`);
                return false;
            }
            
            // Skip ALL title and description validation errors
            if (error.field === 'title' || error.field === 'description') {
                console.log(`[FeedErrorUIManager] Skipping ${error.field} issue for feed status: ${error.message}`);
                return false;
            }
            
            // Also skip any error message that contains "title" or "description"
            if (error.message && (
                error.message.toLowerCase().includes('title') ||
                error.message.toLowerCase().includes('description')
            )) {
                console.log(`[FeedErrorUIManager] Skipping issue with title/description in message: ${error.message}`);
                return false;
            }
            
            return true;
        });
        
        console.log('[FeedErrorUIManager] Original errors:', errors.length, 'Filtered errors:', filteredErrors.length);
        
        if (filteredErrors.length === 0) {
            // No errors after filtering, show success message
            feedStatusContent.innerHTML = '<div class="status-message success">Feed loaded successfully. No format errors detected.</div>';
            console.log('[FeedErrorUIManager] No errors after filtering, showing success message');
            return;
        }
        
        console.log('[FeedErrorUIManager] Displaying', filteredErrors.length, 'errors after filtering');
        
        // Update active errors map
        this.updateActiveErrorsMap(filteredErrors);
        
        // Create error container
        const errorContainer = document.createElement('div');
        errorContainer.className = 'feed-error-container';
        
        // Create error header
        const errorHeader = document.createElement('div');
        errorHeader.className = 'feed-error-header';
        errorHeader.innerHTML = `
            <h3>Feed Format Errors (${errors.length})</h3>
            <span class="feed-error-count">${errors.length}</span>
        `;
        
        // Create error content
        const errorContent = document.createElement('div');
        errorContent.className = 'feed-error-content';
        
        // Group errors by row
        const errorsByRow = this.groupErrorsByRow(filteredErrors);
        
        // Add errors to content
        Object.entries(errorsByRow).forEach(([rowIndex, rowErrors]) => {
            const rowGroup = document.createElement('div');
            rowGroup.className = 'error-row-group';
            
            // Add row header
            const rowHeader = document.createElement('div');
            rowHeader.className = 'error-row-header';
            rowHeader.innerHTML = `
                <strong>Row ${rowIndex}</strong>
                ${rowIndex !== 'unknown' ? `<a href="#" class="row-link" data-row="${rowIndex}">Go to Row</a>` : ''}
            `;
            rowGroup.appendChild(rowHeader);
            
            // Add row errors
            rowErrors.forEach(error => {
                const errorItem = document.createElement('div');
                errorItem.className = `error-item ${error.severity || 'error'}`;
                errorItem.dataset.row = rowIndex;
                errorItem.dataset.field = error.field || 'general';
                errorItem.dataset.offerId = error.offerId || '';
                
                const errorIcon = document.createElement('span');
                errorIcon.className = 'error-icon';
                errorIcon.textContent = error.severity === 'error' ? '❌' : error.severity === 'warning' ? '⚠️' : 'ℹ️';
                
                const errorMessage = document.createElement('span');
                errorMessage.className = 'error-message';
                errorMessage.textContent = error.message;
                
                const errorField = document.createElement('span');
                errorField.className = 'error-field';
                if (error.field && error.field !== 'general') {
                    errorField.textContent = `(Field: ${error.field})`;
                }
                
                errorItem.appendChild(errorIcon);
                errorItem.appendChild(errorMessage);
                if (error.field && error.field !== 'general') {
                    errorItem.appendChild(errorField);
                }
                
                rowGroup.appendChild(errorItem);
            });
            
            errorContent.appendChild(rowGroup);
        });
        
        // Add click handler to toggle collapse/expand
        errorHeader.addEventListener('click', () => {
            errorContent.classList.toggle('collapsed');
        });
        
        // Assemble error container
        errorContainer.appendChild(errorHeader);
        errorContainer.appendChild(errorContent);
        
        // Add to feed status content
        feedStatusContent.appendChild(errorContainer);
        
        // Set up row navigation
        this.setupRowNavigation(feedStatusContent);
    }
    
    /**
     * Update the active errors map
     * @param {Array} errors - Array of error objects
     */
    updateActiveErrorsMap(errors) {
        // Clear the map
        this.activeErrors.clear();
        
        // Add each error to the map
        errors.forEach(error => {
            if (error.offerId && error.field) {
                const key = `${error.offerId}:${error.field}`;
                this.activeErrors.set(key, error);
            }
        });
        
        console.log('[FeedErrorUIManager] Active errors map updated:', this.activeErrors.size, 'errors');
    }
    
    /**
     * Group errors by row
     * @param {Array} errors - Array of error objects
     * @returns {Object} - Errors grouped by row
     */
    groupErrorsByRow(errors) {
        return errors.reduce((groups, error) => {
            const rowIndex = error.rowIndex || 'unknown';
            if (!groups[rowIndex]) {
                groups[rowIndex] = [];
            }
            groups[rowIndex].push(error);
            return groups;
        }, {});
    }
    
    /**
     * Set up row navigation
     * @param {HTMLElement} container - The container element
     */
    setupRowNavigation(container) {
        const rowLinks = container.querySelectorAll('.row-link');
        
        rowLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const rowIndex = parseInt(link.dataset.row);
                if (isNaN(rowIndex)) return;
                
                // Find the field to focus
                const errorRowGroup = link.closest('.error-row-group');
                const firstErrorItem = errorRowGroup?.querySelector('.error-item');
                const fieldToFocus = firstErrorItem?.dataset.field || null;
                
                // Navigate to the row
                if (this.managers.feedManager && typeof this.managers.feedManager.navigateToRow === 'function') {
                    this.managers.feedManager.navigateToRow(rowIndex, fieldToFocus);
                } else if (this.managers.feedCoordinator && typeof this.managers.feedCoordinator.navigateToRow === 'function') {
                    this.managers.feedCoordinator.navigateToRow(rowIndex, fieldToFocus);
                } else {
                    console.warn('[FeedErrorUIManager] Cannot navigate to row: feedManager or feedCoordinator not available');
                }
            });
        });
    }
    
    /**
     * Hide all errors
     */
    hideErrors() {
        const feedStatusContent = this.elements.feedStatusContent;
        
        if (!feedStatusContent) {
            console.warn('[FeedErrorUIManager] Cannot hide errors: feedStatusContent element not found');
            return;
        }
        
        // Clear existing content
        feedStatusContent.innerHTML = '';
        
        // Show default message
        feedStatusContent.innerHTML = '<div class="status-message">No feed loaded. Upload a CSV file to begin.</div>';
    }
    
    /**
     * Check if a field has an error
     * @param {string} offerId - The offer ID
     * @param {string} field - The field name
     * @returns {boolean} - Whether the field has an error
     */
    hasError(offerId, field) {
        if (!offerId || !field) return false;
        
        const key = `${offerId}:${field}`;
        return this.activeErrors.has(key);
    }
    
    /**
     * Mark an issue as fixed
     * @param {string} offerId - The offer ID
     * @param {string} field - The field name
     * @returns {boolean} - Whether the issue was successfully marked as fixed
     */
    markIssueAsFixed(offerId, field) {
        if (!offerId || !field) return false;
        
        console.log(`[FeedErrorUIManager] Marking issue as fixed: ${offerId}, ${field}`);
        
        // Skip title and description fields - they should only be in the validation modal
        if (field === 'title' || field === 'description') {
            console.log(`[FeedErrorUIManager] Skipping markIssueAsFixed for ${field} field - should only be in validation modal`);
            return true;
        }
        
        const key = `${offerId}:${field}`;
        if (!this.activeErrors.has(key)) {
            console.log(`[FeedErrorUIManager] No active error found for ${key}`);
            return false;
        }
        
        // Remove from active errors map
        this.activeErrors.delete(key);
        
        // Update the UI
        this.updateErrorUI(offerId, field);
        
        // Update all validation results
        Object.keys(this.validationResults).forEach(feedId => {
            const results = this.validationResults[feedId];
            if (results && results.issues) {
                // Filter out the fixed issue
                results.issues = results.issues.filter(issue => {
                    return !(issue.offerId === offerId && issue.field === field);
                });
                
                // Update counts
                results.errorCount = results.issues.filter(e => e.severity === 'error').length;
                results.warningCount = results.issues.filter(e => e.severity === 'warning').length;
                results.infoCount = results.issues.filter(e => e.severity === 'info').length;
                results.totalIssues = results.issues.length;
                results.isValid = results.errorCount === 0;
            }
        });
        
        return true;
    }
    
    /**
     * Update the error UI after an issue is fixed
     * @param {string} offerId - The offer ID
     * @param {string} field - The field name
     */
    updateErrorUI(offerId, field) {
        const feedStatusContent = this.elements.feedStatusContent;
        if (!feedStatusContent) return;
        
        // Find all error items for this offerId and field
        const selector = `.error-item[data-offer-id="${offerId}"][data-field="${field}"]`;
        const errorItems = feedStatusContent.querySelectorAll(selector);
        
        console.log(`[FeedErrorUIManager] Found ${errorItems.length} error items to remove with selector: ${selector}`);
        
        if (errorItems.length === 0) return;
        
        // Store the parent row group of the first error item
        const rowGroup = errorItems[0].closest('.error-row-group');
        
        // Remove all matching error items
        errorItems.forEach(item => item.remove());
        
        // If row group is empty, remove it
        if (rowGroup && rowGroup.querySelectorAll('.error-item').length === 0) {
            rowGroup.remove();
        }
        
        // Update error count in header
        const errorContainer = feedStatusContent.querySelector('.feed-error-container');
        if (!errorContainer) return;
        
        const remainingErrors = errorContainer.querySelectorAll('.error-item');
        const errorCount = remainingErrors.length;
        
        const errorHeader = errorContainer.querySelector('.feed-error-header h3');
        const errorCountBadge = errorContainer.querySelector('.feed-error-count');
        
        if (errorHeader) {
            errorHeader.textContent = `Feed Format Errors (${errorCount})`;
        }
        
        if (errorCountBadge) {
            errorCountBadge.textContent = errorCount;
        }
        
        // If no errors left, show success message
        if (errorCount === 0) {
            errorContainer.remove();
            feedStatusContent.innerHTML = '<div class="status-message success">Feed loaded successfully. No format errors detected.</div>';
        }
    }
    
    /**
     * Check if a field meets requirements
     * @param {string} field - The field name
     * @param {string} content - The field content
     * @returns {boolean} - Whether the field meets requirements
     */
    fieldMeetsRequirements(field, content) {
        if (!field || !content) return false;
        
        // Get minimum and maximum lengths from validator
        const minLength = this.validator?.minLengths?.[field] || 0;
        const maxLength = this.validator?.maxLengths?.[field] || Infinity;
        
        // Check length
        const length = content.length;
        return length >= minLength && length <= maxLength;
    }
}

// Make globally available
window.FeedErrorUIManager = FeedErrorUIManager;