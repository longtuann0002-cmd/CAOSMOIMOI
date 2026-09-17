import { saveRegisteredToken } from './_fcmHelper.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, deviceType } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const saved = await saveRegisteredToken(token, deviceType);
    return res.status(200).json({ success: saved });
  } catch (err) {
    console.error('Error in /api/register-device:', err);
    return res.status(500).json({ error: err.message });
  }
}
