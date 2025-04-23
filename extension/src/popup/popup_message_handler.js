// src/popup/popup_message_handler.js
// Contains extracted message handling functionality from popup.js

/**
 * Sends a message to the background script and handles the response
 * @param {Object} message - The message to send to the background script
 * @returns {Promise<Object>} - A promise that resolves with the response from the background script
 */
function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
        if (!chrome.runtime?.sendMessage) {
            console.error("chrome.runtime.sendMessage is not available.");
            // Resolve with an error state instead of rejecting to allow graceful handling
            return resolve({ success: false, error: { message: "Extension context invalidated." } });
        }
        
        // Check if feature flags are available
        const useFeatureFlags = typeof window.FEATURES !== 'undefined';
        const useMockAuth = useFeatureFlags && window.FEATURES.USE_MOCK_AUTH;
        const useMockGMC = useFeatureFlags && window.FEATURES.USE_MOCK_GMC_API;
        const useMockFirebase = useFeatureFlags && window.FEATURES.USE_MOCK_FIREBASE;
        const verboseLogging = useFeatureFlags && window.FEATURES.VERBOSE_LOGGING;
        
        // For getAuthState action, return a mock response if we have a mock AuthManager and mocks are enabled
        if (message.action === 'getAuthState' && useMockAuth) {
            if (verboseLogging) console.log("Intercepting getAuthState message with mock response (based on feature flag)");
            const mockAuthManager = new AuthManager();
            const state = mockAuthManager.getAuthState();
            return resolve({ success: true, state: state });
        }
        
        // For other actions, try to send to background, but provide fallbacks
        try {
            chrome.runtime.sendMessage(message, (response) => {
                const lastError = chrome.runtime.lastError;
                if (lastError) {
                    console.error(`Message sending error for action "${message?.action}":`, lastError.message);
                    
                    // Provide mock responses for common actions based on feature flags
                    if (message.action === 'authenticateGmc' && useMockGMC) {
                        if (verboseLogging) console.log("Providing mock GMC authentication response (based on feature flag)");
                        return resolve({
                            success: true,
                            merchantId: 'MOCK-123456',
                            message: 'Mock GMC authentication successful'
                        });
                    } else if (message.action === 'signInWithFirebase' && useMockFirebase) {
                        if (verboseLogging) console.log("Providing mock Firebase sign-in response (based on feature flag)");
                        return resolve({
                            success: true,
                            user: { uid: 'mock-user-id', email: 'mock@example.com' }
                        });
                    } else if ((message.action === 'logoutGmc' && useMockGMC) ||
                               (message.action === 'signOutFirebase' && useMockFirebase)) {
                        if (verboseLogging) console.log(`Providing mock ${message.action} response (based on feature flag)`);
                        return resolve({ success: true });
                    } else {
                        // Resolve with an error state for other actions
                        resolve({ success: false, error: { message: lastError.message } });
                    }
                } else if (response && response.error && !response.success) { // Check success flag with error
                    console.error(`Background script error for action "${message?.action}":`, response.error);
                    resolve(response); // Resolve with the error response from background
                }
                else {
                    resolve(response); // Resolve with the entire response (could be success or specific non-error failure)
                }
            });
        } catch (error) {
            console.error(`Error sending message for action "${message?.action}":`, error);
            
            // Provide mock responses for common actions based on feature flags
            if (message.action === 'getAuthState' && useMockAuth) {
                if (verboseLogging) console.log("Providing mock auth state in catch block (based on feature flag)");
                const mockAuthManager = new AuthManager();
                const state = mockAuthManager.getAuthState();
                return resolve({ success: true, state: state });
            } else if (message.action === 'authenticateGmc' && useMockGMC) {
                if (verboseLogging) console.log("Providing mock GMC authentication in catch block (based on feature flag)");
                return resolve({
                    success: true,
                    merchantId: 'MOCK-123456',
                    message: 'Mock GMC authentication successful'
                });
            } else if (message.action === 'signInWithFirebase' && useMockFirebase) {
                if (verboseLogging) console.log("Providing mock Firebase sign-in in catch block (based on feature flag)");
                return resolve({
                    success: true,
                    user: { uid: 'mock-user-id', email: 'mock@example.com' }
                });
            } else if ((message.action === 'logoutGmc' && useMockGMC) ||
                       (message.action === 'signOutFirebase' && useMockFirebase)) {
                if (verboseLogging) console.log(`Providing mock ${message.action} in catch block (based on feature flag)`);
                return resolve({ success: true });
            } else {
                // Resolve with an error state for other actions
                resolve({ success: false, error: { message: error.message } });
            }
        }
    });
}

// Make function available globally
window.PopupMessageHandler = {
    sendMessageToBackground
};