import React, { useMemo, useState } from 'react';
import { RentalContract, Expense, Camera } from '../types';
import { 
  DollarSign, Landmark, TrendingUp, TrendingDown, ClipboardList, 
  Calendar, FileText, Activity, Info, PieChart, ShoppingBag, 
  User, ChevronLeft, ChevronRight, BarChart3, CalendarDays, Filter,
  Camera as CameraIcon, Search, X, Clock, Layers, ArrowUpRight, CheckCircle2,
  AlertTriangle, Phone
} from 'lucide-react';

interface RevenueDashboardProps {
  contracts: RentalContract[];
  expenses: Expense[];
  cameras: Camera[];
}

export default function RevenueDashboard({
  contracts,
  expenses,
  cameras
}: RevenueDashboardProps) {
  // Extract all available years from contracts & expenses to create long-term calendar
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    const currentYear = new Date().getFullYear();
    yearsSet.add(currentYear);
    yearsSet.add(2025);
    yearsSet.add(2026);
    yearsSet.add(2027);

    contracts.forEach(c => {
      if (c.startDate) {
        const y = parseInt(c.startDate.substring(0, 4), 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });

    expenses.forEach(e => {
      if (e.date) {
        const y = parseInt(e.date.substring(0, 4), 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });

    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [contracts, expenses]);

  // Determine initial year (default to 2026 or latest contract year)
  const initialYear = useMemo(() => {
    if (contracts.length > 0) {
      const dates = contracts.map(c => c.startDate).filter(Boolean).sort();
      if (dates.length > 0) {
        const lastYear = parseInt(dates[dates.length - 1].substring(0, 4), 10);
        if (!isNaN(lastYear)) return lastYear;
      }
    }
    return 2026;
  }, [contracts]);

  // Selected Year for the long-term monthly chart and breakdown
  const [selectedYear, setSelectedYear] = useState<number>(initialYear);
  // selectedMonth: null means "All months in selectedYear", 1..12 means specific month
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Top timeframe filter state
  const [timeframe, setTimeframe] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>(`${selectedYear}-01-01`);
  const [customEnd, setCustomEnd] = useState<string>(`${selectedYear}-12-31`);

  // Selected equipment state for opening detail modal
  const [selectedCameraForModal, setSelectedCameraForModal] = useState<{
    id: string;
    name: string;
    shortName?: string;
    category?: string;
    serialNumber?: string;
    dailyRate?: number;
    image?: string;
  } | null>(null);

  // State for opening uncollected receivables drill-down modal
  const [showReceivablesModal, setShowReceivablesModal] = useState<boolean>(false);
  const [receivablesModalTab, setReceivablesModalTab] = useState<'debt' | 'deposit'>('debt');

  // Equipment table search and filter
  const [equipmentSearch, setEquipmentSearch] = useState<string>('');
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState<string>('all');

  // Compute boundaries for top timeframe filters dynamically
  const dateRange = useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;
    let label = 'Toàn bộ thời gian';

    const currentY = selectedYear;

    switch (timeframe) {
      case 'today': {
        const todayStr = `${currentY}-06-20`;
        start = new Date(todayStr);
        end = new Date(todayStr);
        label = `Hôm nay (${todayStr.split('-').reverse().join('/')})`;
        break;
      }
      case 'this-week': {
        start = new Date(`${currentY}-06-15`);
        end = new Date(`${currentY}-06-21`);
        label = `Tuần này (15/06 - 21/06/${currentY})`;
        break;
      }
      case 'last-week': {
        start = new Date(`${currentY}-06-08`);
        end = new Date(`${currentY}-06-14`);
        label = `Tuần trước (08/06 - 14/06/${currentY})`;
        break;
      }
      case 'this-month': {
        start = new Date(`${currentY}-06-01`);
        end = new Date(`${currentY}-06-30`);
        label = `Tháng 06/${currentY}`;
        break;
      }
      case 'last-month': {
        start = new Date(`${currentY}-05-01`);
        end = new Date(`${currentY}-05-31`);
        label = `Tháng 05/${currentY}`;
        break;
      }
      case 'this-quarter': {
        start = new Date(`${currentY}-04-01`);
        end = new Date(`${currentY}-06-30`);
        label = `Quý 2/${currentY}`;
        break;
      }
      case 'last-quarter': {
        start = new Date(`${currentY}-01-01`);
        end = new Date(`${currentY}-03-31`);
        label = `Quý 1/${currentY}`;
        break;
      }
      case 'this-year': {
        start = new Date(`${currentY}-01-01`);
        end = new Date(`${currentY}-12-31`);
        label = `Cả năm ${currentY}`;
        break;
      }
      case 'custom': {
        if (customStart) start = new Date(customStart);
        if (customEnd) end = new Date(customEnd);
        label = `Từ ${customStart ? new Date(customStart).toLocaleDateString('vi-VN') : 'khởi đầu'} đến ${customEnd ? new Date(customEnd).toLocaleDateString('vi-VN') : 'vô hạn'}`;
        break;
      }
      default:
        label = 'Toàn bộ thời gian';
    }

    return { start, end, label };
  }, [timeframe, customStart, customEnd, selectedYear]);

  // Helper date checker
  const isBetween = (dateStr: string, start: Date | null, end: Date | null): boolean => {
    if (!dateStr) return false;
    const itemDate = new Date(dateStr + 'T00:00:00');
    if (isNaN(itemDate.getTime())) return true;
    
    if (start) {
      const s = new Date(start);
      s.setHours(0, 0, 0, 0);
      if (itemDate < s) return false;
    }
    if (end) {
      const e = new Date(end);
      e.setHours(23, 59, 59, 999);
      if (itemDate > e) return false;
    }
    return true;
  };

  // Top Filtered contracts & expenses
  const filteredContracts = useMemo(() => {
    return (contracts || []).filter(c => {
      if (!c || c.status === 'Cancelled') return false;
      return isBetween(c.startDate, dateRange.start, dateRange.end);
    });
  }, [contracts, dateRange]);

  const filteredExpenses = useMemo(() => {
    return (expenses || []).filter(e => {
      if (!e) return false;
      return isBetween(e.date, dateRange.start, dateRange.end);
    });
  }, [expenses, dateRange]);

  // Contracts that currently have uncollected debt (totalPrice > paidAmount)
  const receivableContracts = useMemo(() => {
    return filteredContracts
      .filter(c => c.status !== 'Cancelled' && ((c.totalPrice || 0) - (c.paidAmount || 0) > 0))
      .map(c => ({
        ...c,
        remainingDebt: (c.totalPrice || 0) - (c.paidAmount || 0)
      }))
      .sort((a, b) => b.remainingDebt - a.remainingDebt);
  }, [filteredContracts]);

  // Contracts waiting for reservation deposit (Chưa thanh toán cọc 50% để giữ máy)
  const pendingDepositContracts = useMemo(() => {
    return filteredContracts
      .filter(c => c.status === 'Pending')
      .map(c => ({
        ...c,
        depositNeeded: c.paidAmount > 0 ? c.paidAmount : Math.round((c.totalPrice || 0) * 0.5)
      }))
      .sort((a, b) => b.depositNeeded - a.depositNeeded);
  }, [filteredContracts]);

  const totalPendingDeposit = useMemo(() => {
    return pendingDepositContracts.reduce((sum, c) => sum + c.depositNeeded, 0);
  }, [pendingDepositContracts]);

  // Overall Financials for the selected top timeframe
  const financials = useMemo(() => {
    const totalRevenue = filteredContracts
      .filter(c => c.status !== 'Pending' && c.status !== 'Cancelled')
      .reduce((sum, c) => sum + c.paidAmount, 0);

    const totalReceivables = filteredContracts
      .filter(c => c.status !== 'Cancelled')
      .reduce((sum, c) => sum + Math.max(0, c.totalPrice - c.paidAmount), 0);

    const activeRentalsCount = filteredContracts.filter(c => c.status === 'Active' || c.status === 'Overdue').length;
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalReceivables,
      activeRentalsCount,
      totalExpenses,
      netProfit
    };
  }, [filteredContracts, filteredExpenses]);

  // Comprehensive Equipment Revenue & Specific Rental Dates Computation
  const equipmentRentalAnalytics = useMemo(() => {
    const map = new Map<string, {
      cameraId: string;
      cameraName: string;
      shortName: string;
      category: string;
      serialNumber: string;
      dailyRate: number;
      image?: string;
      totalRevenue: number;
      totalDays: number;
      rentalCount: number;
      bookings: {
        contractId: string;
        contractCode: string;
        customerName: string;
        customerPhone: string;
        startDate: string;
        endDate: string;
        is6Hours: boolean;
        durationDays: number;
        quantity: number;
        itemDailyRate: number;
        itemRevenue: number;
        contractPaidAmount: number;
        contractTotalPrice: number;
        status: RentalContract['status'];
        note?: string;
      }[];
    }>();

    // Initialize all existing cameras in catalog
    cameras.forEach(cam => {
      map.set(cam.id, {
        cameraId: cam.id,
        cameraName: cam.name,
        shortName: cam.shortName,
        category: cam.category,
        serialNumber: cam.serialNumber,
        dailyRate: cam.dailyRate,
        image: cam.image,
        totalRevenue: 0,
        totalDays: 0,
        rentalCount: 0,
        bookings: []
      });
    });

    // Populate from filteredContracts
    filteredContracts.forEach(c => {
      const is6H = !!c.is6Hours;
      const durationDays = is6H 
        ? 0.5 
        : Math.max(1, Math.ceil((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);

      c.items.forEach(item => {
        let entry = map.get(item.cameraId);
        if (!entry) {
          const matched = cameras.find(cam => cam.name.toLowerCase() === item.cameraName.toLowerCase());
          if (matched) {
            entry = map.get(matched.id);
          }
          if (!entry) {
            entry = {
              cameraId: item.cameraId,
              cameraName: item.cameraName,
              shortName: item.cameraName,
              category: 'Body',
              serialNumber: 'N/A',
              dailyRate: item.dailyRate,
              image: undefined,
              totalRevenue: 0,
              totalDays: 0,
              rentalCount: 0,
              bookings: []
            };
            map.set(item.cameraId, entry);
          }
        }

        const itemEstPrice = is6H ? (item.dailyRate * 0.6 * item.quantity) : (item.dailyRate * durationDays * item.quantity);
        let itemRevenue = itemEstPrice;
        if (c.totalPrice > 0 && c.paidAmount !== undefined) {
          itemRevenue = Math.round((itemEstPrice / c.totalPrice) * c.paidAmount);
        }

        entry.rentalCount += 1;
        entry.totalDays += durationDays * (item.quantity || 1);
        entry.totalRevenue += itemRevenue;

        entry.bookings.push({
          contractId: c.id,
          contractCode: c.contractCode,
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          startDate: c.startDate,
          endDate: c.endDate,
          is6Hours: is6H,
          durationDays,
          quantity: item.quantity || 1,
          itemDailyRate: item.dailyRate,
          itemRevenue,
          contractPaidAmount: c.paidAmount,
          contractTotalPrice: c.totalPrice,
          status: c.status,
          note: c.note
        });
      });
    });

    // Sort bookings for each camera by startDate descending
    map.forEach(entry => {
      entry.bookings.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    });

    return Array.from(map.values());
  }, [cameras, filteredContracts]);

  // Top rented equipment
  const topRentedComponents = useMemo(() => {
    return equipmentRentalAnalytics
      .filter(item => item.rentalCount > 0)
      .sort((a, b) => b.rentalCount - a.rentalCount || b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [equipmentRentalAnalytics]);

  // Filtered equipment list for full equipment revenue table & mobile cards
  const displayEquipmentList = useMemo(() => {
    return equipmentRentalAnalytics
      .filter(item => {
        if (equipmentCategoryFilter !== 'all' && item.category !== equipmentCategoryFilter) {
          return false;
        }
        if (equipmentSearch.trim()) {
          const q = equipmentSearch.toLowerCase();
          const matchName = item.cameraName.toLowerCase().includes(q);
          const matchShort = item.shortName?.toLowerCase().includes(q);
          const matchSerial = item.serialNumber?.toLowerCase().includes(q);
          return matchName || matchShort || matchSerial;
        }
        return true;
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.rentalCount - a.rentalCount);
  }, [equipmentRentalAnalytics, equipmentCategoryFilter, equipmentSearch]);

  // Specific selected camera detail for Modal
  const modalCameraDetail = useMemo(() => {
    if (!selectedCameraForModal) return null;
    const analytics = equipmentRentalAnalytics.find(
      it => it.cameraId === selectedCameraForModal.id || it.cameraName.toLowerCase() === selectedCameraForModal.name.toLowerCase()
    );

    if (analytics) return analytics;

    return {
      cameraId: selectedCameraForModal.id,
      cameraName: selectedCameraForModal.name,
      shortName: selectedCameraForModal.shortName || selectedCameraForModal.name,
      category: selectedCameraForModal.category || 'Body',
      serialNumber: selectedCameraForModal.serialNumber || 'N/A',
      dailyRate: selectedCameraForModal.dailyRate || 0,
      image: selectedCameraForModal.image,
      totalRevenue: 0,
      totalDays: 0,
      rentalCount: 0,
      bookings: []
    };
  }, [selectedCameraForModal, equipmentRentalAnalytics]);

  // 12-Month Long Term Data for selectedYear
  const yearMonthlyData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const monthNum = i + 1;
      const monthStr = String(monthNum).padStart(2, '0');
      const prefix = `${selectedYear}-${monthStr}`;

      let revenue = 0;
      let expectedRevenue = 0;
      const monthContracts: RentalContract[] = [];

      contracts.forEach(c => {
        if (c.status === 'Cancelled') return;
        if (c.startDate && c.startDate.startsWith(prefix)) {
          revenue += c.paidAmount;
          expectedRevenue += c.totalPrice;
          monthContracts.push(c);
        }
      });

      let expenseTotal = 0;
      const monthExpenses: Expense[] = [];

      expenses.forEach(e => {
        if (e.date && e.date.startsWith(prefix)) {
          expenseTotal += e.amount;
          monthExpenses.push(e);
        }
      });

      const netProfit = revenue - expenseTotal;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return {
        monthIndex: monthNum,
        monthLabel: `Tháng ${monthNum}`,
        shortLabel: `T${monthNum}`,
        monthKey: prefix,
        revenue,
        expectedRevenue,
        expense: expenseTotal,
        netProfit,
        profitMargin,
        contracts: monthContracts,
        expenses: monthExpenses,
        hasData: monthContracts.length > 0 || monthExpenses.length > 0
      };
    });

    return months;
  }, [contracts, expenses, selectedYear]);

  // Max value for scaling SVG chart bars across all 12 months
  const chartMaxHeightValue = useMemo(() => {
    const allValues = yearMonthlyData.flatMap(d => [d.revenue, d.expense]);
    const max = Math.max(...allValues, 1000000);
    return max * 1.15;
  }, [yearMonthlyData]);

  // Yearly Summary Totals for selectedYear
  const yearTotals = useMemo(() => {
    const totalRev = yearMonthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalExp = yearMonthlyData.reduce((sum, m) => sum + m.expense, 0);
    const totalExpected = yearMonthlyData.reduce((sum, m) => sum + m.expectedRevenue, 0);
    const totalNet = totalRev - totalExp;
    const margin = totalRev > 0 ? (totalNet / totalRev) * 100 : 0;
    const allYearContracts = yearMonthlyData.flatMap(m => m.contracts);
    const allYearExpenses = yearMonthlyData.flatMap(m => m.expenses);

    return {
      totalRev,
      totalExp,
      totalExpected,
      totalNet,
      margin,
      contracts: allYearContracts,
      expenses: allYearExpenses
    };
  }, [yearMonthlyData]);

  // Data for the Interactive Detailed Breakdown Section (Specific Month or Entire Year)
  const activeDetailData = useMemo(() => {
    if (selectedMonth !== null && selectedMonth >= 1 && selectedMonth <= 12) {
      const monthData = yearMonthlyData[selectedMonth - 1];
      return {
        title: `Tháng ${selectedMonth}/${selectedYear}`,
        monthNum: selectedMonth,
        revenue: monthData.revenue,
        expected: monthData.expectedRevenue,
        unpaid: Math.max(0, monthData.expectedRevenue - monthData.revenue),
        expense: monthData.expense,
        netProfit: monthData.netProfit,
        profitMargin: monthData.profitMargin,
        contracts: monthData.contracts,
        expenses: monthData.expenses
      };
    }

    // Full selected year
    return {
      title: `Cả năm ${selectedYear}`,
      monthNum: null,
      revenue: yearTotals.totalRev,
      expected: yearTotals.totalExpected,
      unpaid: Math.max(0, yearTotals.totalExpected - yearTotals.totalRev),
      expense: yearTotals.totalExp,
      netProfit: yearTotals.totalNet,
      profitMargin: yearTotals.margin,
      contracts: yearTotals.contracts,
      expenses: yearTotals.expenses
    };
  }, [selectedMonth, yearMonthlyData, yearTotals, selectedYear]);

  // Year Navigation Handlers
  const handlePrevYear = () => {
    setSelectedYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

  const handleBarClick = (monthNum: number) => {
    if (selectedMonth === monthNum) {
      setSelectedMonth(null);
    } else {
      setSelectedMonth(monthNum);
    }
  };

  const openCameraDetailModal = (item: {
    cameraId: string;
    cameraName: string;
    shortName?: string;
    category?: string;
    serialNumber?: string;
    dailyRate?: number;
    image?: string;
  }) => {
    setSelectedCameraForModal({
      id: item.cameraId,
      name: item.cameraName,
      shortName: item.shortName,
      category: item.category,
      serialNumber: item.serialNumber,
      dailyRate: item.dailyRate,
      image: item.image
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      {/* Timeframe selector card */}
      <div className="bg-white border border-gray-200 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="p-1.5 sm:p-2 bg-orange-50 rounded-lg sm:rounded-xl text-orange-600 shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </span>
            <div className="min-w-0">
              <h4 className="font-black text-gray-900 text-xs sm:text-sm truncate">Bộ Lọc Khoảng Thời Gian Báo Cáo</h4>
              <p className="text-[10px] sm:text-xs text-gray-500 truncate leading-tight">
                Xem thống kê thu chi theo tuần, tháng, quý, cả năm hoặc tùy chọn.
              </p>
            </div>
          </div>
          
          {/* Active filter badge */}
          <div className="bg-orange-50 border border-orange-200 text-orange-800 px-2.5 py-1 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-black flex items-center gap-1.5 self-start sm:self-auto max-w-full">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
            </span>
            <span className="truncate">Đang lọc: <span className="text-orange-700 font-black">{dateRange.label}</span></span>
          </div>
        </div>

        {/* Quick Filters Options Buttons - Horizontal Touch Scroll for Mobile */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none select-none">
          {[
            { id: 'all', label: '🗓️ Tất cả' },
            { id: 'today', label: '⚡ Hôm nay' },
            { id: 'this-week', label: '📅 Tuần này' },
            { id: 'last-week', label: '⏮️ Tuần trước' },
            { id: 'this-month', label: '📈 Tháng này' },
            { id: 'last-month', label: '📦 Tháng trước' },
            { id: 'this-quarter', label: '💎 Quý này' },
            { id: 'this-year', label: `📅 Cả năm ${selectedYear}` },
            { id: 'custom', label: '⚙️ Tùy chỉnh ngày' }
          ].map((btn) => {
            const isActive = timeframe === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setTimeframe(btn.id)}
                className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs ${
                  isActive
                    ? 'bg-orange-600 text-white border-orange-600 ring-2 ring-orange-400/40 shadow-sm font-black'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-gray-950 font-bold'
                }`}
              >
                {btn.label}
              </button>
            );
          })}
        </div>

        {/* Custom Range Input fields */}
        {timeframe === 'custom' && (
          <div className="bg-gray-50 rounded-xl p-3 sm:p-3.5 border border-dashed border-gray-300 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-500 uppercase block">Từ ngày</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg py-1.5 px-2.5 font-mono text-xs focus:ring-2 focus:ring-orange-500 font-bold cursor-pointer text-gray-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-500 uppercase block">Đến ngày</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg py-1.5 px-2.5 font-mono text-xs focus:ring-2 focus:ring-orange-500 font-bold cursor-pointer text-gray-800"
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2 md:col-span-1">
              <button
                type="button"
                onClick={() => {
                  setCustomStart(`${selectedYear}-01-01`);
                  setCustomEnd(`${selectedYear}-12-31`);
                }}
                className="bg-orange-100 border border-orange-300 text-orange-900 hover:bg-orange-200 transition text-xs font-bold py-1.5 px-3 rounded-lg flex-1 text-center cursor-pointer"
              >
                Đặt nhanh Năm {selectedYear}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomStart('');
                  setCustomEnd('');
                }}
                className="text-gray-700 font-bold bg-white hover:bg-gray-100 border border-gray-300 py-1.5 px-3 rounded-lg text-xs cursor-pointer"
              >
                Đặt lại
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Financial KPIs Cards Grid - Highly optimized for Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* Card 1: Total Revenue */}
        <div className="bg-white border border-gray-200 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs flex items-center gap-2 sm:gap-4 hover:shadow-md transition-all">
          <div className="p-2 sm:p-3.5 rounded-lg sm:rounded-xl bg-orange-50 text-orange-600 shrink-0">
            <DollarSign className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-gray-500 text-[9px] sm:text-xs font-bold block uppercase tracking-wider truncate">Tổng Doanh Thu</span>
            <span className="font-mono text-xs sm:text-xl font-black text-gray-900 block truncate mt-0.5">{financials.totalRevenue.toLocaleString()}đ</span>
            <span className="text-[9px] sm:text-[10px] text-green-600 font-bold block mt-0.5 truncate">Thực thu</span>
          </div>
        </div>

        {/* Card 2: Total Outstanding Receivables (Clickable to view debt details) */}
        <div 
          onClick={() => setShowReceivablesModal(true)}
          className="bg-white border border-gray-200 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs flex items-center gap-2 sm:gap-4 hover:shadow-md hover:border-rose-300 hover:ring-2 hover:ring-rose-200/50 transition-all cursor-pointer group"
          title="Bấm để xem danh sách khách hàng và đơn thuê còn nợ tiền"
        >
          <div className="p-2 sm:p-3.5 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 shrink-0 group-hover:scale-105 transition-transform">
            <Landmark className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 text-[9px] sm:text-xs font-bold block uppercase tracking-wider truncate">Dư Nợ Chưa Thu</span>
              <span className="text-[8px] sm:text-[9px] text-rose-600 bg-rose-50 px-1 py-0.2 rounded font-black hidden sm:inline-block">Chi tiết ➔</span>
            </div>
            <span className="font-mono text-xs sm:text-xl font-black text-rose-700 block truncate mt-0.5">{financials.totalReceivables.toLocaleString()}đ</span>
            <span className="text-[9px] sm:text-[10px] text-rose-600 font-bold block mt-0.5 truncate flex items-center gap-1">
              <span>{receivableContracts.length} đơn nợ</span>
              <span className="text-gray-400 font-normal sm:hidden">• Xem ➔</span>
            </span>
          </div>
        </div>

        {/* Card 3: Total Expenses */}
        <div className="bg-white border border-gray-200 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs flex items-center gap-2 sm:gap-4 hover:shadow-md transition-all">
          <div className="p-2 sm:p-3.5 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <TrendingDown className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-gray-500 text-[9px] sm:text-xs font-bold block uppercase tracking-wider truncate">Tổng Chi Phí Kho</span>
            <span className="font-mono text-xs sm:text-xl font-black text-gray-900 block truncate mt-0.5">{financials.totalExpenses.toLocaleString()}đ</span>
            <span className="text-[9px] sm:text-[10px] text-rose-600 block font-bold mt-0.5 truncate">Bảo dưỡng & máy</span>
          </div>
        </div>

        {/* Card 4: Net Profits */}
        <div className="bg-white border border-gray-200 p-2.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs flex items-center gap-2 sm:gap-4 hover:shadow-md transition-all">
          <div className={`p-2 sm:p-3.5 rounded-lg sm:rounded-xl shrink-0 ${financials.netProfit >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
            <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-gray-500 text-[9px] sm:text-xs font-bold block uppercase tracking-wider truncate font-sans">Lợi Nhuận Thuần</span>
            <span className="font-mono text-xs sm:text-xl font-black text-gray-900 block truncate mt-0.5">{(financials.netProfit).toLocaleString()}đ</span>
            <span className="text-[9px] sm:text-[10px] text-indigo-600 font-bold block mt-0.5 truncate">Tạm tính ròng</span>
          </div>
        </div>
      </div>

      {/* Long-Term Monthly Analytics Chart & Equipment widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Full 12-Month SVG Chart with Year Navigation */}
        <div className="bg-white border border-gray-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-xs lg:col-span-2 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 shrink-0" />
                <h3 className="font-black text-gray-900 text-sm sm:text-base">Thống Kê Thu Chi (Theo Tháng)</h3>
              </div>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                Báo cáo thu chi toàn bộ 12 tháng năm {selectedYear}. Bấm vào cột tháng để xem chi tiết.
              </p>
            </div>

            {/* Year Selector Control */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-gray-100 border border-gray-300 p-1 rounded-xl select-none shadow-xs self-stretch sm:self-auto">
              <button
                type="button"
                onClick={handlePrevYear}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-gray-700 hover:text-gray-950 transition cursor-pointer"
                title="Xem năm trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-2 py-0.5">
                <CalendarDays className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value, 10));
                    setSelectedMonth(null);
                  }}
                  className="bg-transparent font-black text-xs sm:text-sm text-gray-900 focus:outline-none cursor-pointer"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>Năm {yr}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextYear}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white text-gray-700 hover:text-gray-950 transition cursor-pointer"
                title="Xem năm sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-header status badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span className="text-[10px] sm:text-[11px] text-gray-600 font-bold">Thu {selectedYear}:</span>
              <span className="font-mono font-black text-orange-600 text-xs sm:text-sm">{yearTotals.totalRev.toLocaleString()}đ</span>
              <span className="text-gray-300">|</span>
              <span className="text-[10px] sm:text-[11px] text-gray-600 font-bold">Chi:</span>
              <span className="font-mono font-black text-rose-600 text-xs sm:text-sm">{yearTotals.totalExp.toLocaleString()}đ</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMonth(null)}
              className={`text-[11px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-lg transition cursor-pointer shadow-xs self-start sm:self-auto ${
                selectedMonth === null 
                  ? 'bg-orange-600 text-white border border-orange-600 ring-2 ring-orange-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-950 border border-gray-200'
              }`}
            >
              {selectedMonth === null ? `Đang xem: Cả năm ${selectedYear}` : '👁️ Xem cả năm'}
            </button>
          </div>

          {/* 12-Month Bar Chart Container */}
          <div className="h-56 sm:h-64 flex items-end justify-between px-0.5 sm:px-2 pt-4 pb-2 border-b border-gray-200 select-none bg-gray-50/80 rounded-xl overflow-x-auto gap-0.5 sm:gap-1">
            {yearMonthlyData.map((d) => {
              const revPercent = (d.revenue / chartMaxHeightValue) * 100;
              const expPercent = (d.expense / chartMaxHeightValue) * 100;
              const isSelected = selectedMonth === d.monthIndex;

              return (
                <div 
                  key={d.monthIndex} 
                  onClick={() => handleBarClick(d.monthIndex)}
                  className={`flex flex-col items-center gap-1 sm:gap-1.5 flex-1 min-w-[24px] sm:min-w-[40px] p-0.5 sm:p-1 rounded-lg sm:rounded-xl transition-all cursor-pointer border ${
                    isSelected 
                      ? 'bg-orange-100/90 border-orange-400 shadow-xs ring-2 ring-orange-500/30' 
                      : 'border-transparent hover:bg-gray-200/60'
                  }`}
                  title={`Click để xem chi tiết ${d.monthLabel}/${selectedYear}`}
                >
                  <div className="flex gap-0.5 sm:gap-1.5 items-end justify-center w-full h-34 sm:h-38">
                    {/* Revenue Bar */}
                    <div
                      className={`${d.revenue > 0 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-200'} transition-all w-2 sm:w-3 md:w-4 rounded-t-sm shadow-xs relative group cursor-pointer`}
                      style={{ height: `${Math.max(d.revenue > 0 ? 6 : 2, revPercent)}%` }}
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white font-mono text-[9px] sm:text-[10px] py-1 px-1.5 sm:px-2 rounded -translate-y-1.5 whitespace-nowrap z-20 pointer-events-none shadow-lg">
                        <span className="font-bold block text-orange-400">{d.monthLabel}</span>
                        <span>Thu: {d.revenue.toLocaleString()}đ</span>
                      </div>
                    </div>

                    {/* Expense Bar */}
                    <div
                      className={`${d.expense > 0 ? 'bg-rose-500 hover:bg-rose-600' : 'bg-gray-200'} transition-all w-2 sm:w-3 md:w-4 rounded-t-sm shadow-xs relative group cursor-pointer`}
                      style={{ height: `${Math.max(d.expense > 0 ? 6 : 2, expPercent)}%` }}
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white font-mono text-[9px] sm:text-[10px] py-1 px-1.5 sm:px-2 rounded -translate-y-1.5 whitespace-nowrap z-20 pointer-events-none shadow-lg">
                        <span className="font-bold block text-rose-400">{d.monthLabel}</span>
                        <span>Chi: {d.expense.toLocaleString()}đ</span>
                      </div>
                    </div>
                  </div>

                  {/* Month Label with Active Dot if has data */}
                  <div className="flex flex-col items-center">
                    <span className={`text-[9.5px] sm:text-xs font-black font-sans ${
                      isSelected 
                        ? 'text-orange-950 underline decoration-orange-600 decoration-2 font-black' 
                        : d.hasData ? 'text-gray-800' : 'text-gray-400'
                    }`}>
                      {d.shortLabel}
                    </span>
                    {d.hasData && (
                      <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${isSelected ? 'bg-orange-600' : 'bg-indigo-600'} mt-0.5`}></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart Legends */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 pt-1 text-[10.5px] sm:text-xs text-gray-500">
            <div className="flex items-center gap-3 sm:gap-4 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-orange-500 rounded-xs inline-block"></span>
                <span className="text-gray-700">Thu (Thực thu)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-rose-500 rounded-xs inline-block"></span>
                <span className="text-gray-700">Khoản chi</span>
              </div>
            </div>

            <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium italic">
              💡 Hiển thị 12 tháng năm {selectedYear}
            </span>
          </div>
        </div>

        {/* Hot gears leaderboard section */}
        <div className="bg-white border border-gray-200 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl shadow-xs space-y-3 sm:space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-gray-900 text-sm sm:text-base">Top Thiết Bị Sinh Lời</h3>
              <p className="text-[10px] sm:text-xs text-gray-500">Nhấp để xem cụ thể các ngày cho thuê.</p>
            </div>
            <span className="text-[10px] sm:text-xs bg-orange-100 text-orange-900 border border-orange-300 px-2 py-0.5 rounded-full font-black">
              {topRentedComponents.length} máy
            </span>
          </div>

          <div className="space-y-2 flex-1 py-1">
            {topRentedComponents.length > 0 ? (
              topRentedComponents.map((item) => (
                <div 
                  key={item.cameraId} 
                  onClick={() => openCameraDetailModal(item)}
                  className="group flex justify-between items-center bg-gray-50 hover:bg-orange-50/70 p-2.5 sm:p-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-xs transition-all cursor-pointer"
                  title={`Nhấp để xem chi tiết ngày thuê của ${item.cameraName}`}
                >
                  <div className="space-y-0.5 sm:space-y-1 max-w-[170px] min-w-0">
                    <div className="flex items-center gap-1.5">
                      <CameraIcon className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <h4 className="font-bold text-gray-900 text-xs truncate group-hover:text-orange-900" title={item.cameraName}>
                        {item.cameraName}
                      </h4>
                    </div>
                    <span className="text-[10px] text-gray-600 font-sans block font-medium truncate">
                      Doanh thu: <span className="font-bold text-orange-600 font-mono">{item.totalRevenue.toLocaleString()}đ</span> ({item.totalDays}n)
                    </span>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-1.5">
                    <span className="bg-orange-100 text-orange-900 text-[11px] font-black px-2 py-0.5 rounded-full font-sans whitespace-nowrap">
                      <span className="font-mono">{item.rentalCount}</span> lượt
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-600 transition-transform" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-xs font-medium italic text-center py-4">
                Chưa có dữ liệu thống kê thuê thực tế.
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 p-2.5 sm:p-3 rounded-xl text-[11px] sm:text-xs text-amber-900 font-medium leading-relaxed">
            <span>💡 <b>Mẹo:</b> Chạm vào thiết bị để tra cứu ngày bàn giao, ngày trả và khách thuê tương ứng.</span>
          </div>
        </div>
      </div>

      {/* FULL EQUIPMENT REVENUE & SPECIFIC RENTAL DATES SECTION */}
      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0" />
              <h3 className="text-sm sm:text-base font-black text-gray-900">
                Chi Tiết Doanh Thu & Ngày Thuê Từng Thiết Bị
              </h3>
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
              Doanh thu thực thu, tổng số ngày khai thác và nhật ký ngày thuê chi tiết của từng máy/lens.
            </p>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1 sm:w-52">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên máy, mã serial..."
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-orange-500 focus:bg-white transition text-gray-800"
              />
            </div>

            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg text-xs select-none shrink-0 justify-between sm:justify-start">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'Body', label: 'Body Máy' },
                { id: 'Lens', label: 'Ống kính' }
              ].map((cat) => {
                const isCatActive = equipmentCategoryFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEquipmentCategoryFilter(cat.id)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer shadow-xs flex-1 sm:flex-initial text-center ${
                      isCatActive
                        ? 'bg-orange-600 text-white font-black'
                        : 'text-gray-700 hover:text-gray-950 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* MOBILE CARD VIEW: Rendered on mobile screens (<640px) */}
        <div className="grid grid-cols-1 gap-2.5 sm:hidden">
          {displayEquipmentList.length === 0 ? (
            <div className="text-center py-6 text-gray-400 italic text-xs bg-gray-50 rounded-xl border border-gray-200">
              Không tìm thấy thiết bị nào phù hợp.
            </div>
          ) : (
            displayEquipmentList.map((item) => {
              const latestBooking = item.bookings[0];
              return (
                <div
                  key={item.cameraId}
                  onClick={() => openCameraDetailModal(item)}
                  className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs space-y-2.5 hover:border-orange-300 active:bg-orange-50/40 transition cursor-pointer"
                >
                  {/* Card Top: Image + Name + Category + Rate */}
                  <div className="flex items-start gap-2.5">
                    {item.image ? (
                      <img src={item.image} alt={item.cameraName} className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-sm shrink-0">
                        📷
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-extrabold text-gray-900 text-xs truncate">
                          {item.cameraName}
                        </h4>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                          item.category === 'Body' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          item.category === 'Lens' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-0.5">
                        <span className="font-mono">SN: {item.serialNumber}</span>
                        <span className="font-mono font-bold text-gray-700">{item.dailyRate ? `${item.dailyRate.toLocaleString()}đ/ng` : '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Middle: Metrics Row */}
                  <div className="bg-slate-50 p-2 rounded-lg border border-gray-150 grid grid-cols-3 gap-1 text-center">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">Lượt thuê</span>
                      <span className="font-mono text-xs font-black text-gray-800">{item.rentalCount}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">Tổng ngày</span>
                      <span className="font-mono text-xs font-black text-gray-800">{item.totalDays}n</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase font-bold block">Doanh thu</span>
                      <span className="font-mono text-xs font-black text-orange-600 truncate block">
                        {item.totalRevenue.toLocaleString()}đ
                      </span>
                    </div>
                  </div>

                  {/* Card Bottom: Latest Rental + Action Button */}
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-2">
                    <div className="min-w-0 flex-1">
                      {latestBooking ? (
                        <span className="text-[10px] text-gray-700 font-mono font-bold block truncate">
                          Gần nhất: {new Date(latestBooking.startDate).toLocaleDateString('vi-VN')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">Chưa phát sinh thuê</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCameraDetailModal(item);
                      }}
                      className="bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white border border-orange-200 px-2.5 py-1 rounded-lg text-[10.5px] font-black transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Xem ngày ({item.bookings.length})</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* DESKTOP TABLE VIEW: Rendered on tablet & desktop (>=640px) */}
        <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 text-gray-600 font-black uppercase text-[10px] tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3 px-4">Thiết bị</th>
                <th className="py-3 px-3 text-center">Phân loại</th>
                <th className="py-3 px-3 text-right">Đơn giá thuê</th>
                <th className="py-3 px-3 text-center">Lượt thuê</th>
                <th className="py-3 px-3 text-center">Tổng ngày phục vụ</th>
                <th className="py-3 px-3 text-right">Doanh thu thiết bị</th>
                <th className="py-3 px-3">Lần thuê gần nhất (Ngày thuê)</th>
                <th className="py-3 px-4 text-center">Chi tiết ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {displayEquipmentList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400 italic">
                    Không tìm thấy thiết bị nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                displayEquipmentList.map((item) => {
                  const latestBooking = item.bookings[0];
                  return (
                    <tr 
                      key={item.cameraId}
                      onClick={() => openCameraDetailModal(item)}
                      className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                    >
                      {/* Name & Serial */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {item.image ? (
                            <img src={item.image} alt={item.cameraName} className="w-8 h-8 rounded-lg object-cover border border-gray-200 shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                              📷
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-extrabold text-gray-900 block truncate group-hover:text-orange-700">
                              {item.cameraName}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono block">
                              SN: {item.serialNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          item.category === 'Body' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          item.category === 'Lens' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          'bg-gray-200 text-gray-800'
                        }`}>
                          {item.category === 'Body' ? 'Body' : item.category === 'Lens' ? 'Lens' : item.category}
                        </span>
                      </td>

                      {/* Daily Rate */}
                      <td className="py-3 px-3 text-right font-mono text-gray-800 font-bold">
                        {item.dailyRate ? `${item.dailyRate.toLocaleString()}đ/ng` : '-'}
                      </td>

                      {/* Rental Count */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black font-mono ${
                          item.rentalCount > 0 ? 'bg-orange-100 text-orange-900' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.rentalCount}
                        </span>
                      </td>

                      {/* Total Days */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-gray-800">
                        {item.totalDays > 0 ? `${item.totalDays} ngày` : '-'}
                      </td>

                      {/* Total Revenue */}
                      <td className="py-3 px-3 text-right font-mono text-xs font-black text-orange-600">
                        {item.totalRevenue.toLocaleString()}đ
                      </td>

                      {/* Latest Booking Dates */}
                      <td className="py-3 px-3 text-[11px] text-gray-700">
                        {latestBooking ? (
                          <div className="space-y-0.5">
                            <span className="font-black text-gray-900 flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-orange-600" />
                              {new Date(latestBooking.startDate).toLocaleDateString('vi-VN')} ➔ {new Date(latestBooking.endDate).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="text-[10px] text-gray-500 truncate block">
                              Khách: {latestBooking.customerName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Chưa phát sinh thuê</span>
                        )}
                      </td>

                      {/* Action View Detail */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCameraDetailModal(item);
                          }}
                          className="bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white border border-orange-200 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto shadow-xs cursor-pointer"
                        >
                          <span>Xem ngày thuê ({item.bookings.length})</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Interactive Monthly Visual Report */}
      <div id="monthly-details-section" className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-xs space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3 sm:pb-5">
          <div className="space-y-0.5 sm:space-y-1">
            <h3 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600 shrink-0" />
              <span>
                Chi Tiết Hoạt Động Doanh Thu - <span className="text-orange-600 font-black">{activeDetailData.title}</span>
              </span>
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-500">
              Danh sách chi tiết các hợp đồng cọc thuê và các khoản chi thực thu trong kỳ.
            </p>
          </div>

          {/* Quick 12-Month horizontal tab selector with HIGH CONTRAST ACTIVE STATE */}
          <div className="flex gap-1 bg-gray-100 p-1 sm:p-1.5 rounded-xl shrink-0 overflow-x-auto max-w-full scrollbar-none border border-gray-200 select-none shadow-xs -mx-3.5 px-3.5 sm:mx-0 sm:px-1.5">
            {/* Full Year button */}
            <button
              type="button"
              onClick={() => setSelectedMonth(null)}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all whitespace-nowrap cursor-pointer shadow-xs shrink-0 ${
                selectedMonth === null
                  ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/50'
                  : 'bg-white text-gray-700 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              Cả năm {selectedYear}
            </button>

            {/* Individual month buttons T1 -> T12 */}
            {yearMonthlyData.map((d) => {
              const isMonthActive = selectedMonth === d.monthIndex;
              return (
                <button
                  key={d.monthIndex}
                  type="button"
                  onClick={() => setSelectedMonth(d.monthIndex)}
                  className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 shadow-xs shrink-0 ${
                    isMonthActive
                      ? 'bg-orange-600 text-white shadow-md ring-2 ring-orange-400/50'
                      : d.hasData 
                        ? 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-200'
                        : 'bg-gray-50/70 text-gray-400 hover:text-gray-700 hover:bg-white'
                  }`}
                >
                  <span>{d.shortLabel}</span>
                  {d.hasData && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isMonthActive ? 'bg-white' : 'bg-orange-600'}`}></span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Period Stats Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <div className="bg-slate-50 border border-gray-200 p-2.5 sm:p-4.5 rounded-xl space-y-0.5 sm:space-y-1">
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block truncate">Thực thu trong kỳ</span>
            <div className="font-mono text-xs sm:text-lg font-black text-orange-600 block truncate">
              {activeDetailData.revenue.toLocaleString()}đ
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-600 font-bold truncate">
              Dự kiến: <span className="font-black text-gray-900">{activeDetailData.expected.toLocaleString()}đ</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-gray-200 p-2.5 sm:p-4.5 rounded-xl space-y-0.5 sm:space-y-1">
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block truncate">Chi phí phát sinh</span>
            <div className="font-mono text-xs sm:text-lg font-black text-rose-600 block truncate">
              {activeDetailData.expense.toLocaleString()}đ
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-600 font-bold font-sans truncate">
              Bảo dưỡng & kho
            </div>
          </div>

          <div className={`p-2.5 sm:p-4.5 rounded-xl space-y-0.5 sm:space-y-1 border ${
            activeDetailData.netProfit >= 0 
              ? 'bg-emerald-50/70 border-emerald-200' 
              : 'bg-rose-50/70 border-rose-200'
          }`}>
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block truncate">Lợi nhuận ròng</span>
            <div className={`font-mono text-xs sm:text-lg font-black block truncate ${activeDetailData.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {activeDetailData.netProfit.toLocaleString()}đ
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-600 font-bold font-sans truncate">
              Đối trừ ròng
            </div>
          </div>

          <div className="bg-slate-50 border border-gray-200 p-2.5 sm:p-4.5 rounded-xl space-y-0.5 sm:space-y-1">
            <span className="text-[9px] sm:text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block truncate">Tỷ suất biên ròng</span>
            <div className="font-mono text-xs sm:text-lg font-black text-indigo-700 flex items-center gap-1 block truncate">
              <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 shrink-0" />
              {activeDetailData.profitMargin.toFixed(1)}%
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-600 font-bold truncate">
              Hiệu suất ròng
            </div>
          </div>
        </div>

        {/* Detailed Transactions and Expenses of the Selected Period */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Contracts list (Span 3 columns) */}
          <div className="lg:col-span-3 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                Hợp đồng phát sinh trong kỳ ({activeDetailData.contracts.length})
              </h4>
              <span className="text-[10px] text-gray-500 italic font-medium">Thực thi</span>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5 sm:pr-1">
              {activeDetailData.contracts.length === 0 ? (
                <div className="bg-slate-50 border border-gray-200 rounded-xl p-6 sm:p-8 text-center text-gray-400 italic text-xs font-medium">
                  Không phát sinh giao dịch cho thuê máy nào trong {activeDetailData.title}.
                </div>
              ) : (
                activeDetailData.contracts.map((c) => {
                  const isMock = c.id.startsWith('mock-');
                  const statusStyles = 
                    c.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-200' :
                    c.status === 'Active' ? 'bg-blue-100 text-blue-800 border-blue-200 font-black' :
                    c.status === 'Overdue' ? 'bg-rose-100 text-rose-800 border-rose-200 font-black' :
                    'bg-gray-100 text-gray-800 border-gray-200';

                  return (
                    <div 
                      key={c.id} 
                      className="bg-white border border-gray-200 rounded-xl p-3 sm:p-3.5 hover:border-orange-300 hover:shadow-xs transition-all space-y-2 relative"
                    >
                      {/* Contract short header */}
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1 flex-grow min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-gray-900 text-white font-mono text-[9.5px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-xs">
                              {c.contractCode}
                            </span>
                            {isMock && (
                              <span className="bg-amber-100 text-amber-900 text-[8.5px] sm:text-[9px] px-1 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                Lịch sử
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-start gap-1.5 pt-0.5">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs sm:text-[13px] font-black text-gray-900 break-words leading-tight">
                                {c.customerName}
                              </div>
                              <div className="text-[10.5px] sm:text-[11px] text-gray-500 font-mono font-medium mt-0.5">
                                {c.customerPhone}
                              </div>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-bold ${statusStyles}`}>
                          ● {c.status === 'Completed' ? 'Hoàn thành' : c.status === 'Active' ? 'Đang thuê' : c.status === 'Overdue' ? 'Quá hạn' : 'Chờ giao'}
                        </span>
                      </div>

                      {/* Line Items info */}
                      <div className="bg-slate-50 p-2 sm:p-2.5 rounded-lg border border-gray-150 space-y-1">
                        {c.items.map((it, idx) => (
                           <div key={idx} className="flex justify-between items-center text-[10.5px] sm:text-[11px] gap-2">
                             <span className="text-gray-800 font-bold flex items-center gap-1 truncate">
                               <span>📷</span>
                               <span className="truncate">{it.cameraName}</span>
                             </span>
                             <span className="text-gray-600 font-mono shrink-0 font-bold">
                               ({it.quantity}c) × {it.dailyRate.toLocaleString()}đ
                             </span>
                           </div>
                        ))}
                      </div>

                      {/* Payment summary footer */}
                      <div className="flex justify-between items-center text-xs pt-1.5 border-t border-gray-100 gap-2 flex-wrap sm:flex-nowrap">
                        <div className="text-gray-500 flex items-center gap-1 font-bold text-[10px] sm:text-[11px] shrink-0">
                          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                          <span>Thuê: {new Date(c.startDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-1 ml-auto">
                          <span className="text-gray-500 font-bold text-[10px] sm:text-[11px]">thực thu:</span>
                          <span className="font-mono font-black text-orange-600 text-xs sm:text-sm">
                            {c.paidAmount.toLocaleString()}đ
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Expenses list (Span 2 columns) */}
          <div className="lg:col-span-2 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-600" />
                Các khoản chi ({activeDetailData.expenses.length})
              </h4>
            </div>

            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5 sm:pr-1">
              {activeDetailData.expenses.length === 0 ? (
                <div className="bg-slate-50 border border-gray-200 rounded-xl p-6 sm:p-8 text-center text-gray-400 italic text-xs font-medium">
                  Không phát sinh khoản chi nào trong {activeDetailData.title}.
                </div>
              ) : (
                activeDetailData.expenses.map((e) => {
                  const categoryLabels: Record<string, { label: string; bg: string }> = {
                    'Equipment': { label: 'Mua máy mới', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
                    'Maintenance': { label: 'Bảo dưỡng', bg: 'bg-amber-100 text-amber-800 border-amber-200' },
                    'Marketing': { label: 'Marketing', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
                    'Salary': { label: 'Lương', bg: 'bg-blue-100 text-blue-800 border-blue-200' },
                    'Other': { label: 'Khác', bg: 'bg-gray-100 text-gray-800 border-gray-200' }
                  };
                  const catInfo = categoryLabels[e.category] || { label: e.category, bg: 'bg-gray-100 text-gray-800 border-gray-200' };

                  return (
                    <div 
                      key={e.id} 
                      className="bg-white border border-gray-200 rounded-xl p-3 hover:border-rose-300 transition-all space-y-1.5"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className={`text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded border ${catInfo.bg} font-black`}>
                          {catInfo.label}
                        </span>
                        <span className="text-[9.5px] sm:text-[10px] text-gray-500 font-mono font-bold">{new Date(e.date).toLocaleDateString('vi-VN')}</span>
                      </div>

                      <p className="text-xs text-gray-900 font-bold leading-relaxed">
                        {e.description}
                      </p>

                      <div className="text-right pt-1 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 font-bold">Rút quỹ:</span>
                        <span className="font-mono font-black text-rose-600 text-xs sm:text-[13px]">
                          -{e.amount.toLocaleString()}đ
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL: SPECIFIC RENTAL DATES & REVENUE DETAILS FOR SELECTED EQUIPMENT */}
      {modalCameraDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] sm:max-h-[90vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/90 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                {modalCameraDetail.image ? (
                  <img 
                    src={modalCameraDetail.image} 
                    alt={modalCameraDetail.cameraName} 
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-gray-200 shadow-xs shrink-0" 
                  />
                ) : (
                  <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-base sm:text-lg shrink-0">
                    📷
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="font-black text-gray-900 text-xs sm:text-base leading-tight truncate">
                      {modalCameraDetail.cameraName}
                    </h3>
                    <span className="text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-200 shrink-0">
                      {modalCameraDetail.category}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-xs text-gray-500 font-mono block mt-0.5 truncate">
                    SN: <span className="font-black text-gray-800">{modalCameraDetail.serialNumber}</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCameraForModal(null)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition cursor-pointer shrink-0 ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary KPI Cards */}
            <div className="p-3 sm:p-6 bg-slate-50 border-b border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Doanh thu tạo ra</span>
                <span className="font-mono text-xs sm:text-base font-black text-orange-600 block truncate">
                  {modalCameraDetail.totalRevenue.toLocaleString()}đ
                </span>
                <span className="text-[9px] text-green-700 font-bold block">Thực thu</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Tổng lượt thuê</span>
                <span className="font-mono text-xs sm:text-base font-black text-gray-900 block">
                  {modalCameraDetail.rentalCount} lượt
                </span>
                <span className="text-[9px] text-gray-500 font-bold block">{modalCameraDetail.bookings.length} hợp đồng</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Tổng ngày thuê</span>
                <span className="font-mono text-xs sm:text-base font-black text-emerald-700 block">
                  {modalCameraDetail.totalDays} ngày
                </span>
                <span className="text-[9px] text-gray-500 font-bold block">Thời gian thuê</span>
              </div>

              <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-200 shadow-xs space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-500 block">Đơn giá niêm yết</span>
                <span className="font-mono text-xs sm:text-base font-black text-gray-900 block truncate">
                  {modalCameraDetail.dailyRate.toLocaleString()}đ
                </span>
                <span className="text-[9px] text-gray-500 font-bold block">Giá thuê 1 ngày</span>
              </div>
            </div>

            {/* Modal Body: Specific Rental Dates List */}
            <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                  <span>Chi tiết các ngày thuê ({modalCameraDetail.bookings.length})</span>
                </h4>
                <span className="text-[9.5px] sm:text-[10px] text-gray-500 italic font-medium">Mới nhất</span>
              </div>

              {modalCameraDetail.bookings.length === 0 ? (
                <div className="p-6 sm:p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500 text-xs italic font-medium">
                  Chưa có lịch sử cho thuê máy nào trong khoảng thời gian ({dateRange.label}).
                </div>
              ) : (
                <div className="space-y-2.5">
                  {modalCameraDetail.bookings.map((booking, bIdx) => {
                    const statusClass = 
                      booking.status === 'Completed' ? 'bg-green-100 text-green-800 border-green-200' :
                      booking.status === 'Active' ? 'bg-blue-100 text-blue-800 border-blue-200 font-black' :
                      booking.status === 'Overdue' ? 'bg-rose-100 text-rose-800 border-rose-200 font-black' :
                      'bg-gray-100 text-gray-800 border-gray-200';

                    const statusText = 
                      booking.status === 'Completed' ? 'Hoàn thành' :
                      booking.status === 'Active' ? 'Đang thuê' :
                      booking.status === 'Overdue' ? 'Quá hạn' : 'Chờ giao';

                    return (
                      <div 
                        key={bIdx}
                        className="bg-white p-3 sm:p-3.5 rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-xs transition space-y-2"
                      >
                        {/* Header row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-gray-900 text-white font-mono text-[9.5px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-md">
                                {booking.contractCode}
                              </span>
                              <span className="text-[9.5px] sm:text-[10px] font-black text-orange-900 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded-md">
                                {booking.is6Hours ? '⚡ 6 tiếng' : `⏱️ ${booking.durationDays} ngày`}
                              </span>
                              {booking.quantity > 1 && (
                                <span className="text-[9.5px] sm:text-[10px] font-black text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
                                  x{booking.quantity}c
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 pt-0.5">
                              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0" />
                              <span className="font-black text-gray-900 text-xs truncate">{booking.customerName}</span>
                              <span className="text-gray-500 font-mono text-[10px] sm:text-[11px] font-bold shrink-0">({booking.customerPhone})</span>
                            </div>
                          </div>

                          <span className={`text-[9.5px] sm:text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-black ${statusClass}`}>
                            ● {statusText}
                          </span>
                        </div>

                        {/* Exact Dates & Revenue Row */}
                        <div className="bg-slate-50 p-2 sm:p-2.5 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-900 font-mono">
                            <CalendarDays className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-black text-gray-900">
                              {new Date(booking.startDate).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="text-gray-400">➔</span>
                            <span className="bg-white px-1.5 py-0.5 rounded border border-gray-300 font-black text-gray-900">
                              {new Date(booking.endDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-gray-500 mr-1 font-bold">Thu từ máy:</span>
                            <span className="font-mono font-black text-orange-600 text-xs sm:text-sm">
                              {booking.itemRevenue.toLocaleString()}đ
                            </span>
                          </div>
                        </div>

                        {booking.note && (
                          <p className="text-[10.5px] sm:text-[11px] text-gray-700 italic bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                            💬 {booking.note}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
              <span className="text-[10.5px] sm:text-xs text-gray-600 font-medium truncate mr-2">
                Kỳ áp dụng: <b className="text-gray-900">{dateRange.label}</b>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCameraForModal(null)}
                className="px-4 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-xs shrink-0"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: UNCOLLECTED RECEIVABLES & PENDING DEPOSITS DRILL-DOWN MODAL       */}
      {/* ========================================================================= */}
      {showReceivablesModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden self-center animate-scale-up border border-gray-200 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className={`text-white px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center shrink-0 transition-colors ${
              receivablesModalTab === 'debt' 
                ? 'bg-gradient-to-r from-rose-600 to-rose-700' 
                : 'bg-gradient-to-r from-amber-600 to-amber-700'
            }`}>
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="p-2 bg-white/20 rounded-xl shrink-0">
                  <Landmark className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm sm:text-lg flex items-center gap-2 truncate">
                    <span>{receivablesModalTab === 'debt' ? 'Danh Sách Dư Nợ Chưa Thu' : 'Danh Sách Chưa Cọc 50% Giữ Máy'}</span>
                    <span className="text-xs bg-white text-gray-900 px-2 py-0.5 rounded-full font-black">
                      {receivablesModalTab === 'debt' ? `${receivableContracts.length} đơn` : `${pendingDepositContracts.length} đơn`}
                    </span>
                  </h3>
                  <p className="text-[10px] sm:text-xs text-white/80 mt-0.5 truncate">
                    Kỳ thống kê: <b>{dateRange.label}</b>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReceivablesModal(false)}
                className="text-white hover:text-white/70 text-2xl font-bold p-1 leading-none shrink-0 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Tab Switcher */}
            <div className="bg-gray-100 p-1.5 border-b border-gray-200 flex gap-1.5 shrink-0 select-none">
              <button
                type="button"
                onClick={() => setReceivablesModalTab('debt')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  receivablesModalTab === 'debt'
                    ? 'bg-white text-rose-700 shadow-3xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                <span>⚠️ Dư Nợ Chưa Thu</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  receivablesModalTab === 'debt' ? 'bg-rose-100 text-rose-800' : 'bg-gray-200 text-gray-700'
                }`}>
                  {receivableContracts.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setReceivablesModalTab('deposit')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  receivablesModalTab === 'deposit'
                    ? 'bg-white text-amber-800 shadow-3xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                }`}
              >
                <span>⏳ Chưa Cọc 50% Giữ Máy</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  receivablesModalTab === 'deposit' ? 'bg-amber-100 text-amber-900' : 'bg-gray-200 text-gray-700'
                }`}>
                  {pendingDepositContracts.length}
                </span>
              </button>
            </div>

            {/* Total summary bar inside modal */}
            {receivablesModalTab === 'debt' ? (
              <div className="bg-rose-50 border-b border-rose-100 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold text-rose-800 uppercase tracking-wider block">Tổng Tiền Dư Nợ Cần Thu</span>
                  <span className="font-mono text-base sm:text-xl font-black text-rose-700 block">
                    {financials.totalReceivables.toLocaleString()}đ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-bold block">Tổng giá trị đơn nợ:</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-gray-800">
                    {receivableContracts.reduce((sum, c) => sum + (c.totalPrice || 0), 0).toLocaleString()}đ
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border-b border-amber-100 px-4 sm:px-6 py-3 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] sm:text-xs font-bold text-amber-800 uppercase tracking-wider block">Tổng Tiền Cọc 50% Giữ Máy Cần Thu</span>
                  <span className="font-mono text-base sm:text-xl font-black text-amber-700 block">
                    {totalPendingDeposit.toLocaleString()}đ
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 font-bold block">Tổng giá trị đơn chờ cọc:</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-gray-800">
                    {pendingDepositContracts.reduce((sum, c) => sum + (c.totalPrice || 0), 0).toLocaleString()}đ
                  </span>
                </div>
              </div>
            )}

            {/* List of debtor or pending deposit contracts */}
            <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3 flex-1">
              {receivablesModalTab === 'debt' ? (
                receivableContracts.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 text-gray-400 font-medium text-xs sm:text-sm">
                    🎉 Tuyệt vời! Không có khoản dư nợ chưa thu nào trong kỳ này.
                  </div>
                ) : (
                  receivableContracts.map((c) => {
                    let statusText = 'Chờ bàn giao';
                    let statusClass = 'bg-amber-50 text-amber-800 border-amber-200';
                    if (c.status === 'Active') {
                      statusText = 'Đang thuê';
                      statusClass = 'bg-blue-50 text-blue-800 border-blue-200';
                    } else if (c.status === 'Completed') {
                      statusText = 'Đã trả máy';
                      statusClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                    } else if (c.status === 'Overdue') {
                      statusText = 'Quá hạn';
                      statusClass = 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse';
                    }

                    return (
                      <div
                        key={c.id}
                        className="bg-white border border-rose-200/80 rounded-xl p-3 sm:p-4 shadow-3xs space-y-2.5 hover:shadow-sm transition-all"
                      >
                        {/* Header row: Code, Customer & Status */}
                        <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-black text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                {c.contractCode}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusClass}`}>
                                ● {statusText}
                              </span>
                            </div>
                            <div className="font-black text-gray-900 text-sm mt-1 flex items-center gap-1.5 truncate">
                              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="truncate">{c.customerName}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-gray-400 font-bold block uppercase">Dư nợ chưa thu</span>
                            <span className="font-mono font-black text-rose-700 text-sm sm:text-base block">
                              +{c.remainingDebt.toLocaleString()}đ
                            </span>
                          </div>
                        </div>

                        {/* Financial values breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-gray-150">
                          <div>
                            <span className="text-[9.5px] text-gray-400 font-bold uppercase block">Tổng tiền</span>
                            <span className="font-mono font-bold text-gray-800">{c.totalPrice.toLocaleString()}đ</span>
                          </div>
                          <div>
                            <span className="text-[9.5px] text-emerald-700 font-bold uppercase block">Đã thanh toán</span>
                            <span className="font-mono font-bold text-emerald-700">{c.paidAmount.toLocaleString()}đ</span>
                          </div>
                          <div>
                            <span className="text-[9.5px] text-gray-400 font-bold uppercase block">Ngày thuê</span>
                            <span className="font-mono text-gray-700 text-[11px]">{c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : '---'}</span>
                          </div>
                          <div>
                            <span className="text-[9.5px] text-gray-400 font-bold uppercase block">Liên hệ</span>
                            <a
                              href={`tel:${c.customerPhone}`}
                              className="inline-flex items-center gap-1 text-orange-600 hover:underline font-mono font-bold text-[11px]"
                            >
                              <Phone className="w-3 h-3 text-orange-500 shrink-0" />
                              <span>{c.customerPhone}</span>
                            </a>
                          </div>
                        </div>

                        {/* Equipment items summary */}
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Thiết bị:</span>
                          {(c.items || []).map((item, idx) => (
                            <span
                              key={idx}
                              className="bg-orange-50 text-orange-800 border border-orange-100 text-[10px] font-bold px-2 py-0.5 rounded"
                            >
                              {item.cameraName}
                            </span>
                          ))}
                        </div>

                        {c.note && (
                          <p className="text-[10.5px] text-gray-600 bg-amber-50/70 border border-amber-100 p-1.5 rounded font-medium italic">
                            💬 {c.note}
                          </p>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                pendingDepositContracts.length === 0 ? (
                  <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 text-gray-400 font-medium text-xs sm:text-sm">
                    🎉 Không có đơn nào đang chờ khách thanh toán tiền cọc trong kỳ này.
                  </div>
                ) : (
                  pendingDepositContracts.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-amber-200/90 rounded-xl p-3 sm:p-4 shadow-3xs space-y-2.5 hover:shadow-sm transition-all"
                    >
                      {/* Header row: Code, Customer & Status */}
                      <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-gray-900 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                              {c.contractCode}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
                              ● Chờ thanh toán cọc
                            </span>
                          </div>
                          <div className="font-black text-gray-900 text-sm mt-1 flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{c.customerName}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-amber-700 font-bold block uppercase">Tiền cọc cần đóng</span>
                          <span className="font-mono font-black text-amber-700 text-sm sm:text-base block">
                            +{c.paidAmount.toLocaleString()}đ
                          </span>
                        </div>
                      </div>

                      {/* Financial values breakdown */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-amber-50/40 p-2 rounded-lg border border-amber-100">
                        <div>
                          <span className="text-[9.5px] text-gray-400 font-bold uppercase block">Tổng tiền thuê</span>
                          <span className="font-mono font-bold text-gray-800">{c.totalPrice.toLocaleString()}đ</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-amber-800 font-bold uppercase block">Tiền cọc giữ máy</span>
                          <span className="font-mono font-bold text-amber-700">{c.paidAmount.toLocaleString()}đ</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-gray-400 font-bold uppercase block">Ngày nhận máy</span>
                          <span className="font-mono text-gray-700 text-[11px]">{c.startDate ? new Date(c.startDate).toLocaleDateString('vi-VN') : '---'}</span>
                        </div>
                        <div>
                          <span className="text-[9.5px] text-gray-400 font-bold uppercase block">Liên hệ nhắc cọc</span>
                          <a
                            href={`tel:${c.customerPhone}`}
                            className="inline-flex items-center gap-1 text-orange-600 hover:underline font-mono font-bold text-[11px]"
                          >
                            <Phone className="w-3 h-3 text-orange-500 shrink-0" />
                            <span>{c.customerPhone}</span>
                          </a>
                        </div>
                      </div>

                      {/* Equipment items summary */}
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mr-1">Thiết bị:</span>
                        {(c.items || []).map((item, idx) => (
                          <span
                            key={idx}
                            className="bg-orange-50 text-orange-800 border border-orange-100 text-[10px] font-bold px-2 py-0.5 rounded"
                          >
                            {item.cameraName}
                          </span>
                        ))}
                      </div>

                      {c.note && (
                        <p className="text-[10.5px] text-gray-600 bg-amber-50/70 border border-amber-100 p-1.5 rounded font-medium italic">
                          💬 {c.note}
                        </p>
                      )}
                    </div>
                  ))
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
              <span className="text-[10.5px] sm:text-xs text-gray-600 font-medium truncate mr-2">
                {receivablesModalTab === 'debt' ? (
                  <>Tổng cộng: <b className="text-rose-700">{receivableContracts.length}</b> hợp đồng có dư nợ</>
                ) : (
                  <>Tổng cộng: <b className="text-amber-700">{pendingDepositContracts.length}</b> đơn đang chờ cọc</>
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowReceivablesModal(false)}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-black text-xs rounded-xl transition cursor-pointer shadow-xs shrink-0"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
