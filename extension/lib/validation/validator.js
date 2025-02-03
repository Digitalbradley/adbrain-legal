// First ensure rules are available
if (typeof window.basicGMCRules === 'undefined') {
    console.error('GMC validation rules not loaded, creating default rules');
    window.basicGMCRules = {
        required: {
            id: {
                required: true,
                maxLength: 50,
                description: "Unique identifier for each product"
            },
            title: {
                required: true,
                minLength: 20,
                maxLength: 150,
                description: "Product title"
            },
            description: {
                required: true,
                minLength: 70,
                maxLength: 5000,
                description: "Product description"
            },
            link: {
                required: true,
                maxLength: 2000,
                pattern: /^https?:\/\//i,
                description: "Product landing page URL"
            },
            image_link: {
                required: true,
                maxLength: 2000,
                pattern: /^https?:\/\//i,
                description: "Main product image URL"
            },
            price: {
                required: true,
                pattern: /^\d+\.?\d*\s*USD$/i,
                description: "Product price with currency (e.g., 449.56 USD)"
            },
            availability: {
                required: true,
                enum: ['in_stock', 'out_of_stock', 'preorder', 'backorder'],
                description: "Product availability status"
            }
        },
        recommended: {
            brand: {
                maxLength: 70,
                description: "Product brand name"
            },
            gtin: {
                pattern: /^\d{8}|\d{12}|\d{13}|\d{14}$/,
                description: "Global Trade Item Number"
            },
            mpn: {
                maxLength: 70,
                description: "Manufacturer Part Number"
            },
            google_product_category: {
                description: "Google-defined product category"
            }
        }
    };
}

class GMCValidator {
    constructor() {
        console.log('Initializing GMCValidator with rules:', window.basicGMCRules);
        this.rules = window.basicGMCRules;
    }

    async validateFeed(feedData) {
        try {
            console.log('Starting feed validation with data:', feedData);
            
            if (!Array.isArray(feedData)) {
                console.error('Invalid feed data:', feedData);
                throw new Error('Invalid feed data format');
            }

            if (feedData.length === 0) {
                throw new Error('No feed data to validate');
            }

            const results = {
                totalItems: feedData.length,
                validItemCount: 0,
                issues: []
            };

            feedData.forEach((product, index) => {
                try {
                    console.log(`Validating product ${index + 1}:`, product);
                    
                    if (!product || typeof product !== 'object') {
                        console.error(`Invalid product at index ${index}:`, product);
                        return;
                    }

                    const rowIssues = this.validateProduct(product, index + 1);
                    console.log(`Validation results for product ${index + 1}:`, rowIssues);
                    
                    const hasErrors = rowIssues.required.length > 0 || rowIssues.format.length > 0;
                    
                    if (!hasErrors) {
                        results.validItemCount++;
                    }

                    if (rowIssues.required.length > 0 || rowIssues.format.length > 0 || rowIssues.recommendations.length > 0) {
                        results.issues.push({
                            rowIndex: index + 1,
                            issues: [
                                ...rowIssues.required.map(issue => ({ ...issue, type: 'error' })),
                                ...rowIssues.format.map(issue => ({ ...issue, type: 'format' })),
                                ...rowIssues.recommendations.map(issue => ({ ...issue, type: 'optimization' }))
                            ]
                        });
                    }
                } catch (error) {
                    console.error(`Error validating product ${index + 1}:`, error);
                    results.issues.push({
                        rowIndex: index + 1,
                        issues: [{
                            type: 'error',
                            message: `Failed to validate product: ${error.message}`
                        }]
                    });
                }
            });

            console.log('Final validation results:', results);
            return results;

        } catch (error) {
            console.error('Validation error:', error);
            throw new Error(`Failed to validate feed: ${error.message}`);
        }
    }

    validateProduct(product, rowNum) {
        console.log(`Starting product validation for row ${rowNum}:`, product);
        
        const issues = {
            required: [],
            format: [],
            recommendations: []
        };

        // Check required fields
        for (const [field, rules] of Object.entries(this.rules.required)) {
            const value = product[field];
            console.log(`Checking field "${field}":`, { value, rules });

            // Check if field exists and is not empty
            if (!value || value.trim() === '') {
                issues.required.push({
                    row: rowNum,
                    field,
                    message: `Missing required field: ${field}`,
                    description: rules.description
                });
                continue;
            }

            // Validate format
            if (rules.pattern) {
                const testValue = value.trim();
                const isValid = rules.pattern.test(testValue);
                console.log(`Testing pattern for ${field}:`, { pattern: rules.pattern, value: testValue, isValid });
                
                if (!isValid) {
                    issues.format.push({
                        row: rowNum,
                        field,
                        message: `Invalid ${field} format. Expected format: ${rules.description}`,
                        value: testValue
                    });
                }
            }

            // Length validations
            if (rules.minLength && value.length < rules.minLength) {
                issues.format.push({
                    row: rowNum,
                    field,
                    message: `${field} is too short (min: ${rules.minLength} characters)`,
                    value
                });
            }

            if (rules.maxLength && value.length > rules.maxLength) {
                issues.format.push({
                    row: rowNum,
                    field,
                    message: `${field} is too long (max: ${rules.maxLength} characters)`,
                    value
                });
            }

            // Enum validation
            if (rules.enum && !rules.enum.includes(value.toLowerCase())) {
                issues.format.push({
                    row: rowNum,
                    field,
                    message: `Invalid ${field} value. Allowed values: ${rules.enum.join(', ')}`,
                    value
                });
            }
        }

        // Check recommended fields
        for (const [field, rules] of Object.entries(this.rules.recommended)) {
            const value = product[field];
            if (!value || value.trim() === '') {
                issues.recommendations.push({
                    row: rowNum,
                    field,
                    message: `Missing recommended field: ${field}`,
                    description: rules.description
                });
            }
        }

        console.log(`Validation issues for row ${rowNum}:`, issues);
        return issues;
    }
}

// Make it globally available
window.GMCValidator = GMCValidator;
