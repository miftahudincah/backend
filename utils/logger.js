// utils/logger.js - Logging utility for backend

// In-memory log store (for serverless environment)
let logStore = [];
const MAX_LOGS = 2000;

/**
 * Add a log entry
 * @param {Object} logData - Log data
 * @returns {Promise<void>}
 */
async function logActivity(logData) {
  const logEntry = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    ...logData,
    timestamp: logData.timestamp || Date.now()
  };

  logStore.unshift(logEntry);
  
  // Keep only last MAX_LOGS entries
  if (logStore.length > MAX_LOGS) {
    logStore = logStore.slice(0, MAX_LOGS);
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[LOG] ${logEntry.action}:`, logEntry);
  }

  return logEntry;
}

/**
 * Get all logs
 * @returns {Array} Array of log entries
 */
function getLogs() {
  return [...logStore];
}

/**
 * Clear all logs
 */
function clearLogs() {
  logStore = [];
}

/**
 * Get log statistics
 * @returns {Object} Statistics
 */
function getLogStats() {
  const stats = {
    total: logStore.length,
    byAction: {},
    byHour: {},
    last24Hours: 0
  };

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  logStore.forEach(log => {
    // Count by action
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    
    // Count by hour
    const hour = new Date(log.timestamp).getHours();
    stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    
    // Count last 24 hours
    if (now - log.timestamp < oneDay) {
      stats.last24Hours++;
    }
  });

  return stats;
}

/**
 * Filter logs by criteria
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered logs
 */
function filterLogs(filters) {
  let logs = [...logStore];

  if (filters.action && filters.action !== 'all') {
    logs = logs.filter(log => log.action === filters.action);
  }

  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    logs = logs.filter(log => log.timestamp >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    logs = logs.filter(log => log.timestamp <= end);
  }

  if (filters.limit) {
    logs = logs.slice(0, parseInt(filters.limit));
  }

  return logs;
}

module.exports = {
  logActivity,
  getLogs,
  clearLogs,
  getLogStats,
  filterLogs
};