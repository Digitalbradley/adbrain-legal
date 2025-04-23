/**
 * Firebase Mock Implementation
 * 
 * This module provides a mock implementation of Firebase services,
 * particularly focused on Firestore operations for validation history.
 */

/**
 * Initializes a mock Firebase implementation in the window object
 * with enhanced support for validation history operations.
 */
function initializeFirebaseMock() {
    console.log("Initializing Firebase Mock...");
    
    // Create mock Firebase object
    window.firebase = {
        initializeApp: (config) => {
            console.log("Mock Firebase initialized with config:", config);
            return {};
        },
        
        // Auth methods
        auth: () => ({
            currentUser: { uid: 'mock-user-id', email: 'mock@example.com' },
            onAuthStateChanged: (callback) => {
                callback({ uid: 'mock-user-id', email: 'mock@example.com' });
                return () => {}; // Unsubscribe function
            },
            signInWithPopup: () => Promise.resolve({ user: { uid: 'mock-user-id', email: 'mock@example.com' } }),
            signOut: () => Promise.resolve()
        }),
        
        // Firestore implementation
        firestore: createMockFirestore
    };
    
    // Add Firestore static methods to the firebase object
    window.firebase.firestore.FieldValue = {
        serverTimestamp: () => ({ _methodName: 'FieldValue.serverTimestamp' }), // Special marker for handling in add()
        increment: (n) => n,
        arrayUnion: (...items) => items
    };
    
    window.firebase.firestore.Timestamp = {
        now: () => ({ toDate: () => new Date() }),
        fromDate: (date) => ({ toDate: () => date })
    };
}

/**
 * Creates a mock Firestore implementation with enhanced validation history support
 * @returns {Object} Mock Firestore object
 */
function createMockFirestore() {
    // Enhanced mock data with more validation history entries
    const mockData = {
        users: {
            'mock-user-id': {
                profile: {
                    email: 'mock@example.com',
                    name: 'Mock User',
                    subscriptionStatus: 'pro',
                    subscriptionExpiry: new Date(2025, 11, 31)
                },
                scheduledValidation: {
                    enabled: true,
                    frequency: 'weekly',
                    dayOfWeek: 1,
                    time: '09:00',
                    notificationsEnabled: true
                },
                validationHistory: [
                    {
                        id: 'mock-history-1',
                        timestamp: new Date(Date.now() - 86400000 * 2), // 2 days ago
                        feedId: 'mock-feed-1',
                        totalProducts: 100,
                        validProducts: 90,
                        issues: [
                            {
                                rowIndex: 1,
                                offerId: 'product-1',
                                field: 'title',
                                type: 'warning',
                                message: 'Title too short (20 chars). Minimum 30 characters recommended.'
                            },
                            {
                                rowIndex: 2,
                                offerId: 'product-2',
                                field: 'description',
                                type: 'error',
                                message: 'Description missing required information.'
                            }
                        ],
                        summary: {
                            titleIssues: 1,
                            descriptionIssues: 1,
                            otherIssues: 0,
                            errorCount: 1,
                            warningCount: 1,
                            totalIssues: 2
                        },
                        isValid: false
                    },
                    {
                        id: 'mock-history-2',
                        timestamp: new Date(Date.now() - 86400000), // 1 day ago
                        feedId: 'mock-feed-2',
                        totalProducts: 150,
                        validProducts: 145,
                        issues: [
                            {
                                rowIndex: 5,
                                offerId: 'product-5',
                                field: 'title',
                                type: 'warning',
                                message: 'Title may be too generic.'
                            }
                        ],
                        summary: {
                            titleIssues: 1,
                            descriptionIssues: 0,
                            otherIssues: 0,
                            errorCount: 0,
                            warningCount: 1,
                            totalIssues: 1
                        },
                        isValid: true
                    },
                    {
                        id: 'mock-history-3',
                        timestamp: new Date(), // Today
                        feedId: 'mock-feed-3',
                        totalProducts: 200,
                        validProducts: 200,
                        issues: [],
                        summary: {
                            titleIssues: 0,
                            descriptionIssues: 0,
                            otherIssues: 0,
                            errorCount: 0,
                            warningCount: 0,
                            totalIssues: 0
                        },
                        isValid: true
                    }
                ],
                correctionTemplates: [
                    {
                        id: 'mock-template-1',
                        name: 'Title Fixes',
                        created: new Date(),
                        corrections: [],
                        appliedCount: 5
                    }
                ],
                customRules: [
                    {
                        id: 'mock-rule-1',
                        name: 'Title Length Rule',
                        field: 'title',
                        type: 'length',
                        parameters: { min: 30, max: 150 },
                        enabled: true
                    }
                ]
            }
        }
    };
    
    return {
        collection: (collectionPath) => {
            console.log(`Mock Firestore: Accessing collection ${collectionPath}`);
            const pathParts = collectionPath.split('/');
            const collectionName = pathParts[0];
            
            return {
                doc: (docId) => {
                    console.log(`Mock Firestore: Accessing document ${docId} in ${collectionPath}`);
                    
                    return {
                        collection: (subCollectionPath) => {
                            console.log(`Mock Firestore: Accessing subcollection ${subCollectionPath} in ${collectionPath}/${docId}`);
                            
                            // --- Enhanced Mock Subcollection Logic ---
                            if (collectionName === 'users' && docId === 'mock-user-id' && subCollectionPath === 'validationHistory') {
                                console.log(`Mock Firestore: Handling specific subcollection: ${subCollectionPath}`);
                                
                                // Create a reference to the mock data array
                                const historyDataRef = mockData.users['mock-user-id'].validationHistory;
                                
                                // Define the chainable query object with add/doc methods
                                const historyCollectionRef = {
                                    _historyData: historyDataRef,
                                    _orderByField: null,
                                    _orderByDirection: 'desc',
                                    _limit: Infinity,
                                    _filters: [],

                                    // --- Chainable Query Methods ---
                                    orderBy: function(field, direction = 'asc') {
                                        console.log(`Mock Firestore Query: orderBy(${field}, ${direction})`);
                                        this._orderByField = field;
                                        this._orderByDirection = direction.toLowerCase() === 'desc' ? 'desc' : 'asc';
                                        return this;
                                    },
                                    
                                    where: function(field, operator, value) {
                                        console.log(`Mock Firestore Query: where(${field}, ${operator}, ${value})`);
                                        this._filters.push({ field, operator, value });
                                        return this;
                                    },
                                    
                                    limit: function(num) {
                                        console.log(`Mock Firestore Query: limit(${num})`);
                                        this._limit = num;
                                        return this;
                                    },

                                    // --- Execution Method ---
                                    get: async function() {
                                        console.log("Mock Firestore Query: Executing get()");
                                        
                                        try {
                                            // Clone the data to avoid modifying the original
                                            let results = [...this._historyData];

                                            // Apply filters
                                            this._filters.forEach(filter => {
                                                if (filter.field === 'timestamp' && filter.operator === '>=') {
                                                    results = results.filter(item => {
                                                        const itemTimestamp = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
                                                        const filterTimestamp = filter.value && typeof filter.value.toDate === 'function' ? filter.value.toDate() : new Date(filter.value);
                                                        return itemTimestamp >= filterTimestamp;
                                                    });
                                                } else {
                                                    console.warn(`Mock Firestore: Unsupported where clause: ${filter.field} ${filter.operator}`);
                                                }
                                            });

                                            // Apply sorting
                                            if (this._orderByField === 'timestamp') {
                                                results.sort((a, b) => {
                                                    const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
                                                    const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
                                                    const comparison = dateA - dateB;
                                                    return this._orderByDirection === 'desc' ? -comparison : comparison;
                                                });
                                            } else if (this._orderByField) {
                                                console.warn(`Mock Firestore: Unsupported orderBy field: ${this._orderByField}`);
                                            }

                                            // Apply limit
                                            results = results.slice(0, this._limit);

                                            // Format results like QuerySnapshot
                                            const finalMockDocs = results.map((item, index) => ({
                                                id: item.id || `mock-history-${index + 1}`,
                                                data: () => item,
                                                exists: true
                                            }));

                                            console.log(`Mock Firestore Query: Returning ${finalMockDocs.length} documents.`);
                                            
                                            return {
                                                empty: finalMockDocs.length === 0,
                                                size: finalMockDocs.length,
                                                docs: finalMockDocs,
                                                forEach: (callback) => {
                                                    finalMockDocs.forEach(doc => callback(doc));
                                                }
                                            };
                                        } catch (error) {
                                            console.error("Mock Firestore Query Error:", error);
                                            // Return empty result on error
                                            return {
                                                empty: true,
                                                size: 0,
                                                docs: [],
                                                forEach: () => {},
                                                error: error.message
                                            };
                                        }
                                    },

                                    // --- Modification Methods ---
                                    add: async function(data) {
                                        console.log("Mock Firestore: Executing add()", data);
                                        
                                        try {
                                            const newId = `mock-history-${Date.now()}`; // Simple unique ID
                                            const newData = { ...data, id: newId }; // Add the ID to the data
                                            
                                            // Handle serverTimestamp
                                            if (data.timestamp && typeof data.timestamp === 'object' && data.timestamp._methodName === 'FieldValue.serverTimestamp') {
                                                newData.timestamp = new Date(); // Replace placeholder with actual date
                                            }
                                            
                                            // Add to the referenced mock data array
                                            this._historyData.push(newData);
                                            console.log("Mock Firestore: History data after add:", this._historyData);
                                            
                                            return { id: newId }; // Return ref-like object
                                        } catch (error) {
                                            console.error("Mock Firestore Add Error:", error);
                                            throw new Error(`Failed to add document: ${error.message}`);
                                        }
                                    },
                                    
                                    doc: function(subDocId) {
                                        console.log(`Mock Firestore: Accessing history doc ${subDocId}`);
                                        
                                        try {
                                            // Find the specific document in the history data
                                            const docData = this._historyData.find(item => item.id === subDocId);
                                            
                                            return {
                                                get: () => Promise.resolve({
                                                    exists: !!docData,
                                                    id: subDocId,
                                                    data: () => docData
                                                }),
                                                set: (data) => {
                                                    console.log("Mock Firestore: Setting document data", data);
                                                    const index = this._historyData.findIndex(item => item.id === subDocId);
                                                    
                                                    if (index !== -1) {
                                                        this._historyData[index] = { ...data, id: subDocId };
                                                    } else {
                                                        this._historyData.push({ ...data, id: subDocId });
                                                    }
                                                    
                                                    return Promise.resolve();
                                                },
                                                update: (data) => {
                                                    console.log("Mock Firestore: Updating document data", data);
                                                    const index = this._historyData.findIndex(item => item.id === subDocId);
                                                    
                                                    if (index !== -1) {
                                                        this._historyData[index] = { ...this._historyData[index], ...data };
                                                    } else {
                                                        console.warn(`Mock Firestore: Cannot update non-existent document ${subDocId}`);
                                                    }
                                                    
                                                    return Promise.resolve();
                                                },
                                                delete: () => {
                                                    console.log(`Mock Firestore: Deleting document ${subDocId}`);
                                                    const index = this._historyData.findIndex(item => item.id === subDocId);
                                                    
                                                    if (index !== -1) {
                                                        this._historyData.splice(index, 1);
                                                    } else {
                                                        console.warn(`Mock Firestore: Cannot delete non-existent document ${subDocId}`);
                                                    }
                                                    
                                                    return Promise.resolve();
                                                }
                                            };
                                        } catch (error) {
                                            console.error(`Mock Firestore Doc Error for ${subDocId}:`, error);
                                            return {
                                                get: () => Promise.reject(new Error(`Failed to get document: ${error.message}`)),
                                                set: () => Promise.reject(new Error(`Failed to set document: ${error.message}`)),
                                                update: () => Promise.reject(new Error(`Failed to update document: ${error.message}`)),
                                                delete: () => Promise.reject(new Error(`Failed to delete document: ${error.message}`))
                                            };
                                        }
                                    }
                                };
                                
                                return historyCollectionRef;
                            } else {
                                // --- Fallback for other subcollections ---
                                console.warn(`Mock Firestore: Using generic mock for subcollection: ${subCollectionPath}`);
                                
                                // Ensure fallback also returns a chainable object
                                const fallbackQuery = {
                                    orderBy: function() { return this; },
                                    where: function() { return this; },
                                    limit: function() { return this; },
                                    get: () => Promise.resolve({ empty: true, size: 0, docs: [], forEach: () => {} }),
                                    doc: (subDocId) => ({
                                        get: () => Promise.resolve({ exists: false, id: subDocId, data: () => undefined }),
                                        set: (data) => Promise.resolve(),
                                        update: (data) => Promise.resolve(),
                                        delete: () => Promise.resolve()
                                    }),
                                    add: (data) => Promise.resolve({ id: 'mock-generic-doc-id' })
                                };
                                
                                return fallbackQuery;
                            }
                        },
                        
                        get: () => {
                            try {
                                return Promise.resolve({
                                    exists: true,
                                    id: docId,
                                    data: () => {
                                        if (collectionName === 'users' && docId === 'mock-user-id') {
                                            return mockData.users[docId];
                                        }
                                        return { name: 'Mock Document' };
                                    }
                                });
                            } catch (error) {
                                console.error(`Mock Firestore Get Error for ${collectionPath}/${docId}:`, error);
                                return Promise.reject(new Error(`Failed to get document: ${error.message}`));
                            }
                        },
                        
                        set: (data, options) => {
                            try {
                                console.log(`Mock Firestore: Setting document ${docId} in ${collectionPath}`, data);
                                
                                if (collectionName === 'users' && docId === 'mock-user-id') {
                                    // Merge with existing data if options.merge is true
                                    if (options && options.merge) {
                                        mockData.users[docId] = { ...mockData.users[docId], ...data };
                                    } else {
                                        mockData.users[docId] = data;
                                    }
                                }
                                
                                return Promise.resolve();
                            } catch (error) {
                                console.error(`Mock Firestore Set Error for ${collectionPath}/${docId}:`, error);
                                return Promise.reject(new Error(`Failed to set document: ${error.message}`));
                            }
                        },
                        
                        update: (data) => {
                            try {
                                console.log(`Mock Firestore: Updating document ${docId} in ${collectionPath}`, data);
                                
                                if (collectionName === 'users' && docId === 'mock-user-id') {
                                    mockData.users[docId] = { ...mockData.users[docId], ...data };
                                }
                                
                                return Promise.resolve();
                            } catch (error) {
                                console.error(`Mock Firestore Update Error for ${collectionPath}/${docId}:`, error);
                                return Promise.reject(new Error(`Failed to update document: ${error.message}`));
                            }
                        }
                    };
                },
                
                add: (data) => {
                    try {
                        console.log(`Mock Firestore: Adding document to ${collectionPath}`, data);
                        const newId = `mock-doc-${Date.now()}`;
                        return Promise.resolve({ id: newId });
                    } catch (error) {
                        console.error(`Mock Firestore Add Error for ${collectionPath}:`, error);
                        return Promise.reject(new Error(`Failed to add document: ${error.message}`));
                    }
                },
                
                where: () => ({
                    get: () => {
                        try {
                            return Promise.resolve({
                                empty: false,
                                docs: [
                                    {
                                        id: 'mock-doc-id',
                                        data: () => ({ name: 'Mock Document' }),
                                        exists: true
                                    }
                                ]
                            });
                        } catch (error) {
                            console.error(`Mock Firestore Where Query Error for ${collectionPath}:`, error);
                            return Promise.reject(new Error(`Failed to execute query: ${error.message}`));
                        }
                    }
                })
            };
        }
    };
}

// Make function available globally
window.initializeFirebaseMock = initializeFirebaseMock;