/**
 * Loading Indicator Module
 * Creates and manages loading indicators without using innerHTML
 */

console.log('[DEBUG] Loading indicator module loaded');

// Create and show the loading indicator
function createLoadingIndicator() {
    console.log('[DEBUG] Creating loading indicator');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.id = 'script-loading-indicator';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'loading-indicator-content';
    
    const heading = document.createElement('h2');
    heading.textContent = 'Loading AdBrain Feed Manager...';
    
    const statusPara = document.createElement('p');
    statusPara.id = 'loading-status';
    statusPara.textContent = 'Initializing...';
    
    contentDiv.appendChild(heading);
    contentDiv.appendChild(statusPara);
    loadingIndicator.appendChild(contentDiv);
    
    document.body.appendChild(loadingIndicator);
    
    return loadingIndicator;
}

// Update the loading status text
function updateLoadingStatus(status) {
    console.log('[DEBUG] Updating loading status:', status);
    const statusElement = document.getElementById('loading-status');
    if (statusElement) {
        statusElement.textContent = status;
    }
}

// Remove the loading indicator
function removeLoadingIndicator() {
    console.log('[DEBUG] Removing loading indicator');
    const indicator = document.getElementById('script-loading-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Set error state for the loading indicator
function setLoadingIndicatorError() {
    console.log('[DEBUG] Setting loading indicator error state');
    const indicator = document.getElementById('script-loading-indicator');
    if (indicator) {
        const contentDiv = indicator.querySelector('.loading-indicator-content');
        if (contentDiv) {
            contentDiv.style.backgroundColor = '#ff3333';
        }
    }
}

// Create and show the mock mode indicator
function createMockIndicator() {
    console.log('[DEBUG] Creating mock indicator');
    const mockIndicator = document.createElement('div');
    mockIndicator.className = 'mock-indicator';
    mockIndicator.textContent = 'MOCK MODE';
    document.body.appendChild(mockIndicator);
}

// Export functions
console.log('[DEBUG] Exporting LoadingIndicator functions to window');
window.LoadingIndicator = {
    create: createLoadingIndicator,
    update: updateLoadingStatus,
    remove: removeLoadingIndicator,
    setError: setLoadingIndicatorError,
    createMockIndicator: createMockIndicator
};
console.log('[DEBUG] LoadingIndicator module initialization complete');