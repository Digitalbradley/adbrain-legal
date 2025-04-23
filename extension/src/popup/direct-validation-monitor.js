/**
 * Direct Validation Monitoring Module
 *
 * This module provides monitoring and logging functionality for the direct validation
 * refactoring project. It tracks feature flag usage, errors, and performance metrics
 * to help identify issues during the gradual rollout.
 */

(function() {
  // Store error counts by module
  const errorCounts = {
    CORE: 0,
    DATA: 0,
    UI: 0,
    HISTORY: 0,
    TABS: 0,
    LOADING: 0,
    TOTAL: 0
  };

  // Store performance metrics
  const performanceMetrics = {
    validationTime: [],
    renderTime: [],
    totalTime: []
  };

  // Store feature flag usage
  const featureFlagUsage = {
    USE_NEW_CORE: 0,
    USE_NEW_DATA: 0,
    USE_NEW_UI: 0,
    USE_NEW_HISTORY: 0,
    USE_NEW_TABS: 0,
    USE_NEW_LOADING: 0,
    USE_NEW_ALL: 0
  };

  /**
   * Logs an error that occurred in a specific module
   * @param {string} module - The module where the error occurred (CORE, DATA, UI, etc.)
   * @param {Error} error - The error object
   * @param {Object} context - Additional context about the error
   */
  function logError(module, error, context = {}) {
    console.error(`[DIRECT-MONITOR] Error in ${module} module:`, error, context);
    
    // Increment error count
    if (errorCounts[module] !== undefined) {
      errorCounts[module]++;
      errorCounts.TOTAL++;
    }
    
    // In a production environment, this would send telemetry data
    // to a monitoring service to track errors
    try {
      if (window.telemetry && typeof window.telemetry.logError === 'function') {
        window.telemetry.logError('direct_validation_error', {
          module: module,
          message: error.message,
          stack: error.stack,
          context: JSON.stringify(context),
          timestamp: new Date().toISOString(),
          userId: localStorage.getItem('dv-user-id') || 'unknown',
          featureFlags: JSON.stringify(window.DIRECT_VALIDATION_FLAGS)
        });
      }
    } catch (telemetryError) {
      console.error('[DIRECT-MONITOR] Error logging to telemetry:', telemetryError);
    }
    
    // Store error in localStorage for debugging
    try {
      const errors = JSON.parse(localStorage.getItem('dv-errors') || '[]');
      errors.push({
        module: module,
        message: error.message,
        timestamp: new Date().toISOString(),
        featureFlags: { ...window.DIRECT_VALIDATION_FLAGS }
      });
      
      // Keep only the last 50 errors
      if (errors.length > 50) {
        errors.shift();
      }
      
      localStorage.setItem('dv-errors', JSON.stringify(errors));
    } catch (storageError) {
      console.error('[DIRECT-MONITOR] Error storing error in localStorage:', storageError);
    }
  }

  /**
   * Logs a performance metric
   * @param {string} metric - The name of the metric (validationTime, renderTime, totalTime)
   * @param {number} value - The value of the metric in milliseconds
   * @param {Object} context - Additional context about the metric
   */
  function logPerformance(metric, value, context = {}) {
    console.log(`[DIRECT-MONITOR] Performance metric ${metric}:`, value, 'ms');
    
    // Store the metric
    if (performanceMetrics[metric] !== undefined) {
      performanceMetrics[metric].push(value);
      
      // Keep only the last 100 values
      if (performanceMetrics[metric].length > 100) {
        performanceMetrics[metric].shift();
      }
    }
    
    // In a production environment, this would send telemetry data
    // to a monitoring service to track performance
    try {
      if (window.telemetry && typeof window.telemetry.logMetric === 'function') {
        window.telemetry.logMetric('direct_validation_performance', {
          metric: metric,
          value: value,
          context: JSON.stringify(context),
          timestamp: new Date().toISOString(),
          userId: localStorage.getItem('dv-user-id') || 'unknown',
          featureFlags: JSON.stringify(window.DIRECT_VALIDATION_FLAGS)
        });
      }
    } catch (telemetryError) {
      console.error('[DIRECT-MONITOR] Error logging performance to telemetry:', telemetryError);
    }
    
    // Store performance metrics in localStorage for debugging
    try {
      localStorage.setItem('dv-performance', JSON.stringify(performanceMetrics));
    } catch (storageError) {
      console.error('[DIRECT-MONITOR] Error storing performance in localStorage:', storageError);
    }
  }

  /**
   * Logs feature flag usage
   * @param {string} flag - The name of the flag
   * @param {boolean} isEnabled - Whether the flag is enabled
   */
  function logFeatureFlag(flag, isEnabled) {
    console.log(`[DIRECT-MONITOR] Feature flag ${flag} is ${isEnabled ? 'enabled' : 'disabled'}`);
    
    // Increment usage count
    if (featureFlagUsage[flag] !== undefined) {
      featureFlagUsage[flag]++;
    }
    
    // In a production environment, this would send telemetry data
    // to a monitoring service to track feature flag usage
    try {
      if (window.telemetry && typeof window.telemetry.logEvent === 'function') {
        window.telemetry.logEvent('feature_flag_usage', {
          flag: flag,
          enabled: isEnabled,
          timestamp: new Date().toISOString(),
          userId: localStorage.getItem('dv-user-id') || 'unknown'
        });
      }
    } catch (telemetryError) {
      console.error('[DIRECT-MONITOR] Error logging feature flag usage to telemetry:', telemetryError);
    }
    
    // Store feature flag usage in localStorage for debugging
    try {
      localStorage.setItem('dv-feature-flag-usage', JSON.stringify(featureFlagUsage));
    } catch (storageError) {
      console.error('[DIRECT-MONITOR] Error storing feature flag usage in localStorage:', storageError);
    }
  }

  /**
   * Gets error statistics
   * @returns {Object} Error statistics
   */
  function getErrorStats() {
    return { ...errorCounts };
  }

  /**
   * Gets performance statistics
   * @returns {Object} Performance statistics
   */
  function getPerformanceStats() {
    const stats = {};
    
    // Calculate average, min, and max for each metric
    Object.keys(performanceMetrics).forEach(metric => {
      const values = performanceMetrics[metric];
      
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        stats[metric] = {
          avg: avg.toFixed(2),
          min: min.toFixed(2),
          max: max.toFixed(2),
          count: values.length
        };
      } else {
        stats[metric] = {
          avg: 0,
          min: 0,
          max: 0,
          count: 0
        };
      }
    });
    
    return stats;
  }

  /**
   * Gets feature flag usage statistics
   * @returns {Object} Feature flag usage statistics
   */
  function getFeatureFlagStats() {
    return { ...featureFlagUsage };
  }

  /**
   * Clears all monitoring data
   */
  function clearMonitoringData() {
    // Reset error counts
    Object.keys(errorCounts).forEach(key => {
      errorCounts[key] = 0;
    });
    
    // Reset performance metrics
    Object.keys(performanceMetrics).forEach(key => {
      performanceMetrics[key] = [];
    });
    
    // Reset feature flag usage
    Object.keys(featureFlagUsage).forEach(key => {
      featureFlagUsage[key] = 0;
    });
    
    // Clear localStorage
    localStorage.removeItem('dv-errors');
    localStorage.removeItem('dv-performance');
    localStorage.removeItem('dv-feature-flag-usage');
    
    console.log('[DIRECT-MONITOR] Monitoring data cleared');
  }

  // Export functions to global scope
  window.DirectValidationMonitor = {
    logError: logError,
    logPerformance: logPerformance,
    logFeatureFlag: logFeatureFlag,
    getErrorStats: getErrorStats,
    getPerformanceStats: getPerformanceStats,
    getFeatureFlagStats: getFeatureFlagStats,
    clearMonitoringData: clearMonitoringData
  };
})();