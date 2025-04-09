// src/popup/login.js - Refactored for Message Passing

document.addEventListener('DOMContentLoaded', () => {
    const gmcLoginButton = document.getElementById('gmcLoginButton');
    const firebaseLoginButton = document.getElementById('firebaseLoginButton');
    const statusDiv = document.getElementById('status');

    // Function to update UI state during login attempts
    const setLoadingState = (message) => {
        statusDiv.textContent = message;
        statusDiv.className = 'status-loading loading-dots';
        gmcLoginButton.disabled = true;
        firebaseLoginButton.disabled = true;
    };

    // Function to reset UI state after login attempt (failure/cancellation)
    const resetLoadingState = () => {
        // Re-enable buttons if the window hasn't closed
        if (!window.closed) {
            gmcLoginButton.disabled = false;
            firebaseLoginButton.disabled = false;
        }
    };

    // Function to handle errors display
    const displayError = (baseMessage, error = null) => {
        console.error(baseMessage, error);
        let errorMessage = baseMessage;
        // Customize error message based on specific codes if needed
        if (error?.message) {
            // Avoid overly technical messages if possible
            if (error.message.includes('No merchant account found')) {
                errorMessage = 'GMC Connection failed: No Google Merchant Center account found or accessible.';
            } else if (error.message.includes('popup') || error.message.includes('cancelled')) {
                errorMessage = `Sign-in failed: ${error.message}`; // Keep popup related errors
            } else {
                errorMessage = `${baseMessage}: Please try again.`; // Generic fallback
            }
        }
        if (error?.code === 'auth/popup-blocked') {
            errorMessage = 'Sign-in failed: Pop-up blocked by browser. Please allow pop-ups for this extension.';
        } else if (error?.code === 'auth/cancelled-popup-request') {
            errorMessage = 'Sign-in failed: Multiple sign-in attempts detected. Please try again.';
        }

        statusDiv.textContent = errorMessage;
        statusDiv.className = 'status-error';
        resetLoadingState(); // Re-enable buttons after error
    };

    // --- GMC Login Button Listener ---
    gmcLoginButton.addEventListener('click', () => {
        setLoadingState('Connecting Google Merchant Center...');

        chrome.runtime.sendMessage({ action: 'authenticateGmc' }, (response) => {
            // Check for errors during message sending or from the background script
            if (chrome.runtime.lastError) {
                displayError('Error communicating with background service', chrome.runtime.lastError);
                resetLoadingState();
                return;
            }
            if (!response || !response.success) {
                displayError('GMC Connection failed', response?.error);
                resetLoadingState();
                return;
            }

            // --- Success ---
            console.log("Response from authenticateGmc:", response);
            statusDiv.textContent = 'GMC Connected Successfully!';
            statusDiv.className = 'status-success';
            // Don't reset loading state here, window will close
            setTimeout(() => {
                try {
                    // Open main interface (popup.html)
                    chrome.tabs.create({ url: chrome.runtime.getURL('src/popup/popup.html') });
                    window.close(); // Close the login popup
                } catch (error) {
                    console.error('Error opening popup.html:', error);
                    displayError('Error opening main interface', error);
                    resetLoadingState();
                }
            }, 500); // Short delay
        });
    });

    // --- Firebase Login Button Listener ---
    firebaseLoginButton.addEventListener('click', () => {
        setLoadingState('Signing in with Google (Firebase)...');

        chrome.runtime.sendMessage({ action: 'signInWithFirebase' }, (response) => {
            // Check for errors during message sending or from the background script
            if (chrome.runtime.lastError) {
                displayError('Error communicating with background service', chrome.runtime.lastError);
                resetLoadingState();
                return;
            }
            if (!response || (!response.success && !response.cancelled)) {
                displayError('Firebase Sign-in failed', response?.error);
                resetLoadingState();
                return;
            }

            // --- Success or Cancellation ---
            console.log("Response from signInWithFirebase:", response);
            if (response.success) {
                statusDiv.textContent = 'Firebase Sign-in Successful!';
                statusDiv.className = 'status-success';
                // Leave user on login page to potentially connect GMC next
                setTimeout(() => {
                    statusDiv.textContent = 'Sign-in successful. Connect GMC if needed.';
                    statusDiv.className = ''; // Clear status style
                    resetLoadingState(); // Re-enable buttons
                }, 1500); // Longer delay to see message
            } else if (response.cancelled) {
                // Handle cancellation (e.g., popup closed)
                statusDiv.textContent = 'Sign-in cancelled.';
                statusDiv.className = ''; // Clear status style
                resetLoadingState(); // Re-enable buttons
            } else {
                // Handle other cases
                statusDiv.textContent = 'Sign-in completed with unknown status.';
                statusDiv.className = '';
                resetLoadingState();
            }
        });
    });

    // Initial state
    gmcLoginButton.disabled = false;
    firebaseLoginButton.disabled = false;
    statusDiv.textContent = 'Please login to continue';
    statusDiv.className = '';
}); // End DOMContentLoaded