import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { syncToSupabase, fetchFromSupabase, isSupabaseConfigured } from './supabase';
import { isIOS, isStandalone, isNotificationSupported } from './pushNotification';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId: string;
  appId: string;
  vapidKey?: string;
}

const STORAGE_KEY_CONFIG = 'caos_firebase_config';
const STORAGE_KEY_TOKEN = 'caos_fcm_device_token';
const STORAGE_KEY_ALL_TOKENS = 'caos_all_device_tokens';

// Default empty or pre-stored config
export function getFirebaseConfig(): FirebaseConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse Firebase config from localStorage:', e);
  }

  // Fallback to import.meta.env if provided
  const env = (import.meta as any).env || {};
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.VITE_FIREBASE_APP_ID || '',
      vapidKey: env.VITE_FIREBASE_VAPID_KEY || ''
    };
  }

  return null;
}

export function saveFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  if (isSupabaseConfigured) {
    syncToSupabase('system_firebase_config', config);
  }
}

// Check if Firebase is configured
export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return !!(config && config.apiKey && config.projectId && config.messagingSenderId && config.appId);
}

// Initialize Firebase Messaging safely
let messagingInstance: Messaging | null = null;

export function initFirebaseMessaging(): Messaging | null {
  if (typeof window === 'undefined' || !isNotificationSupported()) return null;
  const config = getFirebaseConfig();
  if (!config) return null;

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    if (!messagingInstance) {
      messagingInstance = getMessaging(app);
      
      // Setup foreground message listener
      onMessage(messagingInstance, (payload) => {
        const title = payload.notification?.title || payload.data?.title || '🔔 Tiệm Ảnh Nhà Caos';
        const body = payload.notification?.body || payload.data?.body || 'Bạn có thông báo mới!';
        
        // Show in-app banner or native notification
        if (Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, {
              body,
              icon: '/logocaosdt.png',
              badge: '/logocaosdt.png',
              data: { url: payload.data?.url || '/' }
            } as any);
          });
        }
      });
    }
    return messagingInstance;
  } catch (err) {
    console.warn('Firebase Messaging init failed:', err);
    return null;
  }
}

// Register device and obtain FCM Token
export async function registerDeviceFCMToken(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  if (!isNotificationSupported()) {
    if (isIOS() && !isStandalone()) {
      return {
        success: false,
        error: 'Trên iPhone, bạn cần "Thêm vào Màn hình chính" trước khi bật thông báo!'
      };
    }
    return { success: false, error: 'Thiết bị không hỗ trợ thông báo đẩy.' };
  }

  const config = getFirebaseConfig();
  if (!config) {
    return { 
      success: false, 
      error: 'Chưa cấu hình Firebase Project. Vui lòng nhập thông tin cấu hình Firebase trước.' 
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Quyền thông báo bị từ chối trên thiết bị này.' };
    }

    const messaging = initFirebaseMessaging();
    if (!messaging) {
      return { success: false, error: 'Không thể khởi tạo Firebase Messaging.' };
    }

    const registration = await navigator.serviceWorker.ready;
    const token = await getToken(messaging, {
      vapidKey: config.vapidKey || undefined,
      serviceWorkerRegistration: registration
    });

    if (token) {
      localStorage.setItem(STORAGE_KEY_TOKEN, token);
      await saveTokenToSharedRegistry(token);
      return { success: true, token };
    } else {
      return { success: false, error: 'Không lấy được FCM Token từ Firebase.' };
    }
  } catch (err: any) {
    console.error('Error getting FCM Token:', err);
    return { success: false, error: err?.message || 'Lỗi khi đăng ký FCM Token.' };
  }
}

// Get saved token of this device
export function getCurrentDeviceToken(): string | null {
  return localStorage.getItem(STORAGE_KEY_TOKEN);
}

// Save device token to shared cloud database (Supabase or cloud store)
async function saveTokenToSharedRegistry(token: string): Promise<void> {
  try {
    const deviceType = isIOS() ? 'iOS (iPhone/iPad)' : /Android/.test(navigator.userAgent) ? 'Android' : 'Desktop/Web';
    const deviceRecord = {
      token,
      deviceType,
      updatedAt: new Date().toISOString()
    };

    // 1. Save to local list
    const currentTokensStr = localStorage.getItem(STORAGE_KEY_ALL_TOKENS);
    let tokens: any[] = [];
    if (currentTokensStr) {
      try { tokens = JSON.parse(currentTokensStr); } catch (e) {}
    }
    tokens = tokens.filter(t => t.token !== token);
    tokens.push(deviceRecord);
    localStorage.setItem(STORAGE_KEY_ALL_TOKENS, JSON.stringify(tokens));

    // 2. Sync to Supabase if configured
    if (isSupabaseConfigured) {
      const cloudTokens = await fetchFromSupabase('fcm_registered_devices') || [];
      const updated = Array.isArray(cloudTokens) 
        ? [...cloudTokens.filter((t: any) => t.token !== token), deviceRecord]
        : [deviceRecord];
      await syncToSupabase('fcm_registered_devices', updated);
    }
  } catch (err) {
    console.warn('Failed to save device token to shared registry:', err);
  }
}

// Broadcast notification across all devices
// (Uses Multi-Channel: BroadcastChannel for real-time online devices + Shared Cloud Store trigger)
export async function broadcastToAllDevices(
  title: string, 
  body: string, 
  data?: Record<string, any>
): Promise<boolean> {
  let anyDelivered = false;

  // 1. BroadcastChannel (Delivers instantly to all active tabs/windows on the same origin)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('caos_cross_device_notifications');
      channel.postMessage({
        title,
        body,
        data,
        timestamp: Date.now()
      });
      channel.close();
      anyDelivered = true;
    }
  } catch (e) {
    console.warn('BroadcastChannel error:', e);
  }

  // 2. Storage event broadcast (for other tabs on local browsers)
  try {
    localStorage.setItem('caos_latest_broadcast_alert', JSON.stringify({
      title,
      body,
      data,
      time: Date.now()
    }));
  } catch (e) {}

  // 3. Supabase Realtime broadcast (for remote devices running the app)
  if (isSupabaseConfigured) {
    try {
      await syncToSupabase('latest_push_event', {
        title,
        body,
        data,
        timestamp: new Date().toISOString()
      });
      anyDelivered = true;
    } catch (e) {
      console.warn('Supabase push broadcast error:', e);
    }
  }

  return anyDelivered;
}

// Listen for cross-device broadcast notifications
export function listenToCrossDeviceAlerts(
  onAlert: (alert: { title: string; body: string; data?: any }) => void
): () => void {
  // 1. Listen via BroadcastChannel
  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel('caos_cross_device_notifications');
      channel.onmessage = (event) => {
        if (event.data && event.data.title) {
          onAlert(event.data);
        }
      };
    } catch (e) {}
  }

  // 2. Listen via storage event (cross-tab sync)
  const storageListener = (e: StorageEvent) => {
    if (e.key === 'caos_latest_broadcast_alert' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed && parsed.title) {
          onAlert(parsed);
        }
      } catch (err) {}
    }
  };
  window.addEventListener('storage', storageListener);

  return () => {
    if (channel) channel.close();
    window.removeEventListener('storage', storageListener);
  };
}
