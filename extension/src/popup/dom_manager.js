/**
 * dom_manager.js - Manages DOM element references
 *
 * This module provides a clean interface for accessing DOM elements
 * with robust error handling and validation.
 */

class DOMManager {
    constructor() {
        this.elements = {};
        this.initialize();
    }
    
    /**
     * Initializes the DOM manager by getting references to all required elements
     */
    initialize() {
        console.log('[DEBUG] DOMManager: Initializing DOM element references');
        
        // Get UI element references
        this.elements.fileInput = this.getElement('fileInput');
        this.elements.previewButton = this.getElement('previewFeed');
        this.elements.previewContentContainer = this.getElement('previewContent');
        this.elements.exportButton = this.getElement('exportFeed');
        this.elements.verifyGMCButton = this.getElement('testGMCAuth');
        this.elements.validateGMCButton = this.getElement('validateGMC');
        this.elements.logoutButton = this.getElement('logoutButton');
        this.elements.mainDropdown = this.getElement('analysisDropdown');
        this.elements.searchInput = this.getElement('searchInput');
        this.elements.searchColumnSelect = this.getElement('searchColumn');
        this.elements.searchTypeSelect = this.getElement('searchType');
        this.elements.clearSearchBtn = this.getElement('clearSearchBtn');
        this.elements.searchStatus = document.querySelector('.search-status');
        
        // Validation tab elements
        this.elements.validationTab = this.getElement('validation-tab');
        this.elements.historyTableBody = this.getElement('validationHistory');
        
        // Status elements
        this.elements.feedStatusContent = this.getElement('feedStatusContent');
        
        // Tab elements
        this.elements.tabButtons = document.querySelectorAll('.tab-button');
        this.elements.tabPanels = document.querySelectorAll('.tab-panel');
        
        // Log the elements found
        console.log('[DEBUG] DOMManager: Element references initialized');
        console.log('[DEBUG] DOMManager: Elements found:', Object.keys(this.elements).filter(key => !!this.elements[key]).length);
        console.log('[DEBUG] DOMManager: Elements missing:', Object.keys(this.elements).filter(key => !this.elements[key]).length);
    }
    
    /**
     * Gets an element by ID with error handling
     * @param {string} id - The ID of the element to get
     * @param {boolean} required - Whether the element is required
     * @returns {HTMLElement|null} - The element or null if not found
     */
    getElement(id, required = false) {
        const element = document.getElementById(id);
        if (!element && required) {
            console.error(`[DOMManager] Required element #${id} not found`);
        } else if (!element) {
            console.warn(`[DOMManager] Element #${id} not found`);
        }
        return element;
    }
    
    /**
     * Gets elements by selector with error handling
     * @param {string} selector - The CSS selector to use
     * @param {boolean} required - Whether at least one element is required
     * @returns {NodeList} - The elements found or empty NodeList if none found
     */
    getElements(selector, required = false) {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0 && required) {
            console.error(`[DOMManager] Required elements "${selector}" not found`);
        } else if (elements.length === 0) {
            console.warn(`[DOMManager] Elements "${selector}" not found`);
        }
        return elements;
    }
    
    /**
     * Gets all elements as an object
     * @returns {Object} - An object containing all elements
     */
    getAllElements() {
        return this.elements;
    }
    
    /**
     * Gets a specific element
     * @param {string} name - The name of the element to get
     * @returns {HTMLElement|null} - The element or null if not found
     */
    get(name) {
        if (!this.elements[name]) {
            console.warn(`[DOMManager] Element "${name}" not found in elements collection`);
        }
        return this.elements[name] || null;
    }
    
    /**
     * Checks if all required elements are present
     * @param {Array<string>} requiredElements - Array of required element names
     * @returns {boolean} - True if all required elements are present, false otherwise
     */
    checkRequiredElements(requiredElements) {
        console.log('[DEBUG] DOMManager: Checking required elements:', requiredElements);
        
        const missingElements = requiredElements.filter(name => !this.elements[name]);
        
        if (missingElements.length > 0) {
            console.error('[DEBUG] DOMManager: Missing required elements:', missingElements);
            return false;
        }
        
        console.log('[DEBUG] DOMManager: All required elements found');
        return true;
    }
    
    /**
     * Creates a DOM element with the specified attributes
     * @param {string} tagName - The tag name of the element to create
     * @param {Object} attributes - The attributes to set on the element
     * @param {string} textContent - The text content to set on the element
     * @returns {HTMLElement} - The created element
     */
    createElement(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        // Set attributes
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Set text content
        if (textContent) {
            element.textContent = textContent;
        }
        
        return element;
    }
}

// Make globally available for backward compatibility
window.DOMManager = DOMManager;

// No default export needed for regular scripts