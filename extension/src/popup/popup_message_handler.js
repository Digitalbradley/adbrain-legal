/**
 * popup_message_handler.js
 * 
 * This module handles sending messages to the background script and processing responses.
 * It provides a standardized way to communicate with the background script and handle errors.
 */

// Create a PopupMessageHandler object to handle message sending and receiving
const PopupMessageHandler = {
    /**
     * Sends a message to the background script and returns a promise that resolves with the response.
     * 
     * @param {Object} message - The message to send to the background script
     * @returns {Promise<Object>} - A promise that resolves with the response from the background script
     */
    sendMessageToBackground: function(message) {
        console.log('[DEBUG] Sending message to background:', message);
        
        return new Promise((resolve, reject) => {
            try {
                // Check if chrome.runtime is available (it won't be in test environments)
                if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
                    console.error('[DEBUG] Chrome runtime not available. This is expected in test environments.');
                    
                    // Return a mock response for test environments
                    setTimeout(() => {
                        const mockResponse = this._getMockResponse(message);
                        console.log('[DEBUG] Returning mock response for test environment:', mockResponse);
                        resolve(mockResponse);
                    }, 100);
                    return;
                }
                
                // Normal chrome.runtime.sendMessage flow for extension environment
                chrome.runtime.sendMessage(message, (response) => {
                    // Check for chrome runtime errors
                    if (chrome.runtime.lastError) {
                        console.error('[DEBUG] Chrome runtime error:', chrome.runtime.lastError);
                        reject(new Error(`Chrome runtime error: ${chrome.runtime.lastError.message}`));
                        return;
                    }
                    
                    // Check if response is undefined or null
                    if (!response) {
                        console.warn('[DEBUG] No response received from background script');
                        resolve({ success: false, error: 'No response received from background script' });
                        return;
                    }
                    
                    console.log('[DEBUG] Received response from background:', response);
                    resolve(response);
                });
            } catch (error) {
                console.error('[DEBUG] Error sending message to background:', error);
                reject(error);
            }
        });
    },
    
    /**
     * Sends a message to the background script and handles the response with callbacks.
     * 
     * @param {Object} message - The message to send to the background script
     * @param {Function} onSuccess - Callback function to call on success
     * @param {Function} onError - Callback function to call on error
     */
    sendMessageWithCallbacks: function(message, onSuccess, onError) {
        this.sendMessageToBackground(message)
            .then((response) => {
                if (response && response.success) {
                    if (typeof onSuccess === 'function') {
                        onSuccess(response);
                    }
                } else {
                    const errorMessage = response && response.error ? response.error : 'Unknown error';
                    if (typeof onError === 'function') {
                        onError(new Error(errorMessage));
                    }
                }
            })
            .catch((error) => {
                if (typeof onError === 'function') {
                    onError(error);
                }
            });
    },
    
    /**
     * Sends a message to the background script to get the authentication state.
     * 
     * @returns {Promise<Object>} - A promise that resolves with the authentication state
     */
    getAuthState: function() {
        return this.sendMessageToBackground({ action: 'getAuthState' });
    },
    
    /**
     * Sends a message to the background script to authenticate with GMC.
     * 
     * @returns {Promise<Object>} - A promise that resolves with the authentication result
     */
    authenticateGMC: function() {
        return this.sendMessageToBackground({ action: 'authenticateGmc' });
    },
    
    /**
     * Sends a message to the background script to sign in with Firebase.
     * 
     * @returns {Promise<Object>} - A promise that resolves with the sign-in result
     */
    signInWithFirebase: function() {
        return this.sendMessageToBackground({ action: 'signInWithFirebase' });
    },
    
    /**
     * Sends a message to the background script to sign out.
     * 
     * @returns {Promise<Object>} - A promise that resolves with the sign-out result
     */
    signOut: function() {
        return this.sendMessageToBackground({ action: 'signOut' });
    },
    
    /**
     * Internal method to generate mock responses for test environments
     * @private
     * @param {Object} message - The message that was sent
     * @returns {Object} - A mock response object
     */
    _getMockResponse: function(message) {
        if (!message || !message.action) {
            return { success: false, error: 'Invalid message format' };
        }
        
        // Generate different mock responses based on the action
        switch (message.action) {
            case 'getAuthState':
                return {
                    success: true,
                    state: {
                        gmcAuthenticated: false,
                        firebaseAuthenticated: false,
                        isProUser: false,
                        gmcMerchantId: null,
                        firebaseUserId: null,
                        lastError: null
                    }
                };
                
            case 'authenticateGmc':
                return {
                    success: true,
                    state: {
                        gmcAuthenticated: true,
                        firebaseAuthenticated: false,
                        isProUser: false,
                        gmcMerchantId: 'test-merchant-id',
                        firebaseUserId: null,
                        lastError: null
                    }
                };
                
            case 'signInWithFirebase':
                return {
                    success: true,
                    state: {
                        gmcAuthenticated: false,
                        firebaseAuthenticated: true,
                        isProUser: true,
                        gmcMerchantId: null,
                        firebaseUserId: 'test-user-id',
                        lastError: null
                    }
                };
                
            case 'signOut':
                return {
                    success: true,
                    state: {
                        gmcAuthenticated: false,
                        firebaseAuthenticated: false,
                        isProUser: false,
                        gmcMerchantId: null,
                        firebaseUserId: null,
                        lastError: null
                    }
                };
                
            default:
                return {
                    success: false,
                    error: `Mock response not implemented for action: ${message.action}`
                };
        }
    }
};

// Make the PopupMessageHandler available globally
window.PopupMessageHandler = PopupMessageHandler;

// No default export needed for regular scripts