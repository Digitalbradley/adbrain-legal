/**
 * Direct Validation History Module
 *
 * This module handles validation history management for the direct validation functionality.
 * It provides functions to update the validation history table, create a new table if needed,
 * and handle history-related UI.
 */

(function() {
    /**
     * Updates the validation history table with the new validation results
     * @param {Object} results The validation results
     */
    function updateValidationHistory(results) {
        console.log('[DIRECT] Updating validation history with results:', results);
        
        if (!results) {
            console.error('[DIRECT] Invalid validation results');
            return;
        }
        
        // Try to find the validation history table body by ID
        const historyTableBody = document.getElementById('validationHistory');
        console.log('[DIRECT] Found validation history table body by ID:', historyTableBody);
        
        if (!historyTableBody) {
            console.error('[DIRECT] History table body not found. Looking for element with ID "validationHistory"');
            return;
        }
        
        // Clear placeholder rows if present
        const placeholderRow = historyTableBody.querySelector('td[colspan="5"]');
        if (placeholderRow) {
            console.log('[DIRECT] Clearing placeholder row');
            historyTableBody.innerHTML = '';
        }
        
        // Create a new row for the history table
        const row = createHistoryRow(results);
        
        // Add the row to the top of the table
        console.log('[DIRECT] Adding row to history table');
        historyTableBody.insertBefore(row, historyTableBody.firstChild);
        
        // Set up the click handler for the View Details button
        setupViewDetailsButton(row, results);
    }
    
    /**
     * Creates a validation history table as a last resort if one doesn't exist
     * @param {Object} results The validation results to display
     * @param {HTMLElement} [container] Optional container to append the table to
     */
    function createValidationHistoryTable(results, container) {
        console.log('[DIRECT] Creating validation history table');
        
        if (!results) {
            console.error('[DIRECT] Invalid validation results');
            return;
        }
        
        // Try to find the validation tab if no container provided
        if (!container) {
            container = document.getElementById('validationTab');
            if (!container) {
                console.error('[DIRECT] Cannot create validation history table: validation tab not found');
                return;
            }
        }
        
        // Create the table
        const table = document.createElement('table');
        table.className = 'validation-table';
        
        // Create the table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Date</th>
                <th>Feed ID</th>
                <th>Status</th>
                <th>Issues</th>
                <th>Actions</th>
            </tr>
        `;
        table.appendChild(thead);
        
        // Create the table body
        const tbody = document.createElement('tbody');
        tbody.id = 'validationHistory';
        table.appendChild(tbody);
        
        // Add the table to the container
        container.appendChild(table);
        
        console.log('[DIRECT] Validation history table created');
        
        // Now update the table with the results
        updateValidationHistory(results);
    }
    
    /**
     * Updates the validation history table with the new validation results using the provided element
     * @param {HTMLElement} historyTableBody - The table body element to update
     * @param {Object} results - The validation results
     */
    function updateValidationHistoryWithElement(historyTableBody, results) {
        console.log('[DIRECT] Updating validation history with element:', historyTableBody);
        
        if (!historyTableBody) {
            console.error('[DIRECT] History table body not found');
            return;
        }
        
        if (!results) {
            console.error('[DIRECT] Invalid validation results');
            return;
        }
        
        // Clear placeholder rows if present
        const placeholderRow = historyTableBody.querySelector('td[colspan="5"]');
        if (placeholderRow) {
            console.log('[DIRECT] Clearing placeholder row');
            historyTableBody.innerHTML = '';
        }
        
        // Create a new row for the history table using our createHistoryRow function
        const row = createHistoryRow(results);
        
        // Add the row to the top of the table
        console.log('[DIRECT] Adding row to history table');
        historyTableBody.insertBefore(row, historyTableBody.firstChild);
        
        // Set up the click handler for the View Details button
        setupViewDetailsButton(row, results);
    }
    
    /**
     * Creates a history row element for the validation history table
     * @param {Object} results - The validation results
     * @returns {HTMLElement|null} The created row element or null if results are invalid
     */
    function createHistoryRow(results) {
        console.log('[DIRECT] Creating history row for results:', results);
        
        if (!results) {
            console.error('[DIRECT] Invalid validation results');
            return null;
        }
        
        // Create a new row for the history table
        const row = document.createElement('tr');
        
        // Format the timestamp
        const timestamp = results.timestamp;
        const formattedDate = timestamp.toLocaleDateString();
        const formattedTime = timestamp.toLocaleTimeString();
        
        // Create the row content
        row.innerHTML = `
            <td>${formattedDate} ${formattedTime}</td>
            <td>${results.feedId}</td>
            <td><span style="color: ${results.isValid ? 'green' : 'red'};">${results.isValid ? 'Valid' : 'Issues Found'}</span></td>
            <td>
                <span style="color: ${results.issues.length > 0 ? 'red' : 'green'};">${results.issues.length}</span>
                (${results.issues.filter(i => i.type === 'error').length} errors,
                ${results.issues.filter(i => i.type === 'warning').length} warnings)
            </td>
            <td>
                <button class="view-details-btn modern-button small">View Details</button>
            </td>
        `;
        
        return row;
    }
    
    /**
     * Sets up the click handler for the view details button
     * @param {HTMLElement} rowElement - The row element containing the button
     * @param {Object} results - The validation results
     */
    function setupViewDetailsButton(rowElement, results) {
        console.log('[DIRECT] Setting up view details button');
        
        if (!rowElement) {
            console.error('[DIRECT] Row element not provided');
            return;
        }
        
        if (!results) {
            console.error('[DIRECT] Invalid validation results');
            return;
        }
        
        // Find the view details button
        const viewDetailsBtn = rowElement.querySelector('.view-details-btn');
        if (viewDetailsBtn) {
            console.log('[DIRECT] Adding click handler to View Details button');
            viewDetailsBtn.addEventListener('click', () => {
                console.log('[DIRECT] View Details button clicked');
                if (window.DirectValidationUI) {
                    window.DirectValidationUI.displayValidationDetailsPopup(results);
                }
            });
        } else {
            console.error('[DIRECT] View details button not found');
        }
    }
    
    // Export functions to global scope
    window.DirectValidationHistory = {
        updateValidationHistory: updateValidationHistory,
        createValidationHistoryTable: createValidationHistoryTable,
        updateValidationHistoryWithElement: updateValidationHistoryWithElement,
        createHistoryRow: createHistoryRow,
        setupViewDetailsButton: setupViewDetailsButton
    };
    
    console.log('[DIRECT] History module initialized');
})();