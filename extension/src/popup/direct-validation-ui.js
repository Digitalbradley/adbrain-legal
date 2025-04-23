/**
 * Direct Validation UI Module
 *
 * This module handles UI-related functionality for the direct validation.
 * It provides functions to display validation results, format issues list,
 * set up row navigation, and display the validation details popup.
 */

(function() {
    /**
     * Displays validation results in a floating panel
     * @param {Object} results Validation results
     */
    function displayValidationResults(results) {
        console.log('[DIRECT] displayValidationResults called with results:', results);
        
        // Don't create a floating panel, just update the validation history table
        if (window.DirectValidationHistory) {
            window.DirectValidationHistory.updateValidationHistory(results);
        }
        
        // Switch to the validation tab
        if (window.DirectValidationTabs) {
            window.DirectValidationTabs.switchToValidationTab();
        }
        
        // Show a success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.style.position = 'fixed';
        successMessage.style.top = '20px';
        successMessage.style.left = '50%';
        successMessage.style.transform = 'translateX(-50%)';
        successMessage.style.backgroundColor = '#28a745';
        successMessage.style.color = 'white';
        successMessage.style.padding = '10px 20px';
        successMessage.style.borderRadius = '5px';
        successMessage.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        successMessage.style.zIndex = '1000';
        successMessage.textContent = 'Validation complete. Results shown in Validation History tab.';
        
        document.body.appendChild(successMessage);
        
        // Remove the success message after 3 seconds
        setTimeout(() => {
            successMessage.style.opacity = '0';
            successMessage.style.transition = 'opacity 0.5s';
            setTimeout(() => successMessage.remove(), 500);
        }, 3000);
        
        console.log('[DIRECT] Validation results displayed in Validation History tab');
    }
    
    /**
     * Formats the issues list for display in the panel
     * @param {Array} issues The validation issues to format
     * @returns {string} The formatted HTML for the issues
     */
    function formatIssuesList(issues) {
        console.log('[DIRECT DEBUG] formatIssuesList called with issues:', issues);
        
        if (!issues || !issues.length) {
            console.log('[DIRECT DEBUG] No issues found in the feed data');
            return '<p style="color: green;">No issues found in the feed data!</p>';
        }
        
        // Group issues by row
        const issuesByRow = {};
        issues.forEach(issue => {
            const rowIndex = issue.rowIndex || 'unknown';
            console.log(`[DIRECT DEBUG] Processing issue for row ${rowIndex}:`, issue);
            
            if (!issuesByRow[rowIndex]) {
                issuesByRow[rowIndex] = [];
            }
            issuesByRow[rowIndex].push(issue);
        });
        
        console.log('[DIRECT DEBUG] Issues grouped by row:', issuesByRow);
        
        // Format the issues list
        let html = '<div style="margin-top: 15px;">';
        html += '<h4 style="margin-top: 0;">Issues by Row</h4>';
        
        console.log('[DIRECT DEBUG] Issues grouped by row:', issuesByRow);
        
        Object.entries(issuesByRow).forEach(([rowIndex, rowIssues]) => {
            console.log(`[DIRECT DEBUG] Creating HTML for row ${rowIndex} with ${rowIssues.length} issues`);
            html += `
                <div style="margin-bottom: 15px; border: 1px solid #eee; padding: 10px; border-radius: 5px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>Row ${rowIndex}</strong>
                        ${rowIndex !== 'unknown' ? `<a href="#" class="row-link" data-row="${rowIndex}" style="color: blue; text-decoration: underline; cursor: pointer;">Go to Row</a>` : ''}
                    </div>
                    <ul style="margin: 0; padding-left: 20px;">
                        ${rowIssues.map(issue => {
                            return `
                            <li class="issue-item" data-row="${rowIndex}" data-field="${issue.field || 'general'}" style="margin-bottom: 5px; color: ${issue.type === 'error' ? 'red' : 'orange'};">
                                ${issue.message}
                                ${issue.field ? `<span style="color: #666;">(Field: ${issue.field})</span>` : ''}
                            </li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        });
        
        html += '</div>';
        return html;
    }
    
    /**
     * Sets up row navigation from the validation panel
     * @param {HTMLElement} panel The validation panel element
     */
    function setupRowNavigation(panel) {
        console.log('[DIRECT DEBUG] Setting up row navigation for panel:', panel);
        const rowLinks = panel.querySelectorAll('.row-link');
        console.log('[DIRECT DEBUG] Found row links:', rowLinks.length);
        
        // Store validation issues for tracking
        if (!window.validationIssues) {
            window.validationIssues = {};
        }
        
        rowLinks.forEach(link => {
            console.log('[DIRECT DEBUG] Adding click handler to row link:', link);
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const rowIndex = parseInt(link.dataset.row);
                console.log('[DIRECT DEBUG] Row link clicked for row:', rowIndex);
                
                // Switch to feed tab
                if (window.DirectValidationTabs) {
                    console.log('[DIRECT DEBUG] Switching to feed tab');
                    window.DirectValidationTabs.switchToFeedTab();
                    
                    // Add a small delay to allow the tab switch to complete
                    setTimeout(() => {
                        console.log('[DIRECT DEBUG] Tab switch delay complete, now looking for table');
                        findRowAndHighlight(rowIndex);
                    }, 300); // Increased delay to ensure tab switch completes
                } else {
                    console.log('[DIRECT DEBUG] DirectValidationTabs not available, trying to find row directly');
                    findRowAndHighlight(rowIndex);
                }
            });
        });
        
        function findRowAndHighlight(rowIndex) {
            console.log('[DIRECT DEBUG] Looking for table with selector: #previewContent table');
            const table = document.querySelector('#previewContent table');
            console.log('[DIRECT DEBUG] Found table:', table);
            
            if (!table) {
                console.error('[DIRECT DEBUG] Table not found in #previewContent');
                return;
            }
            
            console.log('[DIRECT DEBUG] Looking for rows in table');
            const rows = table.querySelectorAll('tbody tr');
            console.log('[DIRECT DEBUG] Found rows:', rows.length);
            
            if (rowIndex <= 0 || rowIndex > rows.length) {
                console.error(`[DIRECT DEBUG] Row index ${rowIndex} out of bounds (1-${rows.length})`);
                return;
            }
            
            console.log('[DIRECT DEBUG] Getting row at index:', rowIndex - 1);
            const row = rows[rowIndex - 1];
            console.log('[DIRECT DEBUG] Found row:', row);
            
            if (!row) {
                console.error(`[DIRECT DEBUG] Row at index ${rowIndex - 1} not found`);
                return;
            }
            
            // Scroll to the row
            console.log('[DIRECT DEBUG] Attempting to scroll row into view');
            try {
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                console.log('[DIRECT DEBUG] scrollIntoView called successfully');
            } catch (error) {
                console.error('[DIRECT DEBUG] Error scrolling into view:', error);
                
                // Fallback scrolling method
                console.log('[DIRECT DEBUG] Trying fallback scrolling method');
                const tableContainer = document.getElementById('previewContent');
                if (tableContainer) {
                    const rowTop = row.offsetTop;
                    const containerHeight = tableContainer.clientHeight;
                    tableContainer.scrollTop = rowTop - (containerHeight / 2);
                    console.log('[DIRECT DEBUG] Fallback scrolling applied:', {
                        rowTop,
                        containerHeight,
                        scrollTop: tableContainer.scrollTop
                    });
                }
            }
            
            // Highlight the row using the existing CSS classes
            row.classList.add('row-highlight');
            
            // Add a temporary class for highlighting
            row.classList.add('highlighted-row');
            
            // Keep the highlighting until errors are fixed
            // We'll remove it when the user fixes the errors
            
            console.log('[DIRECT DEBUG] Row highlighted successfully');
        }
    }
    
    /**
     * Displays validation details in a popup when the View Details button is clicked
     * @param {Object} results The validation results
     */
    function displayValidationDetailsPopup(results) {
        // Remove any existing validation panels
        const existingPanels = document.querySelectorAll('.floating-validation-panel');
        existingPanels.forEach(panel => panel.remove());
        
        // Create panel element
        const panel = document.createElement('div');
        panel.className = 'floating-validation-panel';
        panel.dataset.feedId = results.feedId;
        
        // Get issue count
        const issueCount = results.issues?.length || 0;
        
        // Create header and content containers
        const header = document.createElement('div');
        header.className = 'validation-panel-header';
        
        const content = document.createElement('div');
        content.className = 'validation-panel-content';
        
        // Add header content
        header.innerHTML = `
            <h3 style="margin: 0;">Validation Details</h3>
            <button style="background: none; border: none; font-size: 20px; cursor: pointer;" title="Close Panel">&times;</button>
        `;
        
        // Add content
        content.innerHTML = `
            <div style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold;">Feed ID:</span>
                    <span>${results.feedId}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold;">Status:</span>
                    <span style="color: ${results.isValid ? 'green' : 'red'};">${results.isValid ? 'Valid' : 'Invalid'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold;">Issues:</span>
                    <span style="color: ${issueCount > 0 ? 'red' : 'green'};">${issueCount}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span style="font-weight: bold;">Products:</span>
                    <span>${results.validProducts} of ${results.totalProducts} valid</span>
                </div>
            </div>
            <div>
                ${formatIssuesList(results.issues)}
            </div>
        `;
        
        // Add header and content to panel
        panel.appendChild(header);
        panel.appendChild(content);
        
        // Add to document
        document.body.appendChild(panel);
        
        // Add close button functionality
        const closeBtn = header.querySelector('button');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => panel.remove());
        }
        
        // Add row navigation functionality
        setupRowNavigation(panel);
        
        // Make the panel draggable
        makeDraggable(panel);
    }
    
    /**
     * Makes an element draggable by its header
     * @param {HTMLElement} element The element to make draggable
     */
    function makeDraggable(element) {
        const header = element.querySelector('.validation-panel-header');
        if (!header) return;
        
        let isDragging = false;
        let offsetX, offsetY;
        
        header.style.cursor = 'move';
        
        header.addEventListener('mousedown', (e) => {
            // Ignore if clicking on the close button
            if (e.target.tagName === 'BUTTON') return;
            
            isDragging = true;
            offsetX = e.clientX - element.getBoundingClientRect().left;
            offsetY = e.clientY - element.getBoundingClientRect().top;
            
            // Prevent text selection during drag
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;
            
            // Ensure the panel stays within the viewport
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;
            
            element.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            element.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
            
            // Update position to fixed with calculated values
            element.style.position = 'fixed';
            element.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    // Export functions to global scope
    window.DirectValidationUI = {
        displayValidationResults: displayValidationResults,
        formatIssuesList: formatIssuesList,
        setupRowNavigation: setupRowNavigation,
        displayValidationDetailsPopup: displayValidationDetailsPopup,
        makeDraggable: makeDraggable
    };
    
    console.log('[DIRECT] UI module initialized');
})();