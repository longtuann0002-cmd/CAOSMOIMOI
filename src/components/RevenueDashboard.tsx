import React, { useMemo, useState } from 'react';
import { RentalContract, Expense, Camera } from '../types';
import { 
  DollarSign, Landmark, TrendingUp, TrendingDown, ClipboardList, 
  Calendar, FileText, Activity, Info, PieChart, ShoppingBag, 
  User, ChevronLeft, ChevronRight, BarChart3, CalendarDays, Filter,
  Camera as CameraIcon, Search, X, Clock, Layers, ArrowUpRight, CheckCircle2,
  AlertTriangle
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
    return contracts.filter(c => {
      if (c.status === 'Cancelled') return false;
      return isBetween(c.startDate, dateRange.start, dateRange.end);
    });
  }, [contracts, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      return isBetween(e.date, dateRange.start, dateRange.end);
    });
  }, [expenses, dateRange]);

  // Overall Financials for the selected top timeframe
  const financials = useMemo(() => {
    const totalRevenue = filteredContracts
      .filter(c => c.status !== 'Pending' && c.status !== 'Cancelled')
      .reduce((sum, c) => sum + c.paidAmount, 0);

    const totalReceivables = filteredContracts
      .filter(c => c.status === 'Active' || c.status === 'Overdue')
      .reduce((sum, c) => sum + (c.totalPrice - c.paidAmount), 0);

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
    // Map each camera (and cameras from contracts) to detailed rental history
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
          // Find matching by name or create fallback
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
        // Calculate item revenue share based on contract's paidAmount
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

  // Top rented equipment (top 4 for widget card)
  const topRentedComponents = useMemo(() => {
    return equipmentRentalAnalytics
      .filter(item => item.rentalCount > 0)
      .sort((a, b) => b.rentalCount - a.rentalCount || b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [equipmentRentalAnalytics]);

  // Filtered equipment list for full equipment revenue table
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

    // Fallback if no analytics found
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
    <div className="space-y-6">
      {/* Timeframe selector card */}
      <div className="bg-white border border-gray-150 p-4 sm:p-5 rounded-xl sm:rounded-2xl shadow-3xs space-y-3.5 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <span className="p-1.5 sm:p-2 bg-indigo-50 rounded-lg sm:rounded-xl text-indigo-650 shrink-0">
              <Calendar className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </span>
            <div className="min-w-0">
              <h4 className="font-bold text-gray-850 text-xs sm:text-sm truncate">Bộ Lọc Khoảng Thời Gian Báo Cáo</h4>
              <p className="text-[10px] sm:text-xs text-gray-400 break-words leading-tight sm:leading-normal">
                Xem thống kê doanh thu, chi phí theo tuần, tháng, quý, cả năm hoặc tùy chọn ngày.
              </p>
            </div>
          </div>
          
          {/* Active filter badge */}
          <div className="bg-indigo-50 border border-indigo-150 text-indigo-750 px-2.5 py-1 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-extrabold flex items-center gap-2 self-start md:self-auto max-w-full">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600"></span>
            </span>
            <span className="truncate">Đang lọc: <span className="text-indigo-650 font-extrabold font-sans">{dateRange.label}</span></span>
          </div>
        </div>

        {/* Quick Filters Options Buttons */}
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 md:pb-0 md:flex-wrap md:overflow-visible scrollbar-none select-none">
          <button
            onClick={() => { setTimeframe('all'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'all'
                ? 'bg-indigo-650 text-white border-indigo-650 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            🗓️ Tất cả
          </button>
          <button
            onClick={() => { setTimeframe('today'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'today'
                ? 'bg-indigo-650 text-white border-indigo-650 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            ⚡ Hôm nay
          </button>
          <button
            onClick={() => { setTimeframe('this-week'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'this-week'
                ? 'bg-indigo-650 text-white border-indigo-650 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            📅 Tuần này
          </button>
          <button
            onClick={() => { setTimeframe('last-week'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'last-week'
                ? 'bg-indigo-650 text-white border-indigo-650 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            ⏮️ Tuần trước
          </button>
          <button
            onClick={() => { setTimeframe('this-month'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'this-month'
                ? 'bg-indigo-650 text-white border-indigo-650 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            📈 Tháng này
          </button>
          <button
            onClick={() => { setTimeframe('last-month'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'last-month'
                ? 'bg-indigo-650 text-white border-indigo-650 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            📦 Tháng trước
          </button>
          <button
            onClick={() => { setTimeframe('this-quarter'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'this-quarter'
                ? 'bg-indigo-650 text-white border-indigo-650 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            💎 Quý này
          </button>
          <button
            onClick={() => { setTimeframe('this-year'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'this-year'
                ? 'bg-indigo-650 text-white border-indigo-650 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            📅 Cả năm {selectedYear}
          </button>
          <button
            onClick={() => { setTimeframe('custom'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'custom'
                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            ⚙️ Tùy chỉnh ngày
          </button>
        </div>

        {/* Custom Range Input fields */}
        {timeframe === 'custom' && (
          <div className="bg-gray-50 rounded-xl p-3.5 border border-dashed border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase block">Từ ngày</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full bg-white border border-gray-250 rounded-lg py-1 px-2.5 font-mono text-xs focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase block">Đến ngày</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full bg-white border border-gray-250 rounded-lg py-1 px-2.5 font-mono text-xs focus:ring-1 focus:ring-indigo-500 font-medium cursor-pointer"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomStart(`${selectedYear}-01-01`);
                  setCustomEnd(`${selectedYear}-12-31`);
                }}
                className="bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 transition text-[11px] font-bold py-1.5 px-3 rounded-lg flex-1 text-center cursor-pointer"
              >
                Đặt nhanh Năm {selectedYear}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomStart('');
                  setCustomEnd('');
                }}
                className="text-gray-500 font-bold bg-white hover:bg-gray-50 border border-gray-250 py-1.5 px-3 rounded-lg text-xs cursor-pointer"
              >
                Đặt lại
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Financial KPIs Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Revenue */}
        <div className="bg-white border border-gray-150 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-3xs flex items-center gap-2.5 sm:gap-4 hover:shadow-md transition-all">
          <div className="p-2 sm:p-3.5 rounded-lg sm:rounded-xl bg-orange-50 text-orange-600 shrink-0">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-gray-400 text-[9px] sm:text-xs font-bold block uppercase tracking-wider truncate">Tổng Doanh Thu</span>
            <span className="font-mono text-xs sm:text-xl font-black text-gray-900 block truncate mt-0.5">{financials.totalRevenue.toLocaleString()}đ</span>
            <span className="text-[9px] sm:text-[10px] text-green-600 font-medium block mt-0.5 truncate">Thực thu</span>
          </div>
        </div>

        {/* Card 2: Total Outstanding Receivables */}
        <div className="bg-white border border-gray-150 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-3xs flex items-center gap-2.5 sm:gap-4 hover:shadow-md transition-all">
          <div className="p-2 sm:p-3.5 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-gray-400 text-[9px] sm:text-xs font-bold block uppercase tracking-wider truncate">Dư Nợ Chưa Thu</span>
            <span className="font-mono text-xs sm:text-xl font-black text-gray-900 block truncate mt-0.5">{financials.totalReceivables.toLocaleString()}đ</span>
            <span className="text-[9px] sm:text-[10px] text-amber-600 font-medium block mt-0.5 truncate">Dự kiến thu xong</span>
          </div>
        </div>

        {/* Card 3: Total Expenses */}
        <div className="bg-white border border-gray-150 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-3xs flex items-center gap-2.5 sm:gap-4 hover:shadow-md transition-all">
          <div className="p-2 sm:p-3.5 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-gray-400 text-[9px] sm:text-xs font-bold block uppercase tracking-wider truncate">Tổng Chi Phí Kho</span>
            <span className="font-mono text-xs sm:text-xl font-black text-gray-900 block truncate mt-0.5">{financials.totalExpenses.toLocaleString()}đ</span>
            <span className="text-[9px] sm:text-[10px] text-rose-550 block font-medium mt-0.5 truncate">Bảo dưỡng & Mua máy</span>
          </div>
        </div>

        {/* Card 4: Net Profits */}
        <div className="bg-white border border-gray-150 p-3 sm:p-5 rounded-xl sm:rounded-2xl shadow-3xs flex items-center gap-2.5 sm:gap-4 hover:shadow-md transition-all">
          <div className={`p-2 sm:p-3.5 rounded-lg sm:rounded-xl shrink-0 ${financials.netProfit >= 0 ? 'bg-indigo-50 text-indigo-650' : 'bg-red-50 text-red-650'}`}>
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-gray-400 text-[9px] sm:text-xs font-bold block uppercase tracking-wider truncate font-sans">Lợi Nhuận Thuần</span>
            <span className="font-mono text-xs sm:text-xl font-black text-gray-900 block truncate mt-0.5">{(financials.netProfit).toLocaleString()}đ</span>
            <span className="text-[9px] sm:text-[10px] text-indigo-500 font-medium block mt-0.5 truncate">Lợi nhuận tạm tính</span>
          </div>
        </div>
      </div>

      {/* Long-Term Monthly Analytics Chart & Equipment widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Full 12-Month SVG Chart with Year Navigation */}
        <div className="bg-white border border-gray-150 p-5 sm:p-6 rounded-2xl shadow-3xs lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-600 shrink-0" />
                <h3 className="font-bold text-gray-900 text-base">Thống Kê Thu Chi (Theo Tháng - Lịch Dài Hạn)</h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Báo cáo thu chi toàn bộ 12 tháng trong năm. Nhấp vào cột tháng để xem phân tích chi tiết.
              </p>
            </div>

            {/* Year Selector Control */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 p-1 rounded-xl self-start sm:self-auto select-none shadow-2xs">
              <button
                type="button"
                onClick={handlePrevYear}
                className="p-1 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 transition hover:shadow-3xs cursor-pointer"
                title="Xem năm trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 px-2 py-0.5">
                <CalendarDays className="w-3.5 h-3.5 text-orange-600" />
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value, 10));
                    setSelectedMonth(null);
                  }}
                  className="bg-transparent font-extrabold text-xs text-gray-900 focus:outline-none cursor-pointer"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>Năm {yr}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleNextYear}
                className="p-1 rounded-lg hover:bg-white text-gray-600 hover:text-gray-900 transition hover:shadow-3xs cursor-pointer"
                title="Xem năm sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-header status badge */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-500 font-medium">Tổng thu năm {selectedYear}:</span>
              <span className="font-mono font-bold text-orange-600 text-xs">{yearTotals.totalRev.toLocaleString()}đ</span>
              <span className="text-gray-300">|</span>
              <span className="text-[11px] text-gray-500 font-medium">Tổng chi:</span>
              <span className="font-mono font-bold text-rose-600 text-xs">{yearTotals.totalExp.toLocaleString()}đ</span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedMonth(null)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedMonth === null 
                  ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {selectedMonth === null ? `Đang xem: Cả năm ${selectedYear}` : '👁️ Xem cả năm'}
            </button>
          </div>

          {/* 12-Month Bar Chart Container */}
          <div className="h-64 flex items-end justify-between px-1 sm:px-2 pt-6 pb-2 border-b border-gray-200 select-none bg-gray-50/50 rounded-xl overflow-x-auto gap-1">
            {yearMonthlyData.map((d) => {
              const revPercent = (d.revenue / chartMaxHeightValue) * 100;
              const expPercent = (d.expense / chartMaxHeightValue) * 100;
              const isSelected = selectedMonth === d.monthIndex;

              return (
                <div 
                  key={d.monthIndex} 
                  onClick={() => handleBarClick(d.monthIndex)}
                  className={`flex flex-col items-center gap-1.5 flex-1 min-w-[28px] sm:min-w-[40px] p-1 rounded-xl transition-all cursor-pointer border ${
                    isSelected 
                      ? 'bg-orange-50/60 border-orange-300 shadow-xs ring-2 ring-orange-500/20' 
                      : 'border-transparent hover:bg-gray-100/70'
                  }`}
                  title={`Click để xem chi tiết ${d.monthLabel}/${selectedYear}`}
                >
                  <div className="flex gap-0.5 sm:gap-1.5 items-end justify-center w-full h-38">
                    {/* Revenue Bar */}
                    <div
                      className={`${d.revenue > 0 ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-200'} transition-all w-2.5 sm:w-3.5 md:w-4 rounded-t-sm shadow-xs relative group cursor-pointer`}
                      style={{ height: `${Math.max(d.revenue > 0 ? 6 : 2, revPercent)}%` }}
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white font-mono text-[10px] py-1 px-2 rounded -translate-y-1.5 whitespace-nowrap z-20 pointer-events-none shadow-lg">
                        <span className="font-bold block text-orange-400">{d.monthLabel}</span>
                        <span>Thu: {d.revenue.toLocaleString()}đ</span>
                      </div>
                    </div>

                    {/* Expense Bar */}
                    <div
                      className={`${d.expense > 0 ? 'bg-rose-400 hover:bg-rose-500' : 'bg-gray-200'} transition-all w-2.5 sm:w-3.5 md:w-4 rounded-t-sm shadow-xs relative group cursor-pointer`}
                      style={{ height: `${Math.max(d.expense > 0 ? 6 : 2, expPercent)}%` }}
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white font-mono text-[10px] py-1 px-2 rounded -translate-y-1.5 whitespace-nowrap z-20 pointer-events-none shadow-lg">
                        <span className="font-bold block text-rose-400">{d.monthLabel}</span>
                        <span>Chi: {d.expense.toLocaleString()}đ</span>
                      </div>
                    </div>
                  </div>

                  {/* Month Label with Active Dot if has data */}
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] sm:text-[11px] font-bold font-sans ${
                      isSelected 
                        ? 'text-orange-700 font-black' 
                        : d.hasData ? 'text-gray-700' : 'text-gray-400'
                    }`}>
                      {d.shortLabel}
                    </span>
                    {d.hasData && (
                      <span className={`w-1 h-1 rounded-full ${isSelected ? 'bg-orange-600' : 'bg-indigo-400'} mt-0.5`}></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chart Legends */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 bg-orange-500 rounded-xs inline-block"></span>
                <span>Doanh thu (Thực thu)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 bg-rose-400 rounded-xs inline-block"></span>
                <span>Chi phí phát sinh</span>
              </div>
            </div>

            <span className="text-[11px] text-gray-400 italic">
              💡 Hiển thị toàn bộ 12 tháng của năm {selectedYear}
            </span>
          </div>
        </div>

        {/* Hot gears leaderboard section with interactive click to view specific rental dates */}
        <div className="bg-white border border-gray-150 p-5 sm:p-6 rounded-2xl shadow-3xs space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Top Thiết Bị Sinh Lời</h3>
              <p className="text-xs text-gray-400">Nhấp vào thiết bị để xem cụ thể các ngày cho thuê & doanh thu.</p>
            </div>
            <span className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-bold">
              {topRentedComponents.length} máy
            </span>
          </div>

          <div className="space-y-2.5 flex-1 py-1">
            {topRentedComponents.length > 0 ? (
              topRentedComponents.map((item) => (
                <div 
                  key={item.cameraId} 
                  onClick={() => openCameraDetailModal(item)}
                  className="group flex justify-between items-center bg-gray-50/80 hover:bg-orange-50/50 p-3 rounded-xl border border-gray-150 hover:border-orange-200 hover:shadow-xs transition-all cursor-pointer"
                  title={`Nhấp để xem chi tiết ngày thuê của ${item.cameraName}`}
                >
                  <div className="space-y-1 max-w-[170px]">
                    <div className="flex items-center gap-1.5">
                      <CameraIcon className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <h4 className="font-bold text-gray-800 text-xs truncate group-hover:text-orange-900" title={item.cameraName}>
                        {item.cameraName}
                      </h4>
                    </div>
                    <span className="text-[10px] text-gray-500 font-sans block">
                      Doanh thu: <span className="font-bold text-orange-655 font-mono">{item.totalRevenue.toLocaleString()}đ</span> ({item.totalDays} ngày)
                    </span>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full font-sans whitespace-nowrap">
                      <span className="font-mono">{item.rentalCount}</span> Lượt thuê
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-orange-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-xs font-medium italic text-center py-6">
                Chưa có dữ liệu thống kê hoạt động thuê thực tế trong khoảng thời gian này.
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-120 p-3.5 rounded-xl text-[11px] text-amber-800 font-medium">
            <span>💡 <b>Mẹo quản trị:</b> Bấm trực tiếp vào từng dòng máy hoặc bảng bên dưới để tra cứu chi tiết ngày bàn giao, ngày trả và khách thuê tương ứng.</span>
          </div>
        </div>
      </div>

      {/* FULL EQUIPMENT REVENUE & SPECIFIC RENTAL DATES SECTION */}
      <div className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-3xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <CameraIcon className="w-5 h-5 text-indigo-600 shrink-0" />
              <h3 className="text-base font-extrabold text-gray-900">
                Chi Tiết Doanh Thu & Ngày Thuê Từng Thiết Bị
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Bảng tra cứu chuyên sâu: doanh thu thực thu, tổng số ngày khai thác và nhật ký ngày thuê chi tiết của từng máy/ống kính.
            </p>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên máy, mã serial..."
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>

            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg text-xs select-none">
              <button
                type="button"
                onClick={() => setEquipmentCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  equipmentCategoryFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setEquipmentCategoryFilter('Body')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  equipmentCategoryFilter === 'Body'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Body Máy
              </button>
              <button
                type="button"
                onClick={() => setEquipmentCategoryFilter('Lens')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  equipmentCategoryFilter === 'Lens'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ống kính
              </button>
            </div>
          </div>
        </div>

        {/* Equipment Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-150">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-200">
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
                      className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
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
                            <span className="font-extrabold text-gray-900 block truncate group-hover:text-indigo-700">
                              {item.cameraName}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono block">
                              SN: {item.serialNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.category === 'Body' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          item.category === 'Lens' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.category === 'Body' ? 'Body' : item.category === 'Lens' ? 'Lens' : item.category}
                        </span>
                      </td>

                      {/* Daily Rate */}
                      <td className="py-3 px-3 text-right font-mono text-gray-700 font-bold">
                        {item.dailyRate ? `${item.dailyRate.toLocaleString()}đ/ng` : '-'}
                      </td>

                      {/* Rental Count */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                          item.rentalCount > 0 ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {item.rentalCount}
                        </span>
                      </td>

                      {/* Total Days */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-gray-700">
                        {item.totalDays > 0 ? `${item.totalDays} ngày` : '-'}
                      </td>

                      {/* Total Revenue */}
                      <td className="py-3 px-3 text-right font-mono text-xs font-black text-orange-600">
                        {item.totalRevenue.toLocaleString()}đ
                      </td>

                      {/* Latest Booking Dates */}
                      <td className="py-3 px-3 text-[11px] text-gray-600">
                        {latestBooking ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-indigo-950 flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3 text-indigo-500" />
                              {new Date(latestBooking.startDate).toLocaleDateString('vi-VN')} ➔ {new Date(latestBooking.endDate).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="text-[10px] text-gray-400 truncate block">
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
                          className="bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 mx-auto shadow-3xs cursor-pointer"
                        >
                          <span>Xem ngày thuê ({item.bookings.length})</span>
                          <ChevronRight className="w-3 h-3" />
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
      <div id="monthly-details-section" className="bg-white border border-gray-150 rounded-2xl p-5 sm:p-6 shadow-3xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>
                Chi Tiết Hoạt Động Doanh Thu - <span className="text-indigo-650 font-extrabold">{activeDetailData.title}</span>
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Danh sách chi tiết các hợp đồng cọc thuê và các khoản chi thực thu ghi nhận trong thời gian được chọn.
            </p>
          </div>

          {/* Quick 12-Month horizontal tab selector */}
          <div className="flex gap-1 bg-gray-100/80 p-1 rounded-xl shrink-0 overflow-x-auto max-w-full scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedMonth(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedMonth === null
                  ? 'bg-indigo-650 text-white shadow-xs'
                  : 'text-gray-655 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              Cả năm {selectedYear}
            </button>
            {yearMonthlyData.map((d) => (
              <button
                key={d.monthIndex}
                type="button"
                onClick={() => setSelectedMonth(d.monthIndex)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  selectedMonth === d.monthIndex
                    ? 'bg-indigo-650 text-white shadow-xs'
                    : d.hasData 
                      ? 'text-gray-800 hover:text-gray-950 hover:bg-gray-200 font-extrabold'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{d.shortLabel}</span>
                {d.hasData && <span className={`w-1.5 h-1.5 rounded-full ${selectedMonth === d.monthIndex ? 'bg-orange-300' : 'bg-indigo-500'}`}></span>}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Period Stats Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-slate-50 border border-gray-150 p-3 sm:p-4.5 rounded-xl space-y-1">
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block truncate">Thực thu trong kỳ</span>
            <div className="font-mono text-sm sm:text-lg font-bold text-orange-600 block truncate">
              {activeDetailData.revenue.toLocaleString()}đ
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium truncate">
              Dự kiến: <span className="font-bold">{activeDetailData.expected.toLocaleString()}đ</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-gray-150 p-3 sm:p-4.5 rounded-xl space-y-1">
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block truncate">Chi phí phát sinh</span>
            <div className="font-mono text-sm sm:text-lg font-bold text-rose-600 block truncate">
              {activeDetailData.expense.toLocaleString()}đ
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium font-sans truncate">
              Bảo dưỡng & Kho bãi
            </div>
          </div>

          <div className={`p-3 sm:p-4.5 rounded-xl space-y-1 border ${
            activeDetailData.netProfit >= 0 
              ? 'bg-emerald-50/40 border-emerald-150' 
              : 'bg-rose-50/40 border-rose-150'
          }`}>
            <span className="text-[9px] sm:text-[10px] text-gray-450 font-extrabold uppercase tracking-wider block truncate">Lợi nhuận ròng</span>
            <div className={`font-mono text-sm sm:text-lg font-bold block truncate ${activeDetailData.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {activeDetailData.netProfit.toLocaleString()}đ
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium font-sans truncate">
              Doanh thu đối trừ ròng
            </div>
          </div>

          <div className="bg-slate-50 border border-gray-150 p-3 sm:p-4.5 rounded-xl space-y-1">
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block truncate">Tỷ suất biên ròng</span>
            <div className="font-mono text-sm sm:text-lg font-bold text-indigo-700 flex items-center gap-1 block truncate">
              <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              {activeDetailData.profitMargin.toFixed(1)}%
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium truncate">
              Hiệu suất hoạt động ròng
            </div>
          </div>
        </div>

        {/* Detailed Transactions and Expenses of the Selected Period */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Contracts list (Span 3 columns) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-indigo-650" />
                Hợp đồng phát sinh trong kỳ ({activeDetailData.contracts.length})
              </h4>
              <span className="text-[10px] text-gray-400 italic">Thực thi nghiệp vụ</span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {activeDetailData.contracts.length === 0 ? (
                <div className="bg-slate-50 border border-gray-155 rounded-xl p-8 text-center text-gray-400 italic text-xs">
                  Không phát sinh giao dịch cho thuê máy nào trong {activeDetailData.title}.
                </div>
              ) : (
                activeDetailData.contracts.map((c) => {
                  const isMock = c.id.startsWith('mock-');
                  const statusStyles = 
                    c.status === 'Completed' ? 'bg-green-500/10 text-green-700 border-green-200' :
                    c.status === 'Active' ? 'bg-blue-500/10 text-blue-700 border-blue-200 font-bold' :
                    c.status === 'Overdue' ? 'bg-rose-500/10 text-rose-700 border-rose-200 font-bold' :
                    'bg-slate-500/10 text-gray-650 border-gray-200';

                  return (
                    <div 
                      key={c.id} 
                      className="bg-white border border-gray-200 rounded-xl p-3.5 hover:border-indigo-300 hover:shadow-xs transition-all space-y-2.5 relative"
                    >
                      {/* Contract short header */}
                      <div className="flex justify-between items-start gap-2.5">
                        <div className="space-y-1.5 flex-grow min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-indigo-650 text-white font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs">
                              {c.contractCode}
                            </span>
                            {isMock && (
                              <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider">
                                Lịch sử lưu trữ
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-start gap-1.5 pt-0.5">
                            <User className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-extrabold text-gray-900 break-words leading-tight">
                                {c.customerName}
                              </div>
                              <div className="text-[11px] text-gray-500 font-mono font-medium mt-0.5">
                                {c.customerPhone}
                              </div>
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-bold ${statusStyles}`}>
                          ● {c.status === 'Completed' ? 'Hoàn thành' : c.status === 'Active' ? 'Đang thuê' : c.status === 'Overdue' ? 'Quá hạn' : 'Chờ giao'}
                        </span>
                      </div>

                      {/* Line Items info */}
                      <div className="bg-slate-50 p-2.5 rounded-lg border border-gray-150 space-y-1">
                        {c.items.map((it, idx) => (
                           <div key={idx} className="flex justify-between items-center text-[11px] gap-2">
                             <span className="text-gray-700 font-bold flex items-center gap-1 truncate">
                               <span>📷</span>
                               <span className="truncate">{it.cameraName}</span>
                             </span>
                             <span className="text-gray-500 font-mono shrink-0">
                               ({it.quantity} chiếc) × {it.dailyRate.toLocaleString()}đ
                             </span>
                           </div>
                        ))}
                      </div>

                      {/* Payment summary footer */}
                      <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-100 gap-2 flex-wrap sm:flex-nowrap">
                        <div className="text-gray-400 flex items-center gap-1 font-medium text-[11px] shrink-0">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>Ngày thuê: {new Date(c.startDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-1 ml-auto">
                          <span className="text-gray-450 font-medium text-[11px]">cọc / thực thu:</span>
                          <span className="font-mono font-extrabold text-indigo-700 text-xs sm:text-sm">
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
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-rose-500" />
                Các khoản chi phát sinh ({activeDetailData.expenses.length})
              </h4>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {activeDetailData.expenses.length === 0 ? (
                <div className="bg-slate-50 border border-gray-150 rounded-xl p-8 text-center text-gray-400 italic text-xs">
                  Không phát sinh khoản chi nào được ghi nhận trong {activeDetailData.title}.
                </div>
              ) : (
                activeDetailData.expenses.map((e) => {
                  const categoryLabels: Record<string, { label: string; bg: string }> = {
                    'Equipment': { label: 'Mua thiết bị mới', bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
                    'Maintenance': { label: 'Bảo dưỡng sửa chữa', bg: 'bg-amber-500/10 text-amber-700 border-amber-200' },
                    'Marketing': { label: 'Chi phí Marketing', bg: 'bg-indigo-500/10 text-indigo-700 border-indigo-200' },
                    'Salary': { label: 'Lương nhân sự', bg: 'bg-blue-500/10 text-blue-700 border-blue-200' },
                    'Other': { label: 'Chi phí khác', bg: 'bg-gray-500/10 text-gray-700 border-gray-200' }
                  };
                  const catInfo = categoryLabels[e.category] || { label: e.category, bg: 'bg-gray-50 text-gray-700 border-gray-200' };

                  return (
                    <div 
                      key={e.id} 
                      className="bg-white border border-gray-150 rounded-xl p-3 hover:border-rose-350 transition-all space-y-2"
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className={`text-[9px] px-2 py-0.5 rounded border ${catInfo.bg} font-bold`}>
                          {catInfo.label}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono font-medium">{new Date(e.date).toLocaleDateString('vi-VN')}</span>
                      </div>

                      <p className="text-xs text-gray-800 font-bold leading-relaxed">
                        {e.description}
                      </p>

                      <div className="text-right pt-1.5 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-medium">Rút quỹ chi:</span>
                        <span className="font-mono font-extrabold text-rose-600 text-[13px]">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-gray-150 flex justify-between items-center bg-gray-50/80">
              <div className="flex items-center gap-3">
                {modalCameraDetail.image ? (
                  <img 
                    src={modalCameraDetail.image} 
                    alt={modalCameraDetail.cameraName} 
                    className="w-11 h-11 rounded-xl object-cover border border-gray-200 shadow-2xs shrink-0" 
                  />
                ) : (
                  <span className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg shrink-0">
                    📷
                  </span>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-gray-900 text-sm sm:text-base leading-tight">
                      {modalCameraDetail.cameraName}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {modalCameraDetail.category}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono block mt-0.5">
                    Mã thiết bị / Serial: <span className="font-bold text-gray-700">{modalCameraDetail.serialNumber}</span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCameraForModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Summary KPI Cards */}
            <div className="p-4 sm:p-6 bg-slate-50 border-b border-gray-150 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-3xs space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Doanh thu tạo ra</span>
                <span className="font-mono text-sm sm:text-base font-black text-orange-600 block truncate">
                  {modalCameraDetail.totalRevenue.toLocaleString()}đ
                </span>
                <span className="text-[9px] text-green-600 font-medium block">Doanh số thực thu</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-3xs space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng lượt thuê</span>
                <span className="font-mono text-sm sm:text-base font-black text-indigo-650 block">
                  {modalCameraDetail.rentalCount} lượt
                </span>
                <span className="text-[9px] text-gray-400 font-medium block">{modalCameraDetail.bookings.length} hợp đồng</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-3xs space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Tổng ngày thuê</span>
                <span className="font-mono text-sm sm:text-base font-black text-emerald-600 block">
                  {modalCameraDetail.totalDays} ngày
                </span>
                <span className="text-[9px] text-gray-400 font-medium block">Thời gian phục vụ</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-gray-200/80 shadow-3xs space-y-0.5">
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Đơn giá niêm yết</span>
                <span className="font-mono text-sm sm:text-base font-black text-gray-900 block truncate">
                  {modalCameraDetail.dailyRate.toLocaleString()}đ
                </span>
                <span className="text-[9px] text-gray-400 font-medium block">Giá thuê 1 ngày</span>
              </div>
            </div>

            {/* Modal Body: Specific Rental Dates List */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-orange-600" />
                  <span>Chi tiết cụ thể các ngày cho thuê ({modalCameraDetail.bookings.length})</span>
                </h4>
                <span className="text-[10px] text-gray-400 italic">Sắp xếp theo ngày thuê mới nhất</span>
              </div>

              {modalCameraDetail.bookings.length === 0 ? (
                <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-xs italic">
                  Chưa có lịch sử cho thuê máy nào trong khoảng thời gian đang lọc ({dateRange.label}).
                </div>
              ) : (
                <div className="space-y-2.5">
                  {modalCameraDetail.bookings.map((booking, bIdx) => {
                    const statusClass = 
                      booking.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                      booking.status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200 font-bold' :
                      booking.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold' :
                      'bg-gray-50 text-gray-600 border-gray-200';

                    const statusText = 
                      booking.status === 'Completed' ? 'Hoàn thành' :
                      booking.status === 'Active' ? 'Đang thuê' :
                      booking.status === 'Overdue' ? 'Quá hạn' : 'Chờ giao';

                    return (
                      <div 
                        key={bIdx}
                        className="bg-white p-3.5 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-xs transition space-y-2.5"
                      >
                        {/* Header row */}
                        <div className="flex justify-between items-start gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-indigo-650 text-white font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                                {booking.contractCode}
                              </span>
                              <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                                {booking.is6Hours ? '⚡ Thuê 6 tiếng (Nửa ngày)' : `⏱️ Thuê ${booking.durationDays} ngày`}
                              </span>
                              {booking.quantity > 1 && (
                                <span className="text-[10px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                                  x{booking.quantity} chiếc
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 pt-0.5">
                              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="font-extrabold text-gray-900 text-xs">{booking.customerName}</span>
                              <span className="text-gray-400 font-mono text-[11px]">({booking.customerPhone})</span>
                            </div>
                          </div>

                          <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 font-bold ${statusClass}`}>
                            ● {statusText}
                          </span>
                        </div>

                        {/* Exact Dates & Revenue Row */}
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-gray-800 font-semibold font-mono">
                            <CalendarDays className="w-4 h-4 text-indigo-600 shrink-0" />
                            <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-indigo-900">
                              {new Date(booking.startDate).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="text-gray-400">➔</span>
                            <span className="bg-white px-2 py-0.5 rounded border border-gray-200 font-bold text-indigo-900">
                              {new Date(booking.endDate).toLocaleDateString('vi-VN')}
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] text-gray-400 mr-1.5 font-medium">Thu từ máy:</span>
                            <span className="font-mono font-black text-orange-600 text-xs sm:text-sm">
                              {booking.itemRevenue.toLocaleString()}đ
                            </span>
                          </div>
                        </div>

                        {booking.note && (
                          <p className="text-[11px] text-gray-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
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
            <div className="px-6 py-3.5 border-t border-gray-150 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Khoảng thời gian đang áp dụng: <b className="text-gray-800">{dateRange.label}</b>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCameraForModal(null)}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
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
