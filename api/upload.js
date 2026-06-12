// api/upload.js - File upload with Supabase + ImgBB fallback
// Using multer for multipart/form-data handling

const multer = require('multer');
const { uploadToSupabase, uploadToImgBB, isSupabaseAvailable } = require('../utils/supabase');
const { logActivity } = require('../utils/logger');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

// Helper to run middleware
const runMiddleware = (req, res, fn) => {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
};

module.exports = async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Run multer middleware
    await runMiddleware(req, res, upload.single('file'));

    const file = req.file;
    const folder = req.body.folder || 'uploads';
    const userId = req.body.userId || null;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log(`📤 Uploading file: ${file.originalname}, size: ${file.size}, folder: ${folder}`);

    let result;
    let isFallback = false;

    // Try Supabase first if available
    if (await isSupabaseAvailable()) {
      try {
        result = await uploadToSupabase(file, folder, userId);
        console.log(`✅ Uploaded to Supabase: ${result.url}`);
      } catch (supabaseError) {
        console.warn('Supabase upload failed, falling back to ImgBB:', supabaseError.message);
        result = await uploadToImgBB(file);
        isFallback = true;
      }
    } else {
      console.log('Supabase not available, using ImgBB fallback');
      result = await uploadToImgBB(file);
      isFallback = true;
    }

    // Log the activity
    await logActivity({
      action: 'upload_file',
      folder: folder,
      userId: userId,
      fileName: file.originalname,
      fileSize: file.size,
      isFallback: isFallback,
      timestamp: Date.now(),
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    return res.json({
      success: true,
      url: result.url,
      path: result.path || null,
      isFallback: isFallback,
      message: isFallback ? 'Uploaded via ImgBB fallback' : 'Uploaded to Supabase'
    });

  } catch (error) {
    console.error('Upload error:', error);

    await logActivity({
      action: 'upload_file',
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

// Export multer config for other uses
module.exports.upload = upload;