// Utility for Web Push & PWA Notifications (Supporting iOS 16.4+ and Android)

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  isIOS: boolean;
  isStandalone: boolean;
  serviceWorkerRegistered: boolean;
}

// Detect if device is running iOS (iPhone/iPad)
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

// Detect if app is opened as an installed PWA (Home Screen)
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
    (navigator as any).standalone === true;
}

// Check whether Notification API is supported
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Register service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    return registration;
  } catch (err) {
    console.error('Service Worker registration failed:', err);
    return null;
  }
}

// Request permission with iOS guidance
export async function requestNotificationPermission(): Promise<{
  granted: boolean;
  requiresPWA: boolean;
  error?: string;
}> {
  if (!isNotificationSupported()) {
    // If on iOS and not standalone, guide to add to home screen
    if (isIOS() && !isStandalone()) {
      return {
        granted: false,
        requiresPWA: true,
        error: 'Trên iPhone, bạn cần bấm nút Chia sẻ (Share) -> Thêm vào màn hình chính trước khi bật thông báo!'
      };
    }
    return {
      granted: false,
      requiresPWA: false,
      error: 'Trình duyệt này không hỗ trợ Web Push Notification.'
    };
  }

  // On iOS 16.4+, notifications only work if added to Home Screen
  if (isIOS() && !isStandalone()) {
    return {
      granted: false,
      requiresPWA: true,
      error: 'Trên iPhone, bạn cần bấm nút Chia sẻ (Share) -> Thêm vào màn hình chính trước khi bật thông báo!'
    };
  }

  try {
    await registerServiceWorker();
    const permission = await Notification.requestPermission();
    return {
      granted: permission === 'granted',
      requiresPWA: false
    };
  } catch (err: any) {
    return {
      granted: false,
      requiresPWA: false,
      error: err?.message || 'Không thể yêu cầu quyền thông báo.'
    };
  }
}

// Send a test notification to verify device behavior
export async function sendTestNotification(): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification('📷 Tiệm Ảnh Nhà Caos - Trợ lý vận hành', {
        body: 'Thông báo trên iPhone của bạn đã hoạt động hoàn hảo! 🎉',
        icon: '/logocaosdt.png',
        badge: '/logocaosdt.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        renotify: true,
        data: { url: '/' }
      } as any);
      return true;
    } else {
      new Notification('📷 Tiệm Ảnh Nhà Caos', {
        body: 'Thông báo trên thiết bị đã hoạt động! 🎉',
        icon: '/logocaosdt.png'
      });
      return true;
    }
  } catch (e) {
    console.error('Error sending test notification:', e);
    return false;
  }
}

// Send an operation alert notification (with anti-spam timestamp check)
export async function sendOperationNotification(
  title: string, 
  body: string, 
  tag: string
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  // Check anti-spam cooldown (1 hour per specific tag)
  const lastSentKey = `last_notif_${tag}`;
  const lastSent = localStorage.getItem(lastSentKey);
  const now = Date.now();
  if (lastSent && now - parseInt(lastSent, 10) < 60 * 60 * 1000) {
    // Already notified in the last hour
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body,
        icon: '/logocaosdt.png',
        badge: '/logocaosdt.png',
        vibrate: [200, 100, 200],
        tag,
        renotify: true,
        data: { url: '/' }
      } as any);
      localStorage.setItem(lastSentKey, String(now));
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to trigger push notification:', e);
    return false;
  }
}
