class GMCValidator {
    constructor(gmcApi) {
        this.gmcApi = gmcApi;
        this.validationRules = {
            required: [
                'id',
                'title',
                'description',
                'link',
                'image_link',
                'availability',
                'price',
                'brand',
                'condition'
            ],
            recommended: [
                'gtin',
                'mpn',
                'google_product_category'
            ]
        };
    }

    async validateFeed(feedData) {
        try {
            // First perform local validation
            const localValidation = this.performLocalValidation(feedData);
            
            // Then validate with GMC API if local validation passes
            if (localValidation.isValid) {
                const gmcValidation = await this.gmcApi.validateFeed(feedData);
                return this.processGMCValidation(gmcValidation);
            }
            
            return localValidation;
        } catch (error) {
            console.error('Feed validation failed:', error);
            throw new Error('Failed to validate feed');
        }
    }

    performLocalValidation(feedData) {
        const issues = [];
        const validItems = [];

        feedData.forEach((item, index) => {
            const itemIssues = this.validateItem(item);
            if (itemIssues.length > 0) {
                issues.push({
                    rowIndex: index + 1,
                    itemId: item.id,
                    issues: itemIssues
                });
            } else {
                validItems.push(item);
            }
        });

        return {
            isValid: issues.length === 0,
            validItemCount: validItems.length,
            totalItems: feedData.length,
            issues,
            validItems
        };
    }

    validateItem(item) {
        const issues = [];

        // Check required fields
        this.validationRules.required.forEach(field => {
            if (!item[field]) {
                issues.push({
                    field,
                    type: 'error',
                    message: `Missing required field: ${field}`
                });
            }
        });

        // Check recommended fields
        this.validationRules.recommended.forEach(field => {
            if (!item[field]) {
                issues.push({
                    field,
                    type: 'warning',
                    message: `Missing recommended field: ${field}`
                });
            }
        });

        // Validate specific fields
        if (item.price && !this.isValidPrice(item.price)) {
            issues.push({
                field: 'price',
                type: 'error',
                message: 'Invalid price format. Must be a number followed by a valid currency code (e.g., "99.99 USD")'
            });
        }

        if (item.image_link && !this.isValidUrl(item.image_link)) {
            issues.push({
                field: 'image_link',
                type: 'error',
                message: 'Invalid image URL. Must be a valid HTTPS URL'
            });
        }

        if (item.link && !this.isValidUrl(item.link)) {
            issues.push({
                field: 'link',
                type: 'error',
                message: 'Invalid product URL. Must be a valid HTTPS URL'
            });
        }

        return issues;
    }

    isValidPrice(price) {
        const priceRegex = /^\d+(\.\d{2})?\s[A-Z]{3}$/;
        return priceRegex.test(price);
    }

    isValidUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.protocol === 'https:';
        } catch {
            return false;
        }
    }

    processGMCValidation(gmcResponse) {
        // Process and format GMC API validation response
        const issues = [];

        if (gmcResponse.issues) {
            gmcResponse.issues.forEach(issue => {
                issues.push({
                    rowIndex: issue.row,
                    issues: [{
                        type: issue.severity,
                        message: issue.message,
                        field: issue.field
                    }]
                });
            });
        }

        return {
            isValid: issues.length === 0,
            validItemCount: gmcResponse.validProducts,
            totalItems: gmcResponse.totalProducts,
            issues
        };
    }

    // Added test helper method
    generateTestFeed() {
        return [
            {
                id: 'PROD001',
                title: 'Test Product 1',
                description: 'Test Description',
                link: 'https://example.com/product1',
                image_link: 'https://example.com/images/prod001.jpg',
                availability: 'in stock',
                price: '449.56 USD',
                brand: 'Test Brand',
                condition: 'new'
            },
            {
                id: 'PROD002',
                title: 'Test Product 2',
                description: 'Test Description 2',
                link: 'https://example.com/product2',
                image_link: 'https://example.com/images/prod002.jpg',
                availability: 'in stock',
                price: '2062.11 USD',
                brand: 'Test Brand',
                condition: 'new'
            }
        ];
    }
}

// Make it globally available
window.GMCValidator = GMCValidator; 
