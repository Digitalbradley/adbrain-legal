/**
 * Debug script to check if scripts are loaded
 */

console.log('[DEBUG] debug.js loaded');
console.log('[DEBUG] LoadingIndicator available:', !!window.LoadingIndicator);

// Log DOMContentLoaded event but don't add conflicting event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOMContentLoaded in debug.js');
    const previewButton = document.getElementById('previewFeed');
    if (previewButton) {
        console.log('[DEBUG] Found previewFeed button in debug.js');
        // Don't add a direct click listener here as it conflicts with FeedManager
        // Just log that we found the button
    } else {
        console.log('[DEBUG] previewFeed button not found in debug.js');
    }
});