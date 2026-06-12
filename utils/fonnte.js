// utils/fonnte.js - Fonnte API integration for WhatsApp

const axios = require('axios');

const FONNTE_API_URL = 'https://api.fonnte.com/send';

/**
 * Send WhatsApp message via Fonnte API
 * @param {string} phoneNumber - Recipient phone number (format: 62xxxx)
 * @param {string} message - Message content
 * @returns {Promise<Object>} API response
 */
async function sendWhatsAppMessage(phoneNumber, message) {
  const apiKey = process.env.FONNTE_API_KEY;

  if (!apiKey || apiKey === 'your_fonnte_api_key_here') {
    console.warn('⚠️ Fonnte API Key not configured');
    return {
      status: false,
      error: 'Fonnte API Key not configured. Please set FONNTE_API_KEY environment variable.'
    };
  }

  try {
    const response = await axios.post(
      FONNTE_API_URL,
      {
        target: phoneNumber,
        message: message,
        countryCode: '62'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    if (response.data && response.data.status === true) {
      console.log(`✅ WhatsApp sent to ${phoneNumber}`);
      return {
        status: true,
        data: response.data
      };
    } else {
      console.error('Fonnte error:', response.data);
      return {
        status: false,
        error: response.data?.reason || response.data?.message || 'Unknown error from Fonnte'
      };
    }
  } catch (error) {
    console.error('Fonnte API error:', error.message);
    
    if (error.response) {
      return {
        status: false,
        error: `Fonnte API error: ${error.response.status} - ${error.response.data?.message || error.message}`
      };
    } else if (error.request) {
      return {
        status: false,
        error: 'No response from Fonnte API. Check your internet connection.'
      };
    } else {
      return {
        status: false,
        error: error.message
      };
    }
  }
}

/**
 * Check Fonnte API status
 * @returns {Promise<Object>} Status check result
 */
async function checkFonnteStatus() {
  const apiKey = process.env.FONNTE_API_KEY;
  
  if (!apiKey || apiKey === 'your_fonnte_api_key_here') {
    return {
      available: false,
      configured: false,
      message: 'Fonnte API Key not configured'
    };
  }

  // Simple validation - try to get device info
  try {
    const response = await axios.get('https://api.fonnte.com/device', {
      headers: { 'Authorization': apiKey },
      timeout: 10000
    });
    
    return {
      available: true,
      configured: true,
      device: response.data?.device?.number || 'unknown'
    };
  } catch (error) {
    return {
      available: false,
      configured: true,
      message: error.message
    };
  }
}

module.exports = {
  sendWhatsAppMessage,
  checkFonnteStatus
};