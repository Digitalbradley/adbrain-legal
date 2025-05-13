module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./tests/setup.js'],
  moduleDirectories: ['node_modules', 'src'],
  testMatch: ['**/tests/**/*.test.js'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    // Feed Manager modules
    'src/popup/csv_parser.js',
    'src/popup/status_manager.js',
    'src/popup/feed_display_manager.js',
    'src/popup/feed_coordinator.js',
    'src/popup/content_type_validator.js',
    // Validation modules
    'src/popup/validation_firebase_handler.js',
    'src/popup/validation_panel_manager.js',
    'src/popup/validation_issue_manager.js',
    'src/popup/validation_ui_manager.js',
    'src/popup/direct-validation-core.js',
    'src/popup/direct-validation-data.js',
    'src/popup/direct-validation-ui.js',
    'src/popup/direct-validation-history.js',
    'src/popup/direct-validation-tabs.js',
    'src/popup/direct-validation-loading.js',
    'src/popup/feature-flags.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};