// Vercel Serverless Function: /api/auth/login

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { email, password } = req.body || {};
  const requiredPasscode = process.env.SBR_PASSCODE || 'gistda2026';

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลที่ถูกต้อง' });
  }

  if (!password || password.trim() !== requiredPasscode) {
    return res.status(401).json({ success: false, message: 'รหัสผ่านระบบ (Passcode) ไม่ถูกต้อง' });
  }

  const token = 'sbr_token_' + Buffer.from(`${email}:${Date.now()}`).toString('base64');

  return res.status(200).json({
    success: true,
    token: token,
    user: {
      email: email.trim(),
      name: email.split('@')[0],
      role: 'staff',
      timestamp: Date.now(),
    },
  });
}
