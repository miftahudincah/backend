// index.js - Main Express Server for Sistem Absensi IoT
// Backend API untuk WhatsApp, Upload, dan Logging

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ======================= MIDDLEWARE =======================

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression
app.use(compression());

// CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Stricter rate limit for WhatsApp endpoints
const whatsappLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500, // limit each IP to 500 WhatsApp requests per hour
  message: { error: 'WhatsApp rate limit exceeded. Please try again later.' },
});

// ======================= HEALTH CHECK =======================

app.get('/', (req, res) => {
  res.json({
    name: 'Sistem Absensi IoT API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: 'GET /api/health',
      sendWhatsApp: 'POST /api/send-whatsapp',
      sendReminder: 'POST /api/send-reminder',
      upload: 'POST /api/upload',
      logs: 'GET /api/logs',
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// ======================= API ROUTES =======================

// Import route handlers
const sendWhatsAppHandler = require('./api/send-whatsapp');
const sendReminderHandler = require('./api/send-reminder');
const uploadHandler = require('./api/upload');
const logsHandler = require('./api/logs');
const healthHandler = require('./api/health');

// Register routes
app.post('/api/send-whatsapp', whatsappLimiter, sendWhatsAppHandler);
app.post('/api/send-reminder', whatsappLimiter, sendReminderHandler);
app.post('/api/upload', uploadHandler);
app.get('/api/logs', logsHandler);
app.get('/api/health', healthHandler);

// ======================= ERROR HANDLING =======================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    error: message,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ======================= START SERVER =======================

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 WhatsApp API: POST /api/send-whatsapp`);
    console.log(`📤 Upload API: POST /api/upload`);
    console.log(`📊 Logs API: GET /api/logs`);
  });
}

// Export for Vercel
module.exports = app;