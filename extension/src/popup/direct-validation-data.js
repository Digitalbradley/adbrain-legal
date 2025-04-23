/**
 * Direct Validation Data Module
 *
 * This module handles data retrieval and processing for the direct validation functionality.
 * It provides functions to extract data from the preview table and validate feed data against basic rules.
 */

(function() {
    /**
     * Gets data from the preview table
     * @returns {Array} Array of row data objects
     */
    function getTableData() {
        console.log('[DIRECT DEBUG] getTableData called');
        const table = document.querySelector('#previewContent table');
        console.log('[DIRECT DEBUG] Preview table found:', !!table);
        
        if (!table) {
            console.error('[DIRECT] Preview table not found');
            return [];
        }
        
        const headers = [];
        const headerCells = table.querySelectorAll('thead th');
        headerCells.forEach(cell => headers.push(cell.textContent.trim()));
        console.log('[DIRECT DEBUG] Table headers:', headers);
        
        const rows = [];
        const rowElements = table.querySelectorAll('tbody tr');
        
        console.log('[DIRECT DEBUG] Table rows found:', rowElements.length);
        
        rowElements.forEach((row, rowIndex) => {
            const rowData = {};
            const cells = row.querySelectorAll('td');
            console.log(`[DIRECT DEBUG] Row ${rowIndex + 1} cells:`, cells.length);
            
            headers.forEach((header, index) => {
                if (index < cells.length) {
                    // Get the cell content
                    let cellContent = cells[index].textContent.trim();
                    
                    // Check if the cell has editable content
                    const editableField = cells[index].querySelector('[contenteditable="true"]');
                    if (editableField) {
                        cellContent = editableField.textContent.trim();
                        console.log(`[DIRECT DEBUG] Row ${rowIndex + 1}, Column ${header} has editable content:`, cellContent);
                    }
                    
                    rowData[header] = cellContent;
                }
            });
            
            // Add row index for reference
            rowData.rowIndex = rowIndex + 1;
            
            rows.push(rowData);
        });
        
        console.log('[DIRECT DEBUG] Extracted data from table:', rows.slice(0, 3));
        return rows;
    }
    
    /**
     * Validates feed data against basic rules
     * @param {Array} feedData Array of row data objects
     * @returns {Object} Validation results
     */
    function validateFeedData(feedData) {
        console.log('[DIRECT DEBUG] validateFeedData called with', feedData.length, 'rows');
        console.log('[DIRECT DEBUG] First row data:', feedData[0]);
        console.log('[DIRECT DEBUG] Second row data:', feedData[1]);
        console.log('[DIRECT DEBUG] Third row data:', feedData[2]);
        
        const issues = [];
        let validProducts = 0;
        
        feedData.forEach((item, index) => {
            const rowIndex = index + 1;
            let rowHasIssues = false;
            console.log(`[DIRECT DEBUG] Validating row ${rowIndex}:`, item);
            
            // Check title length (example validation)
            console.log(`[DIRECT DEBUG] Title length: ${item.title ? item.title.length : 'N/A'}`);
            
            // Log the item data for debugging
            console.log(`[DIRECT DEBUG] Row ${rowIndex} data:`, item);
            console.log(`[DIRECT DEBUG] Row ${rowIndex} title:`, item.title);
            console.log(`[DIRECT DEBUG] Row ${rowIndex} title type:`, typeof item.title);
            console.log(`[DIRECT DEBUG] Row ${rowIndex} title length:`, item.title ? item.title.length : 'N/A');
            
            // Check title length (should be at least 30 characters)
            if (item.title && item.title.length < 30) {
                console.log(`[DIRECT DEBUG] Title too short: ${item.title.length} chars`);
                issues.push({
                    rowIndex: rowIndex,
                    field: 'title',
                    type: 'error',
                    message: `Title too short (${item.title.length} chars). Minimum 30 characters recommended.`,
                    offerId: item.id || `row-${rowIndex}`
                });
                rowHasIssues = true;
            }
            
            // Check description length (example validation)
            console.log(`[DIRECT DEBUG] Description length: ${item.description ? item.description.length : 'N/A'}`);
            
            // Log the description data for debugging
            console.log(`[DIRECT DEBUG] Row ${rowIndex} description:`, item.description);
            console.log(`[DIRECT DEBUG] Row ${rowIndex} description type:`, typeof item.description);
            console.log(`[DIRECT DEBUG] Row ${rowIndex} description length:`, item.description ? item.description.length : 'N/A');
            
            // Check description length (should be at least 90 characters)
            if (item.description && item.description.length < 90) {
                console.log(`[DIRECT DEBUG] Description too short: ${item.description.length} chars`);
                issues.push({
                    rowIndex: rowIndex,
                    field: 'description',
                    type: 'error',
                    message: `Description too short (${item.description.length} chars). Minimum 90 characters recommended.`,
                    offerId: item.id || `row-${rowIndex}`
                });
                rowHasIssues = true;
            }
            
            // Check if image link exists
            if (!item.image_link || item.image_link.trim() === '') {
                issues.push({
                    rowIndex: rowIndex,
                    field: 'image_link',
                    type: 'error',
                    message: 'Image link is required but missing.',
                    offerId: item.id || `row-${rowIndex}`
                });
                rowHasIssues = true;
            }
            
            // Check if link exists
            if (!item.link || item.link.trim() === '') {
                issues.push({
                    rowIndex: rowIndex,
                    field: 'link',
                    type: 'error',
                    message: 'Product link is required but missing.',
                    offerId: item.id || `row-${rowIndex}`
                });
                rowHasIssues = true;
            }
            
            if (!rowHasIssues) {
                validProducts++;
            }
        });
        
        console.log('[DIRECT DEBUG] Validation complete. Issues found:', issues.length);
        console.log('[DIRECT DEBUG] Issues:', issues);
        
        return {
            feedId: `DIRECT-VAL-${Date.now().toString().slice(-6)}`,
            timestamp: new Date(),
            totalProducts: feedData.length,
            validProducts: validProducts,
            issues: issues,
            isValid: issues.length === 0
        };
    }
    
    // Export functions to global scope
    window.DirectValidationData = {
        getTableData: getTableData,
        validateFeedData: validateFeedData
    };
    
    console.log('[DIRECT] Data module initialized');
})();