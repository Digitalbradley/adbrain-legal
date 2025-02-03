// Listen for extension installation/update
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed/updated');
});

// Single message listener for all message types
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.type === 'GET_AUTH_TOKEN') {
        console.log('Getting auth token...');
        chrome.identity.getAuthToken({ 
            interactive: true,
            scopes: ['https://www.googleapis.com/auth/content']
        }, (token) => {
            if (chrome.runtime.lastError) {
                console.error('Auth error:', chrome.runtime.lastError);
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }
            console.log('Got auth token successfully:', token);
            sendResponse({ token });
        });
        return true; // Keep the message channel open for async response
    }

    // Log any runtime errors
    if (chrome.runtime.lastError) {
        console.error('Runtime error:', chrome.runtime.lastError);
    }
});
