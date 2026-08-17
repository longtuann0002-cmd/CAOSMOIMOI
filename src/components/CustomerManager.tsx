import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Customer, RentalContract } from '../types';
import { Search, Plus, Trash2, Edit2, Shield, User, Heart, AlertTriangle, Phone, Globe, MapPin, ChevronLeft, ChevronRight, FileSpreadsheet, Eye, Calendar, DollarSign, FileText, CheckCircle2, Clock, X, Info } from 'lucide-react';

interface CustomerManagerProps {
  customers: Customer[];
  contracts?: RentalContract[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer?: (id: string) => void;
}

export default function CustomerManager({
  customers,
  contracts = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer
}: CustomerManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'UNPAID_DEPOSIT' | 'HAS_DEBT' | 'NO_DEBT'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  const [formState, setFormState] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    idNumber: '',
    idPhotoFront: '',
    idPhotoBack: '',
    trustLevel: 'High' as Customer['trustLevel'],
    notes: ''
  });

  // Resize image to max width 1200px, quality 0.65
  const resizeImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1200;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Calculate customer debt and financials helper
  const getCustomerFinancials = (phone: string) => {
    if (!phone) {
      return {
        custContracts: [],
        totalDebt: 0,
        totalSpent: 0,
        totalExpected: 0,
        debtContractsCount: 0,
        pendingDepositCount: 0,
        pendingDepositAmount: 0
      };
    }
    const custContracts = (contracts || []).filter(c => c && c.customerPhone === phone && c.status !== 'Cancelled');
    const totalDebt = custContracts.reduce((sum, c) => sum + Math.max(0, (c.totalPrice || 0) - (c.paidAmount || 0)), 0);
    const totalSpent = custContracts.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
    const totalExpected = custContracts.reduce((sum, c) => sum + (c.totalPrice || 0), 0);
    const debtContractsCount = custContracts.filter(c => (c.totalPrice || 0) > (c.paidAmount || 0)).length;
    
    // Pending reservation deposits (Đơn chờ cọc 50% giữ máy - Chỉ tính đơn chưa cọc đủ 50%)
    const pendingContracts = custContracts.filter(c => c.status === 'Pending' && (c.paidAmount || 0) < Math.round((c.totalPrice || 0) * 0.5));
    const pendingDepositCount = pendingContracts.length;
    const pendingDepositAmount = pendingContracts.reduce((sum, c) => {
      const reqDeposit = Math.round((c.totalPrice || 0) * 0.5);
      return sum + Math.max(0, reqDeposit - (c.paidAmount || 0));
    }, 0);

    return {
      custContracts,
      totalDebt,
      totalSpent,
      totalExpected,
      debtContractsCount,
      pendingDepositCount,
      pendingDepositAmount
    };
  };

  // Total summary metrics across all customers
  const overallCustomerDebt = useMemo(() => {
    return (contracts || [])
      .filter(c => c && c.status !== 'Cancelled')
      .reduce((sum, c) => sum + Math.max(0, (c.totalPrice || 0) - (c.paidAmount || 0)), 0);
  }, [contracts]);

  const overallPendingDeposit = useMemo(() => {
    return (contracts || [])
      .filter(c => c && c.status === 'Pending' && (c.paidAmount || 0) < Math.round((c.totalPrice || 0) * 0.5))
      .reduce((sum, c) => {
        const reqDeposit = Math.round((c.totalPrice || 0) * 0.5);
        return sum + Math.max(0, reqDeposit - (c.paidAmount || 0));
      }, 0);
  }, [contracts]);

  const debtorCount = useMemo(() => {
    const debtorPhones = new Set(
      (contracts || [])
        .filter(c => c && c.status !== 'Cancelled' && ((c.totalPrice || 0) > (c.paidAmount || 0)) && c.customerPhone)
        .map(c => c.customerPhone)
    );
    return (customers || []).filter(c => c && c.phone && debtorPhones.has(c.phone)).length;
  }, [contracts, customers]);

  const pendingDepositCustomerCount = useMemo(() => {
    const pendingPhones = new Set(
      (contracts || [])
        .filter(c => c && c.status === 'Pending' && (c.paidAmount || 0) < Math.round((c.totalPrice || 0) * 0.5) && c.customerPhone)
        .map(c => c.customerPhone)
    );
    return (customers || []).filter(c => c && c.phone && pendingPhones.has(c.phone)).length;
  }, [contracts, customers]);

  const filteredCustomers = useMemo(() => {
    return (customers || [])
      .filter(c => {
        if (!c) return false;
        const query = searchQuery.toLowerCase().trim();
        const nameMatch = (c.name || '').toLowerCase().includes(query);
        const phoneMatch = (c.phone || '').includes(query);
        const emailMatch = !!(c.email && c.email.toLowerCase().includes(query));
        const idMatch = !!(c.idNumber && c.idNumber.toLowerCase().includes(query));
        const matchesSearch = nameMatch || phoneMatch || emailMatch || idMatch;

        if (!matchesSearch) return false;

        if (debtFilter === 'UNPAID_DEPOSIT') {
          const { pendingDepositCount } = getCustomerFinancials(c.phone);
          return pendingDepositCount > 0;
        }
        if (debtFilter === 'HAS_DEBT') {
          const { totalDebt } = getCustomerFinancials(c.phone);
          return totalDebt > 0;
        }
        if (debtFilter === 'NO_DEBT') {
          const { totalDebt, pendingDepositCount } = getCustomerFinancials(c.phone);
          return totalDebt === 0 && pendingDepositCount === 0;
        }

        return true;
      })
      .sort((a, b) => {
        // 1. Sắp xếp khách hàng có nhiều lượt thuê nhất lên trang đầu
        const countA = (contracts || []).filter(c => c && c.customerPhone === a.phone && c.status !== 'Cancelled').length || (a.rentalCount || 0);
        const countB = (contracts || []).filter(c => c && c.customerPhone === b.phone && c.status !== 'Cancelled').length || (b.rentalCount || 0);

        if (countB !== countA) {
          return countB - countA;
        }

        // 2. Nếu cùng lượt thuê, ưu tiên người có tổng tiền thuê (chi tiêu) cao hơn
        const spentA = (contracts || []).filter(c => c && c.customerPhone === a.phone && c.status !== 'Cancelled').reduce((sum, c) => sum + (c.paidAmount || 0), 0);
        const spentB = (contracts || []).filter(c => c && c.customerPhone === b.phone && c.status !== 'Cancelled').reduce((sum, c) => sum + (c.paidAmount || 0), 0);
        if (spentB !== spentA) {
          return spentB - spentA;
        }

        // 3. Xếp theo thứ tự bảng chữ cái tên
        return (a.name || '').localeCompare(b.name || '', 'vi');
      });
  }, [customers, searchQuery, debtFilter, contracts]);

  // Pagination Configuration
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, debtFilter]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  const handleOpenAddModal = () => {
    setFormState({
      name: '',
      phone: '',
      email: '',
      address: '',
      idNumber: '',
      idPhotoFront: '',
      idPhotoBack: '',
      trustLevel: 'High',
      notes: ''
    });
    setEditingCustomer(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setFormState({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      idNumber: c.idNumber || '',
      idPhotoFront: c.idPhotoFront || '',
      idPhotoBack: c.idPhotoBack || '',
      trustLevel: c.trustLevel,
      notes: c.notes || ''
    });
    setEditingCustomer(c);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.phone) {
      setValidationError('Vui lòng điền đầy đủ Tên và Số điện thoại khách hàng!');
      return;
    }

    if (editingCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        ...formState
      });
    } else {
      const newCust: Customer = {
        id: `cust-${Date.now()}`,
        rentalCount: 0,
        createdAt: new Date().toISOString(),
        ...formState
      };
      onAddCustomer(newCust);
    }
    setShowAddModal(false);
    setValidationError(null);
  };

  const handleExportCSV = () => {
    if (filteredCustomers.length === 0) {
      return;
    }

    const BOM = '\uFEFF';
    const headers = [
      'ID Khách Hàng',
      'Họ Và Tên',
      'Số Điện Thoại',
      'Trang liên kết / Website',
      'Địa Chỉ',
      'Số Giấy Tờ (CCCD/ID)',
      'Hạng Tin Cậy',
      'Số Lần Thuê Máy',
      'Ghi Chú Chi Tiết',
      'Tổng Doanh Số Tích Lũy (VND)',
      'Ngày Khởi Tạo'
    ];

    const rows = filteredCustomers.map(c => {
      let trustVN = 'Cao';
      if (c.trustLevel === 'Medium') trustVN = 'Trung bình';
      else if (c.trustLevel === 'Low') trustVN = 'Cảnh báo rủi ro';

      return [
        c.id,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.phone.replace(/"/g, '""')}"`,
        `"${(c.email || '').replace(/"/g, '""')}"`,
        `"${(c.address || '').replace(/"/g, '""')}"`,
        `"${(c.idNumber || '').replace(/"/g, '""')}"`,
        trustVN,
        c.rentalCount,
        `"${(c.notes || '').replace(/"/g, '""')}"`,
        c.totalSpent || 0,
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : ''
      ];
    });

    const csvContent = BOM + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_khach_hang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white border border-gray-150 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-xl font-black text-gray-850 flex items-center gap-2 select-none">
              <User className="text-orange-600 w-4.5 h-4.5 sm:w-5 bg-orange-50 p-1 rounded-md sm:bg-transparent sm:p-0" /> Quản Lý Khách Hàng Thuê Máy
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-normal">
              Tra cứu hồ sơ khách hàng, kiểm soát dư nợ chưa thu và xếp hạng độ tin cậy để quyết định mức độ cọc.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              className="bg-slate-50 border border-gray-200 text-gray-700 font-extrabold sm:font-semibold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm flex items-center justify-center gap-1.5 hover:bg-slate-100 hover:text-gray-900 transition-all cursor-pointer shadow-4xs"
              title="Xuất định dạng CSV tải về"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" /> Xuất bản CSV
            </button>
            <button
              onClick={handleOpenAddModal}
              className="bg-orange-600 text-white font-extrabold sm:font-medium px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm flex items-center justify-center gap-1.5 hover:bg-orange-700 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Thêm khách hàng
            </button>
          </div>
        </div>

        {/* Aggregate Financial Metrics Banner: Dư Nợ & Chưa Thanh Toán Cọc */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Card 1: Dư Nợ Chưa Thu */}
          <div className="bg-gradient-to-r from-rose-50 to-rose-100/60 border border-rose-200/90 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2.5 shadow-3xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 sm:p-2.5 bg-rose-200/80 text-rose-800 rounded-xl shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9.5px] sm:text-[11px] font-bold text-rose-800 uppercase tracking-wider block truncate">Dư Nợ Khách Chưa Thu</span>
                <span className="font-mono text-sm sm:text-lg font-black text-rose-700 block truncate mt-0.5">
                  {overallCustomerDebt.toLocaleString()}đ
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDebtFilter(debtFilter === 'HAS_DEBT' ? 'ALL' : 'HAS_DEBT')}
              className="text-[10px] sm:text-xs font-black text-rose-800 bg-white/90 border border-rose-300 px-2.5 py-1 rounded-lg shrink-0 hover:bg-rose-50 transition cursor-pointer shadow-4xs"
            >
              ⚠️ {debtorCount} khách nợ
            </button>
          </div>

          {/* Card 2: Chưa Thanh Toán Cọc 50% Giữ Máy */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200/90 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2.5 shadow-3xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 sm:p-2.5 bg-amber-200/80 text-amber-800 rounded-xl shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[9.5px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block truncate">Chưa Thanh Toán Cọc 50% Giữ Máy</span>
                <span className="font-mono text-sm sm:text-lg font-black text-amber-700 block truncate mt-0.5">
                  {overallPendingDeposit.toLocaleString()}đ
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDebtFilter(debtFilter === 'UNPAID_DEPOSIT' ? 'ALL' : 'UNPAID_DEPOSIT')}
              className="text-[10px] sm:text-xs font-black text-amber-800 bg-white/90 border border-amber-300 px-2.5 py-1 rounded-lg shrink-0 hover:bg-amber-50 transition cursor-pointer shadow-4xs"
            >
              ⏳ {pendingDepositCustomerCount} khách chưa cọc 50%
            </button>
          </div>
        </div>

        {/* Search Bar & Debt Filters */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, số CCCD, trang liên kết..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8.5 pr-4 py-1.5 sm:py-2.5 text-xs sm:text-sm w-full border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-400/80"
            />
          </div>

          {/* Quick Filter Tabs for Debt & Pending Deposit Status */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none">
            <button
              type="button"
              onClick={() => setDebtFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                debtFilter === 'ALL'
                  ? 'bg-orange-600 text-white border-orange-600 shadow-3xs'
                  : 'bg-gray-50 text-gray-650 border-gray-200 hover:bg-gray-100'
              }`}
            >
              Tất cả ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setDebtFilter('UNPAID_DEPOSIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                debtFilter === 'UNPAID_DEPOSIT'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-3xs'
                  : 'bg-amber-50 text-amber-800 border-amber-250 hover:bg-amber-100'
              }`}
            >
              <span>Chưa thanh toán cọc 50% giữ máy</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${debtFilter === 'UNPAID_DEPOSIT' ? 'bg-white/20 text-white' : 'bg-amber-200/80 text-amber-900'}`}>
                {pendingDepositCustomerCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDebtFilter('HAS_DEBT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                debtFilter === 'HAS_DEBT'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-3xs'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span>Còn dư nợ chưa thu</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${debtFilter === 'HAS_DEBT' ? 'bg-white/20 text-white' : 'bg-rose-200/80 text-rose-800'}`}>
                {debtorCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDebtFilter('NO_DEBT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap border flex items-center gap-1.5 ${
                debtFilter === 'NO_DEBT'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-3xs'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>Đã thanh toán đủ</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${debtFilter === 'NO_DEBT' ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-800'}`}>
                {customers.length - debtorCount - pendingDepositCustomerCount > 0 ? customers.length - debtorCount - pendingDepositCustomerCount : 0}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid List - 2 columns on mobile, scales up on larger screens */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {paginatedCustomers.map(cust => {
          const sortedContracts = (contracts || [])
            .filter(contract => 
              contract.customerPhone === cust.phone
            )
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

          const financials = getCustomerFinancials(cust.phone);

          return (
            <div key={cust.id} className={`bg-white border rounded-xl p-2.5 sm:p-4 shadow-2xs space-y-2 sm:space-y-3 flex flex-col justify-between hover:shadow-sm transition-all ${
              financials.pendingDepositCount > 0
                ? 'border-amber-300 ring-1 ring-amber-400/30'
                : financials.totalDebt > 0 
                  ? 'border-rose-300 ring-1 ring-rose-400/20' 
                  : 'border-gray-150/70 hover:border-gray-300'
            }`}>
              <div className="space-y-2 sm:space-y-2.5">
                {/* Header: Name + rental count */}
                <div className="flex justify-between items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 text-xs sm:text-sm truncate leading-snug" title={cust.name}>
                      {cust.name}
                    </h3>
                    {/* Trust badge — full text on sm+, icon only on mobile */}
                    <span className={`inline-flex items-center gap-1 text-[9px] sm:text-[9.5px] font-bold px-1 sm:px-1.5 py-0.5 rounded-full mt-0.5 sm:mt-1 border ${
                      cust.trustLevel === 'High' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      cust.trustLevel === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      <Shield className="w-2 h-2 sm:w-2.5 sm:h-2.5 shrink-0" />
                      <span className="hidden sm:inline">{cust.trustLevel === 'High' ? '★ Tin cậy cao' : cust.trustLevel === 'Medium' ? '● Vừa' : '▲ Cẩn thận'}</span>
                      <span className="sm:hidden">{cust.trustLevel === 'High' ? '★' : cust.trustLevel === 'Medium' ? '●' : '▲'}</span>
                    </span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                    {sortedContracts.length || cust.rentalCount} đơn
                  </span>
                </div>

                {/* Debt / deposit alerts - compact on mobile */}
                {financials.pendingDepositCount > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 sm:p-2.5 space-y-0.5 sm:space-y-1">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs gap-1">
                      <span className="font-extrabold text-amber-900 truncate">⏳ Chưa cọc 50%</span>
                      <span className="font-mono font-black text-amber-700 shrink-0 text-[10px] sm:text-sm">+{financials.pendingDepositAmount.toLocaleString()}đ</span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-amber-700 font-medium">({financials.pendingDepositCount} đơn chờ)</div>
                  </div>
                )}

                {financials.totalDebt > 0 ? (
                  <div className="bg-rose-50 border border-rose-200/90 rounded-lg px-2 py-1.5 sm:p-2.5 space-y-0.5 sm:space-y-1">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs gap-1">
                      <span className="font-extrabold text-rose-800 truncate">⚠️ Dư nợ</span>
                      <span className="font-mono font-black text-rose-700 shrink-0 text-[10px] sm:text-sm">+{financials.totalDebt.toLocaleString()}đ</span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-rose-600 font-medium">({financials.debtContractsCount} đơn nợ)</div>
                  </div>
                ) : financials.pendingDepositCount === 0 ? (
                  <div className="bg-emerald-50/60 border border-emerald-150 rounded-lg px-2 py-1 flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="text-emerald-800 font-bold">✓ Đủ tiền</span>
                    <span className="font-mono text-emerald-700 font-bold">0đ</span>
                  </div>
                ) : null}

                {/* Contact info - compact */}
                <div className="border-t border-gray-100 pt-1.5 sm:pt-2.5 space-y-1 sm:space-y-1.5 text-[10px] sm:text-xs">
                  <div className="flex items-center gap-1 font-mono">
                    <Phone className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 shrink-0" />
                    <span className="text-gray-800 font-bold truncate">{cust.phone}</span>
                  </div>
                  {cust.email && (
                    <div className="flex items-center gap-1 truncate hidden sm:flex" title={cust.email}>
                      <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                      <a 
                        href={cust.email.startsWith('http://') || cust.email.startsWith('https://') ? cust.email : `https://${cust.email}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="truncate text-orange-600 hover:text-orange-700 hover:underline font-medium transition-colors"
                      >
                        {cust.email}
                      </a>
                    </div>
                  )}
                  {cust.address && (
                    <div className="hidden sm:flex items-start gap-1 text-[11px]">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                      <span className="truncate" title={cust.address}>{cust.address}</span>
                    </div>
                  )}
                </div>

                {/* Rental history — visible on both mobile and desktop */}
                <div className="pt-1.5 sm:pt-2 border-t border-dashed border-gray-150 space-y-1 sm:space-y-1.5">
                  <span className="text-[9px] sm:text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Đơn thuê gần đây ({sortedContracts.length})
                  </span>
                  {sortedContracts.length === 0 ? (
                    <p className="text-[10px] sm:text-[11px] text-gray-400 italic">Chưa có đơn thuê</p>
                  ) : (
                    <div className="space-y-1 sm:space-y-1.5 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                      {[...sortedContracts].reverse().slice(0, 2).map((contract) => {
                        const origIndex = sortedContracts.findIndex(c => c.id === contract.id);
                        const nthRental = origIndex !== -1 ? origIndex + 1 : sortedContracts.length;
                        const statusConfig = 
                          contract.status === 'Completed' ? { bg: 'bg-green-50 border-green-150 text-green-700', label: 'Xong' } :
                          contract.status === 'Active' ? { bg: 'bg-blue-50 border-blue-150 text-blue-700 font-bold', label: 'Đang thuê' } :
                          contract.status === 'Overdue' ? { bg: 'bg-rose-50 border-rose-150 text-rose-700 animate-pulse', label: 'Trễ hạn' } :
                          contract.status === 'Pending' ? { bg: 'bg-amber-50 border-amber-150 text-amber-700', label: 'Chờ' } :
                          { bg: 'bg-gray-50 border-gray-150 text-gray-500', label: 'Hủy' };
                        return (
                          <div 
                            key={contract.id} 
                            onClick={() => setSelectedCustomerForHistory(cust)}
                            className="bg-gray-50/75 border border-gray-200/60 rounded-lg p-1.5 sm:p-2 hover:border-orange-200 hover:bg-orange-50/10 cursor-pointer transition text-[10px] sm:text-[11px] space-y-0.5 sm:space-y-1 group"
                          >
                            <div className="flex justify-between items-center gap-1">
                              <span className="font-mono font-extrabold text-orange-600 truncate group-hover:text-orange-700 text-[10px] sm:text-xs">{contract.contractCode}</span>
                              <span className={`px-1 rounded text-[8px] sm:text-[8.5px] font-bold border shrink-0 ${statusConfig.bg}`}>{statusConfig.label}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] sm:text-xs">
                              <span className="font-bold text-gray-750">Lần {nthRental}</span>
                              <span className="font-mono text-gray-500 text-[9.5px] sm:text-[10px]">{contract.totalPrice.toLocaleString()}đ</span>
                            </div>
                          </div>
                        );
                      })}
                      {sortedContracts.length > 2 && (
                        <button type="button" onClick={() => setSelectedCustomerForHistory(cust)}
                          className="text-[9.5px] sm:text-[10px] font-bold text-indigo-650 hover:text-indigo-800 transition block text-center w-full pt-0.5">
                          Xem thêm {sortedContracts.length - 2} đơn...
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 pt-2 flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForHistory(cust)}
                  className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-150 px-1.5 sm:px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 min-w-0"
                  title="Xem toàn bộ lịch sử"
                >
                  <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="truncate hidden sm:inline">Chi tiết ({sortedContracts.length})</span>
                  <span className="sm:hidden">{sortedContracts.length} đơn</span>
                </button>
                <button
                  onClick={() => handleOpenEditModal(cust)}
                  className="text-orange-600 hover:text-white border border-orange-200 hover:bg-orange-600 px-2 sm:px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0"
                >
                  Sửa
                </button>
                {onDeleteCustomer && (
                  <button
                    onClick={() => setDeleteConfirmId(cust.id)}
                    className="text-gray-400 hover:text-rose-650 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 border border-transparent hover:border-rose-100"
                    title="Xóa khách hàng"
                  >
                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filteredCustomers.length === 0 && (
          <div className="col-span-full bg-white border border-gray-150 p-8 sm:p-12 text-center rounded-2xl text-gray-400 italic font-medium text-sm">
            Không tìm thấy hồ sơ khách hàng nào phù hợp.
          </div>
        )}
      </div>

      {/* Pagination controls — compact on mobile */}
      {totalPages > 1 && (
        <div className="bg-white border border-gray-150 px-3 py-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4 shadow-2xs select-none">
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium text-center sm:text-left">
            <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> / <span className="font-bold text-gray-800">{filteredCustomers.length}</span> khách hàng
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            {Array.from({ length: totalPages }, (_, idx) => idx + 1)
              .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
              .reduce<(number | 'dot')[]>((acc, page, i, arr) => {
                if (i > 0 && (page as number) - (arr[i - 1] as number) > 1) acc.push('dot');
                acc.push(page);
                return acc;
              }, [])
              .map((item, i) =>
                item === 'dot' ? (
                  <span key={`dot-${i}`} className="px-1 text-gray-400 text-xs">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item as number)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition cursor-pointer ${
                      currentPage === item
                        ? 'bg-orange-600 border border-orange-600 text-white shadow-xs'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Customer Add/Edit Modal */}
      {showAddModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden self-center border border-gray-100 animate-scale-up">
            <div className="bg-orange-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <User className="w-5 h-5" /> {editingCustomer ? 'Sửa Hồ Sơ Khách Hàng' : 'Tạo Hồ Sơ Khách Mới'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-gray-200 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span>⚠</span> {validationError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Họ và tên khách hàng *</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={e => setFormState({ ...formState, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="VD: Nguyễn Văn Hải"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại liên hệ *</label>
                  <input
                    type="tel"
                    required
                    value={formState.phone}
                    onChange={e => setFormState({ ...formState, phone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="VD: 0912345678"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số định danh CCCD/Hộ chiếu</label>
                  <input
                    type="text"
                    value={formState.idNumber}
                    onChange={e => setFormState({ ...formState, idNumber: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="VD: 001095034..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Trang cá nhân / Website (Mạng xã hội)</label>
                <input
                  type="text"
                  value={formState.email}
                  onChange={e => setFormState({ ...formState, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="VD: facebook.com/fullname hoặc website.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Địa chỉ thường trú / tạm trú</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={e => setFormState({ ...formState, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="VD: Số 12, ngõ 80 Cầu Giấy, Hà Nội"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Đánh giá tín cậy hệ thống</label>
                <select
                  value={formState.trustLevel}
                  onChange={e => setFormState({ ...formState, trustLevel: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-medium text-gray-750"
                >
                  <option value="High">Tin cậy cao (Không yêu cầu đặt cọc tiền mặt lớn)</option>
                  <option value="Medium">Trung bình (Có giữ CCCD + Giấy tờ gốc bảo hiểm)</option>
                  <option value="Low">Mức nguy cơ (Yêu cầu giữ tài sản xe máy + cọc tiền mặt cao)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nhật ký hoạt động / Lưu ý nghiệp vụ</label>
                <textarea
                  value={formState.notes}
                  onChange={e => setFormState({ ...formState, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono text-xs"
                  placeholder="Ví dụ: Khách hàng quen thích lấy máy sớm lúc 7h sáng, giữ máy cẩn thận."
                  rows={3}
                />
              </div>

              {/* CCCD Photo Upload Section */}
              <div className="bg-indigo-50/40 border border-indigo-150 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider">
                    📷 Ảnh CCCD / Giấy tờ tùy thân (2 mặt)
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100/60 px-2 py-0.5 rounded-full">Tùy chọn</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Mặt trước */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider block">Mặt trước</span>
                    <label className="relative block w-full aspect-[3/2] rounded-lg overflow-hidden border-2 border-dashed border-indigo-200 hover:border-indigo-400 cursor-pointer transition-all group bg-white">
                      {formState.idPhotoFront ? (
                        <img src={formState.idPhotoFront} alt="CCCD mặt trước" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-1 text-indigo-300 group-hover:text-indigo-500 transition-colors">
                          <span className="text-2xl">🪪</span>
                          <span className="text-[10px] font-bold">Tải ảnh lên</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) resizeImage(file, (b64) => setFormState(prev => ({ ...prev, idPhotoFront: b64 })));
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {formState.idPhotoFront && (
                      <button type="button" onClick={() => setFormState(prev => ({ ...prev, idPhotoFront: '' }))}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer transition">
                        ✕ Xóa ảnh
                      </button>
                    )}
                  </div>

                  {/* Mặt sau */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-extrabold text-gray-600 uppercase tracking-wider block">Mặt sau</span>
                    <label className="relative block w-full aspect-[3/2] rounded-lg overflow-hidden border-2 border-dashed border-indigo-200 hover:border-indigo-400 cursor-pointer transition-all group bg-white">
                      {formState.idPhotoBack ? (
                        <img src={formState.idPhotoBack} alt="CCCD mặt sau" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-1 text-indigo-300 group-hover:text-indigo-500 transition-colors">
                          <span className="text-2xl">🪪</span>
                          <span className="text-[10px] font-bold">Tải ảnh lên</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) resizeImage(file, (b64) => setFormState(prev => ({ ...prev, idPhotoBack: b64 })));
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {formState.idPhotoBack && (
                      <button type="button" onClick={() => setFormState(prev => ({ ...prev, idPhotoBack: '' }))}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-bold cursor-pointer transition">
                        ✕ Xóa ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-650 hover:bg-gray-105 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 text-white font-medium px-5 py-2 rounded-xl text-sm hover:bg-orange-700 transition-all cursor-pointer"
                >
                  {editingCustomer ? 'Cập nhật hồ sơ' : 'Thêm khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scale-up border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-655">
              <span className="p-2 bg-red-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-red-600" />
              </span>
              <h3 className="font-bold text-lg text-gray-900">Xóa hồ sơ khách hàng</h3>
            </div>
            
            <p className="text-sm text-gray-500">
              Bạn có chắc chắn muốn xóa hồ sơ của khách hàng <strong>{customers.find(c => c.id === deleteConfirmId)?.name}</strong>? Toàn bộ lịch sử đặt lịch sẽ bị mất kết nối và không thể khôi phục.
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
                  if (onDeleteCustomer) {
                    onDeleteCustomer(deleteConfirmId);
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

      {/* Customer detailed order history modal */}
      {selectedCustomerForHistory && typeof document !== 'undefined' && createPortal(
        (() => {
          const sortedContracts = (contracts || [])
            .filter(contract => 
              contract.customerPhone === selectedCustomerForHistory.phone
            )
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

          // Reverse to show newest orders first
          const displayContracts = [...sortedContracts].reverse();

          return (
            <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[9999] animate-fade-in">
              <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[94vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-gray-150 animate-scale-up">
                {/* Modal Header */}
                <div className="bg-indigo-600 text-white px-4 sm:px-5 py-3 sm:py-4 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className="p-1.5 bg-indigo-500/30 rounded-lg shrink-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-lg truncate">Hồ Sơ & Lịch Sử Đơn Thuê Máy</h3>
                      <p className="text-[10px] sm:text-xs text-indigo-100 truncate">
                        Khách hàng: <span className="font-extrabold text-white">{selectedCustomerForHistory.name}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerForHistory(null)}
                    className="text-white hover:text-gray-200 font-extrabold text-2xl p-1 hover:bg-indigo-700/50 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1 select-none">
                  {/* Profile detail section */}
                  <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-3xs grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold text-slate-404 uppercase tracking-widest text-slate-400">Thông tin khách hàng</h4>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="font-mono font-bold">{selectedCustomerForHistory.phone}</span>
                        </div>
                        {selectedCustomerForHistory.idNumber && (
                          <div className="flex items-center gap-2 text-gray-750 font-mono">
                            <span className="font-sans text-xs font-bold text-gray-400">CMND/CCCD:</span>
                            <span>{selectedCustomerForHistory.idNumber}</span>
                          </div>
                        )}
                        {selectedCustomerForHistory.email && (
                          <div className="flex items-center gap-2 text-gray-700 truncate">
                            <Globe className="w-4 h-4 text-gray-400" />
                            <a href={selectedCustomerForHistory.email.startsWith('http') ? selectedCustomerForHistory.email : `https://${selectedCustomerForHistory.email}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate">
                              {selectedCustomerForHistory.email}
                            </a>
                          </div>
                        )}
                        {selectedCustomerForHistory.address && (
                          <div className="text-xs text-gray-500 flex items-start gap-1.5 leading-tight">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span>{selectedCustomerForHistory.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4 flex flex-col justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-404 uppercase tracking-widest text-slate-400">Xếp hạng & Thống kê</h4>
                        <div className="flex items-center gap-2.5 mt-1.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                            selectedCustomerForHistory.trustLevel === 'High' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            selectedCustomerForHistory.trustLevel === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            <Shield className="w-3.5 h-3.5" />
                            {selectedCustomerForHistory.trustLevel === 'High' ? 'Tin cậy cao' :
                             selectedCustomerForHistory.trustLevel === 'Medium' ? 'Mức độ tin cậy vừa' :
                             'Mức độ rủi ro cao'}
                          </span>

                          <span className="text-xs font-black text-gray-800 bg-gray-100 border border-gray-200 px-2.5 py-0.5 rounded-full">
                            Tổng cộng {sortedContracts.length} đơn hàng
                          </span>
                        </div>
                      </div>

                      {/* Notes Box */}
                      {selectedCustomerForHistory.notes && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-900 font-mono mt-2">
                          📝 {selectedCustomerForHistory.notes}
                        </div>
                      )}

                      {/* CCCD Photo Viewer */}
                      {(selectedCustomerForHistory.idPhotoFront || selectedCustomerForHistory.idPhotoBack) && (
                        <div className="mt-2 space-y-1.5">
                          <div className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">🪪 Ảnh CCCD / Giấy tờ
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedCustomerForHistory.idPhotoFront && (
                              <div className="space-y-0.5">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">Mặt trước</div>
                                <a href={selectedCustomerForHistory.idPhotoFront} target="_blank" rel="noreferrer">
                                  <img
                                    src={selectedCustomerForHistory.idPhotoFront}
                                    alt="CCCD mặt trước"
                                    className="w-full rounded-lg border border-indigo-200 object-cover hover:opacity-90 transition cursor-zoom-in"
                                  />
                                </a>
                              </div>
                            )}
                            {selectedCustomerForHistory.idPhotoBack && (
                              <div className="space-y-0.5">
                                <div className="text-[10px] font-bold text-gray-500 uppercase">Mặt sau</div>
                                <a href={selectedCustomerForHistory.idPhotoBack} target="_blank" rel="noreferrer">
                                  <img
                                    src={selectedCustomerForHistory.idPhotoBack}
                                    alt="CCCD mặt sau"
                                    className="w-full rounded-lg border border-indigo-200 object-cover hover:opacity-90 transition cursor-zoom-in"
                                  />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Financial Overview Metrics Summary */}
                  {(() => {
                    const totalCustomerSpend = sortedContracts.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
                    const totalCustomerOriginal = sortedContracts.reduce((sum, c) => sum + (c.totalPrice || 0), 0);
                    const pendingDepositCount = sortedContracts.filter(c => c.status === 'Pending' && ((c.paidAmount || 0) < Math.round((c.totalPrice || 0) * 0.5))).length;
                    const pendingDepositAmount = sortedContracts
                      .filter(c => c.status === 'Pending' && ((c.paidAmount || 0) < Math.round((c.totalPrice || 0) * 0.5)))
                      .reduce((sum, c) => sum + Math.max(0, Math.round((c.totalPrice || 0) * 0.5) - (c.paidAmount || 0)), 0);
                    const totalCustomerDebt = sortedContracts
                      .filter(c => c.status !== 'Cancelled')
                      .reduce((sum, c) => sum + Math.max(0, (c.totalPrice || 0) - (c.paidAmount || 0)), 0);

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-white border border-gray-200 rounded-xl p-2.5 sm:p-3 shadow-3xs">
                          <span className="text-[10px] uppercase font-extrabold text-gray-400 block">Tổng giá trị đơn</span>
                          <span className="font-mono text-sm sm:text-base font-black text-gray-900 block mt-0.5">
                            {totalCustomerOriginal.toLocaleString()}đ
                          </span>
                        </div>

                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 sm:p-3 shadow-3xs">
                          <span className="text-[10px] uppercase font-extrabold text-emerald-800 block">Thực tế đã thu</span>
                          <span className="font-mono text-sm sm:text-base font-black text-emerald-700 block mt-0.5">
                            {totalCustomerSpend.toLocaleString()}đ
                          </span>
                        </div>

                        <div className={`rounded-xl p-2.5 sm:p-3 shadow-3xs border ${
                          pendingDepositCount > 0
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-white border-gray-200'
                        }`}>
                          <span className={`text-[10px] uppercase font-extrabold block ${
                            pendingDepositCount > 0 ? 'text-amber-800' : 'text-gray-400'
                          }`}>
                            Chờ khách cọc 50%
                          </span>
                          <span className={`font-mono text-sm sm:text-base font-black block mt-0.5 ${
                            pendingDepositCount > 0 ? 'text-amber-700' : 'text-gray-600'
                          }`}>
                            {pendingDepositAmount > 0 ? `+${pendingDepositAmount.toLocaleString()}đ` : '0đ (Không có)'}
                          </span>
                        </div>

                        <div className={`rounded-xl p-2.5 sm:p-3 shadow-3xs border ${
                          totalCustomerDebt > 0
                            ? 'bg-rose-50 border-rose-200'
                            : 'bg-emerald-50/40 border-gray-200'
                        }`}>
                          <span className={`text-[10px] uppercase font-extrabold block ${
                            totalCustomerDebt > 0 ? 'text-rose-800' : 'text-gray-400'
                          }`}>
                            Dư nợ chưa thu
                          </span>
                          <span className={`font-mono text-sm sm:text-base font-black block mt-0.5 ${
                            totalCustomerDebt > 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {totalCustomerDebt > 0 ? `+${totalCustomerDebt.toLocaleString()}đ` : '0đ (Đủ)'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* List of rental contracts */}
                  <div className="space-y-2.5">
                    <h4 className="font-black text-gray-900 text-sm flex items-center justify-between">
                      <span>DANH SÁCH ĐƠN THUÊ MÁY (THỜI GIAN LÙI DẦN)</span>
                      <span className="text-xs font-mono font-normal text-gray-400">
                        Tổng {displayContracts.length} lần thuê
                      </span>
                    </h4>

                    {displayContracts.length === 0 ? (
                      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 font-medium italic text-xs">
                        Khách hàng này chưa phát sinh hợp đồng thuê máy nào trong hệ thống.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayContracts.map((contract) => {
                          const origIndex = sortedContracts.findIndex(c => c.id === contract.id);
                          const nthRental = origIndex !== -1 ? origIndex + 1 : sortedContracts.length;
                          const calculatedDays = (() => {
                            if (!contract.startDate || !contract.endDate) return 1;
                            const diffTime = Math.abs(new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime());
                            return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
                          })();

                          const remainingDebt = Math.max(0, (contract.totalPrice || 0) - (contract.paidAmount || 0));

                          return (
                            <div 
                              key={contract.id}
                              className={`bg-white border rounded-xl p-3.5 sm:p-4 space-y-3 shadow-3xs hover:border-indigo-200 transition ${
                                contract.status === 'Completed' ? 'border-gray-200' :
                                contract.status === 'Active' ? 'border-indigo-300 ring-1 ring-indigo-200' :
                                contract.status === 'Overdue' ? 'border-rose-300 ring-1 ring-rose-200' :
                                'border-amber-200'
                              }`}
                            >
                              {/* Order top bar */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg">
                                    {contract.contractCode}
                                  </span>
                                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg">
                                    ★ Lần thuê thứ {nthRental}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                    contract.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                                    contract.status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                    contract.status === 'Overdue' ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' :
                                    contract.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-gray-100 text-gray-500 border-gray-200'
                                  }`}>
                                    {contract.status === 'Completed' ? '● Hoàn thành' :
                                     contract.status === 'Active' ? '● Đang thuê máy' :
                                     contract.status === 'Overdue' ? '▲ Quá hạn trả' :
                                     contract.status === 'Pending' ? '⏳ Chờ nhận máy' : '✕ Đã hủy'}
                                  </span>
                                </div>
                              </div>

                              {/* Dates & duration */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-50 p-2 rounded-lg border border-gray-150">
                                  <div className="text-gray-400 font-bold text-[10px] uppercase">Thời hạn thuê máy:</div>
                                  <div className="font-mono text-gray-800 font-bold mt-0.5">
                                    📅 {new Date(contract.startDate).toLocaleDateString('vi-VN')} {contract.is6Hours ? '' : `đến ${new Date(contract.endDate).toLocaleDateString('vi-VN')}`}
                                  </div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg border border-gray-150">
                                  <div className="text-gray-400 font-bold text-[10px] uppercase">Hình thức thuê:</div>
                                  <div className="font-bold text-gray-800 mt-0.5">
                                    {contract.is6Hours 
                                      ? `Gói ngắn hạn 6 giờ (Trả trước ${contract.returnTime || '18:00'})` 
                                      : `${calculatedDays} ngày (${calculatedDays} đêm)`
                                    }
                                  </div>
                                </div>
                              </div>

                              {/* Contract items */}
                              <div className="space-y-1.5">
                                <div className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Thiết bị trong đơn hàng:</div>
                                <div className="border border-gray-150 rounded-lg overflow-hidden divide-y divide-gray-150">
                                  {contract.items.map((item, id) => (
                                    <div key={id} className="flex justify-between items-center p-2 text-xs hover:bg-slate-50/50">
                                      <div className="font-extrabold text-gray-800 flex items-center gap-1.5 font-sans">
                                        <span className="text-orange-500">📷</span>
                                        <span>{item.cameraName}</span>
                                      </div>
                                      <div className="text-right font-mono text-gray-600 font-medium">
                                        ({item.quantity} chiếc) • {Math.round(item.dailyRate).toLocaleString()}đ {contract.is6Hours ? '/gói 6h' : '/ngày'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Financial values and deposit details */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                                <div className="bg-slate-50 border border-gray-200 p-2 rounded-xl">
                                  <div className="text-[10px] text-gray-400 font-extrabold uppercase">Tổng giá trị</div>
                                  <div className="font-mono text-xs sm:text-sm text-gray-800 font-extrabold">
                                    {contract.totalPrice.toLocaleString()}đ
                                  </div>
                                </div>
                                <div className="bg-emerald-50/40 border border-emerald-100 p-2 rounded-xl">
                                  <div className="text-[10px] text-emerald-600 font-extrabold uppercase">Đã thanh toán</div>
                                  <div className="font-mono text-xs sm:text-sm text-emerald-700 font-extrabold">
                                    {contract.paidAmount.toLocaleString()}đ
                                  </div>
                                </div>
                                <div className={`p-2 rounded-xl border ${
                                  remainingDebt > 0 && contract.status !== 'Cancelled'
                                    ? 'bg-rose-50 border-rose-200'
                                    : 'bg-emerald-50/20 border-gray-200'
                                }`}>
                                  <div className={`text-[10px] font-extrabold uppercase ${
                                    remainingDebt > 0 && contract.status !== 'Cancelled' ? 'text-rose-700' : 'text-gray-400'
                                  }`}>
                                    Dư nợ chưa thu
                                  </div>
                                  <div className={`font-mono text-xs sm:text-sm font-black ${
                                    remainingDebt > 0 && contract.status !== 'Cancelled' ? 'text-rose-700' : 'text-emerald-700'
                                  }`}>
                                    {remainingDebt > 0 && contract.status !== 'Cancelled' ? `+${remainingDebt.toLocaleString()}đ` : '0đ (Đủ)'}
                                  </div>
                                </div>
                                <div className="bg-indigo-50/40 border border-indigo-100 p-2 rounded-xl">
                                  <div className="text-[10px] text-indigo-605 font-extrabold uppercase text-indigo-700">Thế chấp</div>
                                  <div className="font-mono text-[11px] text-indigo-700 font-bold truncate" title={contract.customerDocNote || `${contract.customerDocType === 'CCCD_And_1M' ? 'Giữ CCCD + 1 triệu' : contract.customerDocType}: ${contract.depositAmount.toLocaleString()}đ`}>
                                    {contract.customerDocNote || `${contract.customerDocType === 'CCCD_And_1M' ? 'CCCD + 1M' : contract.customerDocType}`}
                                  </div>
                                </div>
                              </div>

                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-white border-t border-gray-150 p-4 flex justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerForHistory(null)}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2 rounded-xl text-sm shadow-sm transition cursor-pointer"
                  >
                    ✕ Đóng hồ sơ
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
}
