/**
 * Tests for ValidationPanelManager
 */

// Import the module under test
// Note: In a real implementation, we would import the module directly
// but for this test, we'll use the global class defined in setup.js

describe('ValidationPanelManager', () => {
  let panelManager;
  let mockManagers;
  
  // Setup before each test
  beforeEach(() => {
    // Create mock managers
    mockManagers = {
      feedManager: {
        navigateToRow: jest.fn()
      },
      errorManager: {
        showError: jest.fn()
      },
      loadingManager: {
        showLoading: jest.fn(),
        hideLoading: jest.fn()
      },
      monitor: {
        logOperation: jest.fn(),
        logError: jest.fn()
      }
    };
    
    // Create a fresh instance for each test
    panelManager = new ValidationPanelManager(mockManagers);
  });
  
  // Test constructor
  describe('constructor', () => {
    test('should initialize with provided managers', () => {
      expect(panelManager.managers).toBe(mockManagers);
      expect(panelManager.activeValidationPanel).toBeNull();
    });
    
    test('should warn if feedManager is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      new ValidationPanelManager({});
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('FeedManager not provided'));
    });
    
    test('should warn if errorManager is not provided', () => {
      const consoleSpy = jest.spyOn(console, 'warn');
      new ValidationPanelManager({ feedManager: {} });
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('ErrorManager not provided'));
    });
  });
  
  // Test handleViewDetails method
  describe('handleViewDetails', () => {
    test('should create and display a validation panel', () => {
      // Mock createValidationPanel
      panelManager.createValidationPanel = jest.fn(() => {
        const panel = document.createElement('div');
        panel.style = {};
        return panel;
      });
      
      // Mock setupRowNavigation
      panelManager.setupRowNavigation = jest.fn();
      
      const feedId = 'test-feed-id';
      const validationData = {
        isValid: true,
        issues: []
      };
      
      panelManager.handleViewDetails(feedId, validationData);
      
      expect(panelManager.createValidationPanel).toHaveBeenCalledWith(feedId, validationData);
      expect(panelManager.setupRowNavigation).toHaveBeenCalled();
      expect(panelManager.activeValidationPanel).not.toBeNull();
    });
    
    test('should close existing panel before creating a new one', () => {
      // Create a mock active panel
      const mockPanel = {
        remove: jest.fn(),
        style: {}
      };
      panelManager.activeValidationPanel = mockPanel;
      
      // Mock createValidationPanel
      panelManager.createValidationPanel = jest.fn(() => {
        const panel = document.createElement('div');
        panel.style = {};
        return panel;
      });
      
      // Mock setupRowNavigation
      panelManager.setupRowNavigation = jest.fn();
      
      panelManager.handleViewDetails('test-feed-id', { isValid: true, issues: [] });
      
      expect(mockPanel.remove).toHaveBeenCalled();
      expect(panelManager.activeValidationPanel).not.toBe(mockPanel);
    });
    
    test('should exit if panel creation fails', () => {
      // Mock createValidationPanel to return null
      panelManager.createValidationPanel = jest.fn(() => null);
      
      // Mock setupRowNavigation
      panelManager.setupRowNavigation = jest.fn();
      
      panelManager.handleViewDetails('test-feed-id', { isValid: true, issues: [] });
      
      expect(panelManager.setupRowNavigation).not.toHaveBeenCalled();
      expect(panelManager.activeValidationPanel).toBeNull();
    });
  });
  
  // Test createValidationPanel method
  describe('createValidationPanel', () => {
    test('should create a panel with validation data', () => {
      // Mock formatValidationIssues
      panelManager.formatValidationIssues = jest.fn(() => '<div>Mock issues</div>');
      
      // Mock groupIssuesByRow
      panelManager.groupIssuesByRow = jest.fn(() => ({}));
      
      // Mock makeDraggable
      panelManager.makeDraggable = jest.fn();
      
      const feedId = 'test-feed-id';
      const data = {
        isValid: true,
        issues: []
      };
      
      const panel = panelManager.createValidationPanel(feedId, data);
      
      expect(panel).toBeDefined();
      expect(panel.className).toContain('floating-validation-panel');
      expect(panel.dataset.feedId).toBe(feedId);
      expect(panelManager.formatValidationIssues).toHaveBeenCalled();
      expect(panelManager.makeDraggable).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(panel);
    });
    
    test('should return null if data is invalid', () => {
      const result = panelManager.createValidationPanel('test-feed-id', null);
      
      expect(result).toBeNull();
      expect(mockManagers.errorManager.showError).toHaveBeenCalled();
    });
    
    test('should handle close button click', () => {
      // Mock formatValidationIssues
      panelManager.formatValidationIssues = jest.fn(() => '<div>Mock issues</div>');
      
      // Mock groupIssuesByRow
      panelManager.groupIssuesByRow = jest.fn(() => ({}));
      
      // Mock makeDraggable
      panelManager.makeDraggable = jest.fn();
      
      // Mock querySelector to return a close button
      const mockCloseBtn = {
        onclick: null
      };
      document.createElement = jest.fn(() => {
        const element = {
          className: '',
          style: {},
          dataset: {},
          innerHTML: '',
          querySelector: jest.fn(() => mockCloseBtn),
          remove: jest.fn()
        };
        return element;
      });
      
      const panel = panelManager.createValidationPanel('test-feed-id', { isValid: true, issues: [] });
      panelManager.activeValidationPanel = panel;
      
      // Trigger the close button click
      mockCloseBtn.onclick();
      
      expect(panel.remove).toHaveBeenCalled();
      expect(panelManager.activeValidationPanel).toBeNull();
    });
  });
  
  // Test createAndShowSummaryPanel method
  describe('createAndShowSummaryPanel', () => {
    test('should create and display a summary panel', () => {
      // Mock makeDraggable
      panelManager.makeDraggable = jest.fn();
      
      const historyId = 'test-history-id';
      const historyData = {
        timestamp: new Date(),
        feedId: 'test-feed-id',
        isValid: true,
        totalProducts: 100,
        validProducts: 100,
        summary: {
          totalIssues: 0,
          errorCount: 0,
          warningCount: 0,
          titleIssues: 0,
          descriptionIssues: 0,
          otherIssues: 0
        }
      };
      
      panelManager.createAndShowSummaryPanel(historyId, historyData);
      
      expect(panelManager.activeValidationPanel).not.toBeNull();
      expect(panelManager.makeDraggable).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalled();
    });
    
    test('should close existing panel before creating a new one', () => {
      // Create a mock active panel
      const mockPanel = {
        remove: jest.fn()
      };
      panelManager.activeValidationPanel = mockPanel;
      
      // Mock makeDraggable
      panelManager.makeDraggable = jest.fn();
      
      panelManager.createAndShowSummaryPanel('test-history-id', {
        timestamp: new Date(),
        feedId: 'test-feed-id',
        isValid: true,
        summary: {}
      });
      
      expect(mockPanel.remove).toHaveBeenCalled();
      expect(panelManager.activeValidationPanel).not.toBe(mockPanel);
    });
  });
  
  // Test setupRowNavigation method
  describe('setupRowNavigation', () => {
    test('should set up click handlers for row links', () => {
      // Create a mock panel with row links
      const mockLinks = [
        { dataset: { row: '1' }, onclick: null, closest: jest.fn(() => ({ querySelector: jest.fn(() => ({ dataset: { field: 'title' } })) })) },
        { dataset: { row: '2' }, onclick: null, closest: jest.fn(() => ({ querySelector: jest.fn(() => ({ dataset: { field: 'description' } })) })) }
      ];
      
      const mockPanel = {
        querySelectorAll: jest.fn(() => mockLinks)
      };
      
      panelManager.setupRowNavigation(mockPanel);
      
      // Trigger the first link's click handler
      const mockEvent = { preventDefault: jest.fn() };
      mockLinks[0].onclick(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockManagers.feedManager.navigateToRow).toHaveBeenCalledWith(1, 'title');
    });
    
    test('should handle invalid row indices', () => {
      // Create a mock panel with an invalid row link
      const mockLinks = [
        { dataset: { row: 'not-a-number' }, onclick: null, closest: jest.fn(() => ({ querySelector: jest.fn(() => ({ dataset: { field: 'title' } })) })) }
      ];
      
      const mockPanel = {
        querySelectorAll: jest.fn(() => mockLinks)
      };
      
      panelManager.setupRowNavigation(mockPanel);
      
      // Trigger the link's click handler
      const mockEvent = { preventDefault: jest.fn() };
      mockLinks[0].onclick(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockManagers.feedManager.navigateToRow).not.toHaveBeenCalled();
    });
    
    test('should handle missing feedManager', () => {
      // Remove feedManager
      panelManager.managers.feedManager = null;
      
      // Create a mock panel with row links
      const mockLinks = [
        { dataset: { row: '1' }, onclick: null, closest: jest.fn(() => ({ querySelector: jest.fn(() => ({ dataset: { field: 'title' } })) })) }
      ];
      
      const mockPanel = {
        querySelectorAll: jest.fn(() => mockLinks)
      };
      
      panelManager.setupRowNavigation(mockPanel);
      
      // Trigger the link's click handler
      const mockEvent = { preventDefault: jest.fn() };
      mockLinks[0].onclick(mockEvent);
      
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      // Should not throw an error
    });
  });
  
  // Test makeDraggable method
  describe('makeDraggable', () => {
    test('should make an element draggable by its header', () => {
      // Create a mock element with a header
      const mockHeader = {
        addEventListener: jest.fn(),
        style: {}
      };
      
      const mockElement = {
        querySelector: jest.fn(() => mockHeader),
        style: {},
        getBoundingClientRect: jest.fn(() => ({ width: 300, height: 200 }))
      };
      
      panelManager.makeDraggable(mockElement);
      
      expect(mockHeader.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockHeader.style.cursor).toBe('grab');
    });
    
    test('should do nothing if header is not found', () => {
      // Create a mock element without a header
      const mockElement = {
        querySelector: jest.fn(() => null)
      };
      
      panelManager.makeDraggable(mockElement);
      
      // No error should be thrown
    });
  });
  
  // Test formatValidationIssues method
  describe('formatValidationIssues', () => {
    test('should format validation issues for display', () => {
      const issues = [
        { rowIndex: 1, field: 'title', type: 'warning', message: 'Title too short' },
        { rowIndex: 2, field: 'description', type: 'error', message: 'Description missing' }
      ];
      
      const issuesByRow = {
        '1': [issues[0]],
        '2': [issues[1]]
      };
      
      const result = panelManager.formatValidationIssues(issues, issuesByRow);
      
      expect(result).toContain('GMC Validation Issues');
      expect(result).toContain('Row 1');
      expect(result).toContain('Row 2');
      expect(result).toContain('Title too short');
      expect(result).toContain('Description missing');
    });
    
    test('should show a message when no issues are found', () => {
      const result = panelManager.formatValidationIssues([]);
      
      expect(result).toContain('No issues found');
    });
    
    test('should recalculate issuesByRow if not provided', () => {
      // Mock groupIssuesByRow
      panelManager.groupIssuesByRow = jest.fn(() => ({
        '1': [{ rowIndex: 1, field: 'title', type: 'warning', message: 'Title too short' }]
      }));
      
      const issues = [
        { rowIndex: 1, field: 'title', type: 'warning', message: 'Title too short' }
      ];
      
      panelManager.formatValidationIssues(issues);
      
      expect(panelManager.groupIssuesByRow).toHaveBeenCalledWith(issues);
    });
  });
  
  // Test groupIssuesByRow method
  describe('groupIssuesByRow', () => {
    test('should group issues by row index', () => {
      const issues = [
        { rowIndex: 1, field: 'title', type: 'warning', message: 'Title too short' },
        { rowIndex: 1, field: 'description', type: 'error', message: 'Description missing' },
        { rowIndex: 2, field: 'title', type: 'warning', message: 'Title too generic' }
      ];
      
      const result = panelManager.groupIssuesByRow(issues);
      
      expect(Object.keys(result)).toHaveLength(2);
      expect(result['1']).toHaveLength(2);
      expect(result['2']).toHaveLength(1);
    });
    
    test('should handle issues without row index', () => {
      const issues = [
        { field: 'title', type: 'warning', message: 'Title too short' }
      ];
      
      const result = panelManager.groupIssuesByRow(issues);
      
      expect(Object.keys(result)).toHaveLength(1);
      expect(result['unknown']).toHaveLength(1);
    });
    
    test('should return empty object for null issues', () => {
      const result = panelManager.groupIssuesByRow(null);
      
      expect(result).toEqual({});
    });
  });
  
  // Test countIssuesByType method
  describe('countIssuesByType', () => {
    test('should count issues by type', () => {
      const issues = [
        { rowIndex: 1, field: 'title', type: 'warning', message: 'Title too short' },
        { rowIndex: 2, field: 'title', type: 'warning', message: 'Title too generic' },
        { rowIndex: 3, field: 'description', type: 'error', message: 'Description missing' }
      ];
      
      const titleCount = panelManager.countIssuesByType(issues, 'title');
      const descriptionCount = panelManager.countIssuesByType(issues, 'description');
      
      expect(titleCount).toBe(2);
      expect(descriptionCount).toBe(1);
    });
    
    test('should count exclusive issues by type', () => {
      const issues = [
        { rowIndex: 1, field: 'title', type: 'warning', message: 'Title too short' },
        { rowIndex: 2, field: 'title', type: 'warning', message: 'Title too generic' },
        { rowIndex: 2, field: 'description', type: 'error', message: 'Description missing' }
      ];
      
      // Mock groupIssuesByRow
      panelManager.groupIssuesByRow = jest.fn(() => ({
        '1': [issues[0]],
        '2': [issues[1], issues[2]]
      }));
      
      const exclusiveTitleCount = panelManager.countIssuesByType(issues, 'title', true);
      
      expect(exclusiveTitleCount).toBe(1); // Only row 1 has exclusively title issues
    });
    
    test('should return 0 for null issues', () => {
      const result = panelManager.countIssuesByType(null, 'title');
      
      expect(result).toBe(0);
    });
  });
  
  // Test countRowsWithBothIssues method
  describe('countRowsWithBothIssues', () => {
    test('should count rows with both title and description issues', () => {
      const issuesByRow = {
        '1': [
          { field: 'title', type: 'warning', message: 'Title too short' },
          { field: 'description', type: 'error', message: 'Description missing' }
        ],
        '2': [
          { field: 'title', type: 'warning', message: 'Title too generic' }
        ],
        '3': [
          { field: 'description', type: 'error', message: 'Description too short' }
        ]
      };
      
      const result = panelManager.countRowsWithBothIssues(issuesByRow);
      
      expect(result).toBe(1); // Only row 1 has both title and description issues
    });
    
    test('should return 0 for null issuesByRow', () => {
      const result = panelManager.countRowsWithBothIssues(null);
      
      expect(result).toBe(0);
    });
  });
});