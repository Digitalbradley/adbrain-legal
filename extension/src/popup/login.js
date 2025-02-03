document.getElementById('loginButton').addEventListener('click', async () => {
    try {
        const gmcApi = new GMCApi();
        await gmcApi.authenticate();
        
        // Open main interface in new tab
        chrome.tabs.create({
            url: chrome.runtime.getURL('src/popup/popup.html')
        });
        
        // Close the popup
        window.close();
    } catch (error) {
        console.error('Login failed:', error);
        alert('Login failed. Please try again.');
    }
}); 