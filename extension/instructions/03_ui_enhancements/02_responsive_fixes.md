# Responsive Fixes Implementation

## Overview
This module implements responsive design fixes and enhancements to ensure optimal display across all device sizes.

## Implementation Steps

### 1. Responsive Layout Manager
Handles responsive breakpoints and layout adjustments.
class ResponsiveLayoutManager {
    constructor() {
        this.breakpoints = {
            mobile: 480,
            tablet: 768,
            desktop: 1024,
            wide: 1440
        };
        
        this.currentBreakpoint = null;
        this.listeners = new Set();
        this.initialize();
    }

    initialize() {
        this.setupResizeObserver();
        this.checkBreakpoint();
        
        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.checkBreakpoint(), 100);
        });
    }

    setupResizeObserver() {
        const resizeObserver = new ResizeObserver(this.debounce(() => {
            this.checkBreakpoint();
            this.adjustLayouts();
        }, 250));
        
        resizeObserver.observe(document.body);
    }

    adjustLayouts() {
        const elements = document.querySelectorAll('[data-responsive]');
        elements.forEach(element => {
            const config = JSON.parse(element.dataset.responsive || '{}');
            this.applyResponsiveRules(element, config);
        });
    }

    private applyResponsiveRules(element, config) {
        const breakpoint = this.currentBreakpoint;
        const rules = config[breakpoint] || {};
        
        Object.entries(rules).forEach(([property, value]) => {
            element.style[property] = value;
        });
    }

    private debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

### 2. Mobile Navigation Handler
Implements mobile-friendly navigation and menu systems.

class MobileNavigationHandler {
    constructor() {
        this.nav = document.querySelector('.main-nav');
        this.toggle = document.querySelector('.nav-toggle');
        this.overlay = null;
        this.isOpen = false;
        this.swipeStartY = 0;
        this.swipeThreshold = 50;
        
        this.initialize();
    }

    initialize() {
        this.createOverlay();
        this.setupEventListeners();
        this.setupTouchHandlers();
    }

    setupEventListeners() {
        this.toggle?.addEventListener('click', () => this.toggleNavigation());
        
        // Close nav on route change
        window.addEventListener('popstate', () => this.closeNavigation());
        
        // Handle keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeNavigation();
            }
        });
    }

    setupTouchHandlers() {
        if (!this.nav) return;

        this.nav.addEventListener('touchstart', (e) => {
            this.swipeStartY = e.touches[0].clientY;
        });

        this.nav.addEventListener('touchmove', (e) => {
            const currentY = e.touches[0].clientY;
            const diff = currentY - this.swipeStartY;

            if (diff > this.swipeThreshold) {
                this.closeNavigation();
            }
        });
    }

    private createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'nav-overlay';
        this.overlay.addEventListener('click', () => this.closeNavigation());
        document.body.appendChild(this.overlay);
    }

    private toggleNavigation() {
        this.isOpen ? this.closeNavigation() : this.openNavigation();
    }

    private openNavigation() {
        this.isOpen = true;
        this.nav?.classList.add('open');
        this.overlay?.classList.add('visible');
        document.body.style.overflow = 'hidden';
    }

    private closeNavigation() {
        this.isOpen = false;
        this.nav?.classList.remove('open');
        this.overlay?.classList.remove('visible');
        document.body.style.overflow = '';
    }
}

### 3. Touch Interaction Manager
Manages touch-based interactions and gestures.

class TouchInteractionManager {
    constructor() {
        this.touchElements = new Map();
        this.gestureElements = new Map();
        this.initialize();
    }

    initialize() {
        this.setupTouchListeners();
        this.detectTouchCapability();
    }

    registerTouchElement(elementId, config = {}) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const touchConfig = {
            swipeThreshold: config.swipeThreshold || 50,
            longPressDelay: config.longPressDelay || 500,
            doubleTapDelay: config.doubleTapDelay || 300,
            handlers: config.handlers || {}
        };

        this.touchElements.set(elementId, {
            element,
            config: touchConfig,
            state: {
                startX: 0,
                startY: 0,
                lastTap: 0,
                longPressTimer: null
            }
        });

        this.attachTouchHandlers(elementId);
    }

    private attachTouchHandlers(elementId) {
        const { element, config, state } = this.touchElements.get(elementId);

        element.addEventListener('touchstart', (e) => {
            state.startX = e.touches[0].clientX;
            state.startY = e.touches[0].clientY;

            state.longPressTimer = setTimeout(() => {
                config.handlers.onLongPress?.(e);
            }, config.longPressDelay);
        });

        element.addEventListener('touchend', (e) => {
            clearTimeout(state.longPressTimer);
            this.handleTouchEnd(elementId, e);
        });

        element.addEventListener('touchmove', (e) => {
            this.handleTouchMove(elementId, e);
        });
    }

    private handleTouchEnd(elementId, event) {
        const { config, state } = this.touchElements.get(elementId);
        const now = Date.now();

        if (now - state.lastTap < config.doubleTapDelay) {
            config.handlers.onDoubleTap?.(event);
            state.lastTap = 0;
        } else {
            state.lastTap = now;
        }
    }

    private handleTouchMove(elementId, event) {
        const { config, state } = this.touchElements.get(elementId);
        const touch = event.touches[0];
        
        const deltaX = touch.clientX - state.startX;
        const deltaY = touch.clientY - state.startY;

        if (Math.abs(deltaX) > config.swipeThreshold) {
            const direction = deltaX > 0 ? 'right' : 'left';
            config.handlers.onSwipe?.(direction, event);
        }
    }

    private detectTouchCapability() {
        const isTouchDevice = 'ontouchstart' in window || 
            navigator.maxTouchPoints > 0;
        document.body.classList.toggle('touch-device', isTouchDevice);
    }
}

### 4. Responsive Table Handler
Implements responsive table layouts and mobile adaptations.

class ResponsiveTableHandler {
    constructor() {
        this.tables = new Map();
        this.breakpoint = 768; // Default mobile breakpoint
        this.initialize();
    }

    initialize() {
        this.findAndProcessTables();
        window.addEventListener('resize', this.debounce(() => {
            this.updateTables();
        }, 250));
    }

    findAndProcessTables() {
        document.querySelectorAll('table[data-responsive]').forEach(table => {
            this.processTable(table);
        });
    }

    processTable(table) {
        const tableId = table.id || `responsive-table-${Date.now()}`;
        table.id = tableId;

        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent);
        
        this.tables.set(tableId, {
            element: table,
            headers,
            originalHTML: table.innerHTML
        });

        this.updateTableLayout(tableId);
    }

    updateTableLayout(tableId) {
        const { element, headers } = this.tables.get(tableId);
        
        if (window.innerWidth < this.breakpoint) {
            this.convertToMobileLayout(element, headers);
        } else {
            this.restoreOriginalLayout(tableId);
        }
    }

    private convertToMobileLayout(table, headers) {
        const rows = Array.from(table.querySelectorAll('tr'));
        
        rows.forEach(row => {
            if (row.parentElement.tagName === 'THEAD') return;
            
            const cells = Array.from(row.querySelectorAll('td'));
            cells.forEach((cell, index) => {
                cell.setAttribute('data-label', headers[index]);
            });
        });

        table.classList.add('mobile-layout');
    }

    private restoreOriginalLayout(tableId) {
        const { element, originalHTML } = this.tables.get(tableId);
        element.innerHTML = originalHTML;
        element.classList.remove('mobile-layout');
    }

    private updateTables() {
        this.tables.forEach((_, tableId) => {
            this.updateTableLayout(tableId);
        });
    }

    private debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
}

## Required CSS
Styles for responsive layouts and mobile-first design.
/* Base Responsive Layout */
:root {
    --mobile-breakpoint: 480px;
    --tablet-breakpoint: 768px;
    --desktop-breakpoint: 1024px;
    --wide-breakpoint: 1440px;
}

/* Mobile First Base Styles */
body {
    font-size: 16px;
    line-height: 1.5;
    margin: 0;
    padding: 0;
}

/* Container */
.container {
    width: 100%;
    padding: 0 1rem;
    margin: 0 auto;
    box-sizing: border-box;
}

/* Responsive Grid System */
.grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
}

/* Mobile Navigation Styles */
.nav-toggle {
    display: block;
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
}

.main-nav {
    position: fixed;
    top: 0;
    left: -100%;
    width: 80%;
    height: 100vh;
    background: var(--nav-bg-color);
    transition: left 0.3s ease;
    z-index: 999;
}

.main-nav.open {
    left: 0;
}

.nav-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.nav-overlay.visible {
    display: block;
    opacity: 1;
}

/* Responsive Tables */
.table-responsive {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

table.mobile-layout {
    display: block;
}

table.mobile-layout tr {
    display: block;
    margin-bottom: 1rem;
    border: 1px solid var(--border-color);
}

table.mobile-layout td {
    display: block;
    padding: 0.5rem;
    text-align: right;
}

table.mobile-layout td::before {
    content: attr(data-label);
    float: left;
    font-weight: bold;
}

/* Breakpoint: Tablet (768px) */
@media (min-width: 768px) {
    .container {
        max-width: 720px;
    }

    .grid {
        grid-template-columns: repeat(8, 1fr);
    }

    .nav-toggle {
        display: none;
    }

    .main-nav {
        position: static;
        width: auto;
        height: auto;
    }
}

/* Breakpoint: Desktop (1024px) */
@media (min-width: 1024px) {
    .container {
        max-width: 960px;
    }

    .grid {
        grid-template-columns: repeat(12, 1fr);
    }
}

/* Breakpoint: Wide (1440px) */
@media (min-width: 1440px) {
    .container {
        max-width: 1320px;
    }
}

/* Touch Interactions */
.touch-device .clickable {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.touch-device .swipeable {
    touch-action: pan-y;
    user-select: none;
}

/* Loading States */
@media (max-width: 767px) {
    .loading-overlay {
        padding: 1rem;
    }

    .loading-indicator {
        transform: scale(0.8);
    }
}

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}

## Testing Requirements
1. Breakpoint Testing
   - Mobile devices
   - Tablets
   - Desktop screens
   - Large displays

2. Touch Interactions
   - Gesture recognition
   - Touch feedback
   - Mobile scrolling

3. Layout Transitions
   - Smooth adaptations
   - Content reflow
   - Navigation changes

## Success Criteria
- Smooth responsive transitions
- Consistent mobile experience
- Touch-friendly interactions
- Proper content scaling

## Next Steps
1. Implement performance optimizations
2. Add touch gesture enhancements
3. Optimize mobile layouts

## Resources
- Responsive Design Patterns
- Mobile UX Guidelines
- Touch Interface Best Practices