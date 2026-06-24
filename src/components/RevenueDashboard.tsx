import React, { useMemo, useState } from 'react';
import { RentalContract, Expense, Camera } from '../types';
import { 
  DollarSign, Landmark, TrendingUp, TrendingDown, ClipboardList, Package, Layers, 
  Calendar, FileText, CheckCircle2, Activity, Info, PieChart, ShoppingBag, ArrowRight, User
} from 'lucide-react';

interface RevenueDashboardProps {
  contracts: RentalContract[];
  expenses: Expense[];
  cameras: Camera[];
}

// High fidelity simulations for empty historical periods
const MARCH_SIMULATED_CONTRACTS: any[] = [
  {
    id: 'mock-con-m1',
    contractCode: 'HD-2026-03-01',
    customerId: 'cust-1',
    customerName: 'Nguyễn Văn Hải',
    customerPhone: '0912345678',
    startDate: '2026-03-05',
    endDate: '2026-03-08',
    totalPrice: 2500000,
    paidAmount: 2500000,
    status: 'Completed',
    items: [{ cameraId: 'cam-1', cameraName: 'Canon EOS R50', dailyRate: 150000, quantity: 2 }],
    is6Hours: false,
    depositAmount: 5000000,
    customerDocType: 'CCCD gốc',
    depositRefunded: true,
    note: 'Khách quen giữ máy kỹ.'
  },
  {
    id: 'mock-con-m2',
    contractCode: 'HD-2026-03-02',
    customerId: 'cust-2',
    customerName: 'Lê Minh Tú',
    customerPhone: '0988776655',
    startDate: '2026-03-18',
    endDate: '2026-03-19',
    totalPrice: 2000000,
    paidAmount: 2000000,
    status: 'Completed',
    items: [{ cameraId: 'cam-4', cameraName: 'Sony FE 24-70mm f/2.8 GM II', dailyRate: 300000, quantity: 1 }],
    is6Hours: false,
    depositAmount: 8000000,
    customerDocType: 'Bằng lái xe máy',
    depositRefunded: true,
    note: 'Chụp mẫu studio.'
  }
];

const MARCH_SIMULATED_EXPENSES: any[] = [
  {
    id: 'mock-exp-m1',
    category: 'Maintenance',
    amount: 1200000,
    date: '2026-03-12',
    description: 'Hút ẩm sâu, Lau bụi mốc kính Canon RF 24-70mm'
  },
  {
    id: 'mock-exp-m2',
    category: 'Marketing',
    amount: 800000,
    date: '2026-03-24',
    description: 'Quảng cáo Fanpage phục vụ mùa kỷ yếu'
  }
];

const APRIL_SIMULATED_CONTRACTS: any[] = [
  {
    id: 'mock-con-a1',
    contractCode: 'HD-2026-04-01',
    customerId: 'cust-3',
    customerName: 'Phan Anh Đức',
    customerPhone: '0933441122',
    startDate: '2026-04-03',
    endDate: '2026-04-06',
    totalPrice: 3800000,
    paidAmount: 3800000,
    status: 'Completed',
    items: [{ cameraId: 'cam-3', cameraName: 'Sony Alfa 7 IV (A7M4)', dailyRate: 450000, quantity: 1 }],
    is6Hours: false,
    depositAmount: 12000000,
    customerDocType: 'CCCD + Xe máy Wave',
    depositRefunded: true,
    note: 'Làm sòng phẳng.'
  },
  {
    id: 'mock-con-a2',
    contractCode: 'HD-2026-04-02',
    customerId: 'cust-4',
    customerName: 'Trần Thị Thảo',
    customerPhone: '0905123456',
    startDate: '2026-04-22',
    endDate: '2026-04-24',
    totalPrice: 2400000,
    paidAmount: 2400000,
    status: 'Completed',
    items: [{ cameraId: 'cam-2', cameraName: 'Fujifilm X-S10', dailyRate: 250000, quantity: 1 }],
    is6Hours: false,
    depositAmount: 6000000,
    customerDocType: 'Thế chấp hộ khẩu',
    depositRefunded: true,
    note: 'Trễ hạn nhẹ nhưng đã cam kết trả bù.'
  }
];

const APRIL_SIMULATED_EXPENSES: any[] = [
  {
    id: 'mock-exp-a1',
    category: 'Equipment',
    amount: 2500000,
    date: '2026-04-05',
    description: 'Sắm thêm tủ chống ẩm Andbon AD-80S'
  },
  {
    id: 'mock-exp-a2',
    category: 'Other',
    amount: 1000000,
    date: '2026-04-28',
    description: 'Mua đồ đóng gói chuyên dụng, chống sốc túi máy'
  }
];

export default function RevenueDashboard({
  contracts,
  expenses,
  cameras
}: RevenueDashboardProps) {
  // New States for flexible timeframe filtering
  const [timeframe, setTimeframe] = useState<string>('all');
  const [customStart, setCustomStart] = useState<string>('2026-06-15');
  const [customEnd, setCustomEnd] = useState<string>('2026-06-21');

  // Compute boundaries based on reference local date 2026-06-20 (Saturday)
  const dateRange = useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;
    let label = 'Toàn bộ thời gian';

    switch (timeframe) {
      case 'today':
        start = new Date('2026-06-20');
        end = new Date('2026-06-20');
        label = 'Hôm nay (20/06/2026)';
        break;
      case 'this-week':
        start = new Date('2026-06-15');
        end = new Date('2026-06-21');
        label = 'Tuần này (15/06 - 21/06/2026)';
        break;
      case 'last-week':
        start = new Date('2026-06-08');
        end = new Date('2026-06-14');
        label = 'Tuần trước (08/06 - 14/06/2026)';
        break;
      case 'this-month':
        start = new Date('2026-06-01');
        end = new Date('2026-06-30');
        label = 'Tháng này (Tháng 06/2026)';
        break;
      case 'last-month':
        start = new Date('2026-05-01');
        end = new Date('2026-05-31');
        label = 'Tháng trước (Tháng 05/2026)';
        break;
      case 'this-quarter':
        start = new Date('2026-04-01');
        end = new Date('2026-06-30');
        label = 'Quý này (Q2/2026)';
        break;
      case 'last-quarter':
        start = new Date('2026-01-01');
        end = new Date('2026-03-31');
        label = 'Quý trước (Q1/2026)';
        break;
      case 'custom':
        if (customStart) start = new Date(customStart);
        if (customEnd) end = new Date(customEnd);
        label = `Từ ${customStart ? new Date(customStart).toLocaleDateString('vi-VN') : 'khởi đầu'} đến ${customEnd ? new Date(customEnd).toLocaleDateString('vi-VN') : 'vô hạn'}`;
        break;
      default:
        label = 'Toàn bộ thời gian';
    }

    return { start, end, label };
  }, [timeframe, customStart, customEnd]);

  // Safe range checker
  const isBetween = (dateStr: string, start: Date | null, end: Date | null): boolean => {
    const itemDate = new Date(dateStr + 'T00:00:00');
    if (isNaN(itemDate.getTime())) return true;
    
    if (start) {
      const s = new Date(start);
      s.setHours(0,0,0,0);
      if (itemDate < s) return false;
    }
    if (end) {
      const e = new Date(end);
      e.setHours(23,59,59,999);
      if (itemDate > e) return false;
    }
    return true;
  };

  // Dynamic filter arrays
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

  // Calculate high-level financial parameters dynamically
  const financials = useMemo(() => {
    // Total Revenue of SELECTED timeframe: exclude Pending or Cancelled as those don't have recorded payments yet
    const totalRevenue = filteredContracts
      .filter(c => c.status !== 'Pending' && c.status !== 'Cancelled')
      .reduce((sum, c) => sum + c.paidAmount, 0);

    // Receivables (Tiền chưa thu hồi) of SELECTED timeframe
    const totalReceivables = filteredContracts
      .filter(c => c.status === 'Active' || c.status === 'Overdue')
      .reduce((sum, c) => sum + (c.totalPrice - c.paidAmount), 0);

    // Active contract count of SELECTED timeframe
    const activeRentalsCount = filteredContracts.filter(c => c.status === 'Active' || c.status === 'Overdue').length;

    // Total expenses of SELECTED timeframe
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Net profit of SELECTED timeframe
    const netProfit = totalRevenue - totalExpenses;

    return {
      totalRevenue,
      totalReceivables,
      activeRentalsCount,
      totalExpenses,
      netProfit
    };
  }, [filteredContracts, filteredExpenses]);

  // Compute equipment rental stats inside selected timeframe (showing trending gear popularity)
  const topRentedComponents = useMemo(() => {
    const counts: Record<string, { name: string; count: number; totalRev: number }> = {};
    
    filteredContracts.forEach(c => {
      const duration = Math.max(1, Math.ceil((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
      
      c.items.forEach(item => {
        if (!counts[item.cameraId]) {
          counts[item.cameraId] = {
            name: item.cameraName,
            count: 0,
            totalRev: 0
          };
        }
        counts[item.cameraId].count += 1;
        counts[item.cameraId].totalRev += item.dailyRate * duration;
      });
    });

    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 4);
  }, [filteredContracts]);

  // Determine bar chart index mapping
  const selectedMonthIndex = useMemo(() => {
    if (timeframe === 'custom') {
      if (customStart === '2026-03-01' && customEnd === '2026-03-31') return 0;
      if (customStart === '2026-04-01' && customEnd === '2026-04-30') return 1;
    }
    if (timeframe === 'last-month') return 2;
    if (timeframe === 'this-month') return 3;
    return -1;
  }, [timeframe, customStart, customEnd]);

  // Calculate monthly metrics representing May and June 2026 for drawing the chart
  const barChartData = useMemo(() => {
    const data = [
      { month: 'Tháng 3', revenue: 0, expense: 0 },
      { month: 'Tháng 4', revenue: 0, expense: 0 },
      { month: 'Tháng 5', revenue: 0, expense: 0 },
      { month: 'Tháng 6', revenue: 0, expense: 0 }
    ];

    // Computed real values for each month
    let testMarchRev = 0;
    let testMarchExp = 0;
    contracts.forEach(c => {
      if (c.status === 'Cancelled') return;
      if (c.startDate.startsWith('2026-03')) {
        testMarchRev += c.paidAmount;
      }
    });
    expenses.forEach(e => {
      if (e.date.startsWith('2026-03')) {
        testMarchExp += e.amount;
      }
    });

    let testAprilRev = 0;
    let testAprilExp = 0;
    contracts.forEach(c => {
      if (c.status === 'Cancelled') return;
      if (c.startDate.startsWith('2026-04')) {
        testAprilRev += c.paidAmount;
      }
    });
    expenses.forEach(e => {
      if (e.date.startsWith('2026-04')) {
        testAprilExp += e.amount;
      }
    });

    let testMayRev = 0;
    let testMayExp = 0;
    contracts.forEach(c => {
      if (c.status === 'Cancelled') return;
      if (c.startDate.startsWith('2026-05')) {
        testMayRev += c.paidAmount;
      }
    });
    expenses.forEach(e => {
      if (e.date.startsWith('2026-05')) {
        testMayExp += e.amount;
      }
    });

    let testJuneRev = 0;
    let testJuneExp = 0;
    contracts.forEach(c => {
      if (c.status === 'Cancelled') return;
      if (c.startDate.startsWith('2026-06')) {
        testJuneRev += c.paidAmount;
      }
    });
    expenses.forEach(e => {
      if (e.date.startsWith('2026-06')) {
        testJuneExp += e.amount;
      }
    });

    data[0].revenue = testMarchRev;
    data[0].expense = testMarchExp;
    data[1].revenue = testAprilRev;
    data[1].expense = testAprilExp;
    data[2].revenue = testMayRev;
    data[2].expense = testMayExp;
    data[3].revenue = testJuneRev;
    data[3].expense = testJuneExp;

    return data;
  }, [contracts, expenses]);

  // Max value for scaling SVG chart bars
  const chartMaxHeightValue = useMemo(() => {
    const allValues = barChartData.flatMap(d => [d.revenue, d.expense]);
    const max = Math.max(...allValues, 1000000);
    return max * 1.15;
  }, [barChartData]);

  // Selected timeframe summary for cards and details section
  const selectedTimeframeData = useMemo(() => {
    const revTotal = filteredContracts.reduce((sum, c) => sum + c.paidAmount, 0);
    const expTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const revExpected = filteredContracts.reduce((sum, c) => sum + c.totalPrice, 0);
    const unpaidTotal = Math.max(0, revExpected - revTotal);
    const netMonth = revTotal - expTotal;
    const profitMargin = revTotal > 0 ? (netMonth / revTotal) * 100 : 0;

    return {
      monthName: dateRange.label,
      contracts: filteredContracts,
      expenses: filteredExpenses,
      revTotal,
      expTotal,
      revExpected,
      unpaidTotal,
      netMonth,
      profitMargin
    };
  }, [filteredContracts, filteredExpenses, dateRange]);

  const handleChartBarClick = (index: number) => {
    if (index === 0) {
      setTimeframe('custom');
      setCustomStart('2026-03-01');
      setCustomEnd('2026-03-31');
    } else if (index === 1) {
      setTimeframe('custom');
      setCustomStart('2026-04-01');
      setCustomEnd('2026-04-30');
    } else if (index === 2) {
      setTimeframe('last-month');
    } else if (index === 3) {
      setTimeframe('this-month');
    }
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
              <p className="text-[10px] sm:text-xs text-gray-400 break-words leading-tight sm:leading-normal">Xem thống kê doanh thu, chi phí chi nhất theo tuần, quý, tháng hoặc tùy chọn.</p>
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

        {/* Quick Filters Options Buttons - Swipeable on mobile, wrapping gracefully on desktop */}
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
            💎 Quý này (Q2)
          </button>
          <button
            onClick={() => { setTimeframe('last-quarter'); }}
            className={`px-3 py-1.5 rounded-lg sm:rounded-xl text-[10.5px] sm:text-xs font-bold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              timeframe === 'last-quarter'
                ? 'bg-indigo-650 text-white border-indigo-650 shadow-xs'
                : 'bg-gray-50 text-gray-655 border-gray-200 hover:bg-gray-100 hover:text-gray-950'
            }`}
          >
            ⏱️ Quý trước (Q1)
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
                  setCustomStart('2026-06-01');
                  setCustomEnd('2026-06-20');
                }}
                className="bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-100 transition text-[11px] font-bold py-1.5 px-3 rounded-lg flex-1 text-center cursor-pointer"
              >
                Đặt nhanh Tháng 6
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

      {/* Analytics Chart & Detail widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG-based beautiful chart */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-gray-900 text-base">Thống Kê Thu Chi (Theo Tháng)</h3>
              <p className="text-xs text-gray-400">Doanh số thực thu qua đợt bàn giao so với ngân sách duy trì đội máy. Chọn tháng để xem chi tiết.</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
                <Info className="w-3 h-3" />
                Đang xem: {selectedTimeframeData.monthName}
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between px-2 sm:px-6 pt-6 border-b border-gray-200 select-none bg-gray-50/50 rounded-xl">
            {barChartData.map((d, index) => {
              const revPercent = (d.revenue / chartMaxHeightValue) * 100;
              const expPercent = (d.expense / chartMaxHeightValue) * 100;
              const isSelected = selectedMonthIndex === index;

              return (
                <div 
                  key={index} 
                  onClick={() => handleChartBarClick(index)}
                  className={`flex flex-col items-center gap-2.5 w-1/4 p-1 sm:p-2 rounded-xl transition-all cursor-pointer border ${
                    isSelected 
                      ? 'bg-orange-50/40 border-orange-200 shadow-xs ring-2 ring-orange-500/10' 
                      : 'border-transparent hover:bg-gray-100/55'
                  }`}
                  title={`Click để xem phân tích chi tiết của ${d.month}`}
                >
                  <div className="flex gap-1 sm:gap-2.5 items-end justify-center w-full h-40">
                    {/* Revenue Bar */}
                    <div
                      className="bg-orange-500 hover:bg-orange-600 transition-all w-4 sm:w-7 md:w-8 rounded-t-md shadow-xs relative group cursor-pointer"
                      style={{ height: `${Math.max(4, revPercent)}%` }}
                    >
                      {/* Hover Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white font-mono text-[10px] py-1 px-2 rounded -translate-y-1.5 whitespace-nowrap z-10 pointer-events-none">
                        Doanh thu: {d.revenue.toLocaleString()}đ
                      </div>
                    </div>

                    {/* Expense Bar */}
                    <div
                      className="bg-rose-450 bg-rose-400 hover:bg-rose-500 transition-all w-4 sm:w-7 md:w-8 rounded-t-md shadow-xs relative group cursor-pointer"
                      style={{ height: `${Math.max(4, expPercent)}%` }}
                    >
                      {/* Hover Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-900 text-white font-mono text-[10px] py-1 px-2 rounded -translate-y-1.5 whitespace-nowrap z-10 pointer-events-none">
                        Chi phí: {d.expense.toLocaleString()}đ
                      </div>
                    </div>
                  </div>

                  <span className={`text-[11px] sm:text-xs font-bold font-sans mt-0.5 ${isSelected ? 'text-orange-755 underline font-extrabold' : 'text-gray-500'}`}>{d.month}</span>
                </div>
              );
            })}
          </div>

          {/* Chart Legends */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 bg-orange-500 rounded inline-block"></span>
              <span>Tổng doanh thu (Doanh số cọc thuê)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2.5 bg-rose-400 rounded inline-block"></span>
              <span>Tổng chi phí (Khoản chi)</span>
            </div>
          </div>
        </div>

        {/* Hot gears leaderboard section */}
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Thiết Bị Được Thuê Nhiều Nhất</h3>
            <p className="text-xs text-gray-400">Thiết bị mang lại tần suất sử dụng và tỉ lệ sinh lời tối ưu.</p>
          </div>

          <div className="space-y-4">
            {topRentedComponents.length > 0 ? (
              topRentedComponents.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-gray-50/70 p-3 rounded-xl border border-gray-100 hover:shadow-2xs transition-shadow">
                  <div className="space-y-1 max-w-[170px]">
                    <h4 className="font-bold text-gray-800 text-xs truncate" title={item.name}>{item.name}</h4>
                    <span className="text-[10px] text-gray-500 font-sans">Doanh thu máy: <span className="font-bold text-orange-655 font-mono">{item.totalRev.toLocaleString()}đ</span></span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="bg-orange-100 text-orange-850 text-orange-800 text-xs font-bold px-2.5 py-1 rounded-full font-sans whitespace-nowrap">
                      <span className="font-mono">{item.count}</span> Lượt thuê
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-xs font-medium italic text-center py-6">
                Chưa có dữ liệu thống kê hoạt động thuê thực tế để lập bảng.
              </p>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-120 p-3.5 rounded-xl text-[11px] text-amber-800 font-medium">
            <span>💡 <b>Lời khuyên kho bãi:</b> Canon EOS R50 và Fuji X-S10 đang chiếm 80% tần suất thuê. Xem xét mua bổ sung máy Canon R100 hoặc lens zoom góc rộng để mở rộng tệp doanh thu.</span>
          </div>
        </div>
      </div>

      {/* Detailed Interactive Monthly Visual Report */}
      <div id="monthly-details-section" className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="space-y-1">
            <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>
                Chi Tiết Hoạt Động Doanh Thu - <span className="text-indigo-650 font-extrabold">{selectedTimeframeData.monthName}</span>
              </span>
            </h3>
            <p className="text-xs text-gray-500">
              Danh sách chi tiết các hợp đồng cọc thuê và các khoản chi thực thu ghi nhận trong thời gian được lọc.
            </p>
          </div>

          {/* Quick horizontal tab selector for the months */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl shrink-0 overflow-x-auto max-w-full">
            {barChartData.map((d, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleChartBarClick(index)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedMonthIndex === index
                    ? 'bg-indigo-650 text-white shadow-xs'
                    : 'text-gray-650 hover:text-gray-900 hover:bg-gray-200'
                }`}
              >
                {d.month}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Month Stats Overviews */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-slate-50 border border-gray-150 p-3 sm:p-4.5 rounded-xl space-y-1">
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block truncate">Thực thu trong kỳ</span>
            <div className="font-mono text-sm sm:text-lg font-bold text-orange-600 block truncate">
              {selectedTimeframeData.revTotal.toLocaleString()}đ
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium truncate">
              Dự kiến: <span className="font-bold">{selectedTimeframeData.revExpected.toLocaleString()}đ</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-gray-150 p-3 sm:p-4.5 rounded-xl space-y-1">
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block truncate">Chi phí phát sinh</span>
            <div className="font-mono text-sm sm:text-lg font-bold text-rose-600 block truncate">
              {selectedTimeframeData.expTotal.toLocaleString()}đ
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium font-sans truncate">
              Bảo dưỡng & Kho bãi
            </div>
          </div>

          <div className={`p-3 sm:p-4.5 rounded-xl space-y-1 border ${
            selectedTimeframeData.netMonth >= 0 
              ? 'bg-emerald-50/40 border-emerald-150' 
              : 'bg-rose-50/40 border-rose-150'
          }`}>
            <span className="text-[9px] sm:text-[10px] text-gray-450 font-extrabold uppercase tracking-wider block truncate">Lợi nhuận ròng</span>
            <div className={`font-mono text-sm sm:text-lg font-bold block truncate ${selectedTimeframeData.netMonth >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {selectedTimeframeData.netMonth.toLocaleString()}đ
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium font-sans truncate font-medium">
              Doanh thu đối trừ ròng
            </div>
          </div>

          <div className="bg-slate-50 border border-gray-150 p-3 sm:p-4.5 rounded-xl space-y-1">
            <span className="text-[9px] sm:text-[10px] text-gray-400 font-extrabold uppercase tracking-wider block truncate">Tỷ suất biên ròng</span>
            <div className="font-mono text-sm sm:text-lg font-bold text-indigo-700 flex items-center gap-1 block truncate">
              <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              {selectedTimeframeData.profitMargin.toFixed(1)}%
            </div>
            <div className="text-[9px] sm:text-[10px] text-gray-500 font-medium truncate">
              Hiệu suất hoạt động ròng
            </div>
          </div>
        </div>

        {/* Detailed Transactions and Expenses of the Month */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Contracts list of the Month (Span 3 columns) */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-indigo-650" />
                Hợp đồng phát sinh trong kỳ ({selectedTimeframeData.contracts.length})
              </h4>
              <span className="text-[10px] text-gray-400 italic">Thực thi nghiệp vụ</span>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {selectedTimeframeData.contracts.length === 0 ? (
                <div className="bg-slate-50 border border-gray-155 rounded-xl p-8 text-center text-gray-400 italic text-xs">
                  Không phát sinh giao dịch cho thuê máy nào trong khoảng thời gian này.
                </div>
              ) : (
                selectedTimeframeData.contracts.map((c) => {
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
                          <span className="text-gray-450 font-medium text-[11px]">cọc:</span>
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

          {/* Expenses list of the Month (Span 2 columns) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-rose-500" />
                Các khoản chi phát sinh ({selectedTimeframeData.expenses.length})
              </h4>
            </div>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {selectedTimeframeData.expenses.length === 0 ? (
                <div className="bg-slate-50 border border-gray-150 rounded-xl p-8 text-center text-gray-400 italic text-xs">
                  Không phát sinh khoản chi nào được ghi nhận trong khoảng thời gian này.
                </div>
              ) : (
                selectedTimeframeData.expenses.map((e) => {
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
    </div>
  );
}
