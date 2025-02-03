// Basic GMC validation rules for free version
const basicGMCRules = {
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
            pattern: /^https?:\/\/.+/i,
            description: "Product landing page URL"
        },
        image_link: {
            required: true,
            maxLength: 2000,
            pattern: /^https?:\/\//i,
            description: "Main product image URL (must start with http:// or https://)"
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

// Export for use in validator
window.basicGMCRules = basicGMCRules;

// Title validation rules
const titleRules = {
    minLength: {
        value: 20,
        message: "Title length (%s) must be at least 20 characters"
    },
    maxLength: {
        value: 70,
        message: "Title length (%s) exceeds maximum 70 characters"
    }
};

// Description validation rules
const descriptionRules = {
    minLength: {
        value: 70,
        message: "Description length (%s) must be at least 70 characters"
    },
    maxLength: {
        value: 250,
        message: "Description length (%s) exceeds maximum 250 characters"
    }
};
