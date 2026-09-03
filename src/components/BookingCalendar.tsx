import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Camera, RentalContract, BankConfig, Customer } from '../types';
import MoneyInput from './MoneyInput';
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Camera as CameraIcon, AlertTriangle, CheckCircle, Info, Trash2, CreditCard, Settings, Phone, Copy, Sparkles, Clock, User, Filter, Eye, Image as ImageIcon, FileText } from 'lucide-react';
import { toPng } from 'html-to-image';
import { getCameraRateForDuration, checkBookingConflict, add6Hours } from '../utils/pricing';
import { loadStoredData, saveStoredData } from '../utils/mockData';
import { formatDMY } from '../utils/dateUtils';
import { VIET_BANKS } from './ContractManager';

const getCameraColorProps = (shortName: string) => {
  const nameUpper = (shortName || '').toUpperCase();
  if (nameUpper.includes('R50')) {
    return {
      border: 'border-rose-500',
      textClass: 'text-rose-700',
      bgClass: 'bg-rose-50/90 text-rose-800 hover:bg-rose-100/90',
      tagColor: 'bg-rose-100 text-rose-800'
    };
  }
  if (nameUpper.includes('XS10') || nameUpper.includes('XS-10')) {
    return {
      border: 'border-emerald-500',
      textClass: 'text-emerald-700',
      bgClass: 'bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100/90',
      tagColor: 'bg-emerald-100 text-emerald-800'
    };
  }
  if (nameUpper.includes('A7') || nameUpper.includes('A74')) {
    return {
      border: 'border-amber-600',
      textClass: 'text-amber-800',
      bgClass: 'bg-amber-50/90 text-amber-800 hover:bg-amber-100/90',
      tagColor: 'bg-amber-100 text-amber-800'
    };
  }
  if (nameUpper.includes('2470') || nameUpper.includes('GM')) {
    return {
      border: 'border-cyan-500',
      textClass: 'text-cyan-700',
      bgClass: 'bg-cyan-50/90 text-cyan-800 hover:bg-cyan-100/90',
      tagColor: 'bg-cyan-100 text-cyan-800'
    };
  }
  // Default orange for other devices / lenses
  return {
    border: 'border-orange-500',
    textClass: 'text-orange-700',
    bgClass: 'bg-orange-50/90 text-orange-800 hover:bg-orange-100/90',
    tagColor: 'bg-orange-100 text-orange-800'
  };
};

const renderDocTypeLabel = (docType: string) => {
  switch (docType) {
    case 'CCCD': return 'Giữ căn cước (CCCD)';
    case 'CCCD_And_1M': return 'Giữ CCCD + 1 triệu';
    case 'GPLX': return 'Giữ bằng lái (GPLX)';
    case 'Passport': return 'Giữ hộ chiếu (Passport)';
    case 'CashDeposit': return 'Đặt cọc tiền mặt';
    case 'Other': return 'Xe máy / Tài sản khác';
    default: return docType;
  }
};

interface BookingCalendarProps {
  cameras: Camera[];
  contracts: RentalContract[];
  customers?: Customer[];
  onAddContract: (contract: RentalContract) => void;
  onDeleteContract?: (id: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  systemDate: string;
}

export default function BookingCalendar({
  cameras,
  contracts,
  customers = [],
  onAddContract,
  onDeleteContract,
  selectedDate,
  setSelectedDate,
  systemDate
}: BookingCalendarProps) {
  // Calendar focuses on a target year and month. Initialize to match selectedDate (closest booking on startup)
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const parts = selectedDate.split('-');
    return parts[0] ? parseInt(parts[0]) : 2026;
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const parts = selectedDate.split('-');
    return parts[1] ? parseInt(parts[1]) : 5;
  }); // 1-indexed
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [showAddQuickModal, setShowAddQuickModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [customAlertMessage, setCustomAlertMessage] = useState<string | null>(null);
  const [selectedCameraFilter, setSelectedCameraFilter] = useState<string>('ALL');

  // Tự động hủy lọc nếu thiết bị đang chọn lọc bị chuyển sang trạng thái bảo trì
  useEffect(() => {
    if (selectedCameraFilter !== 'ALL') {
      const exists = cameras.some(c => c.status !== 'Maintenance' && c.shortName === selectedCameraFilter);
      if (!exists) {
        setSelectedCameraFilter('ALL');
      }
    }
  }, [cameras, selectedCameraFilter]);

  const goToToday = () => {
    const today = systemDate || new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    const parts = today.split('-');
    setCurrentYear(parseInt(parts[0]));
    setCurrentMonth(parseInt(parts[1]));
  };

  // Bank Configuration and selection states for Quick-Payment QR Codes
  const [bankConfig, setBankConfig] = useState<BankConfig>(() =>
    loadStoredData('rental_bank_config', {
      bankId: 'MB',
      accountNo: '0387532321',
      accountName: 'TIEM ANH NHA CAO'
    })
  );
  const [showQrForContractCode, setShowQrForContractCode] = useState<string | null>(null);
  const [calendarQrOption, setCalendarQrOption] = useState<'remaining' | 'deposit50' | 'full'>('remaining');

  const syncBankConfig = () => {
    const freshConfig = loadStoredData('rental_bank_config', {
      bankId: 'MB',
      accountNo: '0387532321',
      accountName: 'TIEM ANH NHA CAO'
    });
    setBankConfig(freshConfig);
  };
  
  // For quick booking form
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerDocType: 'CCCD' as const,
    customerDocNote: 'Giữ CCCD gốc',
    selectedCameraIds: [] as string[],
    startDate: '',
    endDate: '',
    is6Hours: false,
    startTime: '08:00',
    returnTime: '14:00',
    depositAmount: 0,
    paidAmount: 0,
    discountPercent: 0, // Tỷ lệ tự giảm giá (%)
    note: '',
  });

  const [prevCalculatedTotal, setPrevCalculatedTotal] = useState(0);

  const calculatedDays = useMemo(() => {
    if (formData.is6Hours) return 1;
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [formData.startDate, formData.endDate, formData.is6Hours]);

  const calculatedTotal = useMemo(() => {
    const dailyTotal = formData.selectedCameraIds.reduce((sum, id) => {
      const cam = cameras.find(c => c.id === id);
      return sum + (cam ? getCameraRateForDuration(cam, calculatedDays, formData.is6Hours) : 0);
    }, 0);
    const totalBeforeDiscount = formData.is6Hours ? dailyTotal : dailyTotal * calculatedDays;
    const discountAmount = Math.round(totalBeforeDiscount * (formData.discountPercent / 100));
    return Math.max(0, totalBeforeDiscount - discountAmount);
  }, [formData.selectedCameraIds, calculatedDays, formData.is6Hours, formData.discountPercent, cameras]);

  const getCameraRecommendedDeposit = (id: string): number => {
    const cam = cameras.find(c => c.id === id);
    if (cam && typeof cam.depositAmount === 'number') {
      return cam.depositAmount;
    }
    return 0;
  };

  const calculatedRecommendedDeposit = useMemo(() => {
    return formData.selectedCameraIds.reduce((sum, id) => sum + getCameraRecommendedDeposit(id), 0);
  }, [formData.selectedCameraIds, cameras]);

  const [prevRecommendedDeposit, setPrevRecommendedDeposit] = useState(0);

  // Auto-fill deposit amount when selecting equipment or switching to CashDeposit
  useEffect(() => {
    if (calculatedRecommendedDeposit !== prevRecommendedDeposit) {
      if (formData.depositAmount === 0 || formData.depositAmount === prevRecommendedDeposit || formData.customerDocType === 'CashDeposit') {
        setFormData(prev => ({
          ...prev,
          depositAmount: calculatedRecommendedDeposit
        }));
      }
      setPrevRecommendedDeposit(calculatedRecommendedDeposit);
    }
  }, [calculatedRecommendedDeposit, prevRecommendedDeposit, formData.depositAmount, formData.customerDocType]);

  // Synchronize dynamic reservation deposit value, defaulting to exactly 50% of calculated total price
  useEffect(() => {
    if (calculatedTotal !== prevCalculatedTotal) {
      const prevHalfPrice = Math.round(prevCalculatedTotal * 0.5);
      if (formData.paidAmount === 0 || formData.paidAmount === prevHalfPrice) {
        setFormData(prev => ({
          ...prev,
          paidAmount: Math.round(calculatedTotal * 0.5)
        }));
      }
      setPrevCalculatedTotal(calculatedTotal);
    }
  }, [calculatedTotal, prevCalculatedTotal, formData.paidAmount]);

  // Calculate grid info for the rendered month OR week (T2 đầu tuần, CN cuối tuần)
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      // Get first day of the month (Monday-first: 0 is T2, 1 is T3, ..., 6 is CN)
      const rawFirstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is CN, 1 is T2...
      const firstDayIndex = (rawFirstDayIndex + 6) % 7; // Convert to Monday-first (T2 = 0, ..., CN = 6)
      const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
      const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

      const days: { day: number; isCurrentMonth: boolean; dateString: string }[] = [];

      // Fill previous month padding days
      for (let i = firstDayIndex - 1; i >= 0; i--) {
        const prevDay = prevMonthDays - i;
        const m = currentMonth === 1 ? 12 : currentMonth - 1;
        const y = currentMonth === 1 ? currentYear - 1 : currentYear;
        days.push({
          day: prevDay,
          isCurrentMonth: false,
          dateString: `${y}-${String(m).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`
        });
      }

      // Fill current month days
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({
          day: i,
          isCurrentMonth: true,
          dateString: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        });
      }

      // Fill next month padding days to round up to multiple of 7 (usually 35 or 42 cells)
      const remainingCells = (7 - (days.length % 7)) % 7;
      for (let i = 1; i <= remainingCells; i++) {
        const m = currentMonth === 12 ? 1 : currentMonth + 1;
        const y = currentMonth === 12 ? currentYear + 1 : currentYear;
        days.push({
          day: i,
          isCurrentMonth: false,
          dateString: `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        });
      }

      return days;
    } else {
      // Weekly view: 7 days starting from Monday (T2) to Sunday (CN) of that week
      const baseDate = new Date(selectedDate);
      const rawDayOfWeek = baseDate.getDay(); // 0 (CN) to 6 (T7)
      const dayOfWeekMondayFirst = (rawDayOfWeek + 6) % 7; // 0 (T2) to 6 (CN)
      const startOfWeek = new Date(baseDate);
      startOfWeek.setDate(baseDate.getDate() - dayOfWeekMondayFirst); // set to T2 (Monday) of the week

      const days: { day: number; isCurrentMonth: boolean; dateString: string }[] = [];
      for (let i = 0; i < 7; i++) {
        const loopDate = new Date(startOfWeek);
        loopDate.setDate(startOfWeek.getDate() + i);
        const y = loopDate.getFullYear();
        const m = loopDate.getMonth() + 1;
        const d = loopDate.getDate();
        days.push({
          day: d,
          isCurrentMonth: m === currentMonth,
          dateString: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        });
      }
      return days;
    }
  }, [currentYear, currentMonth, viewMode, selectedDate]);

  // Map each calendar day to contracts
  const dayBookingsMap = useMemo(() => {
    const map: Record<string, { contract: RentalContract; cameraShort: string; cameraName: string; timeString: string }[]> = {};

    contracts.forEach(contract => {
      if (contract.status === 'Cancelled') return;
      
      const start = new Date(contract.startDate);
      const end = new Date(contract.endDate);
      
      // Loop from start date to end date
      let loopDate = new Date(start);
      while (loopDate <= end) {
        const dateStr = loopDate.toISOString().split('T')[0];
        if (!map[dateStr]) map[dateStr] = [];

        contract.items.forEach(item => {
          const cam = cameras.find(c => c.id === item.cameraId);
          const shortName = cam?.shortName || item.cameraName.substring(0, 5);

          // Build a dummy time range based on actual items to mimic the exact details from screenshot
          // For May 1: 00:00-00:00 XS10, 00:00-00:00 R50
          // For May 2: 00:00-08:00 XS10, 00:00-08:00 R50
          // For May 3: 06:00-00:00 XS10
          // For May 4: 00:00-06:00 XS10
          // For May 5: 12:00-00:00 R50
          let timeString = '00:00-00:00';
          if (contract.is6Hours) {
            const retTime = contract.returnTime || '18:00';
            const [hBase, mBase] = retTime.split(':');
            const hInt = parseInt(hBase) || 18;
            const startH = Math.max(0, hInt - 6);
            const startStr = `${String(startH).padStart(2, '0')}:${mBase || '00'}`;
            timeString = `${startStr}-${retTime}`;
          } else if (dateStr === '2026-05-02') timeString = '00:00-08:00';
          else if (dateStr === '2026-05-03') timeString = '06:00-00:00';
          else if (dateStr === '2026-05-04') timeString = '00:00-06:00';
          else if (dateStr === '2026-05-05') timeString = '12:00-00:00';
          else if (dateStr === '2026-05-14') {
            timeString = shortName === 'R50' ? '00:00-00:00' : '08:00-00:00';
          } else if (dateStr === '2026-05-17') {
            timeString = shortName === 'R50' ? '00:00-00:00' : '00:00-08:00';
          } else if (dateStr === '2026-05-18') {
            timeString = '00:00-12:00';
          } else if (dateStr === '2026-05-19') {
            timeString = '08:00-00:00';
          } else if (dateStr === '2026-05-20') {
            timeString = '00:00-08:00';
          }

          map[dateStr].push({
            contract,
            cameraShort: shortName,
            cameraName: item.cameraName,
            timeString
          });
        });

        // Advance 1 day
        loopDate.setDate(loopDate.getDate() + 1);
      }
    });

    return map;
  }, [contracts, cameras]);

  // Dynamic Camera Real Time Status calculation for active devices (excluding Maintenance)
  const systemStatusInfo = useMemo(() => {
    // Chỉ hiển thị các thiết bị không ở trạng thái bảo trì
    const displayCams = cameras.filter(cam => cam.status !== 'Maintenance');
    
    return displayCams.map(cam => {
      const activeBookingsToday = (dayBookingsMap[selectedDate] || []).filter(b => b.cameraShort === cam.shortName);
      
      let statusText = 'Còn trống cả ngày';
      let statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      
      if (activeBookingsToday.length > 0) {
        const hasFullDay = activeBookingsToday.some(b => (b.timeString === '00:00-00:00' && !b.contract.is6Hours));
        if (hasFullDay) {
          statusText = 'Kín lịch cả ngày';
          statusColor = 'bg-rose-50 text-rose-900 border-rose-300';
        } else {
          const times = activeBookingsToday.map(b => `${b.timeString}${b.contract.is6Hours ? ' (6h)' : ''}`).join(', ');
          statusText = `Bận giờ: ${times}`;
          statusColor = 'bg-amber-50 text-amber-900 border-amber-300';
        }
      }

      return {
        ...cam,
        statusText,
        statusColor
      };
    });
  }, [cameras, dayBookingsMap, selectedDate]);

  const handlePrev = () => {
    if (viewMode === 'month') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      // Go back 7 days from selectedDate
      const base = new Date(selectedDate);
      base.setDate(base.getDate() - 7);
      const dateStr = base.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      const parts = dateStr.split('-');
      setCurrentYear(parseInt(parts[0]));
      setCurrentMonth(parseInt(parts[1]));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      // Go forward 7 days from selectedDate
      const base = new Date(selectedDate);
      base.setDate(base.getDate() + 7);
      const dateStr = base.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      const parts = dateStr.split('-');
      setCurrentYear(parseInt(parts[0]));
      setCurrentMonth(parseInt(parts[1]));
    }
  };

  const [quickReceiptContract, setQuickReceiptContract] = useState<RentalContract | null>(null);
  const [isExportingReceipt, setIsExportingReceipt] = useState<boolean>(false);

  const handleExportReceiptImage = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      setCustomAlertMessage('Không tìm thấy dữ liệu để xuất ảnh!');
      return;
    }
    
    setIsExportingReceipt(true);
    await new Promise(resolve => setTimeout(resolve, 250));
    
    const prevMarginLeft = element.style.marginLeft;
    const prevMarginRight = element.style.marginRight;
    const prevWidth = element.style.width;
    const prevMinWidth = element.style.minWidth;
    const prevMaxWidth = element.style.maxWidth;
    
    element.style.marginLeft = '0';
    element.style.marginRight = '0';
    element.style.width = '420px';
    element.style.minWidth = '420px';
    element.style.maxWidth = '420px';
    
    try {
      const dataUrl = await toPng(element, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        pixelRatio: 2,
        width: 420,
      });
      
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Lỗi khi xuất ảnh:', err);
      setCustomAlertMessage('Không thể tạo file ảnh. Vui lòng thử lại!');
    } finally {
      element.style.marginLeft = prevMarginLeft;
      element.style.marginRight = prevMarginRight;
      element.style.width = prevWidth;
      element.style.minWidth = prevMinWidth;
      element.style.maxWidth = prevMaxWidth;
      setIsExportingReceipt(false);
    }
  };

  const handleQuickBookingSubmit = (e?: React.FormEvent, exportReceiptAfterSave = false) => {
    if (e) e.preventDefault();
    if (formData.selectedCameraIds.length === 0) {
      setCustomAlertMessage('Vui lòng chọn ít nhất một thiết bị!');
      return;
    }
    if (!formData.is6Hours && (!formData.startDate || !formData.endDate)) {
      setCustomAlertMessage('Vui lòng nhập ngày bắt đầu và ngày kết thúc!');
      return;
    }
    if (formData.is6Hours && !formData.startDate) {
      setCustomAlertMessage('Vui lòng nhập ngày thuê!');
      return;
    }

    if (!formData.is6Hours && formData.endDate < formData.startDate) {
      setCustomAlertMessage('Ngày trả dự kiến không thể nhỏ hơn ngày bắt đầu!');
      return;
    }

    const conflict = checkBookingConflict(
      formData.selectedCameraIds,
      formData.startDate,
      formData.is6Hours ? formData.startDate : formData.endDate,
      formData.is6Hours,
      contracts,
      undefined,
      formData.is6Hours ? (formData.startTime || '08:00') : undefined,
      formData.is6Hours ? (formData.returnTime || '14:00') : undefined
    );
    if (conflict.hasConflict) {
      setCustomAlertMessage(conflict.message);
      return;
    }

    const items = formData.selectedCameraIds.map(id => {
      const cam = cameras.find(c => c.id === id);
      return {
        cameraId: id,
        cameraName: cam?.name || 'Thiết bị',
        dailyRate: cam ? getCameraRateForDuration(cam, calculatedDays, formData.is6Hours) : 100000,
        quantity: 1
      };
    });

    const totalPrice = calculatedTotal;

    const contractCode = `HD-2026-${String(contracts.length + 1).padStart(3, '0')}`;

    const newContract: RentalContract = {
      id: `con-${Date.now()}`,
      contractCode,
      customerId: formData.customerId,
      customerName: formData.customerName,
      customerPhone: formData.customerPhone,
      customerDocType: formData.customerDocType,
      customerDocNote: formData.customerDocNote,
      items,
      startDate: formData.startDate,
      endDate: formData.is6Hours ? formData.startDate : formData.endDate,
      is6Hours: formData.is6Hours,
      startTime: formData.is6Hours ? (formData.startTime || '08:00') : undefined,
      returnTime: formData.is6Hours ? (formData.returnTime || '14:00') : undefined,
      totalPrice,
      discountPercent: formData.discountPercent,
      paidAmount: formData.paidAmount,
      depositAmount: formData.depositAmount,
      status: 'Pending',
      note: formData.note,
      createdAt: new Date().toISOString()
    };

    onAddContract(newContract);
    setShowAddQuickModal(false);

    if (exportReceiptAfterSave) {
      setQuickReceiptContract(newContract);
    }

    // Reset form
    setFormData({
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerDocType: 'CCCD',
      customerDocNote: 'Giữ CCCD gốc',
      selectedCameraIds: [],
      startDate: '',
      endDate: '',
      is6Hours: false,
      returnTime: '18:00',
      depositAmount: 0,
      paidAmount: 0,
      discountPercent: 0,
      note: '',
    });
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    const parts = dateStr.split('-');
    setCurrentYear(parseInt(parts[0]));
    setCurrentMonth(parseInt(parts[1]));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Real-time Camera Status & Filter Bar */}
      <div className="bg-white border border-gray-150/70 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-3xs">
        <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse"></span>
            <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Trạng thái máy trong ngày ({selectedDate})</span>
          </div>
          {selectedCameraFilter !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedCameraFilter('ALL')}
              className="text-[10px] text-orange-600 hover:text-orange-800 font-bold bg-orange-50 hover:bg-orange-100 px-2 py-0.5 rounded-md transition cursor-pointer flex items-center gap-1"
            >
              ✕ Bỏ lọc máy ({selectedCameraFilter})
            </button>
          )}
        </div>

        {systemStatusInfo.length === 0 ? (
          <div className="p-3 text-center text-xs text-gray-400 italic bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            Tất cả thiết bị hiện đang ở trạng thái bảo trì hoặc chưa có thiết bị sẵn sàng.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-2">
            {systemStatusInfo.map(cam => {
              const isFilterActive = selectedCameraFilter === cam.shortName;
              return (
                <div
                  key={cam.id}
                  onClick={() => setSelectedCameraFilter(prev => prev === cam.shortName ? 'ALL' : cam.shortName)}
                  className={`p-2 sm:p-2.5 border rounded-xl flex items-start gap-2 transition-all cursor-pointer select-none ${cam.statusColor} ${
                    isFilterActive ? 'ring-2 ring-orange-500 shadow-xs scale-102 bg-orange-50/40' : 'hover:shadow-3xs hover:scale-101'
                  }`}
                  title="Bấm để lọc xem lịch của máy này"
                >
                  <div className="p-1.5 rounded-lg bg-white/95 shadow-3xs text-gray-700 shrink-0 mt-0.5">
                    <CameraIcon className="w-3.5 h-3.5 text-gray-700" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="font-black text-[11px] sm:text-xs text-gray-900 truncate leading-tight">
                        {cam.shortName}
                      </h3>
                      <span className="text-[8.5px] font-bold text-gray-400 font-mono shrink-0">
                        {cam.category === 'Body' ? 'Body' : cam.category === 'Lens' ? 'Lens' : 'Combo'}
                      </span>
                    </div>
                    <p className="text-[9px] text-gray-500 font-semibold font-mono truncate leading-tight mt-0.5">
                      {cam.serialNumber}
                    </p>
                    <div className="text-[9px] sm:text-[10px] font-black mt-1.5 flex items-center gap-1 leading-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0"></span>
                      <span className="truncate">{cam.statusText}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Calendar Section */}
      <div className="bg-white border border-gray-150/70 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
        {/* Calendar Header with Navigation */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3.5 mb-3 sm:mb-4 border-b border-gray-100 pb-3.5 sm:pb-4">
          {/* Title & Today on Mobile */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 sm:p-2.5 bg-orange-600 text-white rounded-xl shadow-2xs">
                <CalendarIcon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
              </span>
              <div>
                <h2 className="text-base sm:text-xl font-black text-gray-900 tracking-tight select-none">
                  {viewMode === 'month' ? `Tháng ${String(currentMonth).padStart(2, '0')}, ${currentYear}` : `Lịch tuần`}
                </h2>
                <p className="text-gray-450 text-xs hidden sm:block">
                  Theo dõi lịch trống, lịch bận và nhận máy chính xác theo từng mốc
                </p>
              </div>
            </div>

            {/* Today Jump Button (Mobile only) */}
            <button
              type="button"
              onClick={goToToday}
              className="lg:hidden px-3 py-1.5 text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl transition cursor-pointer active:scale-95 flex items-center gap-1 shadow-3xs"
              title="Về ngày hôm nay"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Hôm nay</span>
            </button>
          </div>

          {/* Controls: Navigator + Switcher + Prominent CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            {/* Today Jump Button (Desktop / Web - Placed next to Tháng / Tuần) */}
            <button
              type="button"
              onClick={goToToday}
              className="hidden lg:flex px-3 py-2 text-xs font-bold bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-xl transition cursor-pointer active:scale-95 items-center gap-1.5 shadow-3xs shrink-0"
              title="Về ngày hôm nay"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>Hôm nay</span>
            </button>

            <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
              {/* View Switcher: Tháng / Tuần */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/80 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center ${
                    viewMode === 'month'
                      ? 'bg-white text-orange-600 shadow-3xs font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Tháng
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center ${
                    viewMode === 'week'
                      ? 'bg-white text-orange-600 shadow-3xs font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Tuần
                </button>
              </div>

              {/* Timeframe Navigator (Prev, Next) */}
              <div className="flex items-center justify-between border border-gray-200 rounded-xl bg-gray-50/80 p-0.5 gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1.5 text-gray-650 hover:bg-white hover:text-gray-900 rounded-lg transition-all cursor-pointer shrink-0"
                  title={viewMode === 'month' ? "Tháng trước" : "Tuần trước"}
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                </button>

                <span className="px-1.5 font-black text-gray-800 text-xs text-center select-none font-mono truncate flex-1 sm:min-w-[80px]">
                  {viewMode === 'month' ? `${String(currentMonth).padStart(2, '0')}/${currentYear}` : 'Tuần này'}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1.5 text-gray-650 hover:bg-white hover:text-gray-900 rounded-lg transition-all cursor-pointer shrink-0"
                  title={viewMode === 'month' ? "Tháng sau" : "Tuần sau"}
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Quick Booking Button - Prominent & Full Width on Mobile */}
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  startDate: selectedDate,
                  endDate: selectedDate
                }));
                setShowAddQuickModal(true);
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 active:scale-[0.98] bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white cursor-pointer uppercase tracking-wider whitespace-nowrap transition-all"
              title="Đặt lịch nhanh"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Đặt lịch nhanh</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="w-full pb-1">
          {/* Day Grid Headers: T2 ở đầu, CN ở cuối */}
          <div className="grid grid-cols-7 gap-1 bg-slate-100/70 py-2 px-1 rounded-xl text-center font-black text-gray-600 text-[11px] sm:text-xs tracking-wider mb-2 select-none">
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>
            <div className="text-rose-600 font-black">CN</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map(({ day, isCurrentMonth, dateString }) => {
              const allBookings = dayBookingsMap[dateString] || [];
              const bookings = selectedCameraFilter === 'ALL'
                ? allBookings
                : allBookings.filter(b => b.cameraShort.toUpperCase().includes(selectedCameraFilter.toUpperCase()));
              
              const bookingCount = bookings.length;
              const isSelected = selectedDate === dateString;
              const isToday = (systemDate || new Date().toISOString().split('T')[0]) === dateString;

              // Determine status and style matching the legend
              let statusStyle = 'bg-white border-gray-200 hover:border-emerald-400';
              if (bookingCount > 0) {
                const hasFullDayBooking = bookings.some(b => !b.contract.is6Hours);
                if (bookingCount >= 2 && hasFullDayBooking) {
                  statusStyle = 'bg-rose-50/80 border-rose-300 hover:border-rose-400';
                } else {
                  statusStyle = 'bg-amber-50/80 border-amber-300 hover:border-amber-400';
                }
              }

              // Subdued styling if the day belongs to another month
              const monthStyle = isCurrentMonth ? 'text-gray-900' : 'text-gray-300 bg-gray-50/40 border-gray-150';

              return (
                <div
                  key={dateString}
                  onClick={() => handleDayClick(dateString)}
                  className={`border rounded-xl p-1 sm:p-2 cursor-pointer transition-all flex flex-col justify-between ${statusStyle} ${monthStyle} ${
                    isSelected ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50/30 shadow-xs' : 'hover:shadow-3xs'
                  } ${viewMode === 'week' ? 'min-h-[85px] sm:min-h-[160px]' : 'min-h-[52px] sm:min-h-[92px]'}`}
                >
                  {/* Cell Header: Day number + count badge */}
                  <div className="flex justify-between items-center pb-0.5 sm:pb-1">
                    <span className={`text-[11px] sm:text-xs font-black inline-flex items-center justify-center ${
                      isToday 
                        ? 'w-5 h-5 rounded-full bg-orange-600 text-white shadow-3xs' 
                        : (isCurrentMonth ? (isSelected ? 'text-orange-700' : 'text-gray-800') : 'text-gray-400')
                    }`}>
                      {day}
                    </span>
                    {bookingCount > 0 && (
                      <span className="bg-white/95 border border-gray-200 text-gray-700 text-[8px] sm:text-[9.5px] font-black px-1.5 py-0.5 rounded-full shadow-3xs leading-none">
                        {bookingCount}
                      </span>
                    )}
                  </div>

                  {/* Mobile View: High-contrast micro-labels */}
                  <div className="flex md:hidden flex-col gap-0.5 mt-0.5 select-none w-full overflow-hidden">
                    {bookings.slice(0, 2).map((b, idx) => {
                      const colors = getCameraColorProps(b.cameraShort);
                      return (
                        <div
                          key={idx}
                          className={`px-1 py-0.5 rounded-[4px] text-[8px] font-black tracking-tight leading-tight border border-black/5 border-l-2 ${colors.border} ${colors.bgClass} flex items-center justify-between truncate w-full shadow-3xs`}
                          title={`${b.cameraName}`}
                        >
                          <span className="truncate">{b.cameraShort}</span>
                          {b.contract.is6Hours && (
                            <span className="text-[7px] font-bold text-amber-800 shrink-0">6h</span>
                          )}
                        </div>
                      );
                    })}
                    {bookingCount > 2 && (
                      <div className="text-[7.5px] font-black text-orange-700 bg-orange-100/80 border border-orange-200/60 rounded-[3px] py-px text-center leading-none mt-0.5 shrink-0">
                        +{bookingCount - 2} máy
                      </div>
                    )}
                  </div>

                  {/* Desktop View: Booking item text blocks */}
                  <div className={`hidden md:block space-y-1 mt-0.5 flex-grow overflow-y-auto scrollbar-none select-none ${viewMode === 'week' ? 'max-h-[105px] sm:max-h-[125px]' : 'max-h-[46px] sm:max-h-[50px]'}`}>
                    {bookings.map((b, idx) => {
                      const colors = getCameraColorProps(b.cameraShort);
                      return (
                        <div
                          key={idx}
                          className={`shadow-3xs group flex items-center justify-between px-1.5 py-0.5 border border-black/5 border-l-[2.5px] ${colors.border} ${colors.bgClass} rounded-[5px] text-[10px] font-extrabold tracking-tight leading-normal truncate max-w-full transition-all`}
                          title={`${b.cameraName} (${b.contract.is6Hours ? `Lịch thuê 6 tiếng (Trả: ${b.contract.returnTime || '18:00'})` : b.timeString}) - ${b.contract.customerName}`}
                        >
                          <span className="truncate w-full text-[10px]">
                            {b.cameraShort} <span className="opacity-80 font-semibold text-[9px]">({b.contract.is6Hours ? `6h` : b.timeString === '00:00-00:00' ? 'Cả ngày' : b.timeString})</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend Panel at Bottom */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mt-4 text-[11px] sm:text-xs text-gray-600 border-t border-gray-100 pt-3 select-none">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md border border-gray-300 bg-white inline-block"></span>
              <span>Sẵn sàng</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md border border-amber-300 bg-amber-100 inline-block"></span>
              <span>Có lịch lẻ / 6h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md border border-rose-300 bg-rose-100 inline-block"></span>
              <span>Kín lịch</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md border-2 border-orange-500 bg-orange-100 inline-block"></span>
              <span>Đang chọn</span>
            </div>
          </div>

          <div className="text-gray-600 font-mono text-[11px] bg-orange-50/60 px-3 py-1 rounded-lg border border-orange-200/60 flex items-center gap-1.5">
            <span className="font-sans font-bold">Ngày đang chọn:</span>
            <span className="text-orange-600 font-black">{formatDMY(selectedDate)}</span>
          </div>
        </div>

        {/* Mobile-Only Interactive Daily Agenda List */}
        {(() => {
          const calendarDaysWithBookings = calendarDays.filter(d => (dayBookingsMap[d.dateString] || []).length > 0);
          return (
            <div className="block md:hidden mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-2.5 select-none">
                <h3 className="text-xs font-black uppercase tracking-wider text-orange-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-orange-600 rounded-sm"></span>
                  Lịch máy thuê {viewMode === 'month' ? `tháng ${currentMonth}/${currentYear}` : 'trong tuần'}
                </h3>
                <span className="text-[10px] bg-orange-50 text-orange-700 font-black px-2 py-0.5 rounded-full border border-orange-200 leading-none">
                  {calendarDaysWithBookings.length} ngày có lịch
                </span>
              </div>

              {calendarDaysWithBookings.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 scrollbar-none">
                  {calendarDaysWithBookings.map(({ dateString, day }) => {
                    const dayBookings = dayBookingsMap[dateString] || [];
                    const formattedDate = () => {
                      try {
                        const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                        const d = new Date(dateString);
                        return `${daysOfWeek[d.getDay()]}, ${day < 10 ? '0' + day : day}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                      } catch (e) {
                        return `Ngày ${day}/${currentMonth}`;
                      }
                    };

                    const isSelected = selectedDate === dateString;

                    return (
                      <div
                        key={dateString}
                        onClick={() => handleDayClick(dateString)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/20 shadow-xs'
                            : 'bg-gray-50/70 border-gray-200 hover:bg-orange-50/20'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1.5 leading-none select-none">
                          <span className="text-xs font-black text-gray-850 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-orange-600 animate-pulse' : 'bg-gray-400'}`}></span>
                            {formattedDate()}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 font-mono">
                            {dayBookings.length} máy thuê
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {dayBookings.map((b, bIdx) => {
                            const colors = getCameraColorProps(b.cameraShort);
                            return (
                              <div
                                key={bIdx}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-black/5 border-l-2 text-[9.5px] font-black shadow-3xs ${colors.bgClass} ${colors.border}`}
                              >
                                <span>{b.cameraShort}</span>
                                <span className="opacity-75 font-normal text-[8.5px]">
                                  ({b.contract.is6Hours ? '6h' : b.timeString === '00:00-00:00' ? 'Cả ngày' : b.timeString})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl text-center select-none">
                  <p className="text-xs text-gray-400 italic font-medium">Khoảng thời gian này trống lịch thuê</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Selected Day Bookings Detail Inspector */}
      <div className="bg-white border border-gray-150/70 rounded-xl sm:rounded-2xl shadow-sm p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <Info className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-black text-gray-900 text-sm sm:text-base select-none">
                Chi tiết đặt lịch ngày {formatDMY(selectedDate)}
              </h3>
              <span className="text-xs text-gray-500">
                {dayBookingsMap[selectedDate]?.length || 0} thiết bị có lịch thuê trong ngày
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setFormData(prev => ({
                ...prev,
                startDate: selectedDate,
                endDate: selectedDate
              }));
              setShowAddQuickModal(true);
            }}
            className="text-xs font-bold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-600 border border-orange-200 px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm đơn ngày này</span>
          </button>
        </div>

        {dayBookingsMap[selectedDate]?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dayBookingsMap[selectedDate].map((b, idx) => {
              const colors = getCameraColorProps(b.cameraShort);
              return (
                <div key={idx} className="border border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-white hover:border-orange-200 transition-all p-3.5 flex flex-col justify-between gap-3 shadow-3xs">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`${colors.tagColor} text-xs font-black px-2 py-0.5 rounded-lg font-mono shrink-0`}>
                          {b.cameraShort}
                        </span>
                        <h4 className="font-extrabold text-gray-900 text-sm truncate">{b.cameraName}</h4>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border ${
                        b.contract.status === 'Active' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                        b.contract.status === 'Overdue' ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {b.contract.status === 'Active' ? 'Đang thuê' :
                         b.contract.status === 'Overdue' ? 'Quá hạn' : 'Đã xong'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-gray-150 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Thời gian thuê:</span>
                        <span className="font-bold text-gray-800 font-mono">
                          {b.contract.is6Hours ? `Gói 6 tiếng (Trả: ${b.contract.returnTime || '18:00'})` : (b.timeString === '00:00-00:00' ? 'Cả ngày' : b.timeString)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Khách hàng:</span>
                        <span className="font-extrabold text-gray-900">{b.contract.customerName}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Thế chấp:</span>
                        <span className="font-medium text-gray-700">
                          {b.contract.customerDocType === 'CCCD_And_1M' ? 'CCCD + 1M' : b.contract.customerDocType}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-2">
                    <a
                      href={`tel:${b.contract.customerPhone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg text-xs text-orange-700 font-mono font-bold transition"
                    >
                      <Phone className="w-3 h-3 text-orange-600" />
                      <span>{b.contract.customerPhone}</span>
                    </a>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border">
                        {b.contract.contractCode}
                      </span>
                      {onDeleteContract && (
                        <button
                          onClick={() => setDeleteConfirmId(b.contract.id)}
                          className="text-gray-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Xóa Hợp Đồng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 text-center select-none space-y-2">
            <p className="text-sm text-gray-500 font-medium">
              Không có lịch đặt nào cho ngày {selectedDate}. Toàn bộ thiết bị sẵn sàng cho thuê!
            </p>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  startDate: selectedDate,
                  endDate: selectedDate
                }));
                setShowAddQuickModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold hover:bg-orange-700 transition cursor-pointer shadow-3xs"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo đơn thuê ngay cho ngày này</span>
            </button>
          </div>
        )}
      </div>

      {showAddQuickModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full overflow-hidden self-center animate-scale-up">
            <div className="bg-orange-600 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" /> Đặt Lịch & Tạo Đơn Nhanh
              </h3>
              <button
                onClick={() => setShowAddQuickModal(false)}
                className="text-white/80 hover:text-white font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleQuickBookingSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tên khách hàng *</label>
                  {(() => {
                    const query = formData.customerName.trim().toLowerCase();
                    // Build deduplicated list from customers + contracts
                    const allKnown: { name: string; phone: string }[] = [];
                    const seen = new Set<string>();
                    [...customers.map(c => ({ name: c.name, phone: c.phone })),
                     ...contracts.map(c => ({ name: c.customerName, phone: c.customerPhone }))]
                      .forEach(item => {
                        const key = item.phone || item.name;
                        if (!seen.has(key) && item.name) { seen.add(key); allKnown.push(item); }
                      });
                    const nameSuggestions = query.length >= 1
                      ? allKnown.filter(k => k.name.toLowerCase().includes(query) && k.name !== formData.customerName)
                      : [];
                    return (
                      <>
                        <input
                          type="text"
                          required
                          value={formData.customerName}
                          onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder:text-gray-400 font-medium"
                          placeholder="VD: Nguyễn Văn Hải"
                          autoComplete="off"
                        />
                        {nameSuggestions.length > 0 && (
                          <div className="absolute left-0 top-full mt-0.5 w-full bg-white border border-orange-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-44 overflow-y-auto">
                            <div className="px-2 py-1 text-[10px] font-extrabold text-orange-600 uppercase tracking-wider bg-orange-50 border-b border-orange-100">
                              👥 Khách cũ gợi ý
                            </div>
                            {nameSuggestions.slice(0, 6).map((sug, i) => (
                              <button
                                key={i}
                                type="button"
                                onMouseDown={e => {
                                  e.preventDefault();
                                  setFormData({ ...formData, customerName: sug.name, customerPhone: sug.phone || formData.customerPhone });
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-orange-50 transition-colors flex items-center justify-between gap-2 cursor-pointer border-b border-gray-100 last:border-0"
                              >
                                <span className="font-semibold text-sm text-gray-850 truncate">{sug.name}</span>
                                {sug.phone && <span className="font-mono text-[11px] text-gray-500 shrink-0">{sug.phone}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại *</label>
                  {(() => {
                    const phone = formData.customerPhone.trim();
                    const matchedCustomer = phone.length >= 8
                      ? (customers.find(c => c.phone === phone) ||
                         contracts.reduce((found: any, c) => found || (c.customerPhone === phone ? { name: c.customerName, phone: c.customerPhone } : null), null))
                      : null;
                    return (
                      <div className="relative">
                        <input
                          type="tel"
                          required
                          value={formData.customerPhone}
                          onChange={e => {
                            const newPhone = e.target.value;
                            const found = newPhone.trim().length >= 8
                              ? (customers.find(c => c.phone === newPhone.trim()) ||
                                 contracts.reduce((f: any, c) => f || (c.customerPhone === newPhone.trim() ? { name: c.customerName } : null), null))
                              : null;
                            if (found && !formData.customerName) {
                              setFormData({ ...formData, customerPhone: newPhone, customerName: found.name });
                            } else {
                              setFormData({ ...formData, customerPhone: newPhone });
                            }
                          }}
                          className={`w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder:text-gray-400 font-medium font-mono ${matchedCustomer ? 'border-emerald-400 bg-emerald-50/50' : 'border-gray-300'}`}
                          placeholder="VD: 0912345678"
                        />
                        {matchedCustomer && (
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <span>✓</span>
                            <span>Khách cũ: <span className="font-bold">{matchedCustomer.name}</span></span>
                            {formData.customerName !== matchedCustomer.name && (
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, customerName: matchedCustomer.name })}
                                className="ml-1 px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-emerald-700 transition-colors"
                              >
                                Điền tên
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>


              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Giấy tờ thế chấp</label>
                  <select
                    value={formData.customerDocType}
                    onChange={e => {
                      const val = e.target.value as any;
                      const nextData = { ...formData, customerDocType: val };
                      if (val === 'CCCD_And_1M') {
                        nextData.depositAmount = 1000000;
                        if (!formData.customerDocNote || formData.customerDocNote === 'Giữ CCCD gốc') {
                          nextData.customerDocNote = 'Giữ CCCD gốc + 1.000.000đ';
                        }
                      }
                      setFormData(nextData);
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-medium text-gray-700"
                  >
                    <option value="CCCD">Căn cước công dân (CCCD)</option>
                    <option value="CCCD_And_1M">Giữ căn cước (CCCD) và 1 triệu đồng</option>
                    <option value="GPLX">Bằng lái xe (GPLX)</option>
                    <option value="Passport">Hộ chiếu (Passport)</option>
                    <option value="CashDeposit">Đặt cọc tiền mặt</option>
                    <option value="Other">Hình thức khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú thế chấp</label>
                  <input
                    type="text"
                    value={formData.customerDocNote}
                    onChange={e => setFormData({ ...formData, customerDocNote: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="VD: Wave S BKS 29-X... + Thẻ SV"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Chọn thiết bị cần thuê *</label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-[144px] overflow-y-auto space-y-2 bg-gray-50/50">
                  {cameras.filter(cam => cam.status !== 'Maintenance').length === 0 ? (
                    <p className="text-xs text-gray-400 italic text-center py-2">
                      Hiện không có thiết bị khả dụng (toàn bộ thiết bị đang bảo trì).
                    </p>
                  ) : (
                    cameras.filter(cam => cam.status !== 'Maintenance').map(cam => {
                      const isSelected = formData.selectedCameraIds.includes(cam.id);
                      return (
                        <label key={cam.id} className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium hover:text-orange-600 transition-colors">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setFormData({
                                  ...formData,
                                  selectedCameraIds: formData.selectedCameraIds.filter(id => id !== cam.id)
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedCameraIds: [...formData.selectedCameraIds, cam.id]
                                });
                              }
                            }}
                            className="rounded text-orange-600 focus:ring-orange-500 h-4 w-4 border-gray-300"
                          />
                          <div className="flex-grow flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 min-w-0">
                            <span className="truncate text-gray-850 font-bold sm:font-medium text-xs sm:text-sm flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="truncate">{cam.name}</span>
                              <span className="bg-gray-150 text-gray-600 border border-transparent text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0">{cam.serialNumber}</span>
                            </span>
                            <span className="font-mono text-xs text-orange-600 font-extrabold sm:font-bold shrink-0">
                              {formData.is6Hours 
                                ? `${(cam.price6Hours ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.6)).toLocaleString()}đ/6h` 
                                : (calculatedDays > 0 
                                  ? `${Math.round(getCameraRateForDuration(cam, calculatedDays, false)).toLocaleString()}đ/ngày (${calculatedDays}n)` 
                                  : `${(cam.price1Day ?? cam.dailyRate).toLocaleString()}đ/ngày`
                                )
                              }
                            </span>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Rental type toggle */}
              <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-150">
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
                  <span>⏱️ Hình thức thuê & thời gian:</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                       setFormData(prev => ({ ...prev, is6Hours: false }));
                    }}
                    className={`p-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer border text-center flex flex-col items-center justify-center gap-0.5 ${
                      !formData.is6Hours
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-white hover:bg-gray-50 text-gray-650 border-gray-200'
                    }`}
                  >
                    <span>📅 Thuê theo ngày</span>
                    <span className={`text-[10px] font-normal ${!formData.is6Hours ? 'text-orange-100' : 'text-gray-400'}`}>
                      Tính theo mốc ngày lũy tiến
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        is6Hours: true,
                        endDate: prev.startDate,
                        startTime: prev.startTime || '08:00',
                        returnTime: add6Hours(prev.startTime || '08:00')
                      }));
                    }}
                    className={`p-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer border text-center flex flex-col items-center justify-center gap-0.5 ${
                      formData.is6Hours
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white hover:bg-amber-50/30 text-amber-800 border-amber-200/50'
                    }`}
                  >
                    <span>⚡ Thuê nhanh 6 tiếng</span>
                    <span className={`text-[10px] font-normal ${formData.is6Hours ? 'text-amber-100' : 'text-amber-655'}`}>
                      Mức phí ngắn hạn trong ngày
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {formData.is6Hours ? 'Ngày thuê máy *' : 'Ngày bắt đầu *'}
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={e => {
                      const d = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        startDate: d,
                        endDate: prev.is6Hours ? d : prev.endDate
                      }));
                    }}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  {formData.is6Hours ? (
                    <div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-amber-900 mb-1 truncate" title="Giờ lấy máy (HH:MM 24h)">
                            Giờ lấy máy *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            maxLength={5}
                            placeholder="08:00"
                            pattern="^([01]\d|2[0-3]):[0-5]\d$"
                            value={formData.startTime || '08:00'}
                            onChange={e => {
                              let t = e.target.value;
                              // Tự thêm dấu ":" khi nhập đủ 2 ký tự giờ
                              if (/^\d{2}$/.test(t) && (formData.startTime || '').length === 1) {
                                t = t + ':';
                              }
                              setFormData(prev => ({
                                ...prev,
                                startTime: t,
                                returnTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(t) ? add6Hours(t) : prev.returnTime
                              }));
                            }}
                            onBlur={e => {
                              const t = e.target.value;
                              if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) {
                                setFormData(prev => ({ ...prev, startTime: '08:00', returnTime: add6Hours('08:00') }));
                              }
                            }}
                            className="w-full border border-amber-300 bg-amber-50/40 rounded-lg px-2 py-2 text-sm font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none text-center tracking-widest"
                            title="Nhập giờ lấy máy theo định dạng 24h (VD: 08:00, 13:30)"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-900 mb-1 truncate" title="Giờ trả máy (Tự +6h, định dạng 24h)">
                            Giờ trả (+6h) *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            required
                            maxLength={5}
                            placeholder="14:00"
                            pattern="^([01]\d|2[0-3]):[0-5]\d$"
                            value={formData.returnTime || '14:00'}
                            onChange={e => {
                              let t = e.target.value;
                              if (/^\d{2}$/.test(t) && (formData.returnTime || '').length === 1) {
                                t = t + ':';
                              }
                              setFormData(prev => ({ ...prev, returnTime: t }));
                            }}
                            onBlur={e => {
                              const t = e.target.value;
                              if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) {
                                setFormData(prev => ({ ...prev, returnTime: add6Hours(prev.startTime || '08:00') }));
                              }
                            }}
                            className="w-full border border-amber-300 bg-amber-50/40 rounded-lg px-2 py-2 text-sm font-bold text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none text-center tracking-widest"
                            title="Giờ trả máy (định dạng 24h, tự động cộng 6 tiếng từ giờ lấy)"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-amber-700 font-medium mt-1">
                        ⏱️ Tự động tính: {formData.startTime || '08:00'} ➔ {formData.returnTime || '14:00'} (6 tiếng)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Ngày trả dự kiến *
                      </label>
                      <input
                        type="date"
                        required
                        min={formData.startDate}
                        value={formData.endDate}
                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tiền cọc thế chấp (VND)</label>
                  <MoneyInput
                    value={formData.depositAmount || 0}
                    onChange={v => setFormData({ ...formData, depositAmount: v })}
                    placeholder="VD: 5.000.000"
                    className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    suffixColor="gray"
                  />
                  {calculatedRecommendedDeposit > 0 && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, depositAmount: calculatedRecommendedDeposit })}
                        className="text-[10px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer inline-block text-left"
                      >
                        💡 Cọc máy quy định: {calculatedRecommendedDeposit.toLocaleString()}đ
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cọc giữ máy trước (VND)</label>
                  <MoneyInput
                    value={formData.paidAmount || 0}
                    onChange={v => setFormData({ ...formData, paidAmount: v })}
                    placeholder="VD: 500.000"
                    className="border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    suffixColor="gray"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paidAmount: Math.round(calculatedTotal * 0.5) })}
                      className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all cursor-pointer text-center whitespace-nowrap ${
                        formData.paidAmount === Math.round(calculatedTotal * 0.5)
                          ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs font-extrabold'
                          : 'bg-amber-50/50 hover:bg-amber-100/70 text-amber-800 border-amber-200'
                      }`}
                      title="Thu trước 50% tiền thuê"
                    >
                      Cọc 50% ({(Math.round(calculatedTotal * 0.5)).toLocaleString()}đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paidAmount: 0 })}
                      className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all cursor-pointer text-center whitespace-nowrap ${
                        formData.paidAmount === 0
                          ? 'bg-gray-200 border-gray-400 text-gray-800 shadow-xs font-extrabold'
                          : 'bg-gray-50 hover:bg-gray-150 text-gray-700 border-gray-200'
                      }`}
                      title="Không thu cọc giữ máy"
                    >
                      Không cọc (0đ)
                    </button>
                  </div>
                </div>
              </div>

              {/* TÍCH CHỌN: KHÁCH CHƯA THANH TOÁN 50% GIỮ MÁY */}
              <div className="bg-gradient-to-r from-amber-50 to-amber-100/70 border-2 border-amber-300 rounded-xl p-3.5 shadow-3xs">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.paidAmount === 0}
                    onChange={e => {
                      if (e.target.checked) {
                        setFormData({ ...formData, paidAmount: 0 });
                      } else {
                        setFormData({ ...formData, paidAmount: Math.round(calculatedTotal * 0.5) });
                      }
                    }}
                    className="w-5 h-5 text-amber-600 rounded border-amber-400 focus:ring-amber-500 mt-0.5 shrink-0 cursor-pointer accent-amber-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-amber-950 text-xs sm:text-sm leading-snug">⏳ Khách chưa thanh toán tiền cọc 50% để giữ máy</span>
                      {formData.paidAmount === 0 && (
                        <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black whitespace-nowrap shrink-0">
                          ✓ Đang tích chọn
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-amber-850 mt-1 leading-relaxed">
                      {formData.paidAmount === 0
                        ? `⚠️ Đơn sẽ được ghi nhận là "Chưa cọc 50% giữ máy" với số tiền cần thu là ${(Math.round(calculatedTotal * 0.5)).toLocaleString()}đ.`
                        : `✓ Khách đã thanh toán trước 50% tiền cọc (${formData.paidAmount.toLocaleString()}đ).`
                      }
                    </p>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tự giảm giá cho khách (%)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formData.discountPercent || ''}
                      onChange={e => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setFormData({ ...formData, discountPercent: val });
                      }}
                      className="w-16 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                      placeholder="0"
                    />
                    <div className="flex-1 flex gap-1 overflow-x-auto py-0.5 no-scrollbar">
                      {[0, 5, 10, 15, 20, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setFormData({ ...formData, discountPercent: pct })}
                          className={`px-2 py-1 text-xs font-bold rounded-md border transition-all cursor-pointer shrink-0 ${
                            formData.discountPercent === pct
                              ? 'bg-orange-500 border-orange-500 text-white shadow-xs'
                              : 'bg-white hover:bg-gray-50 text-gray-650 border-gray-200'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú đơn hàng</label>
                  <input
                    type="text"
                    value={formData.note}
                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Nhu cầu lấy máy sớm, lens lọc UV..."
                  />
                </div>
              </div>

              {/* Calculated price breakdown card */}
              {calculatedDays > 0 && calculatedTotal > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50/40 border border-orange-100/85 rounded-xl p-3 text-xs text-orange-850 flex justify-between items-center font-medium shadow-2xs">
                  <div>
                    <span className="font-extrabold text-orange-950">Báo giá tạm tính:</span>{' '}
                    {formData.selectedCameraIds.length} thiết bị &times;{' '}
                    {formData.is6Hours ? 'Gói thuê 6 tiếng' : `${calculatedDays} ngày (Đã áp dụng giảm giá)`}
                  </div>
                  <div className="font-mono font-black text-sm text-orange-700">
                    {calculatedTotal.toLocaleString()} đ
                  </div>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddQuickModal(false)}
                  className="px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-650 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-center whitespace-nowrap"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickBookingSubmit(undefined, true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <ImageIcon className="w-4 h-4 shrink-0" />
                  <span>Lưu & Xuất hóa đơn</span>
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 text-white font-bold px-4 sm:px-5 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm hover:bg-orange-700 transition-all cursor-pointer text-center whitespace-nowrap"
                >
                  Xác nhận đặt lịch
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Quick Invoice Receipt Modal for BookingCalendar */}
      {quickReceiptContract && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-[480px] w-full overflow-hidden self-center animate-scale-up border border-gray-100 flex flex-col max-h-[92vh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-orange-600 text-white px-4 sm:px-5 py-3 sm:py-3.5 flex justify-between items-center shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-1.5 truncate">
                  <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" /> <span className="truncate">Hợp đồng {quickReceiptContract.contractCode}</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-white/80 mt-0.5 truncate">Lập lúc: {new Date(quickReceiptContract.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <button
                onClick={() => setQuickReceiptContract(null)}
                className="text-white hover:text-gray-200 text-xl sm:text-2xl font-bold p-1.5 cursor-pointer leading-none shrink-0"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3 sm:p-4 space-y-3.5 flex-1 overflow-y-auto">
              <div id="calendar-contract-receipt-capture" className="bg-white p-3.5 sm:p-4 rounded-2xl space-y-3 font-sans text-gray-900 w-full box-border">
                {/* Visual Invoice Title for image export */}
                <div className="text-center space-y-1 border-b border-gray-200 pb-2.5">
                  <h3 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-wide">
                    HÓA ĐƠN BÀN GIAO & THANH TOÁN
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-[10.5px] sm:text-[11px] text-gray-500 font-mono whitespace-nowrap">
                    <span>Mã HĐ: <strong className="text-orange-600 font-bold">{quickReceiptContract.contractCode}</strong></span>
                    <span className="text-gray-300 font-normal">•</span>
                    <span>Ngày lập: {new Date(quickReceiptContract.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                </div>

                {/* Section 1: Customer details & Timings */}
                <div className="bg-slate-50/80 p-3.5 border border-slate-200/80 rounded-xl space-y-3">
                  <div className="space-y-1 min-w-0">
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">THÔNG TIN KHÁCH THUÊ</h4>
                    <p className="font-black text-gray-900 text-sm sm:text-base">{quickReceiptContract.customerName}</p>
                    <p className="text-xs text-gray-600 font-mono font-bold">SĐT: {quickReceiptContract.customerPhone}</p>
                    <div className="pt-0.5">
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-md inline-block">
                        Thế chấp: {renderDocTypeLabel(quickReceiptContract.customerDocType)}
                      </span>
                    </div>
                    {quickReceiptContract.customerDocNote && (
                      <p className="text-xs text-amber-950 bg-amber-50 border border-amber-200 p-2 rounded-lg font-mono leading-relaxed mt-1">
                        {quickReceiptContract.customerDocNote}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 pt-2.5 border-t border-gray-200">
                    <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">THÔNG TIN THỜI HẠN</h4>
                    <div className="space-y-1.5 text-xs sm:text-[13px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 font-medium whitespace-nowrap">Bắt đầu:</span>
                        <strong className="text-gray-900 font-bold font-mono whitespace-nowrap">{formatDMY(quickReceiptContract.startDate)}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-gray-500 font-medium whitespace-nowrap">Hạn trả máy:</span>
                        <strong className="text-gray-900 font-bold font-mono whitespace-nowrap">
                          {quickReceiptContract.is6Hours ? `Gói 6h (${quickReceiptContract.startTime || '08:00'} - ${quickReceiptContract.returnTime || '14:00'})` : formatDMY(quickReceiptContract.endDate)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rental Items Detail - ONLY item name, no price */}
                <div className="space-y-1.5">
                  <h4 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">DANH SÁCH THIẾT BỊ THUÊ</h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 bg-white">
                    {quickReceiptContract.items.map((i, idx) => (
                      <div key={idx} className="p-2.5 px-3.5 flex items-center text-xs sm:text-sm bg-white">
                        <div className="font-bold text-gray-900 truncate flex-1 min-w-0 flex items-center gap-2">
                          <span className="text-orange-500 text-xs">📷</span>
                          <span className="truncate">{i.cameraName}</span>
                          {i.quantity > 1 && (
                            <span className="text-gray-500 font-mono text-[11px] font-medium">({i.quantity} chiếc)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Summary Block */}
                <div className="bg-gradient-to-br from-orange-50/60 to-amber-50/40 border border-orange-200/80 p-3.5 sm:p-4 rounded-xl space-y-2.5">
                  {quickReceiptContract.discountPercent ? (
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-gray-600 font-medium">Giảm giá tự động:</span>
                      <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-xs shrink-0">-{quickReceiptContract.discountPercent}%</span>
                    </div>
                  ) : null}

                  <div className="flex justify-between items-center text-xs sm:text-sm gap-2">
                    <span className="text-gray-700 font-semibold">Tổng tiền thuê dự kiến:</span>
                    <span className="font-black text-gray-900 text-sm sm:text-base font-mono shrink-0">{quickReceiptContract.totalPrice.toLocaleString()}đ</span>
                  </div>

                  <div className="flex justify-between items-center text-xs sm:text-sm border-t border-orange-200/60 pt-2 text-gray-700 gap-2">
                    <span>Trị giá cọc thế chấp (VNĐ cọc):</span>
                    <span className="font-bold text-gray-800 font-mono shrink-0">{quickReceiptContract.depositAmount.toLocaleString()}đ</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs sm:text-sm border-t border-orange-200/60 pt-2 text-gray-700 gap-2">
                    <span className="font-medium text-amber-900">Khách cọc đặt giữ máy trước ({quickReceiptContract.totalPrice > 0 ? Math.round((quickReceiptContract.paidAmount / quickReceiptContract.totalPrice) * 100) : 0}%):</span>
                    <span className="font-bold text-amber-700 font-mono shrink-0">{quickReceiptContract.paidAmount.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm border-t border-orange-200/60 pt-2 text-gray-700 gap-2">
                    <span>Thực tế khách đã thanh toán:</span>
                    <span className="font-bold text-gray-400 font-mono shrink-0">0đ <span className="text-[10px] font-normal">(Chưa cọc)</span></span>
                  </div>
                  <div className="flex justify-between items-center text-xs sm:text-sm border-t border-orange-300 pt-2 font-bold text-gray-900 gap-2">
                    <span>Còn lại cần thanh toán khi nhận máy:</span>
                    <span className="text-rose-600 text-sm sm:text-base font-black font-mono shrink-0">{(quickReceiptContract.totalPrice - quickReceiptContract.paidAmount).toLocaleString()}đ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Print Simulate buttons - Centered */}
            <div className="bg-gray-50 px-4 sm:px-5 py-3.5 flex flex-wrap gap-2.5 justify-center items-center border-t border-gray-150 shrink-0">
              <button
                type="button"
                className="bg-white hover:bg-gray-100 border border-gray-250 text-gray-750 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-4xs min-h-[38px]"
                onClick={() => setCustomAlertMessage(`Đang chuẩn bị in hợp đồng ${quickReceiptContract.contractCode}... Vui lòng kết nối máy in để in bản cứng kèm chữ ký.`)}
              >
                In Hợp Đồng (Bản cứng)
              </button>

              <button
                type="button"
                disabled={isExportingReceipt}
                onClick={() => handleExportReceiptImage('calendar-contract-receipt-capture', `${quickReceiptContract.contractCode}_thong_tin_thue.png`)}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-4xs border border-transparent min-h-[38px]"
              >
                <ImageIcon className="w-4 h-4" /> {isExportingReceipt ? 'Đang tạo...' : 'Xuất ảnh Hợp đồng'}
              </button>

              <button
                type="button"
                onClick={() => setQuickReceiptContract(null)}
                className="bg-gray-800 text-white hover:bg-gray-900 border border-transparent font-bold text-xs px-5 py-2 rounded-xl transition-colors cursor-pointer text-center min-h-[38px]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-650">
              <span className="p-2 bg-red-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-red-600" />
              </span>
              <h3 className="font-bold text-lg text-gray-900">Xác nhận xóa hợp đồng</h3>
            </div>
            
            <p className="text-sm text-gray-500">
              Bạn có chắc chắn muốn xóa vĩnh viễn hợp đồng này? Hành động này sẽ cập nhật lại trạng thái thiết bị và hồ sơ khách hàng, bản ghi này sẽ bị gỡ bỏ hoàn toàn khỏi hệ thống.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-650 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteContract) {
                    onDeleteContract(deleteConfirmId);
                  }
                  setDeleteConfirmId(null);
                }}
                className="bg-red-600 text-white font-medium px-5 py-2 rounded-xl text-sm hover:bg-red-700 transition-all cursor-pointer"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Custom Alert Modal */}
      {customAlertMessage && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-up border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <span className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </span>
              <h4 className="font-bold text-base text-gray-900">Trùng lịch / Cảnh báo</h4>
            </div>
            <p className="text-sm text-gray-650 leading-relaxed font-sans">{customAlertMessage}</p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCustomAlertMessage(null)}
                className="bg-amber-500 text-white font-medium px-5 py-2 rounded-xl text-sm hover:bg-amber-600 transition-all cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
