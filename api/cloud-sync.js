import { getGoogleAccessToken, SERVICE_ACCOUNT } from './_fcmHelper.js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const accessToken = await getGoogleAccessToken();

    // GET /api/cloud-sync?key=contracts_store
    if (req.method === 'GET') {
      const { key } = req.query || {};
      if (!key) {
        return res.status(400).json({ error: 'Key is required' });
      }

      const url = `https://firestore.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/databases/(default)/documents/caos_cloud_data/${encodeURIComponent(key)}`;
      const firestoreRes = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!firestoreRes.ok) {
        if (firestoreRes.status === 404) {
          return res.status(200).json({ exists: false, data: null });
        }
        const errText = await firestoreRes.text();
        return res.status(firestoreRes.status).json({ error: errText });
      }

      const docData = await firestoreRes.json();
      const rawString = docData.fields?.data?.stringValue;
      let parsed = null;
      if (rawString) {
        try {
          parsed = JSON.parse(rawString);
        } catch (e) {
          parsed = rawString;
        }
      }

      return res.status(200).json({
        exists: true,
        data: parsed,
        updatedAt: docData.fields?.updatedAt?.stringValue || null
      });
    }

    // POST /api/cloud-sync -> { key, data }
    if (req.method === 'POST') {
      const { key, data } = req.body || {};
      if (!key) {
        return res.status(400).json({ error: 'Key is required' });
      }

      const stringified = typeof data === 'string' ? data : JSON.stringify(data);
      const url = `https://firestore.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/databases/(default)/documents/caos_cloud_data/${encodeURIComponent(key)}`;

      const bodyPayload = {
        fields: {
          data: { stringValue: stringified },
          updatedAt: { stringValue: new Date().toISOString() }
        }
      };

      const firestoreRes = await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyPayload)
      });

      if (!firestoreRes.ok) {
        const errText = await firestoreRes.text();
        return res.status(firestoreRes.status).json({ error: errText });
      }

      return res.status(200).json({ success: true, key });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Error in /api/cloud-sync:', err);
    return res.status(500).json({ error: err.message });
  }
}
