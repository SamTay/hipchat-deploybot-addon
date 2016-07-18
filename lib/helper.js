/**
 * Helper object for random utilities
 * Currently only has debugging/logging methods
 */
var exports = {};

/**
 * Logs to console only in development mode
 */
exports.debug = function() {
  if (process.env.NODE_ENV == 'development' || process.env.LOG_LEVEL = 'debug') {
    console.log.apply(console, arguments);
  }
}

/**
 * Simple wrapper around console.error
 */
exports.error = function() {
  console.error.apply(console, arguments);
}

module.exports = exports;
