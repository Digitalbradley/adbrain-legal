window.FeedAnalyzer = class FeedAnalyzer {
    constructor(tableManager) {
        this.tableManager = tableManager;
        this.rules = {
            title: {
                minLength: 25,
                suggestedLength: 70,
                maxLength: 150,
                required: true,
                validate: (value, row) => {
                    const issues = [];
                    if (value.length < 25) {
                        issues.push({
                            type: 'Title Length',
                            message: `Title too short (${value.length} chars). Minimum 25 characters required, 70+ recommended.`,
                            affectedProducts: [row],
                            field: 'title',
                            severity: 'error'
                        });
                    }
                    return issues;
                }
            },
            description: {
                minLength: 90,
                maxLength: 5000,
                required: true,
                validate: (value, row) => {
                    const issues = [];
                    if (value.length < 90) {
                        issues.push({
                            type: 'Description Length',
                            message: `Description too short (${value.length} chars). Minimum 90 characters required.`,
                            affectedProducts: [row],
                            field: 'description',
                            severity: 'error'
                        });
                    }
                    return issues;
                }
            },
            price: {
                format: /^\d+\.?\d{0,2}\s[A-Z]{3}$/,
                required: true,
                validate: (value, row) => {
                    const issues = [];
                    if (!value.match(/^\d+\.?\d{0,2}\s[A-Z]{3}$/)) {
                        issues.push({
                            type: 'Price Format',
                            message: 'Price must be in format "149.99 USD"',
                            affectedProducts: [row],
                            field: 'price',
                            severity: 'error'
                        });
                    }
                    return issues;
                }
            }
        };
    }

    async analyzeFeed(feedData) {
        console.log('FeedAnalyzer: Starting analysis');
        const issues = [];
        
        feedData.forEach((product, index) => {
            const rowNum = index + 1;
            
            // Check each field against rules
            Object.entries(this.rules).forEach(([field, rule]) => {
                if (rule.required && !product[field]) {
                    issues.push({
                        type: 'Required Field',
                        message: `${field} is required`,
                        affectedProducts: [rowNum],
                        field: field,
                        severity: 'error'
                    });
                    return;
                }

                if (product[field] && rule.validate) {
                    const fieldIssues = rule.validate(product[field], rowNum);
                    issues.push(...fieldIssues);
                }
            });
        });

        return {
            issues: issues,
            totalProducts: feedData.length,
            validProducts: feedData.length - issues.length,
            contentHealth: {
                issues: issues
            }
        };
    }
} 