# AdBrain Feed Manager: Pro Version Implementation Plan

## Overview

This document outlines the step-by-step implementation plan for transforming AdBrain Feed Manager into a freemium product with a single Pro tier. The plan focuses on "low-hanging fruit" features that leverage the existing Firebase infrastructure and can be implemented with minimal development effort.

- Please ignore the timeline estimates they are not correct. we will be going ahead and getting all of this implmented in a timely manner.
- Step 1: read all the important files of the codease first
- Step 2: validate and understand this plan and all the steps
- Step 3: Confirm that you will not or at very least be extremely careful whenever you are editing code that will effect the current functionality around feed valiation, fixing errors and modal fucntionality.
- Step 4: To connect fuctionality to my firebase account please let me know when we are there and what I will need to add and update to the database. 

## Phase 1: Foundation (Weeks 1-2)

### Week 1: Firebase Integration Setup

1. **Set Up Firebase Project Configuration**
   - Ensure Firebase project is properly configured for the extension
   - Set up appropriate security rules for Firestore
   - Configure Firebase Authentication for Pro user management

   ```javascript
   // Example Firebase initialization in background.js
   firebase.initializeApp({
     apiKey: "YOUR_API_KEY",
     authDomain: "adbrain-feed-manager.firebaseapp.com",
     projectId: "adbrain-feed-manager",
     storageBucket: "adbrain-feed-manager.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   });
   ```

2. **Create Data Models**
   - Design Firestore collections for:
     - User profiles
     - Validation history
     - Subscription status
     - User preferences

   ```javascript
   // Example Firestore data structure
   users/{userId}/
     profile: {
       email: string,
       name: string,
       createdAt: timestamp,
       subscriptionStatus: string, // "free" or "pro"
       subscriptionExpiry: timestamp
     }
     
   users/{userId}/validationHistory/{validationId}/
     timestamp: timestamp,
     feedId: string,
     totalProducts: number,
     validProducts: number,
     issues: array,
     summary: {
       titleIssues: number,
       descriptionIssues: number,
       otherIssues: number
     }
   ```

3. **Implement Authentication Flow**
   - Add sign-in/sign-up functionality
   - Create account management page
   - Implement subscription status checking

   ```javascript
   // Example authentication check
   function checkProAccess() {
     const user = firebase.auth().currentUser;
     if (!user) return false;
     
     return firebase.firestore()
       .collection('users')
       .doc(user.uid)
       .get()
       .then(doc => {
         const data = doc.data();
         return data.subscriptionStatus === 'pro' && 
                data.subscriptionExpiry.toDate() > new Date();
       });
   }
   ```

### Week 2: Validation History Storage

1. **Modify Validation Process**
   - Update `ValidationUIManager` to store results in Firebase
   - Add timestamp and user information to validation results
   - Implement history retrieval functionality

   ```javascript
   // Example validation storage
   async function storeValidationResults(feedId, results) {
     const user = firebase.auth().currentUser;
     if (!user) return;
     
     const validationRef = firebase.firestore()
       .collection('users')
       .doc(user.uid)
       .collection('validationHistory')
       .doc(); // Auto-generate ID
       
     await validationRef.set({
       timestamp: firebase.firestore.FieldValue.serverTimestamp(),
       feedId: feedId,
       totalProducts: results.totalProducts,
       validProducts: results.validProducts,
       issues: results.issues.slice(0, 500), // Limit for Firestore document size
       summary: {
         titleIssues: results.issues.filter(i => i.field === 'title').length,
         descriptionIssues: results.issues.filter(i => i.field === 'description').length,
         otherIssues: results.issues.filter(i => !['title', 'description'].includes(i.field)).length
       }
     });
     
     return validationRef.id;
   }
   ```

2. **Create Validation History UI**
   - Design and implement a validation history page
   - Add filtering and sorting options
   - Implement history limit for free users (7 days)

   ```html
   <!-- Example validation history UI -->
   <div class="history-container">
     <h2>Validation History</h2>
     <div class="history-filters">
       <select id="historySort">
         <option value="newest">Newest First</option>
         <option value="oldest">Oldest First</option>
         <option value="issues">Most Issues</option>
       </select>
     </div>
     <div id="historyList" class="history-list">
       <!-- Dynamically populated -->
     </div>
     <div class="upgrade-prompt" id="historyLimitPrompt">
       <p>Free accounts can only access the last 7 days of history.</p>
       <button class="upgrade-button">Upgrade to Pro</button>
     </div>
   </div>
   ```

3. **Implement Feature Gating**
   - Create a system to check subscription status
   - Limit features based on subscription
   - Add upgrade prompts for gated features

   ```javascript
   // Example feature gating
   async function checkFeatureAccess(featureName) {
     const user = firebase.auth().currentUser;
     if (!user) return false;
     
     // Free features available to all
     const freeFeatures = ['basic_validation', 'manual_correction', 'search_filter'];
     if (freeFeatures.includes(featureName)) return true;
     
     // Pro features require subscription check
     const proFeatures = ['full_history', 'scheduled_validation', 'bulk_export', 'custom_rules'];
     if (proFeatures.includes(featureName)) {
       return checkProAccess();
     }
     
     return false;
   }
   ```

## Phase 2: Core Pro Features (Weeks 3-6)

### Week 3-4: Scheduled Validation

1. **Set Up Cloud Functions**
   - Create Firebase Cloud Functions for scheduled validation
   - Implement authentication and security checks
   - Set up error handling and logging

   ```javascript
   // Example Cloud Function (scheduled-validation.js)
   const functions = require('firebase-functions');
   const admin = require('firebase-admin');
   admin.initializeApp();

   exports.runScheduledValidations = functions.pubsub
     .schedule('every 24 hours')
     .onRun(async context => {
       const db = admin.firestore();
       const now = admin.firestore.Timestamp.now();
       
       // Get all users with active schedules
       const usersSnapshot = await db.collection('users')
         .where('subscriptionStatus', '==', 'pro')
         .where('scheduledValidation.enabled', '==', true)
         .get();
       
       const validationPromises = [];
       usersSnapshot.forEach(userDoc => {
         const userData = userDoc.data();
         const userId = userDoc.id;
         
         // Check if it's time to run validation for this user
         const schedule = userData.scheduledValidation;
         if (shouldRunValidation(schedule, now)) {
           validationPromises.push(runValidationForUser(userId, schedule));
         }
       });
       
       await Promise.all(validationPromises);
       return null;
     });
   ```

2. **Create Schedule Configuration UI**
   - Add UI for users to configure validation schedule
   - Implement frequency options (daily, weekly)
   - Add email notification preferences

   ```html
   <!-- Example schedule configuration UI -->
   <div class="schedule-config">
     <h3>Scheduled Validation</h3>
     <div class="pro-feature-badge">PRO</div>
     
     <div class="form-group">
       <label>
         <input type="checkbox" id="enableSchedule" />
         Enable scheduled validation
       </label>
     </div>
     
     <div class="form-group">
       <label>Frequency</label>
       <select id="scheduleFrequency">
         <option value="daily">Daily</option>
         <option value="weekly">Weekly</option>
       </select>
     </div>
     
     <div class="form-group" id="weeklyOptions">
       <label>Day of Week</label>
       <select id="scheduleDayOfWeek">
         <option value="1">Monday</option>
         <option value="2">Tuesday</option>
         <option value="3">Wednesday</option>
         <option value="4">Thursday</option>
         <option value="5">Friday</option>
         <option value="6">Saturday</option>
         <option value="0">Sunday</option>
       </select>
     </div>
     
     <div class="form-group">
       <label>
         <input type="checkbox" id="enableEmailNotifications" />
         Send email notifications
       </label>
     </div>
     
     <button id="saveSchedule" class="modern-button">Save Schedule</button>
   </div>
   ```

3. **Implement Email Notifications**
   - Set up email templates for validation results
   - Configure Firebase for sending emails
   - Implement notification preferences

   ```javascript
   // Example email notification function
   async function sendValidationEmail(userId, validationId) {
     const db = admin.firestore();
     
     // Get user data
     const userDoc = await db.collection('users').doc(userId).get();
     const userData = userDoc.data();
     
     // Get validation data
     const validationDoc = await db.collection('users')
       .doc(userId)
       .collection('validationHistory')
       .doc(validationId)
       .get();
     const validationData = validationDoc.data();
     
     // Create email content
     const emailContent = {
       to: userData.email,
       template: {
         name: 'validation-results',
         data: {
           userName: userData.name,
           feedId: validationData.feedId,
           totalProducts: validationData.totalProducts,
           validProducts: validationData.validProducts,
           issueCount: validationData.issues.length,
           summaryUrl: `https://adbrain-feed-manager.web.app/validation/${validationId}`,
           timestamp: validationData.timestamp.toDate().toLocaleString()
         }
       }
     };
     
     // Send email
     return admin.firestore().collection('mail').add(emailContent);
   }
   ```

### Week 5-6: Bulk Export/Import

1. **Implement Bulk Export**
   - Create functionality to export validated feed with corrections
   - Support multiple export formats (CSV, XML)
   - Add export history tracking

   ```javascript
   // Example bulk export function
   async function exportFeedWithCorrections(feedData, format = 'csv') {
     // Apply all corrections from validation
     const correctedData = applyStoredCorrections(feedData);
     
     // Format the data
     let exportContent;
     if (format === 'csv') {
       exportContent = convertToCSV(correctedData);
     } else if (format === 'xml') {
       exportContent = convertToXML(correctedData);
     } else {
       throw new Error('Unsupported export format');
     }
     
     // Create download
     const blob = new Blob([exportContent], { type: getContentType(format) });
     const url = URL.createObjectURL(blob);
     
     // Trigger download
     const a = document.createElement('a');
     a.href = url;
     a.download = `corrected_feed_${new Date().toISOString().slice(0,10)}.${format}`;
     a.click();
     
     // Track export in Firebase
     if (firebase.auth().currentUser) {
       await trackExport(feedData.length, format);
     }
     
     return true;
   }
   ```

2. **Create Correction Templates**
   - Implement functionality to save correction patterns
   - Store templates in Firebase
   - Add template application to new feeds

   ```javascript
   // Example correction template storage
   async function saveCorrectionsAsTemplate(templateName, corrections) {
     const user = firebase.auth().currentUser;
     if (!user) throw new Error('User not authenticated');
     
     await firebase.firestore()
       .collection('users')
       .doc(user.uid)
       .collection('correctionTemplates')
       .add({
         name: templateName,
         created: firebase.firestore.FieldValue.serverTimestamp(),
         corrections: corrections,
         appliedCount: 0
       });
   }
   
   // Example template application
   async function applyTemplate(templateId, feedData) {
     const user = firebase.auth().currentUser;
     if (!user) throw new Error('User not authenticated');
     
     // Get template
     const templateDoc = await firebase.firestore()
       .collection('users')
       .doc(user.uid)
       .collection('correctionTemplates')
       .doc(templateId)
       .get();
       
     if (!templateDoc.exists) throw new Error('Template not found');
     
     const template = templateDoc.data();
     
     // Apply corrections
     const correctedData = feedData.map(item => {
       const corrections = template.corrections.filter(c => 
         matchesCorrectionPattern(item, c.pattern)
       );
       
       if (corrections.length > 0) {
         return applyCorrections(item, corrections);
       }
       
       return item;
     });
     
     // Update template usage count
     await templateDoc.ref.update({
       appliedCount: firebase.firestore.FieldValue.increment(1),
       lastApplied: firebase.firestore.FieldValue.serverTimestamp()
     });
     
     return correctedData;
   }
   ```

3. **Add Bulk Import UI**
   - Create UI for importing previous corrections
   - Implement template management interface
   - Add template application options

   ```html
   <!-- Example template management UI -->
   <div class="templates-manager">
     <h3>Correction Templates</h3>
     <div class="pro-feature-badge">PRO</div>
     
     <div class="templates-list" id="templatesList">
       <!-- Dynamically populated -->
     </div>
     
     <div class="template-actions">
       <button id="saveCurrentAsTemplate" class="modern-button">
         Save Current Corrections as Template
       </button>
     </div>
     
     <div class="template-form" id="newTemplateForm" style="display: none;">
       <div class="form-group">
         <label>Template Name</label>
         <input type="text" id="templateName" placeholder="e.g., Title Length Fixes" />
       </div>
       <div class="form-actions">
         <button id="saveTemplate" class="modern-button">Save</button>
         <button id="cancelTemplate" class="modern-button secondary">Cancel</button>
       </div>
     </div>
   </div>
   ```

## Phase 3: Enhanced Features (Weeks 7-10)

### Week 7-8: Custom Validation Rules

1. **Design Rule Configuration System**
   - Create data model for custom validation rules
   - Implement rule priority and conflict resolution
   - Add rule testing functionality

   ```javascript
   // Example custom rule structure
   const customRule = {
     id: 'custom-title-length',
     name: 'Custom Title Length',
     field: 'title',
     type: 'length',
     parameters: {
       min: 40,
       max: 120
     },
     priority: 1,
     enabled: true,
     created: firebase.firestore.FieldValue.serverTimestamp(),
     modified: firebase.firestore.FieldValue.serverTimestamp()
   };
   ```

2. **Implement Rule Editor UI**
   - Create interface for rule creation and editing
   - Add rule testing against sample data
   - Implement rule import/export

   ```html
   <!-- Example rule editor UI -->
   <div class="rule-editor">
     <h3>Custom Validation Rule</h3>
     
     <div class="form-group">
       <label>Rule Name</label>
       <input type="text" id="ruleName" placeholder="e.g., Strict Title Requirements" />
     </div>
     
     <div class="form-group">
       <label>Apply to Field</label>
       <select id="ruleField">
         <option value="title">Title</option>
         <option value="description">Description</option>
         <option value="price">Price</option>
         <option value="link">Link</option>
         <option value="image_link">Image Link</option>
       </select>
     </div>
     
     <div class="form-group">
       <label>Rule Type</label>
       <select id="ruleType">
         <option value="length">Length Requirement</option>
         <option value="pattern">Pattern Match</option>
         <option value="required_words">Required Words</option>
         <option value="forbidden_words">Forbidden Words</option>
       </select>
     </div>
     
     <!-- Dynamic parameters based on rule type -->
     <div id="ruleParameters"></div>
     
     <div class="form-group">
       <label>Priority</label>
       <select id="rulePriority">
         <option value="1">High</option>
         <option value="2" selected>Normal</option>
         <option value="3">Low</option>
       </select>
     </div>
     
     <div class="form-actions">
       <button id="saveRule" class="modern-button">Save Rule</button>
       <button id="testRule" class="modern-button secondary">Test Rule</button>
       <button id="cancelRule" class="modern-button secondary">Cancel</button>
     </div>
   </div>
   ```

3. **Integrate Custom Rules with Validator**
   - Modify validation engine to incorporate custom rules
   - Implement rule priority handling
   - Add custom rule results to validation output

   ```javascript
   // Example custom rule validation
   function validateWithCustomRules(product, standardRules, customRules) {
     // Start with standard validation
     let issues = validateWithStandardRules(product, standardRules);
     
     // Apply custom rules
     customRules.forEach(rule => {
       if (!rule.enabled) return;
       
       const fieldValue = product[rule.field];
       if (fieldValue === undefined) return;
       
       let isValid = true;
       let message = '';
       
       switch (rule.type) {
         case 'length':
           isValid = validateLength(fieldValue, rule.parameters);
           message = `${rule.field} must be between ${rule.parameters.min} and ${rule.parameters.max} characters`;
           break;
         case 'pattern':
           isValid = validatePattern(fieldValue, rule.parameters);
           message = `${rule.field} must match pattern: ${rule.parameters.pattern}`;
           break;
         // Other rule types...
       }
       
       if (!isValid) {
         // Check for existing issues with this field
         const existingIssueIndex = issues.findIndex(i => i.field === rule.field);
         
         // If there's an existing issue, only replace it if this rule has higher priority
         if (existingIssueIndex >= 0) {
           const existingIssue = issues[existingIssueIndex];
           if (existingIssue.rulePriority && existingIssue.rulePriority > rule.priority) {
             issues[existingIssueIndex] = {
               field: rule.field,
               message: message,
               type: 'error',
               rulePriority: rule.priority,
               ruleId: rule.id
             };
           }
         } else {
           // No existing issue, add this one
           issues.push({
             field: rule.field,
             message: message,
             type: 'error',
             rulePriority: rule.priority,
             ruleId: rule.id
           });
         }
       }
     });
     
     return issues;
   }
   ```

### Week 9-10: Validation Snapshots

1. **Implement Snapshot System**
   - Create data model for validation snapshots
   - Add snapshot creation functionality
   - Implement snapshot comparison

   ```javascript
   // Example snapshot creation
   async function createValidationSnapshot(feedId, validationResults) {
     const user = firebase.auth().currentUser;
     if (!user) throw new Error('User not authenticated');
     
     // Create summary metrics
     const metrics = {
       totalProducts: validationResults.totalProducts,
       validProducts: validationResults.validProducts,
       issuesByType: {
         title: validationResults.issues.filter(i => i.field === 'title').length,
         description: validationResults.issues.filter(i => i.field === 'description').length,
         // Other fields...
       },
       validationScore: calculateValidationScore(validationResults)
     };
     
     // Store snapshot
     await firebase.firestore()
       .collection('users')
       .doc(user.uid)
       .collection('validationSnapshots')
       .add({
         feedId: feedId,
         created: firebase.firestore.FieldValue.serverTimestamp(),
         metrics: metrics,
         // Store a reference to the full validation results
         validationRef: firebase.firestore()
           .collection('users')
           .doc(user.uid)
           .collection('validationHistory')
           .doc(validationResults.id)
       });
   }
   ```

2. **Create Snapshot Comparison UI**
   - Design interface for comparing snapshots
   - Implement visualization of changes
   - Add trend analysis

   ```html
   <!-- Example snapshot comparison UI -->
   <div class="snapshot-comparison">
     <h3>Validation Comparison</h3>
     
     <div class="comparison-selectors">
       <div class="form-group">
         <label>Compare</label>
         <select id="snapshotBase">
           <!-- Dynamically populated -->
         </select>
       </div>
       
       <div class="comparison-vs">vs</div>
       
       <div class="form-group">
         <select id="snapshotCompare">
           <!-- Dynamically populated -->
         </select>
       </div>
     </div>
     
     <div class="comparison-results" id="comparisonResults">
       <!-- Dynamically populated -->
     </div>
     
     <div class="comparison-chart">
       <canvas id="comparisonChart"></canvas>
     </div>
   </div>
   ```

3. **Add Trend Analysis**
   - Implement trend visualization
   - Add progress tracking
   - Create improvement recommendations

   ```javascript
   // Example trend analysis
   async function analyzeValidationTrends(userId, limit = 10) {
     const snapshots = await firebase.firestore()
       .collection('users')
       .doc(userId)
       .collection('validationSnapshots')
       .orderBy('created', 'desc')
       .limit(limit)
       .get();
       
     const trendData = [];
     snapshots.forEach(doc => {
       const data = doc.data();
       trendData.push({
         id: doc.id,
         date: data.created.toDate(),
         validationScore: data.metrics.validationScore,
         validProducts: data.metrics.validProducts,
         totalProducts: data.metrics.totalProducts,
         issuesByType: data.metrics.issuesByType
       });
     });
     
     // Calculate trends
     const trends = {
       overallTrend: calculateOverallTrend(trendData),
       fieldTrends: {
         title: calculateFieldTrend(trendData, 'title'),
         description: calculateFieldTrend(trendData, 'description'),
         // Other fields...
       },
       recommendations: generateRecommendations(trendData)
     };
     
     return {
       snapshots: trendData,
       trends: trends
     };
   }
   ```

## Phase 4: Subscription Management (Weeks 11-12)

### Week 11: Payment Integration

1. **Set Up Payment Processing**
   - Integrate with payment processor (Stripe recommended)
   - Implement subscription creation and management
   - Add webhook handling for subscription events

   ```javascript
   // Example Stripe integration
   async function createSubscription(userId, paymentMethodId) {
     try {
       // Call your backend API to create subscription
       const response = await fetch('https://your-backend.com/create-subscription', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           userId: userId,
           paymentMethodId: paymentMethodId
         }),
       });
       
       const subscription = await response.json();
       
       // Update user's subscription status in Firestore
       await firebase.firestore()
         .collection('users')
         .doc(userId)
         .update({
           subscriptionStatus: 'pro',
           subscriptionId: subscription.id,
           subscriptionCreated: firebase.firestore.FieldValue.serverTimestamp(),
           subscriptionExpiry: new Date(subscription.current_period_end * 1000)
         });
         
       return subscription;
     } catch (error) {
       console.error('Error creating subscription:', error);
       throw error;
     }
   }
   ```

2. **Create Subscription UI**
   - Design subscription page
   - Implement payment form
   - Add subscription management options

   ```html
   <!-- Example subscription UI -->
   <div class="subscription-container">
     <h2>Upgrade to AdBrain Pro</h2>
     
     <div class="subscription-plans">
       <div class="plan-card pro-plan">
         <div class="plan-header">
           <h3>Pro Plan</h3>
           <div class="plan-price">
             <span class="price">$9.99</span>
             <span class="period">/ month</span>
           </div>
         </div>
         
         <div class="plan-features">
           <ul>
             <li>Unlimited validation history</li>
             <li>Scheduled validation</li>
             <li>Bulk export/import</li>
             <li>Custom validation rules</li>
             <li>Validation snapshots</li>
           </ul>
         </div>
         
         <div class="plan-cta">
           <button id="subscribePro" class="modern-button">Subscribe Now</button>
         </div>
       </div>
       
       <div class="plan-card annual-plan">
         <div class="plan-header">
           <h3>Annual Plan</h3>
           <div class="plan-price">
             <span class="price">$99.99</span>
             <span class="period">/ year</span>
           </div>
           <div class="plan-savings">Save 17%</div>
         </div>
         
         <div class="plan-features">
           <ul>
             <li>All Pro features</li>
             <li>Priority support</li>
             <li>Early access to new features</li>
           </ul>
         </div>
         
         <div class="plan-cta">
           <button id="subscribeAnnual" class="modern-button">Subscribe Now</button>
         </div>
       </div>
     </div>
     
     <div id="paymentForm" class="payment-form" style="display: none;">
       <!-- Stripe Elements will be inserted here -->
       <div id="card-element"></div>
       <div id="card-errors"></div>
       
       <div class="payment-actions">
         <button id="submitPayment" class="modern-button">Complete Subscription</button>
         <button id="cancelPayment" class="modern-button secondary">Cancel</button>
       </div>
     </div>
   </div>
   ```

### Week 12: Pro UI Integration

1. **Add Pro Badge and Indicators**
   - Implement Pro badge on user profile
   - Add Pro feature indicators throughout UI
   - Create upgrade prompts for free users

   ```html
   <!-- Example Pro badge -->
   <div class="user-profile">
     <div class="user-info">
       <img src="{{userPhotoUrl}}" alt="{{userName}}" class="user-avatar" />
       <div class="user-details">
         <div class="user-name">{{userName}}</div>
         <div class="user-email">{{userEmail}}</div>
       </div>
     </div>
     
     <div class="user-subscription">
       <div class="pro-badge">PRO</div>
       <div class="subscription-expiry">Renews on {{subscriptionRenewalDate}}</div>
     </div>
   </div>
   
   <!-- Example upgrade prompt -->
   <div class="upgrade-prompt">
     <div class="prompt-icon">⭐</div>
     <div class="prompt-content">
       <h4>Unlock Pro Features</h4>
       <p>Get scheduled validation, custom rules, and more with AdBrain Pro.</p>
     </div>
     <button class="upgrade-button">Upgrade Now</button>
   </div>
   ```

2. **Implement Feature Gating UI**
   - Add UI for locked features
   - Implement upgrade prompts
   - Create seamless upgrade flow

   ```javascript
   // Example feature gating UI
   function updateUIForSubscriptionStatus() {
     const proFeatures = document.querySelectorAll('.pro-feature');
     
     checkProAccess().then(isPro => {
       if (isPro) {
         // User has Pro access
         document.body.classList.add('is-pro-user');
         
         // Enable all Pro features
         proFeatures.forEach(feature => {
           feature.classList.remove('feature-locked');
           
           // Remove any existing upgrade prompts
           const prompt = feature.querySelector('.feature-upgrade-prompt');
           if (prompt) prompt.remove();
           
           // Enable any disabled controls
           feature.querySelectorAll('.pro-control[disabled]').forEach(control => {
             control.disabled = false;
           });
         });
       } else {
         // User has free access
         document.body.classList.remove('is-pro-user');
         
         // Lock Pro features
         proFeatures.forEach(feature => {
           feature.classList.add('feature-locked');
           
           // Add upgrade prompt if not already present
           if (!feature.querySelector('.feature-upgrade-prompt')) {
             const prompt = document.createElement('div');
             prompt.className = 'feature-upgrade-prompt';
             prompt.innerHTML = `
               <p>This is a Pro feature</p>
               <button class="upgrade-button">Upgrade Now</button>
             `;
             feature.appendChild(prompt);
           }
           
           // Disable controls
           feature.querySelectorAll('.pro-control').forEach(control => {
             control.disabled = true;
           });
         });
         
         // Add click handlers to all upgrade buttons
         document.querySelectorAll('.upgrade-button').forEach(button => {
           button.addEventListener('click', () => {
             navigateToSubscriptionPage();
           });
         });
       }
     });
   }
   ```

3. **Final Testing and Launch**
   - Conduct comprehensive testing of all Pro features
   - Test subscription flow and payment processing
   - Prepare for launch with documentation and support

## Launch Checklist

- [ ] All Pro features implemented and tested
- [ ] Subscription management system working correctly
- [ ] Payment processing tested with real transactions
- [ ] Feature gating properly implemented
- [ ] Upgrade prompts added throughout the UI
- [ ] Documentation updated for Pro features
- [ ] Support system in place for Pro users
- [ ] Analytics tracking implemented for conversion monitoring
- [ ] Marketing materials prepared for launch

## Post-Launch Monitoring

After launching the Pro version, monitor these key metrics:

1. **Conversion Rate**: Percentage of free users upgrading to Pro
2. **Retention Rate**: Percentage of Pro users renewing their subscription
3. **Feature Usage**: Which Pro features are most used
4. **User Feedback**: Collect and analyze feedback on Pro features
5. **Support Requests**: Monitor common issues and questions

Adjust the Pro offering based on this data to maximize value and retention.

## Implementation Log

### April 5, 2025

**Completed Task:** Firebase Foundation Setup (Phase 1, Week 1 - Initial Structure)

**Summary:**
*   Reviewed key codebase files (`popup.js`, `login.js`, `gmc/api.js`, `validation_ui_manager.js`, `status_bar_manager.js`, `background.js`, `manifest.json`, etc.) and the monetization plan.
*   Added Firebase initialization to `src/background/background.js` using the provided project configuration and the namespaced SDK style for consistency.
*   Created a new `AuthManager` class (`lib/auth/auth_manager.js`) to centralize authentication logic, initially handling GMC auth state.
*   Refactored `src/popup/login.js`, `src/popup/status_bar_manager.js`, and `src/popup/popup.js` to instantiate and use `AuthManager` for GMC authentication and status display, replacing direct calls to `GMCApi` where appropriate.
*   Defined placeholder Firestore data models in `lib/firebase/models.js` based on the monetization plan.

**Current State:**
The basic structure for Firebase integration is in place. Firebase is initialized, and an `AuthManager` exists to coordinate authentication, though Firebase Auth functionality is not yet implemented. Existing GMC authentication flow remains functional through the `AuthManager`.

**Next Steps (For Next Agent):**
1.  **Implement Firebase Authentication Flow:**
    *   Import the Firebase Auth SDK in `src/background/background.js`.
    *   Implement the `signInWithFirebase()` and `signOutFirebase()` methods within `lib/auth/auth_manager.js` using Firebase Authentication (e.g., Google Sign-In Popup).
    *   Implement `handleFirebaseStateChange` in `AuthManager` to update internal state and potentially trigger Pro status checks.
    *   Modify the UI (likely starting with `src/popup/login.html` and `src/popup/login.js`, or potentially adding elements to `src/popup/popup.html`) to offer Firebase sign-in/sign-up options alongside or instead of the current GMC-only flow.
    *   Ensure `AuthManager` correctly reports the combined auth state (`gmcAuthenticated`, `firebaseAuthenticated`).
2.  **Implement Pro Status Check:**
    *   Import the Firebase Firestore SDK in `src/background/background.js`.
    *   Implement the `checkProStatus()` method in `AuthManager` to query Firestore (e.g., `users/{userId}/profile`) based on the logged-in Firebase user's UID to determine if `subscriptionStatus` is 'pro'.
    *   Update `AuthManager` state (`isProUser`) based on the Firestore check.
    *   Update `StatusBarManager` to visually indicate Pro status if `authState.isProUser` is true.

**Files Modified/Created:**
*   `src/background/background.js` (Modified)
*   `lib/auth/auth_manager.js` (Created)
*   `src/popup/login.js` (Modified)
*   `src/popup/status_bar_manager.js` (Modified)
*   `src/popup/popup.js` (Modified)
*   `lib/firebase/models.js` (Created)

### April 6, 2025 (Agent: Roo)

**Completed Tasks:**
*   **Firebase Authentication Flow (Phase 1, Week 1):**
    *   Imported Firebase Auth SDK (`background.js`).
    *   Implemented `signInWithFirebase`, `signOutFirebase`, `handleFirebaseStateChange` in `AuthManager`.
    *   Added Firebase sign-in button and logic to `login.html`/`login.js`.
*   **Pro Status Check (Phase 1, Week 1):**
    *   Imported Firebase Firestore SDK (`background.js`).
    *   Implemented `checkProStatus` in `AuthManager` to query Firestore (`users/{userId}`).
    *   Updated `StatusBarManager` to display "(PRO)" status.
*   **Validation History Storage (Phase 1, Week 2):**
    *   Modified `ValidationUIManager` to save validation results (summary + limited issues) to Firestore (`users/{userId}/validationHistory`).
    *   Added `loadValidationHistoryFromFirestore` to retrieve history.
    *   Updated history UI in `popup.html` with controls (sort, refresh).
    *   Implemented sorting logic (Newest/Oldest) in `ValidationUIManager` and `popup.js`.
    *   Implemented 7-day history limit and upgrade prompt for free users.
    *   Implemented "View Summary" button logic (fetches summary from Firestore, displays in panel).
*   **Scheduled Validation UI (Phase 2, Week 3-4):**
    *   Added "Settings" tab and UI section in `popup.html` for schedule configuration.
    *   Created `SettingsManager` (`settings_manager.js`) to handle UI logic, load/save settings to Firestore (`users/{userId}` document, `scheduledValidation` field), and apply Pro feature gating.
    *   Integrated `SettingsManager` into `popup.js`.
*   **Bulk Export/Import UI Setup (Phase 2, Week 5-6):**
    *   Added UI section to Feed Preview tab (`popup.html`) for export buttons and template management.
    *   Created `BulkActionsManager` (`bulk_actions_manager.js`) with basic structure, event listeners, and Pro feature gating.
    *   Implemented basic `handleExport` logic using `FeedManager.getCorrectedTableData` and refined CSV/XML conversion helpers.
    *   Implemented template save/load/delete logic using Firestore (`users/{userId}/correctionTemplates`). Added placeholder `FeedManager.getAppliedCorrections`. `handleApplyTemplate` remains a placeholder.
*   **Custom Validation Rules Setup (Phase 3, Week 7-8):**
    *   Created `CustomRuleValidator` structure (`src/lib/validation/custom_rule_validator.js`) with `fetchCustomRules` (fetches enabled rules from Firestore) and placeholder `validate` method.
    *   Integrated `CustomRuleValidator` into `popup.js`.
    *   Modified `ValidationUIManager.triggerGMCValidation` to orchestrate calling both `GMCValidator` and `CustomRuleValidator` (for Pro users) and merging results.
    *   Added Custom Rules UI section and basic Rule Editor form to Settings tab (`popup.html`).
    *   Updated `SettingsManager` to manage the Rule Editor UI (add/edit/delete placeholders, load rules list, gating). Implemented `saveRule` and `deleteRule` Firestore logic.

**Current State:**
Firebase authentication, Pro status checking, validation history storage/retrieval (with summary view), scheduled validation configuration UI, bulk export (basic), and correction template management (save/load/delete) are implemented. Custom rule validation structure is in place but rule application logic is pending.

**Identified Issue:** Core feed preview functionality is reportedly broken.

---

## Debugging Tasks (April 6, 2025)

**Issue:** User reports that the core functionality of selecting a file and previewing the feed in the table (`FeedManager.handlePreview`) is broken after recent changes.

**Goal:** Restore the feed preview functionality.

**Potential Areas to Investigate (Based on Code Comparison):**

1.  **`PopupManager` Instantiation & Dependencies (`popup.js`):**
    *   Verify that `FeedManager` is instantiated correctly *after* all its dependencies (`loadingManager`, `errorManager`, `searchManager`, `monitor`, `validationUIManager`) are available in the shared `managers` object. Check for potential race conditions or incorrect passing of dependencies.
    *   Compare the complex manager instantiation in the current `popup.js` with the simpler structure in the backup `GitHub-Working/popup.js`.
2.  **`FeedManager` Event Listeners (`feed_manager.js`):**
    *   Confirm the event listeners for `#fileInput` (change) and `#previewFeed` (click) are being set up correctly in `FeedManager.setupEventListeners`.
    *   Ensure these elements exist in `popup.html` and their IDs haven't changed.
3.  **`handlePreview` Logic (`feed_manager.js`):**
    *   Step through the `handlePreview` method. Is it being called? Is `readFileAsText` working? Is `parseCSV` throwing an error? Is `displayPreview` failing? Add console logs if necessary.
    *   Compare the current `handlePreview`, `readFileAsText`, `parseCSV`, and `displayPreview` methods with the backup versions for any subtle changes.
4.  **DOM Structure (`popup.html`):**
    *   Double-check that the `#fileInput`, `#previewFeed`, and `#previewContent` elements still exist with the correct IDs and structure expected by `FeedManager`.
5.  **Removed `gmcApi.initialize()` (`popup.js`):**
    *   While unlikely to directly affect file reading/parsing, consider if any part of the UI update or manager interaction within the preview flow indirectly relied on `gmcApi` being initialized earlier in the old flow.
6.  **Cross-Manager Interactions:**
    *   Could an error in `ValidationUIManager` (now a dependency of `FeedManager`) be preventing `FeedManager` from working correctly? Check console for errors originating there.

**Recommendation:** Start by adding detailed logging within `FeedManager.handlePreview` and its helper methods (`readFileAsText`, `parseCSV`, `displayPreview`) in the current code to pinpoint where the process fails. Compare the instantiation logic in the current `popup.js` constructor carefully against the backup version.

---

**Next Steps (For Next Agent):**

1.  **Debug Feed Preview:** Address the "Debugging Tasks" outlined above to restore the core feed preview functionality. Prioritize getting `FeedManager.handlePreview` working correctly.
2.  **Resume Feature Implementation:** Once the preview is fixed, continue with the Custom Validation Rules feature:
    *   Implement dynamic parameter UI (`SettingsManager.updateRuleParametersUI`).
    *   Implement loading rule data into editor (`SettingsManager.showRuleEditor`).
    *   Implement rule application logic (`CustomRuleValidator.validate`).
    *   OR: Proceed to Validation Snapshots (Phase 3, Week 9-10) if preferred.

---

### April 6, 2025 (Agent: Roo - Continued)

**Completed Tasks:**
*   **Firebase Authentication Flow (Phase 1, Week 1):**
    *   Imported Firebase Auth SDK (`background.js`).
    *   Implemented `signInWithFirebase`, `signOutFirebase`, `handleFirebaseStateChange` in `AuthManager`.
    *   Added Firebase sign-in button and logic to `login.html`/`login.js`.
*   **Pro Status Check (Phase 1, Week 1):**
    *   Imported Firebase Firestore SDK (`background.js`).
    *   Implemented `checkProStatus` in `AuthManager` to query Firestore (`users/{userId}`).
    *   Updated `StatusBarManager` to display "(PRO)" status.
*   **Validation History Storage (Phase 1, Week 2):**
    *   Modified `ValidationUIManager` to save validation results (summary + limited issues) to Firestore (`users/{userId}/validationHistory`).
    *   Added `loadValidationHistoryFromFirestore` to retrieve history.
    *   Updated history UI in `popup.html` with controls (sort, refresh).
    *   Implemented sorting logic (Newest/Oldest) in `ValidationUIManager` and `popup.js`.
    *   Implemented 7-day history limit and upgrade prompt for free users.
    *   Implemented "View Summary" button logic (fetches summary from Firestore, displays in panel).
*   **Scheduled Validation UI (Phase 2, Week 3-4):**
    *   Added "Settings" tab and UI section in `popup.html` for schedule configuration.
    *   Created `SettingsManager` (`settings_manager.js`) to handle UI logic, load/save settings to Firestore (`users/{userId}` document, `scheduledValidation` field), and apply Pro feature gating.
    *   Integrated `SettingsManager` into `popup.js`.
*   **Bulk Export/Import UI Setup (Phase 2, Week 5-6):**
    *   Added UI section to Feed Preview tab (`popup.html`) for export buttons and template management.
    *   Created `BulkActionsManager` (`bulk_actions_manager.js`) with basic structure, event listeners, and Pro feature gating.
    *   Implemented basic `handleExport` logic using `FeedManager.getCorrectedTableData` and refined CSV/XML conversion helpers.
    *   Implemented template save/load/delete logic using Firestore (`users/{userId}/correctionTemplates`). Added placeholder `FeedManager.getAppliedCorrections`. `handleApplyTemplate` remains a placeholder.
*   **Custom Validation Rules Setup (Phase 3, Week 7-8):**
    *   Created `CustomRuleValidator` structure (`src/lib/validation/custom_rule_validator.js`) with `fetchCustomRules` (fetches enabled rules from Firestore) and placeholder `validate` method.
    *   Integrated `CustomRuleValidator` into `popup.js`.
    *   Modified `ValidationUIManager.triggerGMCValidation` to orchestrate calling both `GMCValidator` and `CustomRuleValidator` (for Pro users) and merging results.
    *   Added Custom Rules UI section and basic Rule Editor form to Settings tab (`popup.html`).
    *   Updated `SettingsManager` to manage the Rule Editor UI (add/edit/delete placeholders, load rules list, gating). Implemented `saveRule` and `deleteRule` Firestore logic.
*   **Debugging & Refactoring (Manifest V3 Compatibility):**
    *   Identified "Could not connect to background service" error due to `getBackgroundPage` usage in `login.js`.
    *   Refactored `login.js` to use `chrome.runtime.sendMessage`.
    *   Refactored `background.js` to instantiate `AuthManager`/`GMCApi` and handle messages from popups.
    *   Identified "Unexpected token 'export'" errors due to global class definitions. Modified `GMCApi` and `AuthManager` to use `export class`. Removed global assignments.
    *   Refactored `popup.js` to remove direct `AuthManager`/`GMCApi` instantiation and use message passing (`getAuthState`, `authenticateGmc`, `logoutGmc`, `signOutFirebase`).
    *   Refactored `StatusBarManager` to accept auth state via method (`updateAuthState`) instead of direct manager dependency.
    *   Corrected various script loading paths in `login.html` and `popup.html` causing `ERR_FILE_NOT_FOUND`.
    *   Temporarily simplified `background.js` to diagnose service worker registration failure ("Status code: 3", "An unknown error occurred when fetching the script").
    *   Identified remaining `ERR_FILE_NOT_FOUND` for `custom_rule_validator.js` and `analyzer.js` in `popup.html` console.
    *   Corrected script paths in `popup.html` again using relative paths.

**Current State:**
Login screen (`login.html`) appears functional (communicates with minimal background script). Main popup (`popup.html`) fails to load core components due to script loading errors (`ERR_FILE_NOT_FOUND` for `custom_rule_validator.js` and `analyzer.js` reported in console), preventing `PopupManager` initialization. Background script (`background.js`) is currently minimal for debugging purposes. Core feed preview functionality is still broken.

---

## Debugging Tasks (April 6, 2025 - Updated)

**Issue:** Main popup (`popup.html`) fails to load, showing "Error: Extension failed to load core components...". Console shows `net::ERR_FILE_NOT_FOUND` for `custom_rule_validator.js` and `analyzer.js`, preventing `PopupManager` initialization. Core feed preview functionality is also broken (likely related or a separate issue). Login screen appears partially functional but cannot redirect to a working popup.

**Goal:** Resolve script loading errors in `popup.html` and restore core feed preview functionality.

**Potential Areas to Investigate:**

1.  **Script Paths in `popup.html`:**
    *   **Verify Paths Again:** Double-check the corrected relative paths for *all* scripts loaded in `popup.html` (lines ~323-338). Ensure paths like `../../lib/validation/analyzer.js` and `../../lib/validation/custom_rule_validator.js` accurately point to the files from the `src/popup/` directory. Pay attention to `../` vs `../../`.
    *   **File Existence:** Confirm that `analyzer.js` and `custom_rule_validator.js` actually exist at the expected locations (`lib/validation/`).
2.  **Script Content Errors:**
    *   Check `analyzer.js` and `custom_rule_validator.js` for any internal syntax errors or incorrect `export` statements that might prevent them from being parsed correctly, even if found.
3.  **Manifest `web_accessible_resources`:** While less common for scripts loaded directly by extension pages, ensure these scripts don't need to be listed here for some reason (unlikely but possible).
4.  **Feed Preview Issue (Once popup loads):**
    *   **Restore `background.js`:** Uncomment the imports and instantiation logic for `AuthManager` and `GMCApi`. Ensure the message handler logic is also restored correctly.
    *   **Trace `handlePreview`:** Add logging in `FeedManager.handlePreview` and its helpers (`readFileAsText`, `parseCSV`, `displayPreview`) to see where it fails.
    *   **Check Dependencies:** Ensure `FeedManager` receives all necessary managers correctly in `popup.js`.

**Recommendation:**
1.  Carefully re-verify the script paths in `popup.html` one more time, comparing against the actual file structure. Use `read_file` on `analyzer.js` and `custom_rule_validator.js` to confirm their content is valid JavaScript.
2.  Once `popup.html` loads without the "core components" error (even if the UI is empty/non-functional), restore the full code in `background.js`.
3.  Test login again. If successful, test the feed preview.
4.  If feed preview fails, add logging to `FeedManager` methods to diagnose.

---

**Next Steps (For Next Agent):**

1.  **Fix `popup.html` Script Loading:** Resolve the `ERR_FILE_NOT_FOUND` errors for `analyzer.js` and `custom_rule_validator.js` by correcting their paths in `popup.html`. Ensure all manager classes load correctly so `PopupManager` can initialize.
2.  **Restore `background.js`:** Uncomment the previously commented-out sections in `background.js` to restore imports, manager instantiation, and message handling logic.
3.  **Test Login & Popup Load:** Verify that login works and `popup.html` loads without the "core components" error.
4.  **Debug Feed Preview:** If login/popup load works, test the feed preview. If it fails, follow the debugging recommendations in the "Debugging Tasks" section above (add logging to `FeedManager`).
5.  **Resume Feature Implementation:** Once core functionality (login, popup load, feed preview) is restored, continue with the planned features (e.g., finishing Custom Validation Rules implementation or moving to Validation Snapshots).

---