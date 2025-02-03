# Loading States Implementation

## Overview
This module implements loading state indicators and management across the application to provide visual feedback during asynchronous operations.

## Implementation Steps

### 1. Loading State Controller
Implements core loading state management and indicator display.

class LoadingStateController {
    constructor() {
        this.activeStates = new Map();
        this.config = {
            minDuration: 500,
            timeout: 30000,
            showDelay: 200
        };
    }

    startLoading(elementId, options = {}) {
        const startTime = Date.now();
        const settings = { ...this.config, ...options };

        const state = {
            startTime,
            settings,
            timeoutId: setTimeout(() => this.handleTimeout(elementId), settings.timeout),
            showDelayId: setTimeout(() => this.showLoader(elementId), settings.showDelay)
        };

        this.activeStates.set(elementId, state);
        return this.createLoadingPromise(elementId);
    }

    stopLoading(elementId) {
        const state = this.activeStates.get(elementId);
        if (!state) return;

        const elapsed = Date.now() - state.startTime;
        const remaining = Math.max(0, state.settings.minDuration - elapsed);

        setTimeout(() => {
            this.cleanupLoadingState(elementId);
        }, remaining);
    }

    private showLoader(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.classList.add('loading');
        this.createLoadingIndicator(element);
    }

    private cleanupLoadingState(elementId) {
        const state = this.activeStates.get(elementId);
        if (!state) return;

        clearTimeout(state.timeoutId);
        clearTimeout(state.showDelayId);
        
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove('loading');
            element.querySelector('.loading-indicator')?.remove();
        }

        this.activeStates.delete(elementId);
    }
}

### 2. Skeleton Loading Implementation
Creates placeholder content during loading states.

class SkeletonLoader {
    constructor() {
        this.skeletonTemplates = new Map();
        this.activeSkeletons = new Set();
    }

    registerTemplate(name, template) {
        this.skeletonTemplates.set(name, template);
    }

    showSkeleton(elementId, templateName) {
        const element = document.getElementById(elementId);
        const template = this.skeletonTemplates.get(templateName);
        
        if (!element || !template) return;

        // Store original content
        element.dataset.originalContent = element.innerHTML;
        
        // Create and insert skeleton
        const skeleton = this.createSkeleton(template);
        element.innerHTML = '';
        element.appendChild(skeleton);
        
        this.activeSkeletons.add(elementId);
        element.classList.add('skeleton-loading');
    }

    hideSkeleton(elementId) {
        const element = document.getElementById(elementId);
        if (!element || !this.activeSkeletons.has(elementId)) return;

        // Restore original content
        if (element.dataset.originalContent) {
            element.innerHTML = element.dataset.originalContent;
            delete element.dataset.originalContent;
        }

        element.classList.remove('skeleton-loading');
        this.activeSkeletons.delete(elementId);
    }

    private createSkeleton(template) {
        const skeleton = document.createElement('div');
        skeleton.className = 'skeleton-wrapper';
        skeleton.innerHTML = template;
        return skeleton;
    }
}

### 3. Progress Indicator System
Manages progress bars and spinners for loading feedback.

class ProgressIndicator {
    constructor() {
        this.indicators = new Map();
    }

    createProgressBar(elementId, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        
        const progress = document.createElement('div');
        progress.className = 'progress';
        
        progressBar.appendChild(progress);
        element.appendChild(progressBar);

        this.indicators.set(elementId, {
            element: progressBar,
            progress: progress,
            value: 0,
            options
        });
    }

    updateProgress(elementId, value) {
        const indicator = this.indicators.get(elementId);
        if (!indicator) return;

        const clampedValue = Math.max(0, Math.min(100, value));
        indicator.value = clampedValue;
        
        requestAnimationFrame(() => {
            indicator.progress.style.width = `${clampedValue}%`;
            
            if (clampedValue >= 100) {
                this.handleComplete(elementId);
            }
        });
    }

    private handleComplete(elementId) {
        const indicator = this.indicators.get(elementId);
        if (!indicator) return;

        indicator.element.classList.add('complete');
        
        setTimeout(() => {
            this.removeProgressBar(elementId);
        }, 1000);
    }

    private removeProgressBar(elementId) {
        const indicator = this.indicators.get(elementId);
        if (!indicator) return;

        indicator.element.remove();
        this.indicators.delete(elementId);
    }
}

### 4. Loading Overlay Manager
Handles full-screen and partial loading overlays.

class LoadingOverlay {
    constructor() {
        this.overlays = new Map();
        this.defaultConfig = {
            blur: true,
            spinner: true,
            text: 'Loading...',
            transparent: false
        };
    }

    show(targetId = 'body', config = {}) {
        const target = targetId === 'body' ? document.body : document.getElementById(targetId);
        if (!target) return;

        const settings = { ...this.defaultConfig, ...config };
        
        const overlay = this.createOverlay(settings);
        target.appendChild(overlay);
        
        requestAnimationFrame(() => {
            overlay.classList.add('visible');
        });

        this.overlays.set(targetId, overlay);
    }

    hide(targetId = 'body') {
        const overlay = this.overlays.get(targetId);
        if (!overlay) return;

        overlay.classList.remove('visible');
        
        overlay.addEventListener('transitionend', () => {
            overlay.remove();
            this.overlays.delete(targetId);
        });
    }

    private createOverlay(config) {
        const overlay = document.createElement('div');
        overlay.className = `loading-overlay ${config.transparent ? 'transparent' : ''}`;
        
        if (config.blur) {
            overlay.classList.add('blur');
        }

        if (config.spinner) {
            const spinner = document.createElement('div');
            spinner.className = 'spinner';
            overlay.appendChild(spinner);
        }

        if (config.text) {
            const text = document.createElement('div');
            text.className = 'loading-text';
            text.textContent = config.text;
            overlay.appendChild(text);
        }

        return overlay;
    }
}

## Required CSS
Styles for loading indicators and animations.

## Testing Requirements
1. Loading State Transitions
   - Smooth appearance/disappearance
   - Proper timing
   - Animation performance

2. Skeleton Loading
   - Placeholder appearance
   - Animation smoothness
   - Content replacement

3. Progress Indicators
   - Accurate progress display
   - Animation performance
   - State transitions

## Success Criteria
- Smooth loading transitions
- Clear visual feedback
- Consistent behavior
- Performance optimization

## Next Steps
1. Implement responsive fixes
2. Add animation enhancements
3. Optimize performance

## Resources
- Loading State Patterns
- Animation Guidelines
- Performance Best Practices