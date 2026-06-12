// api/health.js - Health check endpoint

const os = require('os');

module.exports = async (req, res) => {
  const startTime = Date.now();

  // Check Fonnte API connectivity (optional)
  let fonnteStatus = 'unknown';
  try {
    const fonnteApiKey = process.env.FONNTE_API_KEY;
    if (fonnteApiKey && fonnteApiKey !== 'your_fonnte_api_key_here') {
      fonnteStatus = 'configured';
    } else {
      fonnteStatus = 'not_configured';
    }
  } catch (error) {
    fonnteStatus = 'error';
  }

  // Check Supabase connectivity
  let supabaseStatus = 'unknown';
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
      supabaseStatus = 'configured';
    } else {
      supabaseStatus = 'not_configured';
    }
  } catch (error) {
    supabaseStatus = 'error';
  }

  const responseTime = Date.now() - startTime;

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: `${responseTime}ms`,
    environment: process.env.NODE_ENV || 'development',
    services: {
      fonnte: fonnteStatus,
      supabase: supabaseStatus,
      imgbb: process.env.IMGBB_KEY ? 'configured' : 'not_configured'
    },
    system: {
      platform: os.platform(),
      nodeVersion: process.version,
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB',
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
      }
    }
  });
};