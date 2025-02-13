class FeedAnalyzer {
    constructor(tableManager) {
        this.tableManager = tableManager;
        this.rules = {
            title: {
                minLength: 70,
                maxLength: 150
            },
            description: {
                minLength: 150,
                maxLength: 5000
            }
        };
        
        // Add listener for field edits
        document.addEventListener('field-edited', (event) => {
            console.log('Field edited, updating analysis');
            this.updateAnalysis();
        });

        this.setupContentChangeListeners();
    }

    setupContentChangeListeners() {
        document.addEventListener('input', (e) => {
            const editableField = e.target.closest('.editable-field');
            if (editableField) {
                // Get the row element
                const row = editableField.closest('tr');
                if (row) {
                    // Small delay to ensure content is updated
                    setTimeout(() => {
                        this.updateRowValidation(row);
                    }, 100);
                }
            }
        });
    }

    updateRowValidation(row) {
        // Get the current analysis report
        const currentReport = document.querySelector('.analysis-report');
        if (!currentReport) return;

        // Re-analyze the entire feed to update statistics
        const table = row.closest('.data-table');
        if (table) {
            const analysis = this.analyzeFeed(table);
            
            // Update the report
            currentReport.outerHTML = this.generateAnalysisReport(analysis);
            
            // Re-setup interactivity
            this.setupReportInteractivity(document.querySelector('.analysis-report'));
        }
    }

    updateAnalysis() {
        const table = document.querySelector('.data-table');
        if (!table) return;

        console.log('Starting analysis update');
        
        // Remove any existing view buttons first
        const existingButton = document.querySelector('.view-analysis-button');
        if (existingButton) {
            existingButton.remove();
        }

        // Remove old report
        const existingReport = document.querySelector('.analysis-report');
        if (existingReport) {
            const analysis = this.analyzeFeed(table);
            const reportHtml = this.generateAnalysisReport(analysis);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = reportHtml;
            existingReport.replaceWith(tempDiv.firstElementChild);
            
            // Setup interactivity for the new report
            const newReport = document.querySelector('.analysis-report');
            this.setupReportInteractivity(newReport);

            console.log('Creating view analysis button');
            
            // Create the button element
            const viewButton = document.createElement('div');
            viewButton.className = 'view-analysis-button';
            viewButton.innerHTML = `
                <span class="view-text">↑ View Updated Analysis</span>
                <span class="close-btn" style="
                    margin-left: 10px;
                    font-size: 18px;
                    cursor: pointer;
                    opacity: 0.7;
                ">×</span>
            `;
            
            // Apply styles directly
            Object.assign(viewButton.style, {
                position: 'fixed',
                top: '80px',
                right: '20px',
                padding: '10px 15px',
                backgroundColor: 'rgba(52, 152, 219, 0.9)',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                zIndex: '9999',
                fontFamily: 'Arial, sans-serif',
                fontSize: '14px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.3s ease'
            });

            // Add hover effects
            viewButton.addEventListener('mouseover', () => {
                viewButton.style.backgroundColor = 'rgba(41, 128, 185, 0.95)';
                viewButton.style.transform = 'translateY(-2px)';
            });
            viewButton.addEventListener('mouseout', () => {
                viewButton.style.backgroundColor = 'rgba(52, 152, 219, 0.9)';
                viewButton.style.transform = 'translateY(0)';
            });

            // Add click handlers
            const viewText = viewButton.querySelector('.view-text');
            const closeBtn = viewButton.querySelector('.close-btn');

            viewText.addEventListener('click', () => {
                console.log('View analysis button clicked');
                this.scrollToAnalysis(newReport);
                viewButton.remove();
            });

            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                viewButton.style.opacity = '0';
                viewButton.style.transform = 'translateX(100px)';
                setTimeout(() => viewButton.remove(), 300);
            });

            // Add scroll handler to hide button when user scrolls near top
            const handleScroll = () => {
                const analysisReport = document.querySelector('.analysis-report');
                if (!analysisReport) return;

                const reportRect = analysisReport.getBoundingClientRect();
                const isReportVisible = reportRect.top >= -100 && reportRect.top <= window.innerHeight;

                if (isReportVisible) {
                    viewButton.style.opacity = '0';
                    viewButton.style.transform = 'translateX(100px)';
                    setTimeout(() => {
                        if (document.body.contains(viewButton)) {
                            viewButton.remove();
                        }
                    }, 300);
                    // Remove scroll listener once button is hidden
                    window.removeEventListener('scroll', handleScroll);
                }
            };

            window.addEventListener('scroll', handleScroll);

            // Add to document
            document.body.appendChild(viewButton);
            console.log('View button added to document');

            // Add entrance animation
            viewButton.style.transform = 'translateX(100px)';
            setTimeout(() => {
                viewButton.style.transform = 'translateX(0)';
            }, 10);
        }
    }

    scrollToAnalysis(reportElement) {
        reportElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest' 
        });
        
        // Add a brief highlight effect
        reportElement.style.transition = 'background-color 0.5s ease';
        reportElement.style.backgroundColor = '#f0f9ff';
        setTimeout(() => {
            reportElement.style.backgroundColor = '';
        }, 1000);
    }

    analyzeFeed(table) {
        if (!table) {
            throw new Error('No table data to analyze');
        }

        // Get headers from the table
        const headers = Array.from(table.querySelectorAll('thead th'))
            .map(th => th.textContent.trim().toLowerCase());

        // Get all rows except header
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        const totalProducts = rows.length;
        
        // Initialize analysis object
        const analysis = {
            totalProducts,
            titleIssues: [],
            descriptionIssues: [],
            imageIssues: [],
            categories: new Set(),
            titleLengths: [],
            descriptionLengths: [],
            duplicateTitles: new Map(),
            duplicateDescriptions: new Map(),
            allCapsCount: 0,
            titleTooShort: 0,
            titleTooLong: 0,
            descTooShort: 0,
            descTooLong: 0,
            issues: []
        };

        // Find column indexes
        const titleIndex = headers.indexOf('title');
        const descriptionIndex = headers.indexOf('description');
        const imageUrlIndex = headers.indexOf('image_link');
        const priceIndex = headers.indexOf('price');
        const categoryIndex = headers.indexOf('google_product_category');

        // Analyze each row
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td');
            const rowNumber = rowIndex + 1;

            // Get field values
            const titleField = cells[titleIndex]?.querySelector('.editable-field')?.textContent.trim() || '';
            const descriptionField = cells[descriptionIndex]?.querySelector('.editable-field')?.textContent.trim() || '';
            const imageUrl = cells[imageUrlIndex]?.textContent.trim() || '';
            const price = cells[priceIndex]?.textContent.trim() || '';
            const category = cells[categoryIndex]?.textContent.trim() || '';

            // Check title
            if (titleField.length < this.rules.title.minLength) {
                analysis.titleTooShort++;
                analysis.titleIssues.push({
                    row: rowIndex,
                    id: rowNumber,
                    title: titleField,
                    message: `Title too short (${titleField.length} chars). Minimum ${this.rules.title.minLength} recommended.`,
                    severity: 'error'
                });
            }
            if (titleField.length > this.rules.title.maxLength) {
                analysis.titleTooLong++;
                analysis.titleIssues.push({
                    row: rowIndex,
                    id: rowNumber,
                    title: titleField,
                    message: `Title too long (${titleField.length} chars). Maximum ${this.rules.title.maxLength} recommended.`,
                    severity: 'error'
                });
            }
            if (titleField === titleField.toUpperCase() && titleField.length > 0) {
                analysis.allCapsCount++;
                analysis.titleIssues.push({
                    row: rowIndex,
                    id: rowNumber,
                    title: titleField,
                    message: 'Title should not be all uppercase',
                    severity: 'warning'
                });
            }

            // Check description
            if (descriptionField.length < this.rules.description.minLength) {
                analysis.descTooShort++;
                analysis.descriptionIssues.push({
                    row: rowIndex,
                    id: rowNumber,
                    title: descriptionField,
                    message: `Description too short (${descriptionField.length} chars). Minimum ${this.rules.description.minLength} recommended.`,
                    severity: 'warning'
                });
            }
            if (descriptionField.length > this.rules.description.maxLength) {
                analysis.descTooLong++;
                analysis.descriptionIssues.push({
                    row: rowIndex,
                    id: rowNumber,
                    title: descriptionField,
                    message: `Description too long (${descriptionField.length} chars). Maximum ${this.rules.description.maxLength} recommended.`,
                    severity: 'error'
                });
            }

            // Check image URL
            if (!imageUrl.startsWith('https://')) {
                analysis.imageIssues.push({
                    row: rowIndex,
                    id: rowNumber,
                    title: titleField,
                    message: 'Image URL must start with https://',
                    severity: 'error'
                });
            }

            // Check price format
            if (price) {
                const parts = price.trim().split(' ');
                if (parts.length !== 2 || isNaN(parseFloat(parts[0])) || parts[1] !== 'USD') {
                    analysis.imageIssues.push({
                        row: rowIndex,
                        id: rowNumber,
                        title: titleField,
                        message: 'Price must be in format "XX.XX USD"',
                        severity: 'error'
                    });
                }
            }

            // Track categories
            if (category) {
                category.split('>').forEach(cat => {
                    const trimmedCat = cat.trim();
                    if (trimmedCat) {
                        analysis.categories.add(trimmedCat);
                    }
                });
            }

            // Track lengths for statistics
            analysis.titleLengths.push(titleField.length);
            analysis.descriptionLengths.push(descriptionField.length);
        });

        return analysis;
    }

    generateAnalysisReport(analysis) {
        const healthScore = Math.round((1 - (analysis.titleIssues.length + analysis.descriptionIssues.length)/(analysis.totalProducts * 2)) * 100);
        
        // Determine health score color
        let healthColor = '#27ae60'; // Green
        if (healthScore < 70) {
            healthColor = '#e67e22'; // Orange
        }
        if (healthScore < 50) {
            healthColor = '#e74c3c'; // Red
        }
        
        return `
        <div class="analysis-report">
            <div class="report-header">
                <h3>Feed Health Analysis</h3>
                <button class="close-analysis" title="Close Analysis">×</button>
            </div>
            
            <div class="health-score">
                <h4>Overall Feed Health</h4>
                <div class="progress-bar">
                    <div class="progress" style="width: ${healthScore}%; background: linear-gradient(90deg, ${healthColor}, ${healthColor}dd)"></div>
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
                        <span class="validation-badge ${analysis.titleIssues.length > 0 ? 'error' : 'success'}">
                            ${analysis.titleIssues.length} (${Math.round(analysis.titleIssues.length/analysis.totalProducts*100)}%)
                        </span>
                    </p>
                    <p>
                        <strong>Description Issues:</strong> 
                        <span class="validation-badge ${analysis.descriptionIssues.length > 0 ? 'error' : 'success'}">
                            ${analysis.descriptionIssues.length} (${Math.round(analysis.descriptionIssues.length/analysis.totalProducts*100)}%)
                        </span>
                    </p>
                </div>
                
                <div class="metric-card">
                    <h4>Technical Issues</h4>
                    <p>
                        <strong>Image Issues:</strong> 
                        <span class="validation-badge ${analysis.imageIssues.length > 0 ? 'error' : 'success'}">
                            ${analysis.imageIssues.length}
                        </span>
                    </p>
                </div>
            </div>

            ${this.generateIssuesList(analysis.titleIssues, 'Title')}
            ${this.generateIssuesList(analysis.descriptionIssues, 'Description')}
            ${this.generateIssuesList(analysis.imageIssues, 'Image')}
        </div>`;
    }

    generateIssuesList(issues, type) {
        if (issues.length === 0) {
            return `
            <div class="issues-list">
                <h4>${type} Issues</h4>
                <p class="status-success">Your feed is looking great! All validation checks passed.</p>
            </div>`;
        }

        return `
        <div class="issues-list">
            <h4>${type} Issues</h4>
            
            <ul class="issues-list">
                ${issues.map(issue => `
                    <li class="issue-item ${issue.severity}">
                        <a href="#" class="issue-link" data-row="${issue.row}">
                            <span class="issue-id">${issue.id}</span>
                            <span class="issue-title">${issue.title}</span>
                        </a>
                        <p class="issue-message">${issue.message}</p>
                    </li>
                `).join('')}
            </ul>
        </div>`;
    }

    setupReportInteractivity(reportElement) {
        // Add click handlers for row links
        reportElement.querySelectorAll('.issue-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const row = parseInt(link.dataset.row);
                this.tableManager.highlightRow(row);
                this.tableManager.scrollToRow(row);
            });
        });

        // Add close button handler
        const closeButton = reportElement.querySelector('.close-analysis');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                reportElement.remove();
            });
        }
    }
}

// Make it globally available
window.FeedAnalyzer = FeedAnalyzer; 
