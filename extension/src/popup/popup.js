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

// Character counter function
window.updateCharCount = function(element, maxLength) {
    const content = element.innerText || element.textContent;
    const charCount = content.length;
    const countDisplay = element.nextElementSibling;
    
    countDisplay.textContent = `${charCount}/${maxLength} characters`;
    
    if (charCount > maxLength) {
        countDisplay.classList.add('error');
        element.classList.add('over-limit');
        countDisplay.style.color = '#dc3545';
    } else {
        countDisplay.classList.remove('error');
        element.classList.remove('over-limit');
        countDisplay.style.color = '#666';
    }

    if (charCount > maxLength * 0.9 && charCount <= maxLength) {
        countDisplay.style.color = '#ffa500';
    }
};

class PopupManager {
    constructor() {
        console.log('Initializing PopupManager');
        
        // Initialize managers
        this.tableManager = new TableManager();
        this.loadingManager = new LoadingManager();
        this.errorManager = new ErrorManager();
        this.gmcApi = new GMCApi();
        this.gmcValidator = new GMCValidator(this.gmcApi);
        this.feedAnalyzer = new FeedAnalyzer(this.tableManager);
        
        // UI elements
        this.fileInput = null;
        this.previewButton = null;
        this.exportButton = null;
        this.validateButton = null;
        this.mainDropdown = null;
        this.dataContainer = null;
        this.testGMCAuthButton = null;
        this.validateGMCButton = null;
    }

    initialize() {
        console.log('Initializing UI');
        this.setupElements();
        this.setupEventListeners();
        this.tableManager.initialize();
    }

    setupElements() {
        console.log('Setting up elements');
        
        this.fileInput = document.getElementById('fileInput');
        this.previewButton = document.getElementById('previewButton');
        this.exportButton = document.getElementById('exportButton');
        this.mainDropdown = document.getElementById('mainDropdown');
        this.dataContainer = document.querySelector('.data-container');
        this.testGMCAuthButton = document.getElementById('testGMCAuth');
        this.validateGMCButton = document.getElementById('validateGMC');

        if (!this.fileInput) console.error('File input not found');
        if (!this.previewButton) console.error('Preview button not found');
        if (!this.exportButton) console.error('Export button not found');
        if (!this.mainDropdown) console.error('Analysis dropdown not found');
        if (!this.dataContainer) console.error('Data container not found');
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
        if (this.fileInput) {
            this.fileInput.addEventListener('change', () => {
                this.previewButton.disabled = !this.fileInput.files.length;
            });
        }

        if (this.previewButton) {
            this.previewButton.addEventListener('click', () => this.handlePreview());
            this.previewButton.disabled = true;
        }

        if (this.exportButton) {
            this.exportButton.addEventListener('click', () => this.handleExport());
        }

        if (this.mainDropdown) {
            this.mainDropdown.addEventListener('change', (e) => this.handleDropdownChange(e));
        }

        if (this.testGMCAuthButton) {
            this.testGMCAuthButton.addEventListener('click', () => this.testGMCAuth());
        }

        if (this.validateGMCButton) {
            this.validateGMCButton.addEventListener('click', () => this.validateWithGMC());
        }
    }

    async handlePreview() {
        console.log('Handling preview');
        const file = this.fileInput.files[0];
        if (!file) {
            this.errorManager.showError('Please select a file first');
            return;
        }

        try {
            this.loadingManager.showLoading('Processing file...');
            console.log('Processing file:', file.name);
            const csvContent = await this.readFile(file);
            console.log('CSV content loaded');
            
            const { headers, data } = this.parseCSV(csvContent);
            console.log('Parsed headers:', headers);
            console.log('Parsed data rows:', data.length);

            this.tableManager.renderTable(headers, data);
            this.loadingManager.hideLoading();
            
            // Setup editable fields after rendering
            this.tableManager.setupEditableFields();
        } catch (error) {
            console.error('Error processing CSV:', error);
            this.loadingManager.hideLoading();
            this.errorManager.showError('Error processing CSV file');
        }
    }

    parseCSV(csvContent) {
        const lines = csvContent.split('\n');
        const headers = this.parseCSVLine(lines[0]);
        console.log('Headers found:', headers);

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            const values = this.parseCSVLine(lines[i]);
            if (values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index];
                });
                data.push(row);
            }
        }

        return { headers, data };
    }

    parseCSVLine(line) {
        const fields = [];
        let inQuotes = false;
        let currentField = '';
        
        for (let char of line) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField.trim());
        
        return fields.map(field => field.replace(/^"|"$/g, ''));
    }

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    handleDropdownChange(e) {
        const selectedValue = e.target.value;
        console.log('Dropdown changed:', selectedValue);
        
        switch(selectedValue) {
            case 'analyze-feed':
                this.analyzeFeed();
                break;
            case 'check-errors':
                this.checkErrors();
                break;
            case 'view-summary':
                this.viewSummary();
                break;
            default:
                break;
        }
    }

    analyzeFeed() {
        console.log('Starting feed analysis');
        const table = document.querySelector('.data-table');
        if (!table) {
            this.errorManager.showError('Please load and preview a feed first before analyzing.');
            return;
        }

        try {
            this.loadingManager.showLoading('Analyzing feed...');
            const analysis = this.feedAnalyzer.analyzeFeed(table);
            const reportHtml = this.feedAnalyzer.generateAnalysisReport(analysis);
            
            // Create and insert the report
            const reportElement = document.createElement('div');
            reportElement.innerHTML = reportHtml;
            
            // Remove any existing report
            const existingReport = document.querySelector('.analysis-report');
            if (existingReport) {
                existingReport.remove();
            }

            // Insert the new report
            this.dataContainer.insertBefore(reportElement.firstElementChild, this.dataContainer.firstChild);

            // Setup interactivity
            this.feedAnalyzer.setupReportInteractivity(this.dataContainer.querySelector('.analysis-report'));
            
            this.loadingManager.hideLoading();
        } catch (error) {
            console.error('Error analyzing feed:', error);
            this.loadingManager.hideLoading();
            this.errorManager.showError('Error analyzing feed. Please try again.');
        }
    }

    async handleExport() {
        try {
            const table = document.querySelector('.data-table');
            if (!table) {
                this.errorManager.showError('Please load and preview a feed first before exporting.');
                return;
            }

            const feedData = this.getFeedDataFromTable(table);
            if (!feedData || !feedData.length) {
                this.errorManager.showError('No data to export');
                return;
            }

            // Convert to CSV
            const headers = Object.keys(feedData[0]);
            const csv = [
                headers.join(','),
                ...feedData.map(row => headers.map(header => {
                    const value = row[header] || '';
                    return value.includes(',') ? `"${value}"` : value;
                }).join(','))
            ].join('\n');

            // Create download link
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'exported_feed.csv';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.errorManager.showError('Feed exported successfully!', 3000);
        } catch (error) {
            console.error('Export failed:', error);
            this.errorManager.showError('Failed to export feed');
        }
    }

    getFeedDataFromTable(table) {
        const headerCells = Array.from(table.querySelectorAll('tr:first-child th'));
        const headerMap = new Map();
        
        headerCells.forEach((th, index) => {
            const headerName = th.textContent.trim().toLowerCase();
            if (headerName && headerName !== '#') {
                headerMap.set(headerName, index);
            }
        });

        const rows = Array.from(table.querySelectorAll('tr:not(.table-header)'));
        
        return rows.map(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const rowData = {};
            
            headerMap.forEach((columnIndex, headerName) => {
                const cell = cells[columnIndex];
                if (cell) {
                    const editableField = cell.querySelector('.editable-field');
                    const value = editableField ? 
                        editableField.textContent.trim() : 
                        cell.textContent.trim();
                    
                    if (value) {
                        rowData[headerName] = value;
                    }
                }
            });
            
            return rowData;
        }).filter(row => Object.keys(row).length > 0);
    }

    async testGMCAuth() {
        try {
            this.loadingManager.showLoading('Testing GMC Authentication...');
            await this.gmcApi.authenticate();
            this.errorManager.showError('GMC Authentication successful!', 3000);
        } catch (error) {
            console.error('GMC Auth test failed:', error);
            this.errorManager.showError('GMC Authentication failed: ' + error.message);
        } finally {
            this.loadingManager.hideLoading();
        }
    }

    async validateWithGMC() {
        try {
            const table = document.querySelector('.data-table');
            if (!table) {
                this.errorManager.showError('Please load and preview a feed first before validating.');
                return;
            }

            this.loadingManager.showLoading('Validating with GMC...');
            const feedData = this.getFeedDataFromTable(table);
            const validationResults = await this.gmcValidator.validateFeed(feedData);
            
            // Process validation results
            if (validationResults.isValid) { 
                this.errorManager.showError('Feed validation successful!', 3000);
            } else {
                // Show validation issues
                const issueCount = validationResults.issues.length;
                this.errorManager.showError(`Feed validation found ${issueCount} issues. Check the analysis report for details.`);
                // You might want to display the issues in a more detailed way
            }
        } catch (error) {
            console.error('GMC validation failed:', error);
            this.errorManager.showError('GMC validation failed: ' + error.message);
        } finally {
            this.loadingManager.hideLoading();
        }
    }

    checkErrors() {
        this.errorManager.showError('Error checking is a PRO feature. Please upgrade to access this functionality.');
    }

    viewSummary() {
        this.errorManager.showError('Feed summary is a PRO feature. Please upgrade to access this functionality.');
    }
}

// Initialize the application
console.log('Script loaded, checking DOM state');

function initializeApp() {
    console.log('DOM is ready, initializing app');
    const manager = new PopupManager();
    manager.initialize();
}

if (document.readyState === 'loading') {
    console.log('DOM still loading, adding event listener');
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    console.log('DOM already loaded, initializing immediately');
    initializeApp();
}
