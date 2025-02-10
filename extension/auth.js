// Listen for button click
document.getElementById('loginButton').addEventListener('click', async () => {
    const statusDiv = document.getElementById('status');
    try {
        statusDiv.textContent = 'Authenticating...';
        
        const token = await new Promise((resolve, reject) => {
            chrome.identity.getAuthToken({ 
                interactive: true,
                scopes: ['https://www.googleapis.com/auth/content']
            }, (token) => {
                if (chrome.runtime.lastError) {
                    console.error('Auth Error:', chrome.runtime.lastError);
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(token);
                }
            });
        });

        // Test GMC access
        await testMerchantCenterAccess(token);
        
        // Store authentication state
        localStorage.setItem('isAuthenticated', 'true');
        
        // Update status and show dashboard button
        statusDiv.textContent = 'Authentication successful!';
        showDashboardButton();
        
    } catch (error) {
        console.error('Login failed:', error);
        statusDiv.textContent = `Authentication failed: ${error.message}`;
        localStorage.removeItem('isAuthenticated');
    }
});

// Check if user is already authenticated on load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Checking authentication state...');
    if (localStorage.getItem('isAuthenticated') === 'true') {
        console.log('User is authenticated, showing dashboard button');
        showDashboardButton();
    } else {
        console.log('User is not authenticated');
    }
});

function showDashboardButton() {
    document.getElementById('openDashboard').style.display = 'block';
    document.getElementById('loginButton').style.display = 'none';
}

// Add this to test GMC API is loaded
console.log('Auth.js loaded, GMCApi available:', typeof GMCApi !== 'undefined');

async function testMerchantCenterAccess(token) {
    const response = await fetch(
        'https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo',
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );
    
    if (!response.ok) {
        throw new Error('Failed to access Merchant Center');
    }
    
    return response.json();
}

// Add dashboard button click handler
document.getElementById('openDashboard').addEventListener('click', function() {
    chrome.tabs.create({
        url: chrome.runtime.getURL('src/popup/popup.html')
    });
});