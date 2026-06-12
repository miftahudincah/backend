// api/logs.js - Get and manage logs
// In-memory log storage (for demo, in production use database)

const { getLogs, clearLogs, getLogStats } = require('../utils/logger');

// In-memory log store (for Vercel serverless)
let logStore = [];
const MAX_LOGS = 1000;

function addLog(log) {
  logStore.unshift(log);
  if (logStore.length > MAX_LOGS) {
    logStore = logStore.slice(0, MAX_LOGS);
  }
}

function getAllLogs() {
  return [...logStore];
}

function clearAllLogs() {
  logStore = [];
}

function getLogStats() {
  const stats = {
    total: logStore.length,
    byAction: {},
    byStatus: {},
    last24Hours: 0,
    last7Days: 0
  };

  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  logStore.forEach(log => {
    // Count by action
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
    
    // Count by status
    const status = log.status || 'success';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    
    // Count by time
    if (log.timestamp && now - log.timestamp < oneDay) {
      stats.last24Hours++;
    }
    if (log.timestamp && now - log.timestamp < sevenDays) {
      stats.last7Days++;
    }
  });

  return stats;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, limit, startDate, endDate } = req.query;

  let logs = getAllLogs();

  // Filter by action
  if (action && action !== 'all') {
    logs = logs.filter(log => log.action === action);
  }

  // Filter by date range
  if (startDate) {
    const start = new Date(startDate).getTime();
    logs = logs.filter(log => log.timestamp >= start);
  }
  if (endDate) {
    const end = new Date(endDate).getTime();
    logs = logs.filter(log => log.timestamp <= end);
  }

  // Apply limit
  const limitNum = parseInt(limit) || 100;
  logs = logs.slice(0, limitNum);

  const stats = getLogStats();

  return res.json({
    success: true,
    stats: stats,
    total: logs.length,
    logs: logs
  });
};

// Export functions for use in other modules
module.exports.addLog = addLog;
module.exports.clearLogs = clearAllLogs;
module.exports.getLogs = getAllLogs;
module.exports.getLogStats = getLogStats;