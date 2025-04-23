/**
 * Simplified validation functionality for the AdBrain Feed Manager extension.
 * This file combines the functionality of ValidationUIManager, ValidationPanelManager,
 * ValidationIssueManager, and ValidationFirebaseHandler into a single file.
 */

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[DEBUG] Simplified validation.js loaded');
    
    // Get UI element references
    const validateButtonEl = document.getElementById('validateGMC');
    const historyTableBody = document.getElementById('validationHistory');
    const validationTab = document.getElementById('validation-tab');
    const feedPreviewContainer = document.getElementById('previewContent');
    
    // Store validation results
    const validationResults = {};
    let activeValidationPanel = null;
    
    // Map offerId to rowIndex
    const offerIdToRowIndexMap = {};
    
    // Set up event listeners
    if (validateButtonEl) {
        console.log('[DEBUG] Setting up validate button click listener');
        validateButtonEl.addEventListener('click', triggerValidation);
    }
    
    // Load validation history when the validation tab is shown
    const validationTabButton = document.querySelector('.tab-button[data-tab="validation"]');
    if (validationTabButton) {
        validationTabButton.addEventListener('click', () => {
            loadValidationHistory();
        });
    }
    
    /**
     * Triggers the validation process
     */
    async function triggerValidation() {
        console.log('[DEBUG] triggerValidation called');
        
        // Show loading state
        document.body.classList.add('is-loading');
        
        try {
            // Switch to validation tab
            switchToValidationTab();
            
            // Generate feedId and get feed data
            const feedId = `GMC-VAL-${Date.now().toString().slice(-6)}`;
            const feedData = getCorrectedTableData();
            
            if (!feedData?.length) {
                alert('No feed data available to validate.');
                return;
            }
            
            // Run validation
            console.log(`[DEBUG] Validating ${feedData.length} items...`);
            const results = await validateFeed(feedData);
            
            // Display validation results
            displayValidationResults(feedId, results);
            
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'success-message';
            successMessage.textContent = 'Validation complete.';
            document.body.appendChild(successMessage);
            setTimeout(() => {
                successMessage.classList.add('show');
                setTimeout(() => {
                    successMessage.classList.remove('show');
                    setTimeout(() => {
                        document.body.removeChild(successMessage);
                    }, 300);
                }, 2000);
            }, 100);
            
        } catch (error) {
            console.error('[DEBUG] Error in triggerValidation:', error);
            alert(`Validation failed: ${error.message}`);
        } finally {
            // Hide loading state
            document.body.classList.remove('is-loading');
        }
    }
    
    /**
     * Switches to the validation tab
     */
    function switchToValidationTab() {
        if (validationTab) {
            const tabContainer = validationTab.closest('.tab-content');
            if (tabContainer) {
                tabContainer.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
                tabContainer.parentElement.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
                validationTab.classList.add('active');
                const correspondingButton = tabContainer.parentElement.querySelector('.tab-button[data-tab="validation"]');
                if (correspondingButton) correspondingButton.classList.add('active');
            }
        }
    }
    
    /**
     * Gets the corrected table data from the feed preview
     */
    function getCorrectedTableData() {
        if (!feedPreviewContainer) {
            console.error('[DEBUG] Feed preview container not found');
            return [];
        }
        
        const table = feedPreviewContainer.querySelector('table');
        if (!table) {
            console.error('[DEBUG] Table not found in feed preview container');
            return [];
        }
        
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        
        return rows.map(row => {
            const rowData = {};
            
            // Get all cells in the row
            const cells = Array.from(row.querySelectorAll('td'));
            
            // Process each cell
            headers.forEach((header, index) => {
                if (index < cells.length) {
                    const cell = cells[index];
                    
                    // For editable fields (title, description), get the content from the editable div
                    if (header === 'title' || header === 'description') {
                        const editableField = cell.querySelector('.editable-field');
                        if (editableField) {
                            rowData[header] = editableField.textContent.trim();
                        } else {
                            rowData[header] = cell.textContent.trim();
                        }
                    } else {
                        rowData[header] = cell.textContent.trim();
                    }
                }
            });
            
            return rowData;
        });
    }
    
    /**
     * Validates the feed data
     * @param {Array} feedData - The feed data to validate
     * @returns {Object} - The validation results
     */
    async function validateFeed(feedData) {
        // Simulate validation delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Find issues in the feed data
        const issues = [];
        
        feedData.forEach((item, index) => {
            const rowIndex = index + 1;
            const offerId = item.id || `product-${rowIndex}`;
            
            // Store the mapping of offerId to rowIndex
            offerIdToRowIndexMap[offerId] = rowIndex;
            
            // Check title length
            if (item.title) {
                const titleLength = item.title.length;
                if (titleLength < 30) {
                    issues.push({
                        rowIndex: rowIndex,
                        field: 'title',
                        type: 'warning',
                        message: `Title too short (${titleLength} chars). Minimum 30 characters recommended.`,
                        offerId: offerId
                    });
                } else if (titleLength > 150) {
                    issues.push({
                        rowIndex: rowIndex,
                        field: 'title',
                        type: 'warning',
                        message: `Title too long (${titleLength} chars). Maximum 150 characters recommended.`,
                        offerId: offerId
                    });
                }
            }
            
            // Check description length
            if (item.description) {
                const descriptionLength = item.description.length;
                if (descriptionLength < 90) {
                    issues.push({
                        rowIndex: rowIndex,
                        field: 'description',
                        type: 'warning',
                        message: `Description too short (${descriptionLength} chars). Minimum 90 characters recommended.`,
                        offerId: offerId
                    });
                } else if (descriptionLength > 5000) {
                    issues.push({
                        rowIndex: rowIndex,
                        field: 'description',
                        type: 'warning',
                        message: `Description too long (${descriptionLength} chars). Maximum 5000 characters recommended.`,
                        offerId: offerId
                    });
                }
            }
        });
        
        return {
            isValid: issues.length === 0,
            totalProducts: feedData.length,
            validProducts: feedData.length - issues.length,
            issues: issues
        };
    }
    
    /**
     * Displays the validation results
     * @param {string} feedId - The ID of the feed
     * @param {Object} results - The validation results
     */
    function displayValidationResults(feedId, results) {
        if (!results) {
            alert("Cannot display validation results: No data provided.");
            return;
        }
        
        console.log(`[DEBUG] Displaying validation results for ${feedId}`, results);
        
        // Store results locally
        validationResults[feedId] = results;
        
        // Update history tab with the new validation run
        updateValidationHistory(feedId, results);
    }
    
    /**
     * Updates the validation history table with a new validation run
     * @param {string} feedId - The ID of the feed
     * @param {Object} results - The validation results
     */
    function updateValidationHistory(feedId, results) {
        if (!historyTableBody) {
            console.error('[DEBUG] Validation history table body not found');
            return;
        }
        
        if (!results) {
            console.error('[DEBUG] No results provided to updateValidationHistory');
            return;
        }
        
        // Clear placeholder rows if present
        const placeholderRow = historyTableBody.querySelector('td[colspan="5"]');
        if (placeholderRow) {
            historyTableBody.innerHTML = '';
        }
        
        // Create display results object for the current run
        const displayResults = {
            isValid: results.isValid !== undefined ? results.isValid : (results.issues?.length === 0),
            issueCount: results.issues?.length || 0,
            errorCount: results.issues?.filter(i => i.type === 'error').length || 0,
            warningCount: results.issues?.filter(i => i.type === 'warning').length || 0,
            totalIssues: results.issues?.length || 0
        };
        
        // Create and add the row element for the current run
        const row = document.createElement('tr');
        row.dataset.historyId = feedId;
        
        // Format timestamp
        const timestamp = new Date();
        const timeString = timestamp.toLocaleString();
        
        // Create status class based on validity
        const statusClass = displayResults.isValid ? 'status-valid' : 'status-invalid';
        const statusText = displayResults.isValid ? 'Valid' : 'Issues Found';
        
        // Create issue count text
        const issueText = displayResults.totalIssues > 0
            ? `${displayResults.totalIssues} (${displayResults.errorCount} errors, ${displayResults.warningCount} warnings)`
            : 'None';
        
        // Set row content
        row.innerHTML = `
            <td>${timeString}</td>
            <td>${feedId}</td>
            <td class="${statusClass}">${statusText}</td>
            <td>${issueText}</td>
            <td>
                <button class="view-details-btn modern-button small" data-history-id="${feedId}">View Details</button>
            </td>
        `;
        
        // Add click handler for the view details button
        const viewDetailsBtn = row.querySelector('.view-details-btn');
        if (viewDetailsBtn) {
            viewDetailsBtn.addEventListener('click', () => displayHistorySummary(feedId));
        }
        
        // Add the row to the top of the table
        if (historyTableBody) {
            historyTableBody.insertBefore(row, historyTableBody.firstChild);
        }
    }
    
    /**
     * Displays a summary of a validation history entry
     * @param {string} historyId - The ID of the history entry to display
     */
    function displayHistorySummary(historyId) {
        console.log(`[DEBUG] Displaying summary for history entry ${historyId}`);
        
        // Get the validation results
        const results = validationResults[historyId];
        if (!results) {
            alert("Could not find history data");
            return;
        }
        
        // Close any existing panel
        if (activeValidationPanel) {
            activeValidationPanel.remove();
            activeValidationPanel = null;
        }
        
        // Create the validation panel
        const panel = createValidationPanel(historyId, results);
        if (!panel) return;
        
        // Add row navigation interactivity to the new panel
        setupRowNavigation(panel);
        
        // Make sure panel is visible and positioned
        panel.style.display = 'block';
        panel.style.opacity = '1';
        panel.style.right = '20px';
        panel.style.top = '150px';
        
        // Make the panel draggable
        makeDraggable(panel);
        
        // Add the panel to the document
        document.body.appendChild(panel);
        
        activeValidationPanel = panel;
    }
    
    /**
     * Creates a validation panel element with the provided data
     * @param {string} feedId - The ID of the feed being validated
     * @param {Object} data - The validation results data
     * @returns {HTMLElement|null} - The created panel element, or null if creation failed
     */
    function createValidationPanel(feedId, data) {
        if (!data || data.issues === undefined) {
            console.error('[DEBUG] Invalid validation data provided to createValidationPanel:', data);
            alert('Could not display validation results: Invalid data.');
            return null;
        }
        
        const issueCount = data.issues.length;
        const panel = document.createElement('div');
        panel.className = 'floating-validation-panel';
        panel.dataset.feedId = feedId;
        
        // Group issues by row
        const issuesByRow = groupIssuesByRow(data.issues);
        
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
                ${formatValidationIssues(data.issues, issuesByRow)}
            </div>`;
        
        const closeBtn = panel.querySelector('.close-panel');
        if (closeBtn) {
            closeBtn.onclick = () => {
                panel.remove();
                if (activeValidationPanel === panel) activeValidationPanel = null;
            };
        }
        
        return panel;
    }
    
    /**
     * Groups validation issues by row for display
     * @param {Array} issues - The validation issues to group
     * @returns {Object} - The issues grouped by row
     */
    function groupIssuesByRow(issues) {
        if (!issues) return {};
        return issues.reduce((groups, issue) => {
            const rowIndex = issue.rowIndex || 'unknown';
            if (!groups[rowIndex]) groups[rowIndex] = [];
            groups[rowIndex].push(issue);
            return groups;
        }, {});
    }
    
    /**
     * Formats validation issues for display in the panel
     * @param {Array} issues - The validation issues to format
     * @param {Object} issuesByRow - The issues grouped by row
     * @returns {string} - The formatted HTML for the issues
     */
    function formatValidationIssues(issues, issuesByRow) {
        if (!issues || !issues.length) return '<p class="no-issues">No issues found according to Google Merchant Center!</p>';
        if (!issuesByRow) issuesByRow = groupIssuesByRow(issues);
        
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
                            const offerId = issue.offerId || issue['Offer ID'] || '';
                            return `
                            <div class="issue-item ${issue.type || 'error'}"
                                 data-row="${rowIndex}"
                                 data-field="${issue.field || 'general'}"
                                 data-offer-id="${offerId}">
                                <span class="issue-severity">${issue.type || 'error'}</span>
                                <span class="issue-message">${issue.message || 'Unknown issue'}</span>
                                ${issue.field && issue.field !== 'general' ? `<span class="issue-field">(Field: ${issue.field})</span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                `).join('')}
            </div>`;
    }
    
    /**
     * Sets up row navigation for the validation panel
     * @param {HTMLElement} panel - The panel element to set up navigation for
     */
    function setupRowNavigation(panel) {
        if (!panel) return;
        panel.querySelectorAll('.row-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const rowIndex = parseInt(link.dataset.row);
                if (!isNaN(rowIndex)) {
                    // Get the field name to focus
                    const issueGroup = link.closest('.issue-group');
                    const firstIssueItem = issueGroup?.querySelector('.issue-item');
                    const fieldToFix = firstIssueItem?.dataset.field || null;
                    
                    // Navigate to the row
                    navigateToRow(rowIndex, fieldToFix);
                }
            };
        });
    }
    
    /**
     * Navigates to a specific row in the feed preview
     * @param {number} rowIndex - The index of the row to navigate to
     * @param {string} fieldToFocus - The field to focus on
     */
    function navigateToRow(rowIndex, fieldToFocus = null) {
        console.log(`[DEBUG] Navigating to row ${rowIndex}, field ${fieldToFocus}`);
        
        // Switch to feed tab
        const feedTabButton = document.querySelector('.tab-button[data-tab="feed"]');
        if (feedTabButton) {
            feedTabButton.click();
        }
        
        // Find the row
        const row = document.querySelector(`#row-${rowIndex}`);
        if (!row) {
            console.error(`[DEBUG] Row ${rowIndex} not found`);
            return;
        }
        
        // Scroll to the row
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Highlight the row
        row.classList.add('validation-focus');
        row.classList.add('needs-fix');
        
        // Focus on the field if specified
        if (fieldToFocus) {
            const field = row.querySelector(`.editable-field[data-field="${fieldToFocus}"]`);
            if (field) {
                field.focus();
                
                // Select all text
                const range = document.createRange();
                range.selectNodeContents(field);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                
                // Add event listener to remove highlighting when fixed
                field.addEventListener('input', debounce(() => {
                    const content = field.textContent || '';
                    const currentLength = content.length;
                    
                    // Define validation rules based on field type
                    const isDescription = fieldToFocus === 'description';
                    const minLength = isDescription ? 90 : 30;
                    const maxLength = isDescription ? 5000 : 150;
                    
                    // Check if the field meets requirements
                    if (currentLength >= minLength && currentLength <= maxLength) {
                        // Remove highlighting
                        field.classList.remove('under-minimum');
                        field.classList.remove('over-limit');
                        
                        // Apply green background to valid fields
                        field.style.backgroundColor = 'rgba(40, 167, 69, 0.1)';
                        field.style.borderColor = '#28a745';
                        
                        // Check if all fields in the row are valid
                        const invalidFields = row.querySelectorAll('.editable-field.under-minimum, .editable-field.over-limit');
                        if (invalidFields.length === 0) {
                            row.classList.remove('needs-fix');
                            row.classList.remove('validation-focus');
                            row.classList.add('fix-complete');
                            
                            // Remove the issue from the panel
                            markIssueAsFixed(row.dataset.offerId, fieldToFocus);
                            
                            // Remove the fix-complete class after a delay
                            setTimeout(() => {
                                row.classList.remove('fix-complete');
                            }, 1000);
                        }
                    }
                }, 300));
            }
        }
    }
    
    /**
     * Marks an issue as fixed for a specific offer ID and field
     * @param {string} offerId - The offer ID of the issue to mark as fixed
     * @param {string} fieldName - The field name of the issue to mark as fixed
     */
    function markIssueAsFixed(offerId, fieldName) {
        console.log(`[DEBUG] Marking issue as fixed for offer ID ${offerId}, field ${fieldName}`);
        
        // Get the active validation panel
        if (!activeValidationPanel) return;
        
        // Get the feed ID from the panel
        const feedId = activeValidationPanel.dataset.feedId;
        if (!feedId || !validationResults[feedId]) return;
        
        // Get the validation results
        const results = validationResults[feedId];
        
        // Remove the issue from the results
        if (results && results.issues) {
            results.issues = results.issues.filter(issue => {
                const issueOfferId = issue.offerId || issue['Offer ID'];
                return !(issueOfferId === offerId && issue.field === fieldName);
            });
            
            // Update the panel
            const issueItem = activeValidationPanel.querySelector(`.issue-item[data-offer-id="${offerId}"][data-field="${fieldName}"]`);
            if (issueItem) {
                const issueGroup = issueItem.closest('.issue-group');
                issueItem.remove();
                
                // If there are no more issues in the group, remove the group
                if (issueGroup && issueGroup.querySelectorAll('.issue-item').length === 0) {
                    issueGroup.remove();
                }
                
                // Update the issue count
                const issueCountEl = activeValidationPanel.querySelector('.issue-count');
                if (issueCountEl) {
                    const issueCount = results.issues.length;
                    issueCountEl.textContent = `${issueCount} Issues Found`;
                    issueCountEl.className = `issue-count ${issueCount > 0 ? 'has-issues' : ''}`;
                }
                
                // Update the validation status
                const validationStatusEl = activeValidationPanel.querySelector('.validation-status');
                if (validationStatusEl) {
                    const isValid = results.issues.length === 0;
                    validationStatusEl.textContent = isValid ? 'Feed Valid' : 'Feed Invalid';
                    validationStatusEl.className = `validation-status ${isValid ? 'valid' : 'invalid'}`;
                }
                
                // If there are no more issues, update the issues container
                if (results.issues.length === 0) {
                    const issuesContainer = activeValidationPanel.querySelector('.issues-container');
                    if (issuesContainer) {
                        issuesContainer.innerHTML = '<p class="no-issues">No issues found according to Google Merchant Center!</p>';
                    }
                }
            }
        }
    }
    
    /**
     * Makes an element draggable by its header
     * @param {HTMLElement} element - The element to make draggable
     */
    function makeDraggable(element) {
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
            // Fallback if no initial transform
            const rect = element.getBoundingClientRect();
            xOffset = (window.innerWidth / 2) - (rect.width / 2);
            yOffset = (window.innerHeight / 2) - (rect.height / 2);
            element.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
            element.style.left = '0px';
            element.style.top = '0px';
        }
        
        const mouseDownHandler = (e) => {
            if (e.target !== header && !header.contains(e.target)) return;
            isDragging = true;
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;
            element.style.cursor = 'grabbing';
            header.style.cursor = 'grabbing';
            e.preventDefault();
        };
        
        const mouseMoveHandler = (e) => {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;
                xOffset = currentX;
                yOffset = currentY;
                element.style.transform = `translate(${currentX}px, ${currentY}px)`;
            }
        };
        
        const mouseUpHandler = () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = '';
                header.style.cursor = 'grab';
            }
        };
        
        header.addEventListener('mousedown', mouseDownHandler);
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
        header.style.cursor = 'grab';
    }
    
    /**
     * Loads validation history
     */
    function loadValidationHistory() {
        if (!historyTableBody) {
            console.error('[DEBUG] Validation history table body not found');
            return;
        }
        
        // Clear existing history rows
        historyTableBody.innerHTML = '<tr><td colspan="5">Loading history...</td></tr>';
        
        // Check if there are any validation results
        if (Object.keys(validationResults).length === 0) {
            historyTableBody.innerHTML = '<tr><td colspan="5">No validation history found.</td></tr>';
            return;
        }
        
        // Clear the table
        historyTableBody.innerHTML = '';
        
        // Add each history entry to the table
        Object.entries(validationResults).forEach(([feedId, results]) => {
            // Create display results object for the current run
            const displayResults = {
                isValid: results.isValid !== undefined ? results.isValid : (results.issues?.length === 0),
                issueCount: results.issues?.length || 0,
                errorCount: results.issues?.filter(i => i.type === 'error').length || 0,
                warningCount: results.issues?.filter(i => i.type === 'warning').length || 0,
                totalIssues: results.issues?.length || 0
            };
            
            // Create and add the row element for the current run
            const row = document.createElement('tr');
            row.dataset.historyId = feedId;
            
            // Format timestamp
            const timestamp = new Date();
            const timeString = timestamp.toLocaleString();
            
            // Create status class based on validity
            const statusClass = displayResults.isValid ? 'status-valid' : 'status-invalid';
            const statusText = displayResults.isValid ? 'Valid' : 'Issues Found';
            
            // Create issue count text
            const issueText = displayResults.totalIssues > 0
                ? `${displayResults.totalIssues} (${displayResults.errorCount} errors, ${displayResults.warningCount} warnings)`
                : 'None';
            
            // Set row content
            row.innerHTML = `
                <td>${timeString}</td>
                <td>${feedId}</td>
                <td class="${statusClass}">${statusText}</td>
                <td>${issueText}</td>
                <td>
                    <button class="view-details-btn modern-button small" data-history-id="${feedId}">View Details</button>
                </td>
            `;
            
            // Add click handler for the view details button
            const viewDetailsBtn = row.querySelector('.view-details-btn');
            if (viewDetailsBtn) {
                viewDetailsBtn.addEventListener('click', () => displayHistorySummary(feedId));
            }
            
            // Add the row to the table
            historyTableBody.appendChild(row);
        });
    }
});

// Add CSS for validation panel
document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
        .floating-validation-panel {
            position: fixed;
            width: 400px;
            max-width: 90vw;
            max-height: 80vh;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .panel-header {
            background: #1976D2;
