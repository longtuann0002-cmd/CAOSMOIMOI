import { getGoogleAccessToken, sendFCMMessage, getRegisteredTokens, SERVICE_ACCOUNT } from './_fcmHelper.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Calculate Vietnam date (UTC+7)
    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const yyyy = vnNow.getUTCFullYear();
    const mm = String(vnNow.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(vnNow.getUTCDate()).padStart(2, '0');
    const todayDateStr = `${yyyy}-${mm}-${dd}`;
    const dateLabel = `${dd}/${mm}`;

    const tomorrowNow = new Date(Date.now() + 7 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    const tomorrowYyyy = tomorrowNow.getUTCFullYear();
    const tomorrowMm = String(tomorrowNow.getUTCMonth() + 1).padStart(2, '0');
    const tomorrowDd = String(tomorrowNow.getUTCDate()).padStart(2, '0');
    const tomorrowDateStr = `${tomorrowYyyy}-${tomorrowMm}-${tomorrowDd}`;

    const force = req.query?.force === 'true';
    const accessToken = await getGoogleAccessToken();

    // 2. Cloud Deduplication Lock: Check if already sent today in Firestore
    const briefingDocUrl = `https://firestore.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/databases/(default)/documents/caos_cloud_data/morning_briefing`;
    if (!force) {
      try {
        const lockRes = await fetch(briefingDocUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (lockRes.ok) {
          const lockData = await lockRes.json();
          const lastDate = lockData.fields?.lastSentDate?.stringValue;
          if (lastDate === todayDateStr) {
            return res.status(200).json({
              success: true,
              message: `Morning briefing for today (${todayDateStr}) was already sent once. Skipped duplicate.`,
              date: todayDateStr
            });
          }
        }
      } catch (lockErr) {
        console.warn('Could not read briefing lock from Firestore:', lockErr);
      }
    }

    // 3. Fetch contracts from Firestore doc: caos_cloud_data/contracts
    let contracts = [];
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/databases/(default)/documents/caos_cloud_data/contracts`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response.ok) {
        const docData = await response.json();
        const raw = docData.fields?.data?.stringValue;
        if (raw) {
          contracts = JSON.parse(raw);
        }
      } else {
        console.warn('Could not read caos_cloud_data/contracts from Firestore, status:', response.status);
      }
    } catch (readErr) {
      console.error('Error fetching contracts from Firestore:', readErr);
    }

    // 4. Filter operations for today
    const handoverToday = (contracts || []).filter(c => c.startDate === todayDateStr && (c.status === 'Pending' || c.status === 'Active'));
    const returnToday   = (contracts || []).filter(c => c.endDate === todayDateStr && c.status === 'Active');
    const overdueList   = (contracts || []).filter(c => c.status === 'Overdue' || (c.status === 'Active' && c.endDate < todayDateStr));
    const upcomingTomorrow = (contracts || []).filter(c => c.startDate === tomorrowDateStr && c.status === 'Pending');

    const total = handoverToday.length + returnToday.length + overdueList.length + upcomingTomorrow.length;

    if (total === 0 && !force) {
      // Record empty check to avoid re-triggering
      try {
        await fetch(briefingDocUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              lastSentDate: { stringValue: todayDateStr },
              sentAt: { stringValue: new Date().toISOString() },
              status: { stringValue: 'no_operations_empty' }
            }
          })
        });
      } catch (e) {}

      return res.status(200).json({
        success: true,
        message: 'No pending/active operations for today. Notification skipped to prevent spam.',
        date: todayDateStr
      });
    }

    // 5. Compose briefing message
    const parts = [];
    if (handoverToday.length > 0)   parts.push(`🟡 ${handoverToday.length} đơn giao hôm nay`);
    if (returnToday.length > 0)     parts.push(`🔵 ${returnToday.length} đơn thu hồi hôm nay`);
    if (overdueList.length > 0)     parts.push(`🔴 ${overdueList.length} đơn trễ hạn`);
    if (upcomingTomorrow.length > 0) parts.push(`⚪ ${upcomingTomorrow.length} đơn ngày mai`);

    const title = `☀️ Nhắc việc sáng ${dateLabel}`;
    const body = parts.length > 0
      ? parts.join('\n')
      : 'Hôm nay không có đơn nào cần xử lý. Chúc ngày tốt lành! ✨';

    // 6. Write Cloud Lock BEFORE sending push so no concurrent request can double-send
    if (!force) {
      try {
        await fetch(briefingDocUrl, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              lastSentDate: { stringValue: todayDateStr },
              sentAt: { stringValue: new Date().toISOString() },
              status: { stringValue: 'sent' }
            }
          })
        });
      } catch (e) {
        console.warn('Could not save briefing lock:', e);
      }
    }

    // 7. Send FCM push to all registered devices
    const tokens = await getRegisteredTokens();
    if (tokens.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'Briefing prepared but no registered device tokens found in Firestore.',
        title,
        body
      });
    }

    const payloadData = {
      type: 'morning_briefing',
      date: todayDateStr,
      badge: total > 0 ? total : 1,
      tag: `briefing-${todayDateStr}` // Deduplication tag: will collapse duplicates on phones
    };

    const results = await Promise.allSettled(
      tokens.map(token => sendFCMMessage(token, title, body, payloadData))
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
      totalDevices: tokens.length,
      title,
      body,
      summary: {
        handoverToday: handoverToday.length,
        returnToday: returnToday.length,
        overdueList: overdueList.length,
        upcomingTomorrow: upcomingTomorrow.length
      }
    });
  } catch (err) {
    console.error('Error in /api/cron-morning-briefing:', err);
    return res.status(500).json({ error: err.message });
  }
}
