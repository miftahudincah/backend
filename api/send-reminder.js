// api/send-reminder.js - Send attendance reminder via WhatsApp

const { sendWhatsAppMessage } = require('../utils/fonnte');
const { logActivity } = require('../utils/logger');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    phoneNumber,
    userName,
    userRole,
    schoolName,
    schoolStartTime,
    minutesLate,
    type = 'reminder'
  } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  if (!userName) {
    return res.status(400).json({ error: 'User name is required' });
  }

  // Format phone number
  let formattedNumber = phoneNumber.replace(/[^0-9]/g, '');
  if (formattedNumber.startsWith('0')) {
    formattedNumber = '62' + formattedNumber.substring(1);
  }
  if (!formattedNumber.startsWith('62')) {
    formattedNumber = '62' + formattedNumber;
  }

  const currentTime = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  let roleTitle = '';
  switch (userRole) {
    case 'siswa': roleTitle = 'Siswa'; break;
    case 'guru': roleTitle = 'Guru'; break;
    case 'staff_tu': roleTitle = 'Staff TU'; break;
    case 'wakil_kepala': roleTitle = 'Wakil Kepala Sekolah'; break;
    case 'admin': roleTitle = 'Kepala Sekolah'; break;
    case 'developer': roleTitle = 'Developer'; break;
    default: roleTitle = 'Pengguna';
  }

  const schoolNameText = schoolName || 'Sekolah';
  const startTime = schoolStartTime || '07:30';

  const message = `*📢 PENGINGAT ABSENSI - ${schoolNameText}*

Halo *${userName}* (${roleTitle}),

⚠️ *Anda BELUM MELAKUKAN ABSENSI MASUK* hari ini!

📅 Tanggal: ${today}
🕐 Jam Sekolah: *Pukul ${startTime} WIB*
⏰ Waktu Sekarang: *${currentTime} WIB*
📊 Keterlambatan: *${minutesLate || 0} menit*

🚨 *SEGERA LAKUKAN ABSENSI FINGERPRINT!*

📍 Lokasi absensi tersedia di:
• Ruang guru/kantor
• Pintu masuk sekolah
• Fingerprint scanner ESP32

💡 *Tips:*
- Pastikan sidik jari Anda sudah terdaftar
- Letakkan jari dengan posisi yang benar
- Jika gagal, coba ulang beberapa kali

--- 
📱 *Sistem Absensi IoT - Real-time*
🔔 Notifikasi ini dikirim secara otomatis oleh sistem.`;

  try {
    const result = await sendWhatsAppMessage(formattedNumber, message);

    await logActivity({
      action: 'send_reminder',
      type: type,
      phoneNumber: formattedNumber,
      userName: userName,
      userRole: userRole,
      status: result.status ? 'success' : 'failed',
      timestamp: Date.now(),
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });

    if (result.status) {
      return res.json({
        success: true,
        message: 'Reminder sent successfully',
        data: result
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send reminder'
      });
    }
  } catch (error) {
    console.error('Send reminder error:', error);

    await logActivity({
      action: 'send_reminder',
      type: type,
      phoneNumber: formattedNumber,
      userName: userName,
      userRole: userRole,
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