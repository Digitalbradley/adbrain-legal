document.getElementById('loginButton').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    const loginButton = document.getElementById('loginButton');
    
    try {
        // Update UI to loading state
        statusDiv.textContent = 'Authenticating';
        statusDiv.className = 'status-loading loading-dots';
        loginButton.disabled = true;
        
        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ 
                interactive: true,
                scopes: AUTH_CONFIG.SCOPES
            }, (token) => {
                if (chrome.runtime.lastError) {
                    console.error('Auth Error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(token);
                }
            });
        });

        // Store the token
        localStorage.setItem('gmc_token', token);
        
        // Show success briefly
        statusDiv.textContent = 'Login successful!';
        statusDiv.className = 'status-success';
        
        // Short delay to show success message
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Open main interface
        chrome.tabs.create({
            url: chrome.runtime.getURL('src/popup/popup.html')
        });
        
        // Close the popup
        window.close();
        
    } catch (error) {
        console.error('Login failed:', error);
        statusDiv.textContent = `Authentication failed: ${error.message}`;
        statusDiv.className = 'status-error';
        loginButton.disabled = false;
    }
}); 