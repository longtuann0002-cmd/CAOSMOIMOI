import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Customer, RentalContract } from '../types';
import { formatDMY } from '../utils/dateUtils';
import { Search, Plus, Trash2, Edit2, Shield, User, Heart, AlertTriangle, Phone, Globe, MapPin, ChevronLeft, ChevronRight, FileSpreadsheet, Eye, Calendar, DollarSign, FileText, CheckCircle2, Clock, X, Info, ArrowUpDown, Filter, SortDesc, Sparkles } from 'lucide-react';

interface CustomerManagerProps {
  customers: Customer[];
  contracts?: RentalContract[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer?: (id: string) => void;
}

export type CustomerSortOption =
  | 'RENTAL_DESC'
  | 'RENTAL_ASC'
  | 'SPENT_DESC'
  | 'LATEST_CONTRACT'
  | 'DEBT_DESC'
  | 'PENDING_DEPOSIT'
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'TRUST_HIGH_FIRST';

export default function CustomerManager({
  customers,
  contracts = [],
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer
}: CustomerManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debtFilter, setDebtFilter] = useState<'ALL' | 'UNPAID_DEPOSIT' | 'HAS_DEBT' | 'NO_DEBT'>('ALL');
  const [trustFilter, setTrustFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
  const [sortBy, setSortBy] = useState<CustomerSortOption>('RENTAL_DESC');
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
    trustLevel: 'High' as Customer['trustLevel'],
    notes: ''
  });

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

        // Filter by trust level
        if (trustFilter !== 'ALL' && c.trustLevel !== trustFilter) {
          return false;
        }

        // Filter by financial status
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
        const contractsA = (contracts || []).filter(c => c && c.customerPhone === a.phone && c.status !== 'Cancelled');
        const contractsB = (contracts || []).filter(c => c && c.customerPhone === b.phone && c.status !== 'Cancelled');

        const countA = contractsA.length || (a.rentalCount || 0);
        const countB = contractsB.length || (b.rentalCount || 0);

        const spentA = contractsA.reduce((sum, c) => sum + (c.paidAmount || 0), 0);
        const spentB = contractsB.reduce((sum, c) => sum + (c.paidAmount || 0), 0);

        const financialsA = getCustomerFinancials(a.phone);
        const financialsB = getCustomerFinancials(b.phone);

        if (sortBy === 'RENTAL_DESC') {
          if (countB !== countA) return countB - countA;
          if (spentB !== spentA) return spentB - spentA;
          return (a.name || '').localeCompare(b.name || '', 'vi');
        }

        if (sortBy === 'RENTAL_ASC') {
          if (countA !== countB) return countA - countB;
          return (a.name || '').localeCompare(b.name || '', 'vi');
        }

        if (sortBy === 'SPENT_DESC') {
          if (spentB !== spentA) return spentB - spentA;
          if (countB !== countA) return countB - countA;
          return (a.name || '').localeCompare(b.name || '', 'vi');
        }

        if (sortBy === 'DEBT_DESC') {
          if (financialsB.totalDebt !== financialsA.totalDebt) {
            return financialsB.totalDebt - financialsA.totalDebt;
          }
          return countB - countA;
        }

        if (sortBy === 'PENDING_DEPOSIT') {
          if (financialsB.pendingDepositAmount !== financialsA.pendingDepositAmount) {
            return financialsB.pendingDepositAmount - financialsA.pendingDepositAmount;
          }
          return countB - countA;
        }

        if (sortBy === 'LATEST_CONTRACT') {
          const latestA = contractsA.reduce((max, c) => {
            const time = new Date(c.startDate).getTime();
            return time > max ? time : max;
          }, 0);
          const latestB = contractsB.reduce((max, c) => {
            const time = new Date(c.startDate).getTime();
            return time > max ? time : max;
          }, 0);
          if (latestB !== latestA) return latestB - latestA;
          return countB - countA;
        }

        if (sortBy === 'NAME_ASC') {
          return (a.name || '').localeCompare(b.name || '', 'vi');
        }

        if (sortBy === 'NAME_DESC') {
          return (b.name || '').localeCompare(a.name || '', 'vi');
        }

        if (sortBy === 'TRUST_HIGH_FIRST') {
          const score = (lvl?: string) => (lvl === 'High' ? 3 : lvl === 'Medium' ? 2 : 1);
          const scoreA = score(a.trustLevel);
          const scoreB = score(b.trustLevel);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return countB - countA;
        }

        return 0;
      });
  }, [customers, searchQuery, debtFilter, trustFilter, sortBy, contracts]);

  // Pagination Configuration
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page when filtering or sorting
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, debtFilter, trustFilter, sortBy]);

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
      <div className="bg-white border border-gray-150 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div className="space-y-0.5">
            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2 select-none">
              <User className="text-orange-600 w-4.5 h-4.5" /> Quản Lý Khách Hàng Thuê Máy
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-500 leading-relaxed">
              Tra cứu hồ sơ khách hàng, kiểm soát dư nợ chưa thu và xếp hạng độ tin cậy.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              className="bg-slate-50 border border-gray-200 text-gray-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-slate-100 transition-all cursor-pointer shadow-3xs"
              title="Xuất định dạng CSV tải về"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" /> Xuất CSV
            </button>
            <button
              onClick={handleOpenAddModal}
              className="bg-orange-600 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 hover:bg-orange-700 transition-all cursor-pointer shadow-3xs"
            >
              <Plus className="w-4 h-4 shrink-0" /> Thêm khách
            </button>
          </div>
        </div>

        {/* Aggregate Financial Metrics Banner: Dư Nợ & Chưa Thanh Toán Cọc */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Card 1: Dư Nợ Chưa Thu */}
          <div className="bg-gradient-to-r from-rose-50 to-rose-100/50 border border-rose-200/90 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 sm:p-2.5 bg-rose-200/80 text-rose-800 rounded-xl shrink-0">
                <DollarSign className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-rose-800 uppercase tracking-wider block truncate">Dư Nợ Chưa Thu</span>
                <span className="font-mono text-base sm:text-lg font-black text-rose-700 block truncate mt-0.5">
                  {overallCustomerDebt.toLocaleString()} đ
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDebtFilter(debtFilter === 'HAS_DEBT' ? 'ALL' : 'HAS_DEBT')}
              className="text-[10.5px] sm:text-xs font-bold text-rose-800 bg-white border border-rose-300 px-2.5 py-1.5 rounded-lg shrink-0 hover:bg-rose-50 transition cursor-pointer shadow-3xs whitespace-nowrap"
            >
              ⚠️ {debtorCount} khách nợ
            </button>
          </div>

          {/* Card 2: Chưa Thanh Toán Cọc 50% Giữ Máy */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200/90 rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-2 shadow-3xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 sm:p-2.5 bg-amber-200/80 text-amber-800 rounded-xl shrink-0">
                <Clock className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-800 uppercase tracking-wider block truncate">Chưa Cọc 50% Giữ Máy</span>
                <span className="font-mono text-base sm:text-lg font-black text-amber-700 block truncate mt-0.5">
                  {overallPendingDeposit.toLocaleString()} đ
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDebtFilter(debtFilter === 'UNPAID_DEPOSIT' ? 'ALL' : 'UNPAID_DEPOSIT')}
              className="text-[10.5px] sm:text-xs font-bold text-amber-800 bg-white border border-amber-300 px-2.5 py-1.5 rounded-lg shrink-0 hover:bg-amber-50 transition cursor-pointer shadow-3xs whitespace-nowrap"
            >
              ⏳ {pendingDepositCustomerCount} khách chưa cọc
            </button>
          </div>
        </div>

        {/* Search Bar, Sorting & Filters */}
        <div className="space-y-2.5">
          <div className="flex flex-col md:flex-row items-stretch gap-2">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm theo tên, SĐT, số CCCD, trang liên kết..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2 text-xs sm:text-sm w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sort & Filter Controls */}
            <div className="grid grid-cols-2 md:flex items-center gap-2">
              {/* Sort Dropdown */}
              <div className="relative flex-1 md:w-52">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-orange-600">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as CustomerSortOption)}
                  className="w-full pl-8 pr-6 py-2 text-xs font-bold border border-gray-200 rounded-xl bg-gray-50 hover:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none text-gray-800 cursor-pointer appearance-none truncate"
                  title="Sắp xếp danh sách khách hàng"
                >
                  <option value="RENTAL_DESC">Thuê nhiều nhất</option>
                  <option value="RENTAL_ASC">Thuê ít nhất</option>
                  <option value="SPENT_DESC">Chi tiêu cao nhất</option>
                  <option value="LATEST_CONTRACT">Thuê gần đây</option>
                  <option value="DEBT_DESC">Dư nợ cao nhất</option>
                  <option value="PENDING_DEPOSIT">Chưa cọc 50% nhiều</option>
                  <option value="NAME_ASC">Tên A → Z</option>
                  <option value="NAME_DESC">Tên Z → A</option>
                  <option value="TRUST_HIGH_FIRST">Độ tin cậy cao</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400 text-[9px]">
                  ▼
                </div>
              </div>

              {/* Trust Filter */}
              <div className="relative flex-1 md:w-44">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-emerald-600">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <select
                  value={trustFilter}
                  onChange={e => setTrustFilter(e.target.value as any)}
                  className="w-full pl-8 pr-6 py-2 text-xs font-bold border border-gray-200 rounded-xl bg-gray-50 hover:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none text-gray-800 cursor-pointer appearance-none truncate"
                  title="Lọc theo mức độ tin cậy"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="High">★ Tin cậy cao</option>
                  <option value="Medium">● Mức chuẩn</option>
                  <option value="Low">▲ Cần cẩn thận</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400 text-[9px]">
                  ▼
                </div>
              </div>
            </div>
          </div>

          {/* Quick Filter Tabs for Debt & Pending Deposit Status */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
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
                <span>Chưa cọc 50%</span>
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
                <span>Còn nợ</span>
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

            {/* Filter Summary & Reset */}
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 select-none">
              <span>Hiển thị <b className="text-orange-600 font-mono">{filteredCustomers.length}</b>/{customers.length} khách</span>
              {(searchQuery || debtFilter !== 'ALL' || trustFilter !== 'ALL' || sortBy !== 'RENTAL_DESC') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setDebtFilter('ALL');
                    setTrustFilter('ALL');
                    setSortBy('RENTAL_DESC');
                  }}
                  className="text-[10.5px] font-bold text-orange-600 hover:text-orange-800 underline cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>
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
            <div key={cust.id} className={`bg-white border rounded-xl p-3 sm:p-4 shadow-3xs space-y-2 sm:space-y-3 flex flex-col justify-between hover:shadow-xs transition-all ${
              financials.pendingDepositCount > 0
                ? 'border-amber-300 ring-1 ring-amber-400/30'
                : financials.totalDebt > 0 
                  ? 'border-rose-300 ring-1 ring-rose-400/20' 
                  : 'border-gray-200/80 hover:border-gray-300'
            }`}>
              <div className="space-y-2 sm:space-y-2.5">
                {/* Header: Name + rental count */}
                <div className="flex justify-between items-start gap-1">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-gray-900 text-xs sm:text-sm truncate leading-snug" title={cust.name}>
                      {cust.name}
                    </h3>
                    {/* Trust badge */}
                    <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full mt-1 border ${
                      cust.trustLevel === 'High' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                      cust.trustLevel === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200/80' :
                      'bg-rose-50 text-rose-700 border-rose-200/80'
                    }`}>
                      <Shield className="w-2.5 h-2.5 shrink-0" />
                      <span>{cust.trustLevel === 'High' ? '★ Tin cậy' : cust.trustLevel === 'Medium' ? '● Vừa' : '▲ Rủi ro'}</span>
                    </span>
                  </div>
                  <span className="text-[9.5px] sm:text-[10px] font-extrabold text-orange-700 bg-orange-50 border border-orange-200/80 px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap">
                    {sortedContracts.length || cust.rentalCount} đơn
                  </span>
                </div>

                {/* Debt / deposit alerts */}
                {financials.pendingDepositCount > 0 && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg px-2 py-1.5 space-y-0.5">
                    <div className="flex items-center justify-between text-xs gap-1">
                      <span className="font-bold text-amber-900 truncate text-[10.5px]">⏳ Chưa cọc</span>
                      <span className="font-mono font-black text-amber-700 shrink-0 text-xs">+{financials.pendingDepositAmount.toLocaleString()} đ</span>
                    </div>
                    <div className="text-[9.5px] text-amber-800 font-medium">({financials.pendingDepositCount} đơn chờ)</div>
                  </div>
                )}

                {financials.totalDebt > 0 ? (
                  <div className="bg-rose-50 border border-rose-300 rounded-lg px-2 py-1.5 space-y-0.5">
                    <div className="flex items-center justify-between text-xs gap-1">
                      <span className="font-bold text-rose-900 truncate text-[10.5px]">⚠️ Dư nợ</span>
                      <span className="font-mono font-black text-rose-700 shrink-0 text-xs">+{financials.totalDebt.toLocaleString()} đ</span>
                    </div>
                    <div className="text-[9.5px] text-rose-700 font-medium">({financials.debtContractsCount} đơn nợ)</div>
                  </div>
                ) : financials.pendingDepositCount === 0 ? (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1 flex items-center justify-between text-[10.5px] sm:text-xs">
                    <span className="text-emerald-900 font-bold">✓ Đủ tiền</span>
                    <span className="font-mono text-emerald-700 font-bold">0 đ</span>
                  </div>
                ) : null}

                {/* Contact info */}
                <div className="border-t border-gray-100 pt-1.5 space-y-1 text-xs">
                  <div className="flex items-center gap-1 font-mono">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-gray-800 font-bold text-[11px] truncate">{cust.phone}</span>
                  </div>
                  {cust.email && (
                    <div className="flex items-center gap-1 truncate hidden sm:flex text-[11px]" title={cust.email}>
                      <Globe className="w-3 h-3 text-gray-400 shrink-0" />
                      <a 
                        href={cust.email.startsWith('http://') || cust.email.startsWith('https://') ? cust.email : `https://${cust.email}`} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="truncate text-orange-600 hover:underline font-medium"
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

                {/* Rental history */}
                <div className="pt-1.5 border-t border-dashed border-gray-150 space-y-1">
                  <span className="text-[9.5px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Đơn thuê gần đây ({sortedContracts.length})
                  </span>
                  {sortedContracts.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">Chưa có đơn thuê</p>
                  ) : (
                    <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                      {[...sortedContracts].reverse().slice(0, 2).map((contract) => {
                        const origIndex = sortedContracts.findIndex(c => c.id === contract.id);
                        const nthRental = origIndex !== -1 ? origIndex + 1 : sortedContracts.length;
                        const statusConfig = 
                          contract.status === 'Completed' ? { bg: 'bg-green-50 border-green-200 text-green-700', label: 'Xong' } :
                          contract.status === 'Active' ? { bg: 'bg-blue-50 border-blue-200 text-blue-700 font-bold', label: 'Đang thuê' } :
                          contract.status === 'Overdue' ? { bg: 'bg-rose-50 border-rose-200 text-rose-700 animate-pulse', label: 'Trễ hạn' } :
                          contract.status === 'Pending' ? { bg: 'bg-amber-50 border-amber-200 text-amber-700', label: 'Chờ' } :
                          { bg: 'bg-gray-50 border-gray-200 text-gray-500', label: 'Hủy' };
                        return (
                          <div 
                            key={contract.id} 
                            onClick={() => setSelectedCustomerForHistory(cust)}
                            className="bg-gray-50/80 border border-gray-200/80 rounded-lg p-1.5 hover:border-orange-200 hover:bg-orange-50/10 cursor-pointer transition text-[10.5px] space-y-0.5 group"
                          >
                            <div className="flex justify-between items-center gap-1">
                              <span className="font-mono font-black text-orange-600 truncate group-hover:text-orange-700 text-[10.5px]">{contract.contractCode}</span>
                              <span className={`px-1 rounded text-[8.5px] font-bold border shrink-0 ${statusConfig.bg}`}>{statusConfig.label}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold text-gray-750">Lần {nthRental}</span>
                              <span className="font-mono text-gray-600 font-semibold">{contract.totalPrice.toLocaleString()}đ</span>
                            </div>
                          </div>
                        );
                      })}
                      {sortedContracts.length > 2 && (
                        <button type="button" onClick={() => setSelectedCustomerForHistory(cust)}
                          className="text-[9.5px] font-bold text-orange-600 hover:text-orange-800 transition block text-center w-full pt-0.5">
                          Xem thêm {sortedContracts.length - 2} đơn...
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 pt-2 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForHistory(cust)}
                  className="bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white border border-orange-200/80 px-2 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 min-w-0"
                  title="Xem toàn bộ lịch sử"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{sortedContracts.length} đơn</span>
                </button>
                <button
                  onClick={() => handleOpenEditModal(cust)}
                  className="text-gray-700 hover:text-orange-600 border border-gray-200 hover:border-orange-300 hover:bg-orange-50 px-2 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0 text-xs"
                >
                  Sửa
                </button>
                {onDeleteCustomer && (
                  <button
                    onClick={() => setDeleteConfirmId(cust.id)}
                    className="text-gray-400 hover:text-rose-650 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Xóa khách hàng"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
        <div className="bg-white border border-gray-150 px-3 py-2.5 sm:p-4 rounded-xl sm:rounded-2xl flex flex-col items-center gap-2 sm:gap-3 shadow-2xs select-none">
          <span className="text-[10px] sm:text-xs text-gray-500 font-medium text-center">
            <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span>–<span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> / <span className="font-bold text-gray-800">{filteredCustomers.length}</span> khách hàng
          </span>
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
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
                  <span key={`dot-${i}`} className="px-1 text-gray-400 text-xs shrink-0">…</span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item as number)}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
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
              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
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
            <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 pt-[max(20px,env(safe-area-inset-top,20px))] pb-[max(16px,env(safe-area-inset-bottom,16px))] z-[9999] animate-fade-in">
              <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] sm:max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 animate-scale-up my-auto">
                {/* Modal Header */}
                <div className="bg-indigo-600 text-white px-4 sm:px-5 py-3 sm:py-3.5 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <span className="p-1.5 bg-indigo-500/30 rounded-lg shrink-0">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base truncate">Hồ Sơ & Lịch Sử Đơn Thuê</h3>
                      <p className="text-[10.5px] sm:text-xs text-indigo-100 truncate">
                        Khách hàng: <span className="font-extrabold text-white">{selectedCustomerForHistory.name}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerForHistory(null)}
                    className="text-white hover:text-gray-200 font-extrabold text-xl p-1 hover:bg-indigo-700/50 rounded-lg transition shrink-0 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-3 sm:p-5 overflow-y-auto space-y-3.5 sm:space-y-4 flex-1 select-none">
                  {/* Profile detail section */}
                  <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4 shadow-3xs grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <h4 className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-wider">Thông tin khách hàng</h4>
                      <div className="space-y-1.5 text-xs sm:text-sm">
                        <div className="flex items-center gap-2 text-gray-800">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-mono font-bold text-xs sm:text-sm">{selectedCustomerForHistory.phone}</span>
                        </div>
                        {selectedCustomerForHistory.idNumber && (
                          <div className="flex items-center gap-2 text-gray-700 font-mono text-xs">
                            <span className="font-sans text-[10.5px] font-bold text-gray-400">CCCD:</span>
                            <span>{selectedCustomerForHistory.idNumber}</span>
                          </div>
                        )}
                        {selectedCustomerForHistory.email && (
                          <div className="flex items-center gap-2 text-gray-700 truncate text-xs">
                            <Globe className="w-3.5 h-3.5 text-gray-400" />
                            <a href={selectedCustomerForHistory.email.startsWith('http') ? selectedCustomerForHistory.email : `https://${selectedCustomerForHistory.email}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate">
                              {selectedCustomerForHistory.email}
                            </a>
                          </div>
                        )}
                        {selectedCustomerForHistory.address && (
                          <div className="text-xs text-gray-600 flex items-start gap-1.5 leading-tight">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                            <span>{selectedCustomerForHistory.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 border-t md:border-t-0 md:border-l border-gray-100 pt-2.5 md:pt-0 md:pl-4 flex flex-col justify-between">
                      <div>
                        <h4 className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-wider">Xếp hạng & Thống kê</h4>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[11px] sm:text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                            selectedCustomerForHistory.trustLevel === 'High' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            selectedCustomerForHistory.trustLevel === 'Medium' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                            'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            <Shield className="w-3 h-3" />
                            {selectedCustomerForHistory.trustLevel === 'High' ? 'Tin cậy cao' :
                             selectedCustomerForHistory.trustLevel === 'Medium' ? 'Tin cậy vừa' :
                             'Rủi ro cao'}
                          </span>

                          <span className="text-[11px] sm:text-xs font-black text-gray-800 bg-gray-100 border border-gray-300 px-2.5 py-0.5 rounded-full">
                            Đã thuê {sortedContracts.length} đơn
                          </span>
                        </div>
                      </div>

                      {/* Notes Box */}
                      {selectedCustomerForHistory.notes && (
                        <div className="bg-amber-50 border border-amber-300 rounded-lg p-2 text-xs text-amber-900 font-mono mt-2 leading-relaxed">
                          📝 {selectedCustomerForHistory.notes}
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
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                        <div className="bg-white border border-gray-200 rounded-xl p-2.5 sm:p-3 shadow-3xs">
                          <span className="text-[10px] sm:text-[11px] font-extrabold text-gray-500 block whitespace-nowrap tracking-wider [word-spacing:3px]">TỔNG GIÁ TRỊ ĐƠN</span>
                          <span className="font-mono text-xs sm:text-base font-black text-gray-900 block mt-0.5 truncate">
                            {totalCustomerOriginal.toLocaleString()} đ
                          </span>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 sm:p-3 shadow-3xs">
                          <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-800 block whitespace-nowrap tracking-wider [word-spacing:4px]">THỰC TẾ ĐÃ THU</span>
                          <span className="font-mono text-xs sm:text-base font-black text-emerald-700 block mt-0.5 truncate">
                            {totalCustomerSpend.toLocaleString()} đ
                          </span>
                        </div>

                        <div className={`rounded-xl p-2.5 sm:p-3 shadow-3xs border ${
                          pendingDepositCount > 0
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-white border-gray-200'
                        }`}>
                          <span className={`text-[10px] sm:text-[11px] font-extrabold block whitespace-nowrap tracking-wider [word-spacing:3px] ${
                            pendingDepositCount > 0 ? 'text-amber-800' : 'text-gray-500'
                          }`}>
                            CHỜ CỌC 50%
                          </span>
                          <span className={`font-mono text-xs sm:text-base font-black block mt-0.5 truncate ${
                            pendingDepositCount > 0 ? 'text-amber-700' : 'text-gray-500'
                          }`}>
                            {pendingDepositAmount > 0 ? `+${pendingDepositAmount.toLocaleString()} đ` : '0 đ'}
                          </span>
                        </div>

                        <div className={`rounded-xl p-2.5 sm:p-3 shadow-3xs border ${
                          totalCustomerDebt > 0
                            ? 'bg-rose-50 border-rose-300'
                            : 'bg-emerald-50 border-emerald-300'
                        }`}>
                          <span className={`text-[10px] sm:text-[11px] font-extrabold block whitespace-nowrap tracking-wider [word-spacing:3px] ${
                            totalCustomerDebt > 0 ? 'text-rose-800' : 'text-emerald-800'
                          }`}>
                            {totalCustomerDebt > 0 ? 'DƯ NỢ CHƯA THU' : 'TẤT TOÁN ĐỦ'}
                          </span>
                          <span className={`font-mono text-xs sm:text-base font-black block mt-0.5 truncate ${
                            totalCustomerDebt > 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {totalCustomerDebt > 0 ? `+${totalCustomerDebt.toLocaleString()} đ` : '0 đ'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* List of rental contracts */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2 pb-0.5">
                      <h4 className="font-black text-gray-900 text-xs sm:text-sm uppercase tracking-wide">
                        Lịch sử đơn thuê ({displayContracts.length} lần)
                      </h4>
                      <span className="text-[10.5px] sm:text-xs text-gray-400 font-medium whitespace-nowrap">
                        Mới nhất trước
                      </span>
                    </div>

                    {displayContracts.length === 0 ? (
                      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 font-medium italic text-xs">
                        Khách hàng này chưa phát sinh hợp đồng thuê máy nào trong hệ thống.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
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
                              className={`bg-white border rounded-xl p-3 sm:p-4 space-y-2.5 shadow-3xs hover:border-indigo-200 transition ${
                                contract.status === 'Completed' ? 'border-gray-200' :
                                contract.status === 'Active' ? 'border-indigo-300 ring-1 ring-indigo-200' :
                                contract.status === 'Overdue' ? 'border-rose-300 ring-1 ring-rose-200' :
                                'border-amber-300'
                              }`}
                            >
                              {/* Order top bar */}
                              <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-black text-xs sm:text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-lg">
                                    {contract.contractCode}
                                  </span>
                                  <span className="text-[10.5px] sm:text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-lg">
                                    ★ Lần {nthRental}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[10.5px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                                    contract.status === 'Completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                    contract.status === 'Active' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                                    contract.status === 'Overdue' ? 'bg-rose-50 text-rose-800 border-rose-300 animate-pulse' :
                                    contract.status === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                    'bg-gray-100 text-gray-600 border-gray-300'
                                  }`}>
                                    {contract.status === 'Completed' ? '● Hoàn thành' :
                                     contract.status === 'Active' ? '● Đang thuê' :
                                     contract.status === 'Overdue' ? '▲ Quá hạn' :
                                     contract.status === 'Pending' ? '⏳ Chờ nhận' : '✕ Đã hủy'}
                                  </span>
                                </div>
                              </div>

                              {/* Dates & duration */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                <div className="bg-slate-50 p-2 rounded-lg border border-gray-200">
                                  <div className="text-gray-400 font-bold text-[10px] uppercase">Thời hạn:</div>
                                  <div className="font-mono text-gray-800 font-bold mt-0.5">
                                    📅 {formatDMY(contract.startDate)} {contract.is6Hours ? '' : `đến ${formatDMY(contract.endDate)}`}
                                  </div>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg border border-gray-200">
                                  <div className="text-gray-400 font-bold text-[10px] uppercase">Hình thức:</div>
                                  <div className="font-bold text-gray-800 mt-0.5">
                                    {contract.is6Hours 
                                      ? `Gói ngắn hạn 6 giờ (Trả trước ${contract.returnTime || '18:00'})` 
                                      : `${calculatedDays} ngày (${calculatedDays} đêm)`
                                    }
                                  </div>
                                </div>
                              </div>

                              {/* Contract items */}
                              <div className="space-y-1">
                                <div className="text-[10.5px] font-extrabold text-gray-400 uppercase tracking-wider">Thiết bị thuê:</div>
                                <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 bg-white">
                                  {contract.items.map((item, id) => (
                                    <div key={id} className="flex justify-between items-center p-2 text-xs hover:bg-slate-50/50 gap-2">
                                      <div className="font-bold text-gray-800 flex items-center gap-1.5 font-sans truncate min-w-0">
                                        <span className="text-orange-500 shrink-0">📷</span>
                                        <span className="truncate">{item.cameraName}</span>
                                      </div>
                                      <div className="text-right font-mono text-gray-600 font-medium shrink-0 text-[11px] sm:text-xs">
                                        ({item.quantity}c) • {Math.round(item.dailyRate).toLocaleString()} đ {contract.is6Hours ? '/6h' : '/ngày'}
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
                                    {contract.totalPrice.toLocaleString()} đ
                                  </div>
                                </div>
                                <div className="bg-emerald-50/40 border border-emerald-100 p-2 rounded-xl">
                                  <div className="text-[10px] text-emerald-600 font-extrabold uppercase">Đã thanh toán</div>
                                  <div className="font-mono text-xs sm:text-sm text-emerald-700 font-extrabold">
                                    {contract.paidAmount.toLocaleString()} đ
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
                                    {remainingDebt > 0 && contract.status !== 'Cancelled' ? `+${remainingDebt.toLocaleString()} đ` : '0 đ (Đủ)'}
                                  </div>
                                </div>
                                <div className="bg-indigo-50/40 border border-indigo-100 p-2 rounded-xl">
                                  <div className="text-[10px] text-indigo-605 font-extrabold uppercase text-indigo-700">Thế chấp</div>
                                  <div className="font-mono text-[11px] text-indigo-700 font-bold truncate" title={contract.customerDocNote || `${contract.customerDocType === 'CCCD_And_1M' ? 'Giữ CCCD + 1 triệu' : contract.customerDocType}: ${contract.depositAmount.toLocaleString()} đ`}>
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
