import crypto from 'crypto';

export const SERVICE_ACCOUNT = {
  project_id: "tiem-anh-nha-caos-d827f",
  client_email: "firebase-adminsdk-fbsvc@tiem-anh-nha-caos-d827f.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCknfBwZIfc3BSx\nfVzbghN91/SHxg0rFXhHl2tlt6x4Qtx/ru8maodhigiNPGUVeJ2H5P8gsyt8s+fi\nO0kz2fkEGudMLovCTDLW8JfbocwDbuA4pxyNvBXiPQK3SS8MxR21UtaXUu8opDju\nIdVke9dy6Wpb0NfiS1fEXNX0XkmlLT4yCrL3trq8WL/9MkVtRNtOAXKjHhecSQJ0\nlWftdXl0xbjGVLN88Zs0iKowTdeTLj7VgFlsnRBTUroHYq2izo8EVPY2wCNwBvuG\njhx3gTeLpyCrtpFQsYPHnz5odsZZcKDG4U0uvvG6nsVqZAND4kAESpBay01PNLq4\nIzqgAxtXAgMBAAECggEAA7B/LI2xloDKPUYhgtFHWDkzA6ir2ozYeBuhLmjvm8xn\n07wbI7ccgfz4KcOHl8kZwsDI+mB5ojRdXJkr5VZxJHyT4DBk39MZtUPe1hnUuuOi\ncTKcSw2YR0ygbHTenJXTD3bOqhqTk0txnoix7IFyt+Jvs09wHzlwEKMXWoA90fld\n6Rss0lKU1q2/WQ59xBfy4irIvSAP7B5/7B7MmX+nAfWb3yBGQRrFmA/ZndAWM4DX\nrGfI0y3QyCj4N9NDngFs4b/47/3tk/ywXyyK7Pd+oh79bak9NG34or0E3g2s+3CW\nxP7S+VOHZMbs/eRDmj1vvsaeLZRPcVNQs3xvAm+tEQKBgQDP22AF1FBb6qPW+KCe\nkvpNyy5UOTONsIMkTpEgrdNAyzIqYByCwF2eSvv5koC53K31hf9uoYuKFwnlOjYl\nPb6OONX1/MBHjKt+5fzzMEAKQWEEGDXblx+mbb9NpFjpNqxEKHKyLGN+1ZmXuK0I\nfjUNHQW3mUWiV6mOmGI/lzF3JwKBgQDKvrOivVAmTfWCIoukBS/Nt0kDEPoSNi2t\nlqBQm7NyGZCuT6cd0YRiM901e4warRxq56oRLAkFJoNEnSkk6p4nko7x0zFnEmXL\nXwVHG+Za/dO9tUkTyC3mLJdNVFUbXZOrf5/2oSIR2ZtWveY931GzQi8ZCKmni3Ct\nC20A7MFYUQKBgQDAFncdzADbgPMaljgxc5jXzb4p3Zb0CTyYj/b0oU9KYL4ihSGz\n/7xErf1AvhAyM2ucK9JL1gTTf8kISwyAzBfO7V1l78duF+Tg6AAkaeG02IiktQ8I\nuRdpwaB6SzhThdAbSNn+KKFmNFW17dgSsjeqv7hp3L6KccLjYZXiOIJhHwKBgAzM\nVviZ7LpOR4YsehYjga4BuOkppC+MHfwMOxh7i6tTM8/dFVaLiEjOr1MV9nUkoluZ\nPiIRXoxlrvmg1h0PdmZXGRDo3QB9p9FbsTCY8USjKz+ZdwB5rXQPMoneHfU5Rf4Y\nc1eVOlpYGzcxi5wyQa0IK4LwCg2afsVdqEbbqyTRAoGARiM8FUHFsNpN4MW6IjYP\nj2A7m720NmLlyk8urNcRVfLuVIz0LD+4Xk3PYGUna+fdlkOubEeRkFTKeZog5YL2\nKSSJjEExsA4B8aZHkaW4SaFEXH+hT4o7kg7gSW6anr6KIuKnYgbtPZQWp/v1rR3l\nSdlfNPY9qRJC/d4GuQ4J3Jo=\n-----END PRIVATE KEY-----\n"
};

function base64url(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiresAt - 60) {
    return cachedToken;
  }

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    iss: SERVICE_ACCOUNT.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }));

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + payload);
  const signature = sign.sign(SERVICE_ACCOUNT.private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = header + '.' + payload + '.' + signature;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt
  });

  const data = await res.json();
  if (data.access_token) {
    cachedToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in || 3600);
    return cachedToken;
  }
  throw new Error('Failed to obtain Google access token: ' + JSON.stringify(data));
}

export async function sendFCMMessage(targetToken, title, body, dataPayload = {}) {
  const accessToken = await getGoogleAccessToken();
  const url = 'https://fcm.googleapis.com/v1/projects/' + SERVICE_ACCOUNT.project_id + '/messages:send';

  const stringData = {};
  for (const [k, v] of Object.entries(dataPayload)) {
    stringData[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }

  const message = {
    message: {
      token: targetToken,
      notification: {
        title: title,
        body: body
      },
      data: stringData,
      webpush: {
        headers: {
          Urgency: 'high'
        },
        notification: {
          title: title,
          body: body,
          icon: '/logocaosdt.png',
          badge: '/logocaosdt.png',
          vibrate: [200, 100, 200],
          renotify: true,
          requireInteraction: true
        }
      }
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });

  const result = await res.json();
  return { ok: res.ok, status: res.status, result };
}

export async function getRegisteredTokens() {
  const accessToken = await getGoogleAccessToken();
  const url = 'https://firestore.googleapis.com/v1/projects/' + SERVICE_ACCOUNT.project_id + '/databases/(default)/documents/caos_device_tokens';
  
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + accessToken }
  });
  
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.documents) return [];

  const tokens = [];
  for (const doc of data.documents) {
    const fields = doc.fields || {};
    const token = fields.token?.stringValue;
    if (token) {
      tokens.push(token);
    }
  }
  return tokens;
}

export async function saveRegisteredToken(token, deviceType = 'Unknown') {
  const accessToken = await getGoogleAccessToken();
  // Document ID can be encoded or hash
  const docId = Buffer.from(token).toString('base64url').slice(0, 60);
  const url = 'https://firestore.googleapis.com/v1/projects/' + SERVICE_ACCOUNT.project_id + '/databases/(default)/documents/caos_device_tokens/' + docId;

  const body = {
    fields: {
      token: { stringValue: token },
      deviceType: { stringValue: deviceType },
      updatedAt: { stringValue: new Date().toISOString() }
    }
  };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  return res.ok;
}
