/**
 * Manages the search and filtering functionality for the feed preview table.
 */
// Use global debounce function
// No need to import it since it's already available globally

class SearchManager {
    /**
     * @param {object} elements - Object containing references to DOM elements.
     * @param {HTMLInputElement} elements.searchInput
     * @param {HTMLSelectElement} elements.searchColumnSelect
     * @param {HTMLSelectElement} elements.searchTypeSelect
     * @param {HTMLButtonElement} elements.clearSearchBtn
     * @param {HTMLElement} elements.tableContainer - The container holding the preview table (e.g., #previewContent)
     * @param {HTMLElement} elements.statusElement - The element to display search status/results count.
     */
    constructor(elements) {
        this.elements = elements;
        this.debounceTimeout = null;

        if (!this.elements.searchInput || !this.elements.searchColumnSelect || !this.elements.searchTypeSelect || !this.elements.tableContainer || !this.elements.statusElement) {
            console.error('SearchManager: Required DOM elements missing!', elements);
            // Optionally throw an error or disable functionality
            return;
        }

        this.initialize();
    }

    initialize() {
        console.log('Initializing SearchManager...');
        // Add listeners with debounce for performance
        this.elements.searchInput.addEventListener('input', window.debounce(() => {
            this.handleSearch();
        }, 300));

        // Add enter key handler
        this.elements.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        this.elements.searchColumnSelect.addEventListener('change', () => this.handleSearch());
        this.elements.searchTypeSelect.addEventListener('change', () => this.handleSearch());

        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.addEventListener('click', () => {
                this.elements.searchInput.value = '';
                this.handleSearch(); // Re-run search with empty term to show all
            });
        }
        
        // Initial column update might be needed if table exists on load
        this.updateSearchColumns();
    }

    /**
     * Updates the search column dropdown based on the current table headers.
     */
    updateSearchColumns() {
        const currentTable = this.elements.tableContainer.querySelector('table.preview-table');
        const headers = currentTable ? Array.from(currentTable.querySelectorAll('thead th')) : [];
        const select = this.elements.searchColumnSelect;

        // Store current selection
        const currentSelection = select.value;

        // Clear existing options
        select.innerHTML = '';

        // Add "All Columns" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Columns';
        select.appendChild(allOption);

        // Add options for each column header found
        headers.forEach(header => {
            const option = document.createElement('option');
            const headerText = header.textContent.trim();
            if (!headerText) return; // Skip empty headers

            option.value = headerText; // Use header text as value
            // Display friendly names for certain columns
            if (headerText === 'google_product_category') {
                option.textContent = 'Category';
            } else {
                // Capitalize first letter for display
                option.textContent = headerText.charAt(0).toUpperCase() + headerText.slice(1).replace(/_/g, ' ');
            }
            select.appendChild(option);
        });

        // Restore previous selection if possible
        if (Array.from(select.options).some(opt => opt.value === currentSelection)) {
            select.value = currentSelection;
        } else {
            select.value = 'all'; // Default to 'all'
        }
        console.log('Search columns updated.');
    }

    /**
     * Main handler for executing a search based on current input values.
     */
    handleSearch() {
        const searchTerm = this.elements.searchInput.value.toLowerCase().trim();
        const searchColumnValue = this.elements.searchColumnSelect.value; // This is the header text
        const searchType = this.elements.searchTypeSelect.value;

        // Show/hide clear button
        if (this.elements.clearSearchBtn) {
            this.elements.clearSearchBtn.style.display = searchTerm ? 'inline-block' : 'none';
        }

        // Use requestAnimationFrame to avoid layout thrashing during filtering
        requestAnimationFrame(() => {
            const tableBody = this.elements.tableContainer.querySelector('tbody');
            if (!tableBody) {
                // console.warn('Table body not found for search');
                this.updateSearchResults(0, 0); // Update status to show 0 results
                return;
            }

            const rows = tableBody.querySelectorAll('tr');
            let visibleCount = 0;

            // Determine column index based on selected header text
            let columnIndex = -1;
            let headers = [];
            if (searchColumnValue !== 'all') {
                headers = Array.from(this.elements.tableContainer.querySelectorAll('thead th'));
                columnIndex = headers.findIndex(th => th.textContent.trim() === searchColumnValue);
                if (columnIndex === -1) {
                     console.warn(`Search column "${searchColumnValue}" not found in table headers.`);
                }
            }

            rows.forEach(row => {
                let match = false;
                if (!searchTerm) {
                    match = true; // Show all if search term is empty
                } else if (searchColumnValue === 'all') {
                    // Search all cells
                    match = Array.from(row.querySelectorAll('td')).some(cell => {
                        const content = this.getCellContent(cell);
                        return this.matchesSearchCriteria(content, searchTerm, searchType);
                    });
                } else if (columnIndex !== -1) {
                    // Search specific column
                    const cell = row.querySelectorAll('td')[columnIndex];
                    if (cell) {
                        const content = this.getCellContent(cell);
                        match = this.matchesSearchCriteria(content, searchTerm, searchType);
                    }
                } // If column not found (columnIndex === -1), match remains false

                // Update visibility
                row.style.display = match ? '' : 'none';
                if (match) visibleCount++;
            });

            this.updateSearchResults(visibleCount, rows.length);
            // Highlighting removed for simplicity, can be added back if needed
            // this.applyHighlighting(tableBody, searchTerm, searchColumnValue, columnIndex);
        });
    }

    /**
     * Updates the status element with the search results count.
     * @param {number} visibleCount - Number of rows matching the search.
     * @param {number} totalCount - Total number of rows in the table.
     */
    updateSearchResults(visibleCount, totalCount) {
        const statusEl = this.elements.statusElement;
        if (!statusEl) return;

        if (!this.elements.searchInput || !this.elements.searchInput.value) {
            statusEl.textContent = `Showing ${totalCount} items`;
        } else if (visibleCount === 0) {
            statusEl.textContent = 'No matches found';
        } else {
            statusEl.textContent = `Found ${visibleCount} of ${totalCount} items`;
        }

        // Clear message after a delay if search is cleared
        if (!this.elements.searchInput || !this.elements.searchInput.value) {
            setTimeout(() => {
                if (statusEl && (!this.elements.searchInput || !this.elements.searchInput.value)) {
                    statusEl.textContent = ''; // Clear status when search is empty
                }
            }, 2000);
        }
    }

    /**
     * Gets the text content of a table cell, handling editable fields.
     * @param {HTMLElement} cell
     * @returns {string}
     */
    getCellContent(cell) {
        if (!cell) return '';
        const editableField = cell.querySelector('.editable-field');
        if (editableField) {
            return editableField.textContent?.trim() || '';
        }
        return cell.textContent?.trim() || '';
    }

    /**
     * Checks if content matches the search criteria.
     * @param {string} content
     * @param {string} searchTerm
     * @param {string} searchType ('contains', 'equals', 'startsWith')
     * @returns {boolean}
     */
    matchesSearchCriteria(content, searchTerm, searchType) {
        if (!searchTerm) return true; // Show all if no search term
        if (typeof content !== 'string') return false;

        content = content.toLowerCase(); // Case-insensitive search

        // Special handling for category searches if needed (check column select value)
        if (this.elements.searchColumnSelect?.value === 'Category') {
             const categories = content.split('>').map(c => c.trim().toLowerCase());
             switch (searchType) {
                 case 'contains': return categories.some(cat => cat.includes(searchTerm));
                 case 'equals': return categories.some(cat => cat === searchTerm);
                 case 'startsWith': return categories.some(cat => cat.startsWith(searchTerm));
                 default: return categories.some(cat => cat.includes(searchTerm));
             }
        }

        // Regular search
        switch (searchType) {
            case 'contains':
                return content.includes(searchTerm);
            case 'equals':
                return content === searchTerm;
            case 'startsWith':
                return content.startsWith(searchTerm);
            default: // Should not happen, but default to contains
                return content.includes(searchTerm);
        }
    }

    // --- Helper methods removed/merged into handleSearch ---
    // handleAllColumnsSearch
    // handleColumnSearch
    // showAllRows
    // updateRowVisibility (simplified in handleSearch)
    // showSearchLoading / hideSearchLoading (removed for simplicity)
    // highlightText (removed for simplicity)
    // getColumnIndex (merged into handleSearch)
    // highlightCategoryMatch (removed for simplicity)
    // clearSearch (handled by clear button + handleSearch)

}

// Make globally available for backward compatibility
window.SearchManager = SearchManager;

// No default export needed for regular scripts