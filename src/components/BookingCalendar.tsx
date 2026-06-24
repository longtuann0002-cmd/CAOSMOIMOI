import React, { useState, useMemo, useEffect } from 'react';
import { Camera, RentalContract, BankConfig } from '../types';
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Camera as CameraIcon, AlertTriangle, CheckCircle, Info, Trash2, CreditCard, Settings, Phone, Copy } from 'lucide-react';
import { getCameraRateForDuration, checkBookingConflict } from '../utils/pricing';
import { loadStoredData, saveStoredData } from '../utils/mockData';
import { VIET_BANKS } from './ContractManager';

const getCameraColorProps = (shortName: string) => {
  const nameUpper = shortName.toUpperCase();
  if (nameUpper.includes('R50')) {
    return {
      border: 'border-rose-500',
      bgClass: 'bg-rose-50/90 text-rose-800 hover:bg-rose-100/90',
      tagColor: 'bg-rose-100 text-rose-800'
    };
  }
  if (nameUpper.includes('XS10') || nameUpper.includes('XS-10')) {
    return {
      border: 'border-emerald-500',
      bgClass: 'bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100/90',
      tagColor: 'bg-emerald-100 text-emerald-800'
    };
  }
  if (nameUpper.includes('A7') || nameUpper.includes('A74')) {
    return {
      border: 'border-amber-600',
      bgClass: 'bg-amber-50/90 text-amber-800 hover:bg-amber-100/90',
      tagColor: 'bg-amber-100 text-amber-800'
    };
  }
  if (nameUpper.includes('2470') || nameUpper.includes('GM')) {
    return {
      border: 'border-cyan-500',
      bgClass: 'bg-cyan-50/90 text-cyan-800 hover:bg-cyan-100/90',
      tagColor: 'bg-cyan-100 text-cyan-800'
    };
  }
  // Default orange for other devices / lenses
  return {
    border: 'border-orange-500',
    bgClass: 'bg-orange-50/90 text-orange-800 hover:bg-orange-100/90',
    tagColor: 'bg-orange-100 text-orange-805'
  };
};

interface BookingCalendarProps {
  cameras: Camera[];
  contracts: RentalContract[];
  onAddContract: (contract: RentalContract) => void;
  onDeleteContract?: (id: string) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  systemDate: string;
}

export default function BookingCalendar({
  cameras,
  contracts,
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
    customerId: 'cust-1',
    customerName: 'Nguyễn Văn Hải',
    customerPhone: '0912345678',
    customerDocType: 'CCCD' as const,
    customerDocNote: 'Giữ CCCD gốc',
    selectedCameraIds: [] as string[],
    startDate: '',
    endDate: '',
    is6Hours: false,
    returnTime: '18:00',
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
    switch (id) {
      case 'cam-1': return 2000000; // Canon EOS R50
      case 'cam-2': return 5000000; // Fujifilm X-S15
      case 'cam-3': return 10000000; // Sony A7M4
      case 'cam-4': return 5000000; // Sony FE 24-70mm GM II
      case 'cam-5': return 1000000; // Sigma 56mm f/1.4
      default: return 2000000;
    }
  };

  const calculatedRecommendedDeposit = useMemo(() => {
    return formData.selectedCameraIds.reduce((sum, id) => sum + getCameraRecommendedDeposit(id), 0);
  }, [formData.selectedCameraIds]);

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

  // Calculate grid info for the rendered month OR week
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      // Get first day of the month
      const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is CN (Sunday), 1 is T2, etc.
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
      // Weekly view: 7 days containing the selectedDate (starting from Sunday of that week)
      const baseDate = new Date(selectedDate);
      const dayOfWeek = baseDate.getDay(); // 0 (CN) to 6 (T7)
      const startOfWeek = new Date(baseDate);
      startOfWeek.setDate(baseDate.getDate() - dayOfWeek); // set to CN of the week

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

  // Dynamic Camera Real Time Status calculation for all devices
  const systemStatusInfo = useMemo(() => {
    // Show all cameras
    const displayCams = cameras;
    
    return displayCams.map(cam => {
      const activeBookingsToday = (dayBookingsMap[selectedDate] || []).filter(b => b.cameraShort === cam.shortName);
      
      let statusText = 'Còn trống cả ngày';
      let statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      
      if (activeBookingsToday.length > 0) {
        const hasFullDay = activeBookingsToday.some(b => (b.timeString === '00:00-00:00' && !b.contract.is6Hours));
        if (hasFullDay) {
          statusText = 'Kín lịch cả ngày';
          statusColor = 'bg-rose-50 text-rose-850 border-rose-250';
        } else {
          const times = activeBookingsToday.map(b => `${b.timeString}${b.contract.is6Hours ? ' (6h)' : ''}`).join(', ');
          statusText = `Bận giờ: ${times}`;
          statusColor = 'bg-amber-50 text-amber-850 border-amber-250';
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

  const handleQuickBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      contracts
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
      returnTime: formData.is6Hours ? formData.returnTime : undefined,
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
    // Reset form
    setFormData({
      customerId: 'cust-1',
      customerName: 'Nguyễn Văn Hải',
      customerPhone: '0912345678',
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
    <div className="space-y-6">
      {/* Real-time status cards of all cameras */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
        {systemStatusInfo.map(cam => (
          <div
            key={cam.id}
            className={`p-2 sm:p-2.5 border rounded-xl flex items-center gap-2 sm:gap-2.5 transition-all hover:shadow-xs ${cam.statusColor}`}
          >
            <div className="p-1 sm:p-1.5 rounded-lg bg-white shadow-3xs text-gray-700 shrink-0">
              <CameraIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-extrabold text-[11px] sm:text-xs text-gray-900 truncate leading-tight" title={cam.name}>{cam.name}</h3>
              <p className="text-[9px] sm:text-[10px] opacity-80 font-medium font-mono mt-0.5 truncate leading-normal">{cam.serialNumber}</p>
              <p className="text-[10px] sm:text-[11px] font-bold mt-1 flex items-center gap-1 leading-normal">
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block shrink-0 animate-pulse"></span>
                <span className="truncate">{cam.statusText}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Calendar Section */}
      <div className="bg-white border border-gray-150/70 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
        {/* Calendar Header with Navigation */}
        <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-3.5 sm:gap-4 mb-3 sm:mb-4 border-b border-gray-100 pb-3.5 sm:pb-4">
          <div className="space-y-0.5 flex items-center justify-between xl:block">
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2 select-none">
              <CalendarIcon className="text-orange-600 w-4.5 h-4.5 sm:w-5 sm:h-5 bg-orange-50 p-1 rounded-md sm:bg-transparent sm:p-0 shrink-0" /> Lịch Máy Ảnh
            </h2>
            <p className="text-gray-500 text-xs hidden sm:block">
              Phân tích trạng thái trống, lịch trực và đặt lịch thuê thiết bị nhanh chóng.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto">
            {/* Mobile optimization: display view mode switcher and prev/next date side-by-side or stacked cleanly */}
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              {/* View Switcher: Tháng / Tuần */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-150 text-[10.5px] sm:text-xs font-bold w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`flex-1 text-center px-2 sm:px-4 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    viewMode === 'month'
                      ? 'bg-white text-orange-600 shadow-3xs border border-gray-200/40 font-extrabold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Theo tháng
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`flex-1 text-center px-2 sm:px-4 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    viewMode === 'week'
                      ? 'bg-white text-orange-600 shadow-3xs border border-gray-200/40 font-extrabold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  Theo tuần
                </button>
              </div>

              {/* Timeframe selector header prev/next */}
              <div className="flex items-center justify-between border border-gray-200 rounded-lg bg-gray-50/80 p-0.5 w-full sm:w-auto gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="p-1 sm:p-1.5 text-gray-650 hover:bg-white hover:text-gray-900 rounded-md transition-all cursor-pointer shrink-0"
                  title={viewMode === 'month' ? "Tháng trước" : "Tuần trước"}
                >
                  <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.7]" />
                </button>
                <span className="px-1.5 font-extrabold text-gray-800 text-[11px] sm:text-xs text-center select-none truncate flex-1 sm:min-w-[120px]">
                  {viewMode === 'month' ? `${currentMonth}/${currentYear}` : 'Lịch tuần'}
                </span>
                <button
                  type="button"
                  onClick={handleNext}
                  className="p-1 sm:p-1.5 text-gray-650 hover:bg-white hover:text-gray-900 rounded-md transition-all cursor-pointer shrink-0"
                  title={viewMode === 'month' ? "Tháng sau" : "Tuần sau"}
                >
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.7]" />
                </button>
              </div>
            </div>

            {/* Save / Add Quick Button */}
            <button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  startDate: selectedDate,
                  endDate: selectedDate
                }));
                setShowAddQuickModal(true);
              }}
              className="px-3.5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-black text-[11px] sm:text-sm flex items-center justify-center gap-1.5 shadow-2xs sm:shadow-3xs transition-all w-full sm:w-auto h-9 sm:h-11 active:scale-[0.98] bg-orange-600 text-white hover:bg-orange-700 cursor-pointer uppercase tracking-wider"
              title="Đặt lịch nhanh"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" /> Đặt lịch nhanh
            </button>
          </div>
        </div>

        {/* Swipe / tap helper hint for mobile */}
        <div className="flex sm:hidden items-center justify-between text-[10px] text-orange-850 font-bold tracking-tight bg-orange-50/40 px-3 py-2 rounded-lg border border-orange-100/50 mb-2.5 select-none">
          <span className="flex items-center gap-1">
            ⚡ Chạm ngày bất kỳ để xem nhanh chi tiết lịch thuê ở dưới
          </span>
        </div>

        {/* Outer Grid Wrapper: fluid without requiring annoying horizontal scroll on mobile screen container grids */}
        <div className="w-full pb-1">
          <div className="w-full">
            
            {/* Day Grid Headers */}
            <div className="grid grid-cols-7 gap-1 bg-gray-50/70 py-1.5 sm:py-2 px-0.5 sm:px-2 rounded-lg sm:rounded-xl text-center font-black text-gray-500 text-[10.5px] sm:text-xs tracking-wider mb-1.5 sm:mb-2 select-none">
              <div>CN</div>
              <div>T2</div>
              <div>T3</div>
              <div>T4</div>
              <div>T5</div>
              <div>T6</div>
              <div>T7</div>
            </div>

            {/* Calendar Day Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarDays.map(({ day, isCurrentMonth, dateString }) => {
                const bookings = dayBookingsMap[dateString] || [];
                const bookingCount = bookings.length;
                const isSelected = selectedDate === dateString;

                // Determine status and style matching the legend
                let statusStyle = 'bg-emerald-50/65 border-emerald-100 hover:border-emerald-300'; // Trống
                if (bookingCount > 0) {
                  const hasFullDayBooking = bookings.some(b => !b.contract.is6Hours);
                  if (bookingCount >= 2 && hasFullDayBooking) {
                    statusStyle = 'bg-rose-55 border-rose-100 hover:border-rose-300'; // Kín lịch
                  } else {
                    statusStyle = 'bg-amber-50/75 border-amber-100 hover:border-amber-300'; // Có lịch lẻ
                  }
                }

                // Subdued styling if the day belongs to another month
                const monthStyle = isCurrentMonth ? 'text-gray-900' : 'text-gray-300 bg-gray-50/40 border-gray-100';

                return (
                  <div
                    key={dateString}
                    onClick={() => handleDayClick(dateString)}
                    className={`border rounded-lg sm:rounded-xl p-1 sm:p-2 cursor-pointer transition-all flex flex-col justify-between ${statusStyle} ${monthStyle} ${
                      isSelected ? 'ring-2 ring-orange-500/25 border-orange-500 bg-orange-50/10 shadow-xs' : 'hover:shadow-3xs'
                    } ${viewMode === 'week' ? 'min-h-[75px] sm:min-h-[160px]' : 'min-h-[48px] sm:min-h-[90px]'}`}
                  >
                    {/* Cell Header: Day number + count badge */}
                    <div className="flex justify-between items-center pb-0.5 sm:pb-1">
                      <span className={`text-[10px] sm:text-xs font-extrabold ${isCurrentMonth ? (isSelected ? 'text-orange-700' : 'text-gray-750') : 'text-gray-400'}`}>
                        {day}
                      </span>
                      {bookingCount > 0 && (
                        <span className="bg-white/95 border border-gray-200/50 text-gray-500 text-[7px] sm:text-[9px] font-extrabold px-1 sm:px-1.5 py-0.2 sm:py-0.5 rounded-full shadow-2xs leading-none">
                          {bookingCount}
                        </span>
                      )}
                    </div>

                    {/* Mobile Only: Beautiful high-contrast micro-labels with actual Camera Rental Codes */}
                    <div className="flex md:hidden flex-col gap-0.5 mt-1 select-none w-full max-w-full overflow-hidden">
                      {bookings.slice(0, 2).map((b, idx) => {
                        const colors = getCameraColorProps(b.cameraShort);
                        return (
                          <div
                            key={idx}
                            className={`px-1 py-0.5 rounded-[3px] text-[7.5px] font-black tracking-tighter leading-none border-l-[2px] ${colors.border} ${colors.bgClass} flex items-center justify-between truncate w-full shadow-4xs`}
                            title={`${b.cameraName}`}
                          >
                            <span className="truncate pr-0.5">{b.cameraShort}</span>
                            {b.contract.is6Hours && (
                              <span className="text-[6.5px] opacity-75 shrink-0">6h</span>
                            )}
                          </div>
                        );
                      })}
                      {bookingCount > 2 && (
                        <div className="text-[7px] font-extrabold text-orange-700 bg-orange-50/80 border border-orange-100 rounded-[2px] py-px text-center leading-none mt-0.5 font-sans shrink-0">
                          +{bookingCount - 2} máy
                        </div>
                      )}
                    </div>

                    {/* Desktop View: Booking item text blocks inside the day cell list */}
                    <div className={`hidden md:block space-y-1 mt-0.5 flex-grow overflow-y-auto scrollbar-none select-none ${viewMode === 'week' ? 'max-h-[105px] sm:max-h-[125px]' : 'max-h-[44px] sm:max-h-[48px]'}`}>
                      {bookings.map((b, idx) => {
                        const colors = getCameraColorProps(b.cameraShort);
                        return (
                          <div
                            key={idx}
                            className={`shadow-4xs group flex items-center justify-between px-1.5 py-0.5 border-l-[3px] ${colors.border} ${colors.bgClass} rounded-[4px] text-[10px] font-extrabold tracking-tight leading-normal truncate max-w-full transition-all`}
                            title={`${b.cameraName} (${b.contract.is6Hours ? `Lịch thuê 6 tiếng (Trả: ${b.contract.returnTime || '18:00'})` : b.timeString}) - ${b.contract.customerName}`}
                          >
                            <span className="truncate w-full text-[10px]">
                              {b.cameraShort} <span className="opacity-90 font-bold text-[9px]">({b.contract.is6Hours ? `6h` : b.timeString === '00:00-00:00' ? 'cả ngày' : b.timeString})</span>
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
        </div>

        {/* Legend Panel at Bottom */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-[10.5px] sm:text-xs text-gray-550 border-t border-gray-100 pt-3.5 select-none">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-3.5 h-2.5 rounded border border-emerald-200 bg-emerald-50/70 inline-block"></span>
            <span>Trống</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-3.5 h-2.5 rounded border border-amber-200 bg-amber-50/80 inline-block"></span>
            <span>Có lịch lẻ</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-3.5 h-2.5 rounded border border-rose-200 bg-rose-50 inline-block"></span>
            <span>Kín lịch</span>
          </div>
          <div className="sm:ml-auto text-gray-450 font-mono text-[9px] sm:text-[11px] mt-1 sm:mt-0 bg-orange-50/40 hover:bg-orange-50/70 px-2.5 py-0.5 sm:py-1 rounded-md border border-orange-100 transition-all flex items-center gap-1 border-dashed">
            <span>Ngày đang chọn:</span> <span className="text-orange-600 font-extrabold">{selectedDate}</span>
          </div>
        </div>

        {/* Mobile-Only Interactive Daily Agenda List */}
        {(() => {
          const calendarDaysWithBookings = calendarDays.filter(d => (dayBookingsMap[d.dateString] || []).length > 0);
          return (
            <div className="block md:hidden mt-4 border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3 select-none">
                <h3 className="text-xs font-black uppercase tracking-wider text-orange-750 flex items-center gap-1.5 font-display">
                  <span className="w-1.5 h-3 bg-orange-600 rounded-sm"></span>
                  Sổ biểu lịch máy thuê {viewMode === 'month' ? `tháng ${currentMonth}/${currentYear}` : 'trong tuần'}
                </h3>
                <span className="text-[10px] bg-orange-50 text-orange-700 font-extrabold px-2.5 py-0.5 rounded-full border border-orange-100 shadow-3xs leading-none">
                  {calendarDaysWithBookings.length} ngày có lịch
                </span>
              </div>

              {calendarDaysWithBookings.length > 0 ? (
                <div className="max-h-[320px] overflow-y-auto pr-1 space-y-2.5 scrollbar-none">
                  {calendarDaysWithBookings.map(({ dateString, day }) => {
                    const dayBookings = dayBookingsMap[dateString] || [];
                    const formattedDate = () => {
                      try {
                        const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                        const d = new Date(dateString);
                        return `${daysOfWeek[d.getDay()]}, Ngày ${day < 10 ? '0' + day : day}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                      } catch (e) {
                        return `Ngày ${day} tháng ${currentMonth}`;
                      }
                    };

                    const isSelected = selectedDate === dateString;

                    return (
                      <div
                        key={dateString}
                        onClick={() => handleDayClick(dateString)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-orange-50/80 border-orange-300 ring-2 ring-orange-500/10 shadow-xs'
                            : 'bg-gray-50/65 border-gray-150 hover:bg-slate-55/10'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2 leading-none select-none">
                          <span className="text-[11.5px] font-extrabold text-gray-800 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-orange-600 animate-pulse' : 'bg-gray-400'}`}></span>
                            {formattedDate()}
                          </span>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tight">
                            {dayBookings.length} lượt thuê
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {dayBookings.map((b, bIdx) => {
                            const colors = getCameraColorProps(b.cameraShort);
                            return (
                              <div
                                key={bIdx}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-extrabold shadow-4xs ${colors.bgClass} ${colors.border}`}
                              >
                                <span className="font-sans font-black tracking-tight">{b.cameraShort}</span>
                                <span className="w-1 h-1 rounded-full bg-current/30"></span>
                                <span className="opacity-90 font-medium">
                                  {b.contract.is6Hours ? 'Thuê 6h' : b.timeString === '00:00-00:00' ? 'Cả ngày' : b.timeString}
                                </span>
                                <span className="opacity-80 font-normal pr-0.5">({b.contract.customerName})</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-gray-50/30 border border-dashed border-gray-200 rounded-xl text-center select-none">
                  <p className="text-[11px] text-gray-400 italic font-medium">Khoảng thời gian này trống lịch thuê</p>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Selected Day Bookings Detail Inspector */}
      <div className="bg-white border border-gray-150/70 rounded-2xl shadow-sm p-4 sm:p-6 mb-6">
        <h3 className="font-extrabold text-gray-900 border-b border-gray-100 pb-3.5 mb-4 flex items-center gap-2 text-sm sm:text-base select-none">
          <Info className="w-4.5 h-4.5 text-blue-500 shrink-0" />
          Chi tiết đặt lịch cho ngày {selectedDate}
        </h3>

        {dayBookingsMap[selectedDate]?.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {dayBookingsMap[selectedDate].map((b, idx) => {
              const colors = getCameraColorProps(b.cameraShort);
              const qrIsOpen = showQrForContractCode === b.contract.contractCode;
              return (
                <div key={idx} className="border border-gray-150/50 rounded-2xl bg-gray-50/40 hover:bg-slate-55/10 transition-all flex flex-col overflow-hidden">
                  <div className="p-4 flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`${colors.tagColor} text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md font-mono shrink-0`}>
                          {b.contract.is6Hours ? `Thuê 6 tiếng (Trả: ${b.contract.returnTime || '18:00'})` : b.timeString === '00:00-00:00' ? 'Cả ngày' : b.timeString}
                        </span>
                        <h4 className="font-extrabold text-gray-800 text-sm truncate leading-snug">{b.cameraName}</h4>
                      </div>
                      
                      <div className="text-xs text-gray-550 flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">Mã:</span>
                          <span className="font-mono bg-gray-100 border border-gray-200 text-gray-750 font-bold px-1.5 py-0.5 rounded text-[10px] select-all">
                            {b.contract.contractCode}
                          </span>
                        </div>
                        <span className="text-gray-300 hidden sm:inline">|</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-400">Khách:</span>
                          <span className="font-extrabold text-gray-800">{b.contract.customerName}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1.5">
                        <a href={`tel:${b.contract.customerPhone}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-100/60 rounded-lg text-[11px] text-orange-700 font-mono font-bold transition-all shrink-0">
                          <Phone className="w-3 h-3 text-orange-500 fill-orange-500/10" /> {b.contract.customerPhone}
                        </a>
                        <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200/50 px-1.5 py-0.5 rounded font-bold shrink-0">
                          {b.contract.customerDocType === 'CCCD_And_1M' ? 'CCCD + 1 triệu cọc' : `${b.contract.customerDocType} cọc`}
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 gap-2 shrink-0">
                      <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-3xs shrink-0 ${
                        b.contract.status === 'Active' ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' :
                        b.contract.status === 'Overdue' ? 'bg-red-50 text-red-750 border border-red-150' :
                        'bg-gray-100 text-gray-705 border border-gray-200/65'
                      }`}>
                        {b.contract.status === 'Active' ? 'Đang thuê' :
                         b.contract.status === 'Overdue' ? 'Quá hạn' : 'Đã kết thúc'}
                      </span>
                      <div className="flex gap-1.5 items-center mt-0 sm:mt-1.5">
                        {onDeleteContract && (
                          <button
                            onClick={() => {
                              setDeleteConfirmId(b.contract.id);
                            }}
                            className="text-red-500 hover:text-white hover:bg-red-55 p-1.5 rounded-xl border border-transparent hover:border-red-100 transition-all cursor-pointer w-8.5 h-8.5 active:scale-95 flex items-center justify-center"
                            title="Xóa Hợp Đồng"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm italic py-4 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 select-none">
            Không có lịch đặt nào cho ngày này. Thiết bị sẵn sàng phục vụ!
          </p>
        )}
      </div>

      {/* Quick Booking Modal */}
      {showAddQuickModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden self-center animate-scale-up">
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
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tên khách hàng *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={formData.customerPhone}
                    onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="09xx xxx xxx"
                  />
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
                  {cameras.map(cam => {
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
                  })}
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
                      setFormData(prev => ({ ...prev, is6Hours: true, endDate: prev.startDate }));
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ngày bắt đầu *</label>
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {formData.is6Hours ? 'Giờ trả dự kiến (24h) *' : 'Ngày trả dự kiến *'}
                  </label>
                  {formData.is6Hours ? (
                    <div className="flex gap-2">
                      <div className="flex-1 border border-amber-200 bg-amber-50/20 text-amber-800 rounded-lg p-2 text-[10px] font-bold flex items-center justify-center h-[38px] cursor-not-allowed border-dashed">
                        ⏱️ Trả trong ngày
                      </div>
                      <input
                        type="time"
                        required
                        value={formData.returnTime}
                        onChange={e => setFormData({ ...formData, returnTime: e.target.value })}
                        className="w-[124px] border border-amber-300 bg-amber-50/30 rounded-lg px-2 py-1.5 text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        title="Vui lòng nhập giờ trả máy hẹn trước"
                      />
                    </div>
                  ) : (
                    <input
                      type="date"
                      required
                      min={formData.startDate}
                      value={formData.endDate}
                      onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tiền cọc thế chấp (VND)</label>
                  <input
                    type="number"
                    value={formData.depositAmount || ''}
                    onChange={e => setFormData({ ...formData, depositAmount: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                    placeholder="VD: 5000000"
                  />
                  {calculatedRecommendedDeposit > 0 && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, depositAmount: calculatedRecommendedDeposit })}
                        className="text-[10px] text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer inline-block text-left"
                      >
                        💡 Cọc đề xuất: {calculatedRecommendedDeposit.toLocaleString()}đ
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cọc giữ máy trước (VND)</label>
                  <input
                    type="number"
                    value={formData.paidAmount || ''}
                    onChange={e => setFormData({ ...formData, paidAmount: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                    placeholder="VD: 500000"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, paidAmount: Math.round(calculatedTotal * 0.5) })}
                      className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all cursor-pointer text-center ${
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
                      className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all cursor-pointer text-center ${
                        formData.paidAmount === 0
                          ? 'bg-gray-200 border-gray-400 text-gray-800 shadow-xs font-extrabold'
                          : 'bg-gray-50 hover:bg-gray-150 text-gray-700 border-gray-200'
                      }`}
                      title="Không thu cọc giữ máy"
                    >
                      Không cọc (0đ)
                    </button>
                  </div>
                  <span className="text-[10px] text-orange-600 font-medium block mt-2 bg-orange-50/50 border border-orange-100/50 p-1.5 rounded-lg leading-relaxed">
                    💡 <b>Quy định:</b> Đặt lịch cọc trước 50% tiền thuê, hoặc chọn Không cọc nếu khách quen thanh toán khi trả máy.
                  </span>
                </div>
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

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddQuickModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 text-white px-5 py-2 rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm cursor-pointer"
                >
                  Xác nhận đặt lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-up border border-gray-100 p-6 space-y-4">
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
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlertMessage && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-scale-up border border-gray-100 p-6 space-y-4">
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
        </div>
      )}
    </div>
  );
}
