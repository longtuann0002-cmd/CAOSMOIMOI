import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RentalContract, Camera, ContractStatus } from '../types';
import { formatDMY } from '../utils/dateUtils';
import { 
  Bell, 
  BellRing, 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight, 
  FileText, 
  ChevronRight,
  Info,
  ExternalLink,
  Sliders,
  DollarSign,
  Smartphone,
  CheckCircle2,
  Send,
  Sparkles,
  Share,
  Radio,
  Copy,
  Check,
  Settings,
  Key
} from 'lucide-react';
import {
  isIOS,
  isStandalone,
  getNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  sendOperationNotification,
  checkAndTriggerMorningBriefing,
  updateAppBadge,
  clearAppBadge
} from '../utils/pushNotification';
import {
  isFirebaseConfigured,
  getFirebaseConfig,
  saveFirebaseConfig,
  registerDeviceFCMToken,
  getCurrentDeviceToken,
  broadcastToAllDevices,
  FirebaseConfig
} from '../utils/firebasePush';

interface NotificationCenterProps {
  contracts: RentalContract[];
  cameras: Camera[];
  onUpdateContractStatus: (id: string, status: ContractStatus, note?: string, paidAmount?: number) => void;
  systemDate: string;
  setSystemDate: (date: string) => void;
}

export default function NotificationCenter({
  contracts,
  cameras,
  onUpdateContractStatus,
  systemDate,
  setSystemDate
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToastAction, setShowToastAction] = useState(false);
  const [viewTab, setViewTab] = useState<'all' | 'handover' | 'return' | 'overdue' | 'upcoming'>('all');

  // To search within warnings list
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmHandoverId, setConfirmHandoverId] = useState<string | null>(null);
  const [confirmReturnId, setConfirmReturnId] = useState<string | null>(null);

  // Push Notification state
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isIPhoneDevice, setIsIPhoneDevice] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);
  const [pushErrorMessage, setPushErrorMessage] = useState('');
  const [showIPhoneGuide, setShowIPhoneGuide] = useState(false);

  // Firebase & Multi-Device Sync state
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [firebaseConfigDraft, setFirebaseConfigDraft] = useState<FirebaseConfig>(() => {
    return getFirebaseConfig() || {
      apiKey: '',
      authDomain: '',
      projectId: '',
      messagingSenderId: '',
      appId: '',
      vapidKey: ''
    };
  });
  const [fcmToken, setFcmToken] = useState<string | null>(getCurrentDeviceToken());
  const [isGettingToken, setIsGettingToken] = useState(false);
  const [isBroadcastingTest, setIsBroadcastingTest] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [showAdvancedFirebase, setShowAdvancedFirebase] = useState(false);

  // Sync push status when drawer opens
  useEffect(() => {
    setPushPermission(getNotificationPermission());
    setIsIPhoneDevice(isIOS());
    setIsAppInstalled(isStandalone());
  }, [isOpen]);

  // Note: Auto-trigger toast on mount is disabled to avoid spamming on each app launch.
  // Users can view reminders by clicking the bell icon.

  // Derived operational values
  const reminders = useMemo(() => {
    const tomorrowDate = (() => {
      const d = new Date(systemDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })();

    const list: Array<{
      id: string;
      type: 'handover' | 'return' | 'overdue' | 'upcoming';
      contract: RentalContract;
      title: string;
      description: string;
      badgeColor: string;
      badgeText: string;
    }> = [];

    contracts.forEach(c => {
      // 1. Handover Alert
      if (c.startDate === systemDate && c.status === 'Pending') {
        list.push({
          id: `handover-${c.id}`,
          type: 'handover',
          contract: c,
          title: `Bàn giao thiết bị cho ${c.customerName}`,
          description: `Bắt đầu hợp đồng ${c.contractCode}. Gồm ${c.items.length} thiết bị.`,
          badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          badgeText: 'Cần bàn giao'
        });
      }

      // 2. Return Alert
      if (c.endDate === systemDate && c.status === 'Active') {
        list.push({
          id: `return-${c.id}`,
          type: 'return',
          contract: c,
          title: `Thu hồi thiết bị từ ${c.customerName}`,
          description: `Hợp đồng ${c.contractCode} kết thúc hôm nay.`,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          badgeText: 'Tới hạn thu hồi'
        });
      }

      // 3. Overdue Alert
      const isPastDue = c.endDate < systemDate;
      if (c.status === 'Overdue' || (c.status === 'Active' && isPastDue)) {
        const daysLag = Math.max(1, Math.ceil((new Date(systemDate).getTime() - new Date(c.endDate).getTime()) / (1000 * 60 * 60 * 24)));
        list.push({
          id: `overdue-${c.id}`,
          type: 'overdue',
          contract: c,
          title: `TRỄ HẠN THU HỒI: ${c.customerName}`,
          description: `${c.contractCode} đã quá hạn ${daysLag} ngày (Hết hạn: ${c.endDate}).`,
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
          badgeText: `Quá hạn ${daysLag} ngày`
        });
      }

      // 4. Upcoming / Tomorrow Alert (Sắp thuê trước 1 ngày)
      if (c.startDate === tomorrowDate && c.status === 'Pending') {
        list.push({
          id: `upcoming-${c.id}`,
          type: 'upcoming',
          contract: c,
          title: `Lịch sắp thuê ngày mai: ${c.customerName}`,
          description: `Khách bắt đầu thuê ngày mai (${tomorrowDate}). Gói gồm ${c.items.length} thiết bị.`,
          badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
          badgeText: 'Sắp thuê (Ngày mai)'
        });
      }
    });

    return list;
  }, [contracts, systemDate]);

  // Filter reminders by selected filter tab & search query
  const filteredReminders = useMemo(() => {
    return reminders.filter(r => {
      const matchesTab = viewTab === 'all' || r.type === viewTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        r.contract.customerName.toLowerCase().includes(q) ||
        r.contract.customerPhone.includes(q) ||
        r.contract.contractCode.toLowerCase().includes(q) ||
        r.contract.items.some(i => i.cameraName.toLowerCase().includes(q));

      return matchesTab && matchesSearch;
    });
  }, [reminders, viewTab, searchQuery]);

  const stats = useMemo(() => {
    const handover = reminders.filter(r => r.type === 'handover').length;
    const ret = reminders.filter(r => r.type === 'return').length;
    const overdue = reminders.filter(r => r.type === 'overdue').length;
    const upcoming = reminders.filter(r => r.type === 'upcoming').length;
    return { handover, return: ret, overdue, upcoming, total: reminders.length };
  }, [reminders]);

  // Push notifications are triggered on-demand (e.g. when creating an order or at scheduled 9:00 AM)
  // to avoid spamming the user whenever they open the app.

  const handleEnablePush = async () => {
    setPushErrorMessage('');
    const result = await requestNotificationPermission();
    if (result.granted) {
      setPushPermission('granted');
      setShowIPhoneGuide(false);
      await registerDeviceFCMToken().catch(() => {});
      updateAppBadge(1);
      await sendTestNotification();
    } else {
      setPushPermission(getNotificationPermission());
      if (result.requiresPWA) {
        setShowIPhoneGuide(true);
      }
      if (result.error) {
        setPushErrorMessage(result.error);
      }
    }
  };

  const handleSendTestPush = async () => {
    setIsSendingTest(true);
    setTestSentSuccess(false);
    updateAppBadge(1);
    const ok = await sendTestNotification();
    setIsSendingTest(false);
    if (ok) {
      setTestSentSuccess(true);
      setTimeout(() => setTestSentSuccess(false), 4000);
    }
  };

  const [isTestingMorning, setIsTestingMorning] = useState(false);
  const [testMorningSent, setTestMorningSent] = useState(false);
  const [badgeSetSuccess, setBadgeSetSuccess] = useState(false);

  const handleTestBadge = () => {
    updateAppBadge(1);
    setBadgeSetSuccess(true);
    setToastMessage('🔴 Đã kích hoạt số 1 đỏ! Bạn hãy vuốt về Màn hình chính của iPhone để xem icon ứng dụng nhé!');
    setShowToast(true);
    setTimeout(() => {
      setBadgeSetSuccess(false);
      setShowToast(false);
    }, 6000);
  };

  const handleClearBadge = () => {
    clearAppBadge();
    setToastMessage('Đã xóa số đỏ ngoài Icon app!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleTestMorning = async () => {
    setIsTestingMorning(true);
    const ok = await checkAndTriggerMorningBriefing(contracts, systemDate, true, broadcastToAllDevices);
    setIsTestingMorning(false);
    if (ok) {
      setTestMorningSent(true);
      setTimeout(() => setTestMorningSent(false), 4000);
    }
  };

  const handleGetFCMToken = async () => {
    setIsGettingToken(true);
    setPushErrorMessage('');
    const res = await registerDeviceFCMToken();
    setIsGettingToken(false);
    if (res.success && res.token) {
      setFcmToken(res.token);
      setToastMessage('Đã đăng ký Token thiết bị thành công vào hệ thống thông báo đa máy!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } else if (res.error) {
      setPushErrorMessage(res.error);
    }
  };

  const handleBroadcastTest = async () => {
    setIsBroadcastingTest(true);
    setBroadcastSent(false);
    await broadcastToAllDevices(
      '🔔 Thử nghiệm đồng bộ đa thiết bị',
      'Tất cả điện thoại và máy tính của tiệm đã kết nối đồng bộ thành công! 🎉'
    );
    setIsBroadcastingTest(false);
    setBroadcastSent(true);
    setTimeout(() => setBroadcastSent(false), 4000);
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveFirebaseConfig(firebaseConfigDraft);
    setShowFirebaseModal(false);
    setToastMessage('Đã lưu cấu hình Firebase! Bạn có thể lấy Token và bắt đầu đồng bộ đa thiết bị.');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Handover confirmation handler
  const handleConfirmHandover = (contractId: string) => {
    setConfirmHandoverId(contractId);
  };

  const executeHandover = (contractId: string) => {
    onUpdateContractStatus(contractId, 'Active', 'Bàn giao thiết bị đúng hạn ngày hiện tại.');
    setToastMessage(`Đã bàn giao và kích hoạt hợp đồng ${contracts.find(c => c.id === contractId)?.contractCode}!`);
    setShowToast(true);
    setShowToastAction(false);
    setTimeout(() => setShowToast(false), 3000);
    setConfirmHandoverId(null);
  };

  // Return confirmation handler
  const handleConfirmReturn = (contractId: string, paidAmount: number) => {
    setConfirmReturnId(contractId);
  };

  const executeReturn = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    onUpdateContractStatus(contractId, 'Completed', 'Đã thu hồi máy đầy đủ & nghiệm thu hợp đồng.', contract.totalPrice);
    setToastMessage(`Hợp đồng ${contract.contractCode} đã hoàn tất thành công!`);
    setShowToast(true);
    setShowToastAction(false);
    setTimeout(() => setShowToast(false), 3000);
    setConfirmReturnId(null);
  };

  return (
    <div className="relative">
      {/* Bell Trigger Icon inside Header */}
      <button
        id="notification-bell-btn"
        onClick={() => setIsOpen(true)}
        className={`relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl border transition-all cursor-pointer shadow-3xs active:scale-95 ${
          stats.total > 0
            ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100 hover:border-amber-300'
            : 'bg-white border-gray-200/80 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
        title="Thông báo nhắc nhở vận hành hôm nay"
      >
        <Bell className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" />
        {/* Floating count badge */}
        {stats.total > 0 && (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-mono text-[9px] font-extrabold min-w-4 h-4 px-1 flex items-center justify-center rounded-full border-2 border-white shadow-xs animate-pulse">
            {stats.total > 9 ? '9+' : stats.total}
          </span>
        )}
      </button>

      {/* Render overlay elements in document.body body portal so they are never clipped by header layout limitations */}
      {typeof document !== 'undefined' && createPortal(
        <>
          {/* Toast Notification Banner - Floating Top Right (Trên cùng góc phải) */}
          {showToast && (
            <div id="toast-notification-banner" className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:top-4 z-[9999] max-w-md sm:w-[440px] bg-amber-50/98 backdrop-blur-md rounded-2xl shadow-2xl border border-amber-200/80 border-l-[6px] border-l-amber-600 p-4 sm:p-5 transition-all duration-350 ease-out transform translate-y-0 animate-scale-up hover:shadow-amber-100/40 hover:border-amber-300">
              <div className="flex gap-3 sm:gap-4.5">
                <div className="p-2.5 sm:p-3 bg-amber-100/80 text-amber-900 rounded-xl shrink-0 h-fit border border-amber-200 shadow-xs">
                  <BellRing className="w-5 h-5 sm:w-5.5 sm:h-5.5 shrink-0 animate-bounce text-amber-700" />
                </div>
                
                <div className="flex-1 min-w-0 pr-1 sm:pr-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm font-extrabold font-display text-amber-950 tracking-tight">
                      Nhắc Nhở Vận Hành Hôm Nay
                    </span>
                    <span className="px-2 py-0.5 bg-amber-700 text-[10px] text-white rounded font-bold font-mono tracking-wider shrink-0 uppercase shadow-3xs">
                      {formatDMY(systemDate)}
                    </span>
                  </div>
                  <p className="text-amber-900 text-[11px] sm:text-xs mt-2 leading-relaxed font-bold">
                    {toastMessage}
                  </p>
                  
                  {showToastAction && (
                    <button
                      onClick={() => {
                        setIsOpen(true);
                        setShowToast(false);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all duration-200 active:scale-95 cursor-pointer"
                    >
                      <span>Xem danh sách chi tiết ({stats.total})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
 
                <button
                  onClick={() => setShowToast(false)}
                  className="p-1 sm:p-1.5 text-amber-805 hover:text-amber-950 hover:bg-amber-100/80 rounded-lg shrink-0 h-fit transition-colors cursor-pointer"
                  title="Đóng thông báo"
                >
                  <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </button>
              </div>
            </div>
          )}

          {/* Modal Overlay & Card Details */}
          {isOpen && (
            <div className="fixed inset-0 bg-gray-950/40 backdrop-blur-xs z-[9999] flex justify-end transition-opacity">
              
              {/* Closing backdrop click */}
              <div className="absolute inset-0" onClick={() => setIsOpen(false)} />

              {/* Slider content drawer container */}
              <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10 animate-fade-in sm:border-l border-gray-150">
                
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-150 px-4 sm:px-6 py-3 sm:py-4 z-10 flex flex-col gap-2.5 sm:gap-3">
                  {/* Top row: Title & Close */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 sm:p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                        <BellRing className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-display font-bold text-gray-950 truncate">
                          Trợ Lý Nhắc Nhở Vận Hành
                        </h2>
                        <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium truncate">
                          Tự động lọc các đơn hàng đến hạn bàn giao hoặc thu hồi
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition shrink-0"
                      title="Đóng"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Controls row: Date selector & Settings button */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    {/* System Today Selector widget - formatted as DD/MM/YYYY */}
                    <div className="relative flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 sm:py-1.5 rounded-lg border border-gray-200 text-slate-700 transition shrink-0 cursor-pointer">
                      <Calendar className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                      <span className="text-[11px] text-gray-500 font-medium shrink-0">Ngày:</span>
                      <span className="text-xs text-gray-800 font-bold tracking-tight">
                        {formatDMY(systemDate)}
                      </span>
                      <input
                        type="date"
                        value={systemDate}
                        onChange={(e) => setSystemDate(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        title="Thay đổi ngày hiện tại để kiểm tra thông báo nhắc nhở ngày khác"
                      />
                    </div>

                    {/* Settings Button */}
                    <button
                      type="button"
                      onClick={() => setShowFirebaseModal(true)}
                      className="px-2.5 py-1 sm:py-1.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 border border-slate-200/80 rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-3xs"
                      title="Cài đặt thông báo & Thử nghiệm chuông đa thiết bị"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-500" />
                      <span>Cài đặt</span>
                    </button>
                  </div>
                </div>

                {/* Quick Summary Widgets (Bento row) - Balanced grid fitting nicely on mobile */}
                <div className="border-b border-gray-150 bg-gray-50/70">
                  <div className="px-3 sm:px-6 py-2.5 sm:py-3 grid grid-cols-5 gap-1 sm:gap-2 text-center">
                    <button 
                      onClick={() => setViewTab('all')}
                      className={`py-1.5 sm:py-2 px-1 rounded-xl border transition ${
                        viewTab === 'all' 
                          ? 'bg-white border-orange-600 shadow-2xs text-orange-700 font-bold' 
                          : 'bg-white/60 sm:bg-transparent border-gray-200/60 sm:border-transparent text-gray-500 hover:bg-white'
                      }`}
                    >
                      <div className="text-sm sm:text-base font-bold font-mono">{stats.total}</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold font-sans mt-0.5 truncate">Tất cả</div>
                    </button>

                    <button 
                      onClick={() => setViewTab('handover')}
                      className={`py-1.5 sm:py-2 px-1 rounded-xl border transition ${
                        viewTab === 'handover' 
                          ? 'bg-indigo-50 border-indigo-200 shadow-2xs text-indigo-700 font-bold' 
                          : 'bg-white/60 sm:bg-transparent border-gray-200/60 sm:border-transparent text-gray-500 hover:bg-white'
                      }`}
                    >
                      <div className="text-sm sm:text-base font-bold font-mono text-indigo-650">{stats.handover}</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold font-sans mt-0.5 truncate">Bàn giao</div>
                    </button>

                    <button 
                      onClick={() => setViewTab('return')}
                      className={`py-1.5 sm:py-2 px-1 rounded-xl border transition ${
                        viewTab === 'return' 
                          ? 'bg-emerald-50 border-emerald-200 shadow-2xs text-emerald-700 font-bold' 
                          : 'bg-white/60 sm:bg-transparent border-gray-200/60 sm:border-transparent text-gray-500 hover:bg-white'
                      }`}
                    >
                      <div className="text-sm sm:text-base font-bold font-mono text-emerald-650">{stats.return}</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold font-sans mt-0.5 truncate">Thu hồi</div>
                    </button>

                    <button 
                      onClick={() => setViewTab('overdue')}
                      className={`py-1.5 sm:py-2 px-1 rounded-xl border transition ${
                        viewTab === 'overdue' 
                          ? 'bg-rose-50 border-rose-200 shadow-2xs text-rose-700 font-bold' 
                          : 'bg-white/60 sm:bg-transparent border-gray-200/60 sm:border-transparent text-gray-500 hover:bg-white'
                      }`}
                    >
                      <div className="text-sm sm:text-base font-bold font-mono text-rose-600">{stats.overdue}</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold font-sans mt-0.5 truncate">Trễ hạn</div>
                    </button>

                    <button 
                      onClick={() => setViewTab('upcoming')}
                      className={`py-1.5 sm:py-2 px-1 rounded-xl border transition ${
                        viewTab === 'upcoming' 
                          ? 'bg-amber-50 border-amber-250 shadow-2xs text-amber-700 font-bold' 
                          : 'bg-white/60 sm:bg-transparent border-gray-200/60 sm:border-transparent text-gray-500 hover:bg-white'
                      }`}
                    >
                      <div className="text-sm sm:text-base font-bold font-mono text-amber-655">{stats.upcoming}</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold font-sans mt-0.5 truncate">Sắp thuê</div>
                    </button>
                  </div>
                </div>

                {/* Local Filter search bar inside modal */}
                <div className="px-6 py-3 border-b border-gray-150 flex items-center bg-white gap-2">
                  <input 
                    type="text"
                    placeholder="Tìm nhanh theo khách hàng, số điện thoại, mã đơn..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-orange-600 hover:underline shrink-0"
                    >
                      Xoá lọc
                    </button>
                  )}
                </div>

                {/* Reminder list scroll area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50">
                  {filteredReminders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-16 bg-white rounded-2xl border border-gray-200 p-8">
                      <div className="p-3 bg-gray-50 text-gray-400 rounded-full mb-3">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 font-display">
                        Không tìm thấy sự kiện cần xử lý
                      </h3>
                      <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
                        Mọi thứ cho ngày hôm nay ({formatDMY(systemDate)}) đều trong tầm kiểm soát rồi hoặc bộ lọc của bạn không khớp!
                      </p>
                      
                      {/* Reset view tabs helper */}
                      {(viewTab !== 'all' || searchQuery) && (
                        <button
                          onClick={() => { setViewTab('all'); setSearchQuery(''); }}
                          className="mt-3 text-xs text-orange-650 hover:underline font-bold"
                        >
                          Đặt lại tìm kiếm ban đầu
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredReminders.map(item => {
                      const c = item.contract;
                      const totalPaid = c.paidAmount;
                      const totalPrice = c.totalPrice;
                      const remaining = totalPrice - totalPaid;

                      return (
                        <div 
                          key={item.id} 
                          className={`bg-white rounded-xl border p-4 shadow-sm relative transition hover:border-gray-300 ${
                            item.type === 'overdue' ? 'border-l-4 border-l-rose-500 border-gray-200' :
                            item.type === 'handover' ? 'border-l-4 border-l-indigo-500 border-gray-200' :
                            item.type === 'upcoming' ? 'border-l-4 border-l-amber-500 border-gray-200' :
                            'border-l-4 border-l-emerald-500 border-gray-200'
                          }`}
                        >
                          {/* Top banner / tags info */}
                          <div className="flex justify-between items-start gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-extrabold border rounded-md uppercase font-sans ${item.badgeColor}`}>
                              {item.badgeText}
                            </span>
                            
                            <div className="font-mono text-[11px] text-gray-400 font-bold">
                              {c.contractCode}
                            </div>
                          </div>

                          {/* Title Heading */}
                          <h4 className="text-sm font-extrabold text-gray-900 mt-2 font-display">
                            {item.title}
                          </h4>

                          {/* Items details list */}
                          <div className="mt-2 bg-gray-50 rounded-lg p-2.5 border border-gray-200/60 space-y-1">
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                              Thiết bị yêu cầu:
                            </div>
                            {c.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="font-medium text-gray-700 truncate max-w-[280px]">
                                  📷 {it.cameraName}
                                </span>
                                <span className="font-mono text-gray-500 text-[10px]">
                                  ({it.quantity} chiếc) • {Math.round(it.dailyRate).toLocaleString()}đ/ngày
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Customer / Deposit meta details */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-gray-650 font-medium">
                            <div className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{c.customerName}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <a href={`tel:${c.customerPhone}`} className="hover:underline text-orange-600 font-mono">
                                {c.customerPhone}
                              </a>
                            </div>

                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{formatDMY(c.startDate)} ĐẾN {formatDMY(c.endDate)}</span>
                            </div>

                            <div className="flex items-center gap-1 truncate" title={`Thế chấp: ${c.customerDocNote || 'Chưa cập nhật'}`}>
                              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">Cọc: <span className="font-semibold text-gray-800">{c.customerDocNote || 'Không có'}</span></span>
                            </div>
                          </div>

                          {/* Financial info block */}
                          <div className="mt-3 pt-3 border-t border-gray-150 flex justify-between items-center bg-gray-50/50 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl border-dashed">
                            <div>
                              <div className="text-[10.5px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                                Tổng giá trị đơn hàng
                              </div>
                              <div className="text-sm font-bold text-gray-900 font-mono mt-0.5">
                                {totalPrice.toLocaleString()}đ
                              </div>
                            </div>

                            <div className="text-right">
                              <div className="text-[10.5px] text-gray-400 font-bold uppercase tracking-wider leading-none">
                                {remaining > 0 ? 'Còn phải thu' : 'Trạng thái thanh toán'}
                              </div>
                              {remaining > 0 ? (
                                <div className="text-sm font-extrabold text-amber-600 font-mono mt-0.5 flex items-center justify-end gap-1">
                                  <DollarSign className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  {remaining.toLocaleString()}đ
                                </div>
                              ) : (
                                <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-mono mt-0.5 shrink-0 inline-block">
                                  Đã thu đủ 100%
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Operational Action Buttons section */}
                          <div className="mt-4 pt-4 border-t border-gray-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            {item.type === 'handover' && (
                              <button
                                onClick={() => handleConfirmHandover(c.id)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer w-full sm:w-auto"
                              >
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                Xác nhận bàn giao ngay
                              </button>
                            )}

                            {(item.type === 'return' || item.type === 'overdue') && (
                              <button
                                onClick={() => handleConfirmReturn(c.id, totalPrice)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-2xs cursor-pointer w-full sm:w-auto"
                              >
                                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                Xử lý trả máy & Hoàn tất
                              </button>
                            )}
                            
                            {item.type === 'upcoming' && (
                              <div className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-semibold flex items-center gap-1.5 w-full sm:w-auto">
                                <Clock className="w-3.5 h-3.5 shrink-0 text-amber-550 animate-pulse" /> Sắp đến hạn thuê ngày mai - Hãy sạc pin & chuẩn bị sẵn sàng thiết bị!
                              </div>
                            )}

                            {/* Direct Note addition details */}
                            <div className="text-[10px] text-gray-400 font-medium italic self-start sm:self-center">
                              * Thao tác sẽ cập nhật trạng thái thiết bị tự động.
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>
            </div>
          )}

          {/* Handover Custom Confirmation Modal */}
          {confirmHandoverId && (
            <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-up border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-3 text-indigo-650">
                  <span className="p-2 bg-indigo-50 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-indigo-600" />
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 font-display">Bàn giao thiết bị thuê</h3>
                </div>
                
                <p className="text-sm text-gray-650 leading-relaxed">
                  Xác nhận bàn giao thiết bị và kích hoạt hợp đồng <strong>{contracts.find(c => c.id === confirmHandoverId)?.contractCode}</strong> sang trạng thái <strong>ĐANG THUÊ (Active)</strong>?
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmHandoverId(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-650 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => executeHandover(confirmHandoverId)}
                    className="bg-indigo-600 text-white font-medium px-5 py-2 rounded-xl text-sm hover:bg-indigo-700 transition-all cursor-pointer"
                  >
                    Đồng ý bàn giao
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Return Custom Confirmation Modal */}
          {confirmReturnId && (() => {
            const contract = contracts.find(c => c.id === confirmReturnId);
            if (!contract) return null;
            const outstanding = contract.totalPrice - contract.paidAmount;
            return (
              <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
                <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-up border border-gray-150 p-6 space-y-4">
                  <div className="flex items-center gap-3 text-emerald-650">
                    <span className="p-2 bg-emerald-50 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </span>
                    <h3 className="font-bold text-lg text-gray-900 font-display">Nhận lại máy & Tất toán</h3>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-650 leading-relaxed">
                    <p>Xác nhận đã nhận đủ thiết bị nguyên vẹn từ khách hàng <strong>{contract.customerName}</strong> và thu hồi hợp đồng?</p>
                    <div className="bg-gray-50 border border-gray-200/50 p-3 rounded-xl space-y-1.5 font-sans font-medium text-xs mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-550">Mã đơn hàng:</span>
                        <span className="font-mono font-bold text-gray-800">{contract.contractCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-550">Tổng cộng cần thanh toán:</span>
                        <span className="font-mono font-bold text-gray-900">{contract.totalPrice.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-550">Đã thu cọc trước:</span>
                        <span className="font-mono text-emerald-700 font-semibold">{contract.paidAmount.toLocaleString()}đ</span>
                      </div>
                      {outstanding > 0 ? (
                        <div className="flex justify-between border-t border-dashed border-gray-250 pt-1.5 mt-1 text-red-650 font-bold">
                          <span>Cần thu thêm:</span>
                          <span className="font-mono text-base">{outstanding.toLocaleString()}đ</span>
                        </div>
                      ) : (
                        <div className="text-center font-bold text-emerald-600 border-t border-dashed border-gray-250 pt-1.5 mt-1">
                          ✓ Đã thanh toán đầy đủ
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfirmReturnId(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-650 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => executeReturn(confirmReturnId)}
                      className="bg-emerald-600 text-white font-medium px-5 py-2 rounded-xl text-sm hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                      Đồng ý tất toán
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Settings & Multi-Device Test Modal */}
          {showFirebaseModal && (
            <div className="fixed inset-0 bg-gray-950/50 backdrop-blur-xs z-[10000] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 animate-scale-up border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-150">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-200/60">
                      <Settings className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-slate-900">Cài Đặt Thông Báo & Thử Nghiệm</h3>
                      <p className="text-[11px] text-slate-500">Quản lý chuông, lịch thông báo 9h và đồng bộ đa thiết bị</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFirebaseModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Section 1: Push Status on this device */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Smartphone className="w-4 h-4 text-orange-600 shrink-0" />
                      <div>
                        <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <span>Thông báo trên máy này</span>
                          {pushPermission === 'granted' ? (
                            <span className="text-[9.5px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-md">
                              Đang bật
                            </span>
                          ) : (
                            <span className="text-[9.5px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.2 rounded-md">
                              Chưa bật
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-slate-500">
                          {pushPermission === 'granted'
                            ? 'Thiết bị đã sẵn sàng nhận chuông và banner khi có đơn mới.'
                            : 'Bật để nhận thông báo đẩy native trên màn hình khóa.'}
                        </p>
                      </div>
                    </div>

                    {pushPermission !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleEnablePush}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-black transition flex items-center gap-1 cursor-pointer shrink-0 shadow-xs active:scale-95"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Bật ngay</span>
                      </button>
                    )}
                  </div>

                  {/* iPhone Instruction Guide if requested */}
                  {(showIPhoneGuide || (isIPhoneDevice && !isAppInstalled && pushPermission !== 'granted')) && (
                    <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg space-y-1 text-left text-[10.5px] text-amber-900">
                      <div className="font-bold flex items-center gap-1">
                        <Share className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>Hướng dẫn trên iPhone:</span>
                      </div>
                      <ol className="list-decimal pl-4 space-y-0.5">
                        <li>Mở web bằng Safari ➔ Bấm nút <b>Chia sẻ ⎋</b>.</li>
                        <li>Chọn <b>"Thêm vào Màn hình chính"</b>.</li>
                        <li>Mở icon từ màn hình chính và bấm nút <b>"Bật ngay"</b>.</li>
                      </ol>
                    </div>
                  )}
                </div>

                {/* Section 2: Test Tools */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">Công cụ thử nghiệm chuông & huy hiệu</span>
                    <span className="text-[10.5px] text-slate-500">Kiểm tra âm thanh & icon</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={handleSendTestPush}
                      disabled={isSendingTest}
                      className="px-2 py-2 rounded-xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 text-slate-700 hover:text-orange-700 text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-3xs text-center"
                    >
                      <Send className={`w-3.5 h-3.5 text-orange-600 ${isSendingTest ? 'animate-spin' : ''}`} />
                      <span>{testSentSuccess ? 'Đã gửi test!' : 'Thử chuông máy này'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleTestMorning}
                      disabled={isTestingMorning}
                      className="px-2 py-2 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-slate-700 hover:text-amber-800 text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-3xs text-center"
                    >
                      <Clock className={`w-3.5 h-3.5 text-amber-600 ${isTestingMorning ? 'animate-spin' : ''}`} />
                      <span>{testMorningSent ? 'Đã gửi 9h!' : 'Thử nhắc 9h sáng'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBroadcastTest}
                      disabled={isBroadcastingTest}
                      className="px-2 py-2 rounded-xl border border-indigo-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 text-[11px] font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 shadow-3xs text-center"
                    >
                      <Radio className={`w-3.5 h-3.5 text-indigo-600 ${isBroadcastingTest ? 'animate-spin' : ''}`} />
                      <span>{broadcastSent ? 'Đã bắn tín hiệu!' : 'Bắn thử TẤT CẢ máy'}</span>
                    </button>
                  </div>

                  {/* App Icon Badge Test Area */}
                  <div className="p-2 bg-rose-50/60 border border-rose-200/80 rounded-xl flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-7 h-7 rounded-lg bg-white border border-rose-200 flex items-center justify-center text-xs font-black text-rose-600 shadow-2xs">
                          App
                        </div>
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs">
                          1
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black text-slate-800">Số đỏ ngoài biểu tượng Icon</div>
                        <div className="text-[9.5px] text-slate-500 truncate">Hiện số 1 đỏ trên icon app ngoài màn hình chính</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={handleTestBadge}
                        className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10.5px] font-bold transition shadow-xs active:scale-95 cursor-pointer"
                      >
                        {badgeSetSuccess ? 'Đã bật!' : 'Bật số 1 đỏ'}
                      </button>
                      <button
                        type="button"
                        onClick={handleClearBadge}
                        className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10.5px] font-bold transition cursor-pointer"
                        title="Xóa số đỏ"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>

                  {/* 9 AM schedule note */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200/60 rounded-lg text-[10.5px] text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span><b>Lịch cố định:</b> Tự động tổng hợp và đẩy thông báo vào đúng <b>09:00 sáng</b> hàng ngày.</span>
                  </div>
                </div>

                {/* Section 3: FCM & Multi-Device Sync */}
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                      <span className="text-xs font-black text-slate-800">Đồng bộ đám mây (FCM)</span>
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                        Đã kết nối
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAdvancedFirebase(!showAdvancedFirebase)}
                      className="text-[10.5px] text-orange-600 hover:text-orange-800 font-bold cursor-pointer"
                    >
                      {showAdvancedFirebase ? 'Thu gọn' : 'Chỉnh sửa Key'}
                    </button>
                  </div>

                  {/* Token display */}
                  {fcmToken ? (
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-white border border-slate-200/80 rounded-lg text-[10.5px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-mono text-slate-500 truncate">Token: {fcmToken.substring(0, 24)}...</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(fcmToken);
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2000);
                        }}
                        className="text-orange-600 hover:text-orange-800 font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedToken ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedToken ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleGetFCMToken}
                      disabled={isGettingToken}
                      className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-dashed border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Smartphone className={`w-3.5 h-3.5 text-orange-600 ${isGettingToken ? 'animate-spin' : ''}`} />
                      <span>{isGettingToken ? 'Đang lấy mã...' : 'Đăng ký thiết bị này vào danh bạ nhận thông báo'}</span>
                    </button>
                  )}

                  {/* Collapsed Firebase Form */}
                  {showAdvancedFirebase && (
                    <form onSubmit={handleSaveFirebaseConfig} className="space-y-2.5 pt-2 border-t border-slate-200 mt-2">
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">API Key</label>
                        <input
                          type="text"
                          required
                          value={firebaseConfigDraft.apiKey}
                          onChange={(e) => setFirebaseConfigDraft(prev => ({ ...prev, apiKey: e.target.value.trim() }))}
                          className="w-full px-2.5 py-1 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Project ID</label>
                          <input
                            type="text"
                            required
                            value={firebaseConfigDraft.projectId}
                            onChange={(e) => setFirebaseConfigDraft(prev => ({ ...prev, projectId: e.target.value.trim() }))}
                            className="w-full px-2.5 py-1 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">Sender ID</label>
                          <input
                            type="text"
                            required
                            value={firebaseConfigDraft.messagingSenderId}
                            onChange={(e) => setFirebaseConfigDraft(prev => ({ ...prev, messagingSenderId: e.target.value.trim() }))}
                            className="w-full px-2.5 py-1 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10.5px] font-bold text-slate-700 mb-0.5">VAPID Key</label>
                        <input
                          type="text"
                          value={firebaseConfigDraft.vapidKey || ''}
                          onChange={(e) => setFirebaseConfigDraft(prev => ({ ...prev, vapidKey: e.target.value.trim() }))}
                          className="w-full px-2.5 py-1 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="px-4 py-1.5 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition cursor-pointer"
                        >
                          Lưu lại
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowFirebaseModal(false)}
                    className="px-4 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          )}
        </>,
        document.body
      )}
    </div>
  );
}
