# UI Enhancements Overview

## Overview
This module implements UI improvements and enhancements to provide a better user experience in the Sofie Feed Manager.

## Components

### 1. Loading State Manager
Handles loading states and indicators across the application.
class LoadingStateManager {
    constructor() {
        this.loadingStates = new Map();
        this.defaultConfig = {
            timeout: 30000,
            showDelay: 200,
            minimumDuration: 500
        };
    }

    startLoading(elementId, config = {}) {
        const settings = { ...this.defaultConfig, ...config };
        const startTime = Date.now();
        
        const loadingState = {
            elementId,
            startTime,
            settings,
            timeoutId: null,
            showDelayId: null
        };

        // Set timeout for loading state
        loadingState.timeoutId = setTimeout(() => {
            this.handleTimeout(elementId);
        }, settings.timeout);

        // Delayed showing of loading indicator
        loadingState.showDelayId = setTimeout(() => {
            this.showLoadingIndicator(elementId);
        }, settings.showDelay);

        this.loadingStates.set(elementId, loadingState);
    }

    stopLoading(elementId) {
        const state = this.loadingStates.get(elementId);
        if (!state) return;

        const elapsed = Date.now() - state.startTime;
        const remaining = Math.max(0, state.settings.minimumDuration - elapsed);

        setTimeout(() => {
            this.cleanupLoadingState(elementId);
        }, remaining);
    }

    private showLoadingIndicator(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.classList.add('loading');
        this.createSkeletonLoader(element);
    }

    private createSkeletonLoader(element) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-loader';
        element.appendChild(skeleton);
    }

    private handleTimeout(elementId) {
        this.stopLoading(elementId);
        // Emit timeout event or handle error
    }

    private cleanupLoadingState(elementId) {
        const state = this.loadingStates.get(elementId);
        if (!state) return;

        clearTimeout(state.timeoutId);
        clearTimeout(state.showDelayId);

        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('loading');
            const skeleton = element.querySelector('.skeleton-loader');
            if (skeleton) skeleton.remove();
        }

        this.loadingStates.delete(elementId);
    }
}

### 2. Responsive Layout System
Implements responsive design patterns and mobile-friendly layouts.
class ResponsiveLayoutManager {
    constructor() {
        this.breakpoints = {
            mobile: 480,
            tablet: 768,
            desktop: 1024,
            wide: 1200
        };
        
        this.currentBreakpoint = null;
        this.listeners = new Set();
        
        this.initialize();
    }

    initialize() {
        this.setupResizeObserver();
        this.checkBreakpoint();
        window.addEventListener('resize', this.debounce(this.checkBreakpoint.bind(this), 250));
    }

    setupResizeObserver() {
        const resizeObserver = new ResizeObserver(this.debounce(() => {
            this.checkBreakpoint();
        }, 250));
        
        resizeObserver.observe(document.body);
    }

    checkBreakpoint() {
        const width = window.innerWidth;
        let newBreakpoint = 'mobile';

        for (const [point, size] of Object.entries(this.breakpoints)) {
            if (width >= size) newBreakpoint = point;
        }

        if (this.currentBreakpoint !== newBreakpoint) {
            this.currentBreakpoint = newBreakpoint;
            this.notifyListeners();
        }
    }

    onBreakpointChange(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private notifyListeners() {
        this.listeners.forEach(callback => {
            callback(this.currentBreakpoint);
        });
    }

    private debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

### 3. UI Animation Manager
Manages transitions and animations for smoother user interactions.

class UIAnimationManager {
    constructor() {
        this.animations = new Map();
        this.defaultDuration = 300;
        this.defaultEasing = 'ease-in-out';
    }

    animate(elementId, properties, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) return Promise.reject(new Error('Element not found'));

        const settings = {
            duration: options.duration || this.defaultDuration,
            easing: options.easing || this.defaultEasing,
            delay: options.delay || 0
        };

        const animation = element.animate(properties, settings);
        this.animations.set(elementId, animation);

        return new Promise((resolve, reject) => {
            animation.onfinish = () => {
                this.animations.delete(elementId);
                resolve();
            };
            animation.onerror = reject;
        });
    }

    fadeIn(elementId, options = {}) {
        return this.animate(elementId, [
            { opacity: 0, transform: 'translateY(-10px)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], options);
    }

    fadeOut(elementId, options = {}) {
        return this.animate(elementId, [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(10px)' }
        ], options);
    }

    cancelAnimation(elementId) {
        const animation = this.animations.get(elementId);
        if (animation) {
            animation.cancel();
            this.animations.delete(elementId);
        }
    }
}

### 4. Header Behavior Controller
Controls sticky header behavior and scroll interactions.

class HeaderBehaviorController {
    constructor() {
        this.header = document.querySelector('.sticky-header');
        this.lastScrollPosition = window.scrollY;
        this.ticking = false;
        this.threshold = 50;
        
        this.initialize();
    }

    initialize() {
        if (!this.header) return;
        
        window.addEventListener('scroll', () => {
            if (!this.ticking) {
                window.requestAnimationFrame(() => {
                    this.updateHeaderState();
                    this.ticking = false;
                });
                this.ticking = true;
            }
        });

        this.setupResizeHandler();
    }

    updateHeaderState() {
        const currentScroll = window.scrollY;
        
        // Add sticky class when scrolled past threshold
        if (currentScroll > this.threshold) {
            this.header.classList.add('sticky');
            
            // Hide header when scrolling down, show when scrolling up
            if (currentScroll > this.lastScrollPosition) {
                this.header.classList.add('header-hidden');
            } else {
                this.header.classList.remove('header-hidden');
            }
        } else {
            this.header.classList.remove('sticky');
        }
        
        this.lastScrollPosition = currentScroll;
    }

    setupResizeHandler() {
        const resizeObserver = new ResizeObserver(this.debounce(() => {
            this.updateHeaderPosition();
        }, 250));
        
        resizeObserver.observe(this.header);
    }

    updateHeaderPosition() {
        const headerHeight = this.header.offsetHeight;
        document.body.style.paddingTop = `${headerHeight}px`;
    }

    private debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

## Implementation Files
1. `loading-states.js` - Loading indicator implementation
2. `responsive-layout.js` - Responsive design handlers
3. `ui-animations.js` - Animation controllers
4. `header-behavior.js` - Header interaction management

## Dependencies
- CSS Animation Library
- Responsive Grid System
- UI Component Library
- Event Management System

## Key Features
1. Loading States
   - Progress indicators
   - Skeleton loading
   - State transitions
   - Loading overlays

2. Responsive Design
   - Mobile-first approach
   - Breakpoint management
   - Flexible layouts
   - Touch interactions

3. Animations
   - Smooth transitions
   - Loading animations
   - Error state animations
   - Feedback animations

4. Header Behavior
   - Sticky positioning
   - Scroll awareness
   - Responsive adjustments
   - State management

## Technical Requirements
- Modern CSS support
- JavaScript animation capabilities
- Touch event handling
- Responsive design support

## Success Criteria
- Smooth loading transitions
- Responsive on all devices
- Consistent animations
- Improved user feedback

## Next Steps
1. Implement Loading States (01_loading_states.md)
2. Add Responsive Fixes (02_responsive_fixes.md)
3. Enhance UI Animations
4. Optimize Header Behavior

## Resources
- Animation Guidelines
- Responsive Design Patterns
- Loading State Best Practices
- Mobile UX Guidelines