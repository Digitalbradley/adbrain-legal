class GMCApi {
    constructor() {
        this.API_BASE_URL = 'https://shoppingcontent.googleapis.com/content/v2.1';
        this.OAUTH_SCOPE = 'https://www.googleapis.com/auth/content';
        this.CLIENT_ID = '364850030543-kn12acreg0pokqdo6f524ul1dcj56vlt.apps.googleusercontent.com';
        this.merchantId = null;
        this.accessToken = null;
        this.isAuthenticated = false;
        this.testMode = true; // Added for testing
        this.TEST_MERCHANT_ID = '123456789'; // Added for testing
    }

    async initialize(clientId, clientSecret) {
        try {
            // Initialize OAuth2 client
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            
            // Check if we have stored credentials
            const storedAuth = localStorage.getItem('gmc_auth');
            if (storedAuth) {
                const auth = JSON.parse(storedAuth);
                if (this.isTokenValid(auth)) {
                    this.accessToken = auth.access_token;
                    this.merchantId = auth.merchant_id;
                    this.isAuthenticated = true;
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error initializing GMC API:', error);
            throw new Error('Failed to initialize GMC API');
        }
    }

    isTokenValid(auth) {
        if (!auth || !auth.expires_at) return false;
        // Check if token expires in more than 5 minutes
        return new Date(auth.expires_at).getTime() - Date.now() > 5 * 60 * 1000;
    }

    async authenticate() {
        try {
            console.log('Starting GMC authentication...');
            
            // Move test mode check to the very beginning
            if (this.testMode) {
                console.log('Running in test mode');
                this.accessToken = 'test_token';
                this.merchantId = this.TEST_MERCHANT_ID;
                this.isAuthenticated = true;
                return true;
            }

            if (!chrome || !chrome.runtime) {
                throw new Error('Chrome runtime not available');
            }

            const response = await new Promise((resolve, reject) => {
                chrome.identity.getAuthToken({ 
                    interactive: true,
                    scopes: ['https://www.googleapis.com/auth/content']
                }, (token) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve({ token });
                });
            });
            
            console.log('Auth response:', response);
            this.accessToken = response.token;
            
            // Fetch merchant ID with better error handling
            const merchantResponse = await fetch(
                'https://shoppingcontent.googleapis.com/content/v2.1/accounts/authinfo',
                {
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                }
            );
            
            if (!merchantResponse.ok) {
                throw new Error(`Failed to fetch merchant info: ${merchantResponse.statusText}`);
            }

            const merchantData = await merchantResponse.json();
            console.log('Merchant data:', merchantData);

            if (!merchantData.accountIdentifiers || !merchantData.accountIdentifiers.length) {
                throw new Error('No merchant account found. Please make sure you have access to Google Merchant Center.');
            }

            this.merchantId = merchantData.accountIdentifiers[0].merchantId;
            console.log('Merchant ID set to:', this.merchantId);
            
            return true;
        } catch (error) {
            console.error('Authentication failed:', error);
            throw new Error(`Failed to authenticate with Google Merchant Center: ${error.message}`);
        }
    }

    getAuthUrl() {
        const params = new URLSearchParams({
            client_id: this.clientId,
            redirect_uri: chrome.identity.getRedirectURL('oauth2'),
            response_type: 'code',
            scope: this.OAUTH_SCOPE,
            access_type: 'offline',
            prompt: 'consent'
        });
        
        return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }

    async handleAuthCode(code) {
        try {
            const tokenResponse = await this.exchangeCodeForToken(code);
            this.accessToken = tokenResponse.access_token;
            this.merchantId = await this.fetchMerchantId();
            
            // Store authentication data
            const authData = {
                access_token: this.accessToken,
                refresh_token: tokenResponse.refresh_token,
                merchant_id: this.merchantId,
                expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
            };
            localStorage.setItem('gmc_auth', JSON.stringify(authData));
            
            this.isAuthenticated = true;
            return true;
        } catch (error) {
            console.error('Error handling auth code:', error);
            throw new Error('Failed to handle authentication code');
        }
    }

    async exchangeCodeForToken(code) {
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                code,
                client_id: this.clientId,
                client_secret: this.clientSecret,
                redirect_uri: chrome.identity.getRedirectURL('oauth2'),
                grant_type: 'authorization_code'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to exchange code for token');
        }

        return response.json();
    }

    async fetchMerchantId() {
        const response = await this.makeAuthenticatedRequest(
            `${this.API_BASE_URL}/accounts/authinfo`
        );
        this.merchantId = response.accountIdentifiers[0].merchantId;
    }

    async validateFeed(feedData) {
        try {
            // Test mode validation
            if (this.testMode) {
                console.log('Test mode: Simulating feed validation');
                return {
                    totalProducts: feedData.length,
                    validProducts: feedData.length - 1,
                    issues: [{
                        row: 1,
                        severity: 'warning',
                        message: 'Test validation warning',
                        field: 'price'
                    }]
                };
            }

            const response = await this.makeAuthenticatedRequest(
                `${this.API_BASE_URL}/${this.merchantId}/products/validate`,
                {
                    method: 'POST',
                    body: JSON.stringify(this.formatFeedForGMC(feedData))
                }
            );
            return this.parseGMCResponse(response);
        } catch (error) {
            console.error('Feed validation failed:', error);
            throw new Error('Failed to validate feed with GMC');
        }
    }

    formatFeedForGMC(feedData) {
        return feedData.map(product => ({
            ...product,
            targetCountry: 'US', // Add required GMC fields
            contentLanguage: 'en',
            channel: 'online'
        }));
    }

    parseGMCResponse(response) {
        // Transform GMC response into our format
        return {
            totalItems: response.totalProducts,
            validItemCount: response.validProducts,
            issues: response.issues.map(issue => ({
                rowIndex: issue.row,
                issues: [{
                    type: issue.severity,
                    message: issue.message,
                    field: issue.field
                }]
            }))
        };
    }

    async makeAuthenticatedRequest(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`GMC API request failed: ${response.statusText}`);
        }

        return response.json();
    }

    // Product Feed Methods
    async uploadFeed(feedData) {
        try {
            if (this.testMode) {
                console.log('Test mode: Simulating feed upload');
                return {
                    status: 'success',
                    message: 'Test feed upload successful'
                };
            }

            const response = await this.makeAuthenticatedRequest(
                `${this.API_BASE_URL}/${this.merchantId}/products/batch`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        entries: feedData.map(item => ({
                            batchId: item.id,
                            merchantId: this.merchantId,
                            method: 'insert',
                            product: item
                        }))
                    })
                }
            );
            return response;
        } catch (error) {
            console.error('Feed upload failed:', error);
            throw new Error('Failed to upload feed');
        }
    }

    async getFeedStatus(batchId) {
        try {
            if (this.testMode) {
                console.log('Test mode: Simulating feed status check');
                return {
                    status: 'complete',
                    processedItems: 100,
                    totalItems: 100
                };
            }

            const response = await this.makeAuthenticatedRequest(
                `${this.API_BASE_URL}/${this.merchantId}/products/statuses/${batchId}`
            );
            return response;
        } catch (error) {
            console.error('Failed to get feed status:', error);
            throw new Error('Failed to get feed status');
        }
    }
}

// Make it globally available
window.GMCApi = GMCApi; 