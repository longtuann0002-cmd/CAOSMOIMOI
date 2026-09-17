import { sendFCMMessage, getRegisteredTokens } from './_fcmHelper.js';

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
    const { title, body, data, targetToken } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    let tokens = [];
    if (targetToken) {
      tokens = [targetToken];
    } else {
      tokens = await getRegisteredTokens();
    }

    if (tokens.length === 0) {
      return res.status(200).json({ 
        success: true, 
        message: 'No registered devices found to push to.',
        delivered: 0,
        total: 0
      });
    }

    // Send push to all tokens in parallel
    const results = await Promise.allSettled(
      tokens.map(token => sendFCMMessage(token, title, body, data))
    );

    let delivered = 0;
    let failed = 0;
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value.ok) {
        delivered++;
      } else {
        failed++;
      }
    });

    return res.status(200).json({
      success: true,
      delivered,
      failed,
      total: tokens.length
    });
  } catch (err) {
    console.error('Error in /api/send-push:', err);
    return res.status(500).json({ error: err.message });
  }
}
