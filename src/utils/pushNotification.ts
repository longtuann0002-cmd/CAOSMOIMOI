// Utility for Web Push & PWA Notifications (Supporting iOS 16.4+ and Android)
import { RentalContract } from '../types';
import { formatDMY } from './dateUtils';

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

// Base helper to display notification via Service Worker or fallback
export async function showPushNotification(
  title: string, 
  body: string, 
  tag?: string
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notificationTag = tag || `caos-${Date.now()}`;

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification(title, {
        body,
        icon: '/logocaosdt.png',
        badge: '/logocaosdt.png',
        vibrate: [200, 100, 200],
        tag: notificationTag,
        renotify: true,
        data: { url: '/' }
      } as any);
      return true;
    } else if (typeof Notification !== 'undefined') {
      new Notification(title, {
        body,
        icon: '/logocaosdt.png',
        tag: notificationTag
      });
      return true;
    }
    return false;
  } catch (e) {
    console.error('Error showing push notification:', e);
    return false;
  }
}

// Send a test notification to verify device behavior
export async function sendTestNotification(): Promise<boolean> {
  return showPushNotification(
    '📷 Tiệm Ảnh Nhà Caos - Trợ lý vận hành',
    'Thông báo trên iPhone của bạn đã hoạt động hoàn hảo! 🎉',
    `test-${Date.now()}`
  );
}

// Send an instant notification EVERY TIME an order is created (No blocking!)
export async function sendOrderCreatedNotification(contract: RentalContract): Promise<boolean> {
  const itemsText = (contract.items || []).map(i => i.cameraName).join(', ') || 'Thiết bị thuê';
  const title = `📋 Đơn đặt mới: ${contract.contractCode}`;
  const timeInfo = contract.is6Hours 
    ? `Gói 6h (${contract.startTime || '08:00'} - ${contract.returnTime || '14:00'})` 
    : `${formatDMY(contract.startDate)} - ${formatDMY(contract.endDate)}`;
  const body = `Khách: ${contract.customerName} • ${itemsText} • ${timeInfo} • ${contract.totalPrice.toLocaleString()}đ`;
  
  return showPushNotification(title, body, `order-${contract.id}-${Date.now()}`);
}

// Check and trigger 9:00 AM daily morning operations briefing
export async function checkAndTriggerMorningBriefing(
  contracts: RentalContract[],
  targetDate?: string,
  forceTest: boolean = false
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const now = new Date();
  const currentHour = now.getHours();
  const todayDateStr = targetDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Only trigger at or after 9:00 AM (unless user clicked force test)
  if (currentHour < 9 && !forceTest) {
    return false;
  }

  const morningKey = `morning_briefing_sent_${todayDateStr}`;
  if (!forceTest && localStorage.getItem(morningKey)) {
    return false;
  }

  // Calculate operations for today
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const handoverCount = (contracts || []).filter(c => c.startDate === todayDateStr && c.status === 'Pending').length;
  const returnCount = (contracts || []).filter(c => c.endDate === todayDateStr && c.status === 'Active').length;
  const overdueCount = (contracts || []).filter(c => c.status === 'Overdue' || (c.status === 'Active' && c.endDate < todayDateStr)).length;
  const upcomingCount = (contracts || []).filter(c => c.startDate === tomorrowDateStr && c.status === 'Pending').length;

  const total = handoverCount + returnCount + overdueCount + upcomingCount;
  if (total === 0 && !forceTest) {
    localStorage.setItem(morningKey, 'checked_empty');
    return false;
  }

  const parts: string[] = [];
  if (handoverCount > 0) parts.push(`${handoverCount} đơn giao`);
  if (returnCount > 0) parts.push(`${returnCount} đơn thu hồi`);
  if (overdueCount > 0) parts.push(`${overdueCount} đơn trễ hạn`);
  if (upcomingCount > 0) parts.push(`${upcomingCount} đơn ngày mai`);

  const title = `☀️ Nhắc việc 9h sáng (${formatDMY(todayDateStr)})`;
  const body = parts.length > 0 
    ? `Hôm nay có: ${parts.join(', ')}. Chúc tiệm một ngày làm việc hiệu quả! ✨`
    : 'Hôm nay hiện tại không có đơn nào cần bàn giao hay thu hồi. Chúc bạn một ngày tốt lành! ✨';

  const ok = await showPushNotification(title, body, `morning-${todayDateStr}-${Date.now()}`);
  if (ok && !forceTest) {
    localStorage.setItem(morningKey, 'sent');
  }
  return ok;
}

// Send an operation alert notification (with light 10s debounce to avoid React re-render duplicates)
export async function sendOperationNotification(
  title: string, 
  body: string, 
  signature: string
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const lastSentKey = `last_notif_sig`;
  const lastSentSig = localStorage.getItem(lastSentKey);
  const lastSentTimeKey = `last_notif_time`;
  const lastSentTime = localStorage.getItem(lastSentTimeKey);
  const now = Date.now();

  if (lastSentSig === signature && lastSentTime && now - parseInt(lastSentTime, 10) < 10000) {
    return false;
  }

  localStorage.setItem(lastSentKey, signature);
  localStorage.setItem(lastSentTimeKey, String(now));

  return showPushNotification(title, body, `op-${Date.now()}`);
}
