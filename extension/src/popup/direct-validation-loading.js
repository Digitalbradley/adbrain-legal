/**
 * Direct Validation Loading Module
 *
 * This module handles loading indicators for the direct validation functionality.
 * It provides functions to show and hide loading indicators during the validation process.
 */

(function() {
    /**
     * Shows a loading indicator
     * @param {string} message The loading message to display
     */
    function showLoading(message) {
        // Check if LoadingManager is available
        if (window.LoadingIndicator && window.LoadingIndicator.create) {
            window.LoadingIndicator.create();
            window.LoadingIndicator.update(message);
            return;
        }
        
        // Fallback loading indicator
        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'direct-loading-overlay';
        loadingOverlay.style.position = 'fixed';
        loadingOverlay.style.top = '0';
        loadingOverlay.style.left = '0';
        loadingOverlay.style.width = '100%';
        loadingOverlay.style.height = '100%';
        loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.justifyContent = 'center';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.zIndex = '9999';
        
        loadingOverlay.innerHTML = `
            <div style="background-color: white; padding: 20px; border-radius: 5px; text-align: center;">
                <div style="margin-bottom: 10px;">
                    <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite; margin: 0 auto;"></div>
                </div>
                <div>${message}</div>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.body.appendChild(loadingOverlay);
    }
    
    /**
     * Hides the loading indicator
     */
    function hideLoading() {
        // Check if LoadingManager is available
        if (window.LoadingIndicator && window.LoadingIndicator.remove) {
            window.LoadingIndicator.remove();
            return;
        }
        
        // Fallback loading indicator
        const loadingOverlay = document.getElementById('direct-loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.remove();
        }
    }
    
    // Export functions to global scope
    window.DirectValidationLoading = {
        showLoading: showLoading,
        hideLoading: hideLoading
    };
    
    console.log('[DIRECT] Loading module initialized');
})();