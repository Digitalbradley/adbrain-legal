/**
 * popup_redesign.js
 * 
 * This script handles the functionality for the redesigned popup layout
 * with horizontal controls and enhanced error display.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize tab functionality
    initTabs();
    
    // Initialize feed status area
    initFeedStatus();
    
    // Initialize error UI
    initErrorUI();
    
    // Initialize file input
    initFileInput();
});

/**
 * Initialize file input with custom styling
 */
function initFileInput() {
    const fileInput = document.getElementById('fileInput');
    const fileInputWrapper = fileInput?.parentElement;
    
    if (fileInput && fileInputWrapper) {
        // Set default text
        fileInputWrapper.setAttribute('data-file-name', 'No file chosen');
        
        // Update text when file is selected
        fileInput.addEventListener('change', function() {
            const fileName = this.files.length > 0 ? this.files[0].name : 'No file chosen';
            fileInputWrapper.setAttribute('data-file-name', fileName);
        });
    }
}

/**
 * Initialize tab switching functionality
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the tab to activate
            const tabToActivate = button.getAttribute('data-tab');
            
            // Deactivate all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));
            
            // Activate the selected tab
            button.classList.add('active');
            document.getElementById(`${tabToActivate}-tab`).classList.add('active');
        });
    });
}

/**
 * Initialize feed status area with collapsible functionality
 */
function initFeedStatus() {
    const feedStatusArea = document.getElementById('feedStatusArea');
    const feedStatusContent = document.getElementById('feedStatusContent');
    
    if (feedStatusArea && feedStatusContent) {
        // Add click handler to toggle collapse/expand
        feedStatusArea.querySelector('h3').addEventListener('click', () => {
            feedStatusContent.classList.toggle('collapsed');
        });
    }
}

/**
 * Initialize error UI with enhanced functionality
 */
function initErrorUI() {
    console.log('[DEBUG] Initializing error UI');
    
    try {
        // Check if DOMManager is available
        if (typeof DOMManager === 'undefined') {
            console.error('[DEBUG] DOMManager is not defined');
            return;
        }
        
        // Check if ManagerFactory is available
        if (typeof ManagerFactory === 'undefined') {
            console.error('[DEBUG] ManagerFactory is not defined');
            return;
        }
        
        // Create a DOMManager instance
        const domManager = new DOMManager();
        console.log('[DEBUG] DOMManager created');
        
        // Log the feed status elements
        const feedStatusArea = document.getElementById('feedStatusArea');
        const feedStatusContent = document.getElementById('feedStatusContent');
        console.log('[DEBUG] Feed status elements:', {
            feedStatusArea: !!feedStatusArea,
            feedStatusContent: !!feedStatusContent
        });
        
        // Create a ManagerFactory instance
        const managerFactory = new ManagerFactory(domManager);
        console.log('[DEBUG] ManagerFactory created');
        
        // Get all managers
        const managers = managerFactory.getAllManagers();
        console.log('[DEBUG] Managers:', Object.keys(managers));
        
        // Check if FeedErrorUIManager is available
        if (!managers.feedErrorUIManager) {
            console.error('[DEBUG] FeedErrorUIManager is not available in managers');
        }
        
        // Make FeedErrorUIManager globally available
        window.feedErrorUIManager = managers.feedErrorUIManager;
        
        // Check if FeedErrorUIManager is properly initialized
        if (window.feedErrorUIManager) {
            console.log('[DEBUG] FeedErrorUIManager methods:', Object.keys(window.feedErrorUIManager));
            console.log('[DEBUG] FeedErrorUIManager elements:', {
                feedStatusArea: !!window.feedErrorUIManager.elements.feedStatusArea,
                feedStatusContent: !!window.feedErrorUIManager.elements.feedStatusContent
            });
        }
        
        console.log('[DEBUG] Error UI initialized with FeedErrorUIManager:', !!window.feedErrorUIManager);
        
        // Add a test error to verify the FeedErrorUIManager is working
        if (window.feedErrorUIManager && typeof window.feedErrorUIManager.displayErrors === 'function') {
            console.log('[DEBUG] Testing FeedErrorUIManager.displayErrors');
            window.feedErrorUIManager.displayErrors([
                {
                    type: 'test_error',
                    message: 'This is a test error',
                    severity: 'error',
                    rowIndex: 1,
                    field: 'title',
                    offerId: 'TEST001'
                }
            ]);
        }
    } catch (error) {
        console.error('[DEBUG] Error initializing error UI:', error);
    }
}

/**
 * Display feed errors in the feed status area
 * @param {Array} errors - Array of error objects
 */
function displayFeedErrors(errors) {
    const feedStatusContent = document.getElementById('feedStatusContent');
    
    if (!feedStatusContent) return;
    
    // Clear existing content
    feedStatusContent.innerHTML = '';
    
    if (!errors || errors.length === 0) {
        // No errors, show success message
        feedStatusContent.innerHTML = '<div class="status-message success">Feed loaded successfully. No errors detected.</div>';
        return;
    }
    
    // Create error container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'feed-error-container';
    
    // Create error header
    const errorHeader = document.createElement('div');
    errorHeader.className = 'feed-error-header';
    errorHeader.innerHTML = `
        <h3>Feed Errors (${errors.length})</h3>
        <span class="feed-error-count">${errors.length}</span>
    `;
    
    // Create error content
    const errorContent = document.createElement('div');
    errorContent.className = 'feed-error-content';
    
    // Add errors to content
    errors.forEach(error => {
        const errorItem = document.createElement('div');
        errorItem.className = 'feed-error-item';
        
        const errorTitle = document.createElement('div');
        errorTitle.className = 'feed-error-title';
        errorTitle.innerHTML = `<span class="feed-error-icon">⚠️</span> ${error.title}`;
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'feed-error-message';
        errorMessage.textContent = error.message;
        
        const errorAction = document.createElement('div');
        errorAction.className = 'feed-error-action';
        
        if (error.action) {
            errorAction.innerHTML = `<a href="#" data-action="${error.action.type}" data-target="${error.action.target}">${error.action.text}</a>`;
        }
        
        errorItem.appendChild(errorTitle);
        errorItem.appendChild(errorMessage);
        
        if (error.action) {
            errorItem.appendChild(errorAction);
        }
        
        errorContent.appendChild(errorItem);
    });
    
    // Add click handler to toggle collapse/expand
    errorHeader.addEventListener('click', () => {
        errorContent.classList.toggle('collapsed');
    });
    
    // Assemble error container
    errorContainer.appendChild(errorHeader);
    errorContainer.appendChild(errorContent);
    
    // Add to feed status content
    feedStatusContent.appendChild(errorContainer);
}

// Export functions for use by other modules
window.PopupRedesign = {
    displayFeedErrors: displayFeedErrors
};