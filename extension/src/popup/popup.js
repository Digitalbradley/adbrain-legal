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
        this.fileInput = document.getElementById('fileInput');
        this.previewButton = document.getElementById('previewFeed');
        this.exportButton = document.getElementById('exportFeed');
        this.mainDropdown = document.getElementById('mainDropdown');
        this.dataContainer = null;
        this.testGMCAuthButton = document.getElementById('testGMCAuth');
        this.validateGMCButton = document.getElementById('validateGMC');
        
        this.setupEventListeners();
        this.debounceTimeout = null;
        this.setupScrollSync();
    }

    initialize() {
        console.log('Initializing UI');
        this.setupElements();
        this.tableManager.initialize();
        this.setupScrollSync();
    }

    setupElements() {
        console.log('Setting up elements');
        
        this.dataContainer = document.querySelector('.data-container');

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
                if (this.previewButton) {
                    this.previewButton.disabled = !this.fileInput.files.length;
                }
            });
        }

        if (this.previewButton) {
            this.previewButton.addEventListener('click', () => this.handlePreview());
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
        if (!this.fileInput.files[0]) {
            alert('Please select a file first');
            return;
        }

        try {
            this.loadingManager.showLoading('Processing feed...');
            
            // Read and parse the CSV file
            const csvText = await this.readFileAsText(this.fileInput.files[0]);
            const data = this.parseCSV(csvText);
            
            // Display the data
            await this.displayPreview(data);
            
        } catch (error) {
            console.error('Preview failed:', error);
            alert('Failed to preview file. Please check the format.');
        } finally {
            this.loadingManager.hideLoading();
        }
    }

    async readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                // First try to detect the encoding
                const buffer = e.target.result;
                const decoder = new TextDecoder('utf-8', { fatal: true });
                
                try {
                    const text = decoder.decode(buffer);
                    resolve(text);
                } catch (encodingError) {
                    // If UTF-8 fails, try another common encoding
                    try {
                        const fallbackDecoder = new TextDecoder('iso-8859-1');
                        const text = fallbackDecoder.decode(buffer);
                        resolve(text);
                    } catch (fallbackError) {
                        reject(new Error('Unable to decode file content'));
                    }
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    parseCSV(csvText) {
        // Normalize encoding first
        const normalized = csvText.normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^\x00-\x7F]/g, '');   // Remove non-ASCII

        const lines = normalized.split('\n').filter(line => line.trim());
        
        // Get headers
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            
            // Split the line by comma, handling quoted values
            const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            
            // Create object from headers and values
            const row = {};
            headers.forEach((header, index) => {
                let value = values[index] || '';
                // Clean the value
                value = value
                    .replace(/^"|"$/g, '')  // Remove quotes
                    .trim();
                row[header] = value;
            });
            data.push(row);
        }
        
        return data;
    }

    async displayPreview(data) {
        const container = document.getElementById('previewContent');
        if (!container) return;

        const table = document.createElement('table');
        table.className = 'preview-table';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['id', 'title', 'description', 'link', 'image_link', 'price', 'condition', 'brand', 'gtin', 'mpn', 'google_product_category'];
        
        headers.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.id = `row-${index + 1}`;
            
            headers.forEach(key => {
                if (key === 'title' || key === 'description') {
                    tr.appendChild(this.createEditableCell(row[key] || '', key, index));
                } else {
                    const td = document.createElement('td');
                    td.textContent = row[key] || '';
                    tr.appendChild(td);
                }
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        container.innerHTML = '';
        container.appendChild(table);
    }

    handleDropdownChange(e) {
        const selectedValue = e.target.value;
        
        if (selectedValue === 'analyze-feed') {
            this.analyzeFeed();
        }
    }

    analyzeFeed() {
        const table = document.querySelector('.preview-table');
        if (!table) {
            alert('Please load and preview a feed first before analyzing.');
            return;
        }

        try {
            // Get headers from the table
            const headers = Array.from(table.querySelectorAll('thead th'))
                .map(th => th.textContent.trim().toLowerCase());

            // Get all rows except header
            const rows = Array.from(table.querySelectorAll('tbody tr'));
            const totalProducts = rows.length;
            
            // Initialize analysis object
            const analysis = {
                totalProducts,
                titleErrors: 0,      // < 25 chars
                titleWarnings: 0,    // 25-70 chars
                titleOptimal: 0,     // 70-150 chars
                titleTooLong: 0,     // > 150 chars
                titleIssues: 0,
                descriptionIssues: 0,
                missingImages: 0,
                invalidPrices: 0,
                categories: new Set(),
                titleLengthStats: {
                    underMinimum: 0,    // < 25
                    underOptimal: 0,    // 25-70
                    optimal: 0,         // 70-150
                    tooLong: 0          // > 150
                },
                titleLengths: [],
                descriptionLengths: [],
                duplicateTitles: new Map(),
                duplicateDescriptions: new Map(),
                allCapsCount: 0
            };

            // Find column indexes
            const titleIndex = headers.indexOf('title');
            const descriptionIndex = headers.indexOf('description');
            const imageUrlIndex = headers.indexOf('image_link');
            const priceIndex = headers.indexOf('price');
            const categoryIndex = headers.indexOf('google_product_category');

            // Analyze each row
            rows.forEach((row, index) => {
                const cells = row.querySelectorAll('td');
                
                const titleField = cells[titleIndex]?.querySelector('.editable-field')?.textContent.trim() || '';
                const descriptionField = cells[descriptionIndex]?.querySelector('.editable-field')?.textContent.trim() || '';
                const imageUrl = cells[imageUrlIndex]?.textContent.trim() || '';
                const price = cells[priceIndex]?.textContent.trim() || '';
                const category = cells[categoryIndex]?.textContent.trim() || '';

                // Updated title validation logic
                if (titleField.length < 25) {
                    analysis.titleErrors++;
                    analysis.titleLengthStats.underMinimum++;
                    analysis.titleIssues++;
                } else if (titleField.length < 70) {
                    analysis.titleWarnings++;
                    analysis.titleLengthStats.underOptimal++;
                } else if (titleField.length <= 150) {
                    analysis.titleOptimal++;
                    analysis.titleLengthStats.optimal++;
                } else {
                    analysis.titleTooLong++;
                    analysis.titleLengthStats.tooLong++;
                    analysis.titleIssues++;
                }

                // Keep existing description validation
                if (descriptionField.length < 150) {
                    analysis.descriptionIssues++;
                    analysis.descTooShort++;
                }
                if (descriptionField.length > 5000) {
                    analysis.descriptionIssues++;
                    analysis.descTooLong++;
                }

                // Track duplicates
                analysis.duplicateTitles.set(titleField, (analysis.duplicateTitles.get(titleField) || 0) + 1);
                analysis.duplicateDescriptions.set(descriptionField, (analysis.duplicateDescriptions.get(descriptionField) || 0) + 1);

                // Track categories
                if (category) {
                    category.split('>').forEach(cat => {
                        const trimmedCat = cat.trim();
                        if (trimmedCat) {
                            analysis.categories.add(trimmedCat);
                        }
                    });
                }

                // Check image URL
                if (!imageUrl.startsWith('https://')) {
                    analysis.missingImages++;
                }

                // Check price format
                if (price) {
                    const parts = price.trim().split(' ');
                    if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || parts[1] !== 'USD') {
                        analysis.invalidPrices++;
                    }
                }

                // Track title length
                analysis.titleLengths.push(titleField.length);
                analysis.descriptionLengths.push(descriptionField.length);
            });

            this.displayAnalysisReport(analysis, rows);

        } catch (error) {
            console.error('Error analyzing feed:', error);
            alert('Error analyzing feed. Please try again.');
        }
    }

    displayAnalysisReport(analysis, rows) {
        const healthScore = Math.round((1 - (analysis.titleIssues + analysis.descriptionIssues)/(analysis.totalProducts * 2)) * 100);
        
        // Determine health score color
        let healthColor = '#27ae60'; // Green
        if (healthScore < 70) healthColor = '#e67e22'; // Orange
        if (healthScore < 50) healthColor = '#e74c3c'; // Red

        const analysisHtml = `
            <div class="analysis-report">
                <div class="report-header">
                    <h3>Feed Health Analysis</h3>
                    <button class="close-analysis" title="Close Analysis">×</button>
                </div>
                
                <div class="health-score">
                    <h4>Overall Feed Health</h4>
                    <div class="progress-bar">
                        <div class="progress" style="width: ${healthScore}%; background: ${healthColor}"></div>
                    </div>
                    <div class="score-text" style="color: ${healthColor}">${healthScore}% Healthy</div>
                </div>

                <div class="metrics-grid">
                    <div class="metric-card">
                        <h4>Overall Stats</h4>
                        <p><strong>Total Products:</strong> ${analysis.totalProducts}</p>
                        <p><strong>Categories:</strong> ${analysis.categories.size}</p>
                    </div>
                    
                    <div class="metric-card">
                        <h4>Content Health</h4>
                        <p>
                            <strong>Title Issues:</strong> 
                            <span class="validation-badge ${analysis.titleIssues > 0 ? 'error' : 'success'}">
                                ${analysis.titleIssues} (${Math.round(analysis.titleIssues/analysis.totalProducts*100)}%)
                            </span>
                        </p>
                        <p>
                            <strong>Description Issues:</strong> 
                            <span class="validation-badge ${analysis.descriptionIssues > 0 ? 'error' : 'success'}">
                                ${analysis.descriptionIssues} (${Math.round(analysis.descriptionIssues/analysis.totalProducts*100)}%)
                            </span>
                        </p>
                    </div>
                    
                    <div class="metric-card">
                        <h4>Technical Issues</h4>
                        <p>
                            <strong>Image Issues:</strong> 
                            <span class="validation-badge ${analysis.missingImages > 0 ? 'error' : 'success'}">
                                ${analysis.missingImages}
                            </span>
                        </p>
                        <p>
                            <strong>Price Issues:</strong> 
                            <span class="validation-badge ${analysis.invalidPrices > 0 ? 'error' : 'success'}">
                                ${analysis.invalidPrices}
                            </span>
                        </p>
                    </div>
                </div>

                ${this.generateIssuesList(rows)}
            </div>
        `;

        // Remove any existing analysis report
        const existingReport = document.querySelector('.analysis-report');
        if (existingReport) {
            existingReport.remove();
        }

        // Insert the analysis report before the data table
        const dataContainer = document.querySelector('.data-container');
        const analysisElement = document.createElement('div');
        analysisElement.innerHTML = analysisHtml;
        dataContainer.insertBefore(analysisElement, dataContainer.firstChild);

        this.setupAnalysisInteractivity();
    }

    generateIssuesList(rows) {
        const issues = [];
        
        rows.forEach((row, index) => {
            const titleField = row.querySelector('.title-field')?.textContent.trim() || '';
            const descriptionField = row.querySelector('.description-field')?.textContent.trim() || '';
            const rowIssues = [];

            // Only show critical issues
            if (titleField.length < 25) {
                rowIssues.push(`Title too short (${titleField.length} chars). Minimum 25 characters required for Google Shopping.`);
            }
            if (descriptionField.length < 70) {
                rowIssues.push(`Description too short (${descriptionField.length} chars). Minimum 70 characters required for Google Shopping.`);
            }

            if (rowIssues.length > 0) {
                issues.push(`
                    <div class="issue-item">
                        <strong class="row-link" data-row-id="row-${index + 1}">Row ${index + 1}</strong>
                        ${rowIssues.map(issue => `
                            <div class="issue-message" data-row-id="row-${index + 1}">- ${issue}</div>
                        `).join('')}
                    </div>
                `);
            }
        });

        return issues.length > 0 ? `
            <div class="issues-list">
                <h4>Critical Issues</h4>
                ${issues.join('')}
            </div>
        ` : '<div class="no-issues">No issues found! Your feed meets Google Shopping requirements.</div>';
    }

    setupAnalysisInteractivity() {
        // Add click handlers for row links
        document.querySelectorAll('.row-link, .issue-message').forEach(element => {
            element.addEventListener('click', (e) => {
                const rowId = e.target.getAttribute('data-row-id');
                this.scrollToTableRow(rowId);
            });
        });

        // Add close button handler
        const closeButton = document.querySelector('.close-analysis');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                const report = document.querySelector('.analysis-report');
                if (report) report.remove();
            });
        }
    }

    scrollToTableRow(rowId) {
        const row = document.getElementById(rowId);
        if (row) {
            // Smooth scroll to row
            row.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center'
            });
            
            // Add highlight effect
            row.style.transition = 'background-color 0.3s ease-in-out';
            row.style.backgroundColor = '#fff3cd';
            
            setTimeout(() => {
                row.style.backgroundColor = '';
                // Clean up after animation
                setTimeout(() => {
                    row.style.transition = '';
                }, 300);
            }, 1500);
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

    // Add debounce helper
    debounce(func, wait) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(func, wait);
    }

    // Add text sanitization helper
    sanitizeText(text) {
        return text
            // First normalize the text to handle composite characters
            .normalize('NFKD')
            // Replace common problematic characters
            .replace(/[\u2022]/g, '•')           // Proper bullet point
            .replace(/[\u2013\u2014]/g, '-')     // En and Em dashes
            .replace(/[\u201C\u201D]/g, '"')     // Smart quotes
            .replace(/[\u2018\u2019]/g, "'")     // Smart single quotes
            // Then clean up any remaining issues
            .replace(/â€¢/g, '•')                // Fix broken bullet points
            .replace(/â€œ|â€/g, '"')            // Fix broken quotes
            .replace(/â€™/g, "'")                // Fix broken apostrophes
            .replace(/\s+/g, ' ')                // Normalize spaces
            .trim();
    }

    createEditableCell(content, type, rowIndex) {
        const cell = document.createElement('td');
        const field = document.createElement('div');
        field.className = `editable-field ${type}-field`;
        field.contentEditable = true;
        field.textContent = this.sanitizeText(content);

        // Add character count display
        const charCount = document.createElement('div');
        charCount.className = 'char-count';
        const maxLength = type === 'title' ? 150 : 5000;
        
        const updateCharCount = (length) => {
            charCount.textContent = `${length}/${maxLength}`;
            if (type === 'title') {
                if (length < 25) {
                    charCount.style.color = '#dc3545'; // Red for too short
                } else {
                    charCount.style.color = '#28a745'; // Green for good length
                }
            } else {
                // Description validation
                if (length < 70) {
                    charCount.style.color = '#dc3545'; // Red for too short
                } else {
                    charCount.style.color = '#28a745'; // Green for good length
                }
            }
        };

        // Set initial count
        updateCharCount(content.length);

        // Update count on input
        field.addEventListener('input', () => {
            const currentLength = field.textContent.length;
            updateCharCount(currentLength);
            this.debounce(() => this.analyzeFeed(), 500);
        });

        cell.appendChild(field);
        cell.appendChild(charCount);
        return cell;
    }

    setupScrollSync() {
        const dataContainer = document.querySelector('.data-container');
        const scrollThumb = document.querySelector('.scroll-thumb');
        const scrollTrack = document.querySelector('.scroll-track');
        
        if (!dataContainer || !scrollThumb || !scrollTrack) return;

        // Calculate scrollbar width once
        const scrollbarWidth = dataContainer.offsetWidth - dataContainer.clientWidth;

        // Update thumb width accounting for scrollbar
        const updateThumbWidth = () => {
            // Use offsetWidth to include scrollbar in calculation
            const containerWidth = dataContainer.offsetWidth - scrollbarWidth;
            const scrollRatio = containerWidth / dataContainer.scrollWidth;
            const thumbWidth = Math.max(scrollRatio * 100, 10); // Minimum 10% width
            scrollThumb.style.width = `${thumbWidth}%`;
        };

        // Initial setup
        updateThumbWidth();

        // Sync floating scroll with content
        dataContainer.addEventListener('scroll', () => {
            const maxScroll = dataContainer.scrollWidth - dataContainer.offsetWidth + scrollbarWidth;
            const scrollRatio = dataContainer.scrollLeft / maxScroll;
            const trackWidth = scrollTrack.clientWidth - scrollThumb.offsetWidth;
            const thumbPosition = scrollRatio * trackWidth;
            scrollThumb.style.transform = `translateX(${thumbPosition}px)`;
        });

        // Handle thumb drag
        let isDragging = false;
        let startX;
        let scrollLeft;

        scrollThumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.pageX - scrollThumb.offsetLeft;
            scrollLeft = dataContainer.scrollLeft;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            const x = e.pageX - scrollTrack.getBoundingClientRect().left;
            const walk = (x - startX) * (dataContainer.scrollWidth / scrollTrack.clientWidth);
            dataContainer.scrollLeft = scrollLeft + walk;
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Handle window resize
        window.addEventListener('resize', updateThumbWidth);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});
