// api/send-whatsapp.js - Send WhatsApp message via Fonnte

const { sendWhatsAppMessage } = require('../utils/fonnte');
const { logActivity } = require('../utils/logger');

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { phoneNumber, message, title, type = 'notification' } = req.body;

  // Validate required fields
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!message && !title) {
    return res.status(400).json({ error: 'Message or title is required' });
  }

  // Format phone number
  let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (formattedNumber.startsWith('0')) {
    formattedNumber = '62' + formattedNumber.substring(1);
  }
  if (!formattedNumber.startsWith('62')) {
    formattedNumber = '62' + formattedNumber;
  }

  // Build full message
  let fullMessage = '';
  if (title) {
    fullMessage = `*${title}*\n\n${message || ''}`;
  } else {
    fullMessage = message;
  }

  // Add footer
  fullMessage += '\n\n---\n📱 Sistem Absensi IoT - Real-time';

  try {
    // Send WhatsApp message
    const result = await sendWhatsAppMessage(formattedNumber, fullMessage);

    // Log the activity
    await logActivity({
      action: 'send_whatsapp',
      type: type,
      phoneNumber: formattedNumber,
      status: result.status ? 'success' : 'failed',
      timestamp: Date.now(),
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    if (result.status) {
      return res.json({
        success: true,
        message: 'WhatsApp message sent successfully',
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send WhatsApp message'
      });
    }
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    
    await logActivity({
      action: 'send_whatsapp',
      type: type,
      phoneNumber: formattedNumber,
      status: 'failed',
      error: error.message,
      timestamp: Date.now(),
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};