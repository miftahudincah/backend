// utils/supabase.js - Supabase storage integration

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

let supabaseClient = null;
let supabaseAvailable = true;

/**
 * Initialize Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseClient && supabaseUrl && supabaseKey && supabaseUrl !== 'https://your-project.supabase.co') {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClient;
}

/**
 * Check if Supabase is available
 */
async function isSupabaseAvailable() {
  if (!supabaseAvailable) return false;
  
  const client = getSupabaseClient();
  if (!client) return false;
  
  // Simple test to check connectivity
  try {
    const { data, error } = await client.storage.listBuckets();
    if (error) {
      console.warn('Supabase connectivity check failed:', error.message);
      supabaseAvailable = false;
      return false;
    }
    return true;
  } catch (error) {
    console.warn('Supabase connectivity check error:', error.message);
    supabaseAvailable = false;
    return false;
  }
}

/**
 * Upload file to Supabase Storage
 * @param {Object} file - File object from multer
 * @param {string} folder - Destination folder
 * @param {string} userId - User ID (optional)
 * @returns {Promise<{url: string, path: string}>}
 */
async function uploadToSupabase(file, folder, userId = null) {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not initialized');
  }

  const bucket = 'foto-absensi';
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 10);
  const ext = file.originalname.split('.').pop().toLowerCase();
  
  let filePath;
  if (userId) {
    filePath = `${folder}/${userId}/${timestamp}_${randomStr}.${ext}`;
  } else {
    filePath = `${folder}/${timestamp}_${randomStr}.${ext}`;
  }

  console.log(`📤 Uploading to Supabase: ${filePath}`);

  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, file.buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.mimetype
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: urlData } = client.storage
    .from(bucket)
    .getPublicUrl(filePath);

  console.log(`✅ Uploaded to Supabase: ${urlData.publicUrl}`);

  return {
    url: urlData.publicUrl,
    path: filePath
  };
}

/**
 * Upload file to ImgBB (fallback)
 * @param {Object} file - File object from multer
 * @returns {Promise<{url: string, path: null}>}
 */
async function uploadToImgBB(file) {
  const apiKey = process.env.IMGBB_KEY;
  
  if (!apiKey || apiKey === 'your_imgbb_api_key') {
    throw new Error('ImgBB API Key not configured');
  }

  const formData = new FormData();
  formData.append('image', file.buffer.toString('base64'));
  formData.append('key', apiKey);

  const response = await axios.post('https://api.imgbb.com/1/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 30000
  });

  if (!response.data || !response.data.success) {
    throw new Error('ImgBB upload failed: ' + (response.data?.error?.message || 'Unknown error'));
  }

  console.log(`✅ Uploaded to ImgBB: ${response.data.data.url}`);

  return {
    url: response.data.data.url,
    path: null
  };
}

/**
 * Delete file from Supabase
 * @param {string} filePath - Path of file to delete
 * @returns {Promise<boolean>}
 */
async function deleteFromSupabase(filePath) {
  const client = getSupabaseClient();
  if (!client) {
    return false;
  }

  const bucket = 'foto-absensi';
  
  const { error } = await client.storage
    .from(bucket)
    .remove([filePath]);

  if (error) {
    console.error('Supabase delete error:', error);
    return false;
  }

  console.log(`🗑️ Deleted from Supabase: ${filePath}`);
  return true;
}

module.exports = {
  uploadToSupabase,
  uploadToImgBB,
  deleteFromSupabase,
  isSupabaseAvailable,
  getSupabaseClient
};