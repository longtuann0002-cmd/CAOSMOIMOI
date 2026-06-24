import React, { useState, useMemo, useEffect } from 'react';
import { Expense } from '../types';
import { Search, Plus, Trash2, Tag, Calendar, User, DollarSign, ListCollapse, ChevronLeft, ChevronRight, FileSpreadsheet } from 'lucide-react';

interface ExpenseTrackerProps {
  expenses: Expense[];
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export default function ExpenseTracker({
  expenses,
  onAddExpense,
  onDeleteExpense
}: ExpenseTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    description: '',
    amount: 150000,
    date: new Date().toISOString().split('T')[0],
    category: 'Maintenance' as Expense['category'],
    operator: 'Người vận hành'
  });

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        e.description.toLowerCase().includes(query) ||
        e.operator.toLowerCase().includes(query);

      const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  // Pagination Configuration
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // 8 expenses per page

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage) || 1;
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExpenses, currentPage, itemsPerPage]);

  const totalExpenseSum = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.description || !formState.amount) {
      setValidationError('Vui lòng điền mô tả khoản chi và số tiền hợp lệ!');
      return;
    }

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      ...formState
    };

    onAddExpense(newExp);
    setShowAddModal(false);
    setValidationError(null);
    // Reset
    setFormState({
      description: '',
      amount: 150000,
      date: new Date().toISOString().split('T')[0],
      category: 'Maintenance',
      operator: 'Người vận hành'
    });
  };

  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      return;
    }

    const BOM = '\uFEFF';
    const headers = [
      'ID Khoản Chi',
      'Mô Tả Chi Tiết',
      'Số Tiền (VND)',
      'Ngày Thực Hiện Chi',
      'Danh Mục Chi',
      'Người Chi / Kế Toán'
    ];

    const rows = filteredExpenses.map(e => {
      let catVN = e.category;
      if (e.category === 'Maintenance') catVN = 'Bảo dưỡng vệ sinh';
      else if (e.category === 'Equipment') catVN = 'Mua sắm thiết bị';
      else if (e.category === 'Marketing') catVN = 'Quảng cáo marketing';
      else if (e.category === 'Utilities') catVN = 'Điện nước tiện ích';
      else if (e.category === 'Rent') catVN = 'Thuê cửa hàng';
      else if (e.category === 'Other') catVN = 'Khoản chi khác';

      return [
        e.id,
        `"${e.description.replace(/"/g, '""')}"`,
        e.amount,
        e.date,
        catVN,
        `"${e.operator.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nhat_ky_khoan_chi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryLabel = (cat: Expense['category']) => {
    switch (cat) {
      case 'Maintenance': return 'Bảo dưỡng vệ sinh';
      case 'Equipment': return 'Mua sắm thiết bị';
      case 'Marketing': return 'Quảng cáo marketing';
      case 'Utilities': return 'Điện nước máy móc';
      case 'Rent': return 'Cửa hàng mặt bằng';
      case 'Other': return 'Chi phí khác';
    }
  };

  const getCategoryBadgeClass = (cat: Expense['category']) => {
    switch (cat) {
      case 'Maintenance': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Equipment': return 'bg-orange-50 text-orange-850 border-orange-200';
      case 'Marketing': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Utilities': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Rent': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Other': return 'bg-gray-100 text-gray-800 border-gray-250';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and control section */}
      <div className="bg-white border border-gray-150 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-xl font-black text-gray-850 flex items-center gap-2 select-none">
              <ListCollapse className="text-orange-600 w-4.5 h-4.5 sm:w-5 bg-orange-50 p-1 rounded-md sm:bg-transparent sm:p-0" /> Quản Lý Khoản Chi Vận Hành
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-normal">
              Kê khai các mục chi tiêu mua thêm thiết bị, tiền bảo dưỡng định kỳ và các chi phí phát sinh khác của cửa hàng.
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
              onClick={() => setShowAddModal(true)}
              className="bg-orange-600 text-white font-extrabold sm:font-medium px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm flex items-center justify-center gap-1.5 hover:bg-orange-700 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Ghi chi tiêu
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo nội dung chi, người thanh lý chi..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8.5 pr-4 py-1.5 sm:py-2.5 text-xs sm:text-sm w-full border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-400/80"
            />
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <Tag className="h-4 w-4 text-gray-450 shrink-0" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-sm w-full border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Tất cả định mục</option>
              <option value="Maintenance">Hao mòn bảo dưỡng (Maintenance)</option>
              <option value="Equipment">Mua sắm thiết bị mới (Equipment)</option>
              <option value="Marketing">Chi phí quảng cáo (Marketing)</option>
              <option value="Utilities">Hệ thống & Tiện ích (Utilities)</option>
              <option value="Rent">Tiền địa điểm/Tủ máy (Rent)</option>
              <option value="Other">Các dòng chi phí khác (Other)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Aggregate metrics box */}
      <div className="bg-rose-50/55 border border-rose-100 p-4 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 px-4 sm:px-6">
        <div>
          <span className="text-gray-500 text-xs font-bold block uppercase">Tổng chi phí theo bộ lọc</span>
          <span className="text-2xl font-bold font-mono text-gray-900 mt-1 block">-{totalExpenseSum.toLocaleString()}đ</span>
        </div>
        <span className="text-xs text-rose-700 font-medium bg-white/90 border border-rose-200 px-3 py-1.5 rounded-xl">
          📉 Tổng cộng: {filteredExpenses.length} Giao dịch chi
        </span>
      </div>

      {/* Expenses list logs */}
      <div className="bg-white border border-gray-150/70 rounded-2xl shadow-sm overflow-hidden">
        
        {/* Desktop View: Table layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-xs select-none uppercase tracking-wider">
                <th className="px-6 py-4">Nội Dung Chi</th>
                <th className="px-6 py-4">Danh Mục</th>
                <th className="px-6 py-4">Ngày Xuất</th>
                <th className="px-6 py-4">Người Thực Hiện</th>
                <th className="px-6 py-4 text-right">Số Tiền</th>
                <th className="px-6 py-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {paginatedExpenses.length > 0 ? (
                paginatedExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-850">{exp.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block border text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getCategoryBadgeClass(exp.category)}`}>
                        {getCategoryLabel(exp.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {exp.date}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        {exp.operator}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-rose-650">
                      -{exp.amount.toLocaleString()}đ
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => {
                          setDeleteConfirmId(exp.id);
                        }}
                        className="text-gray-400 hover:text-rose-650 p-2 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa hóa đơn chi"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 font-medium italic">
                    Chưa có kê khai chi tiêu nào đồng bộ bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Designed card transaction list for iOS/Mobile screens */}
        <div className="block md:hidden divide-y divide-gray-100 bg-white">
          {paginatedExpenses.length > 0 ? (
            paginatedExpenses.map(exp => (
              <div key={exp.id} className="p-4 active:bg-gray-50/30 transition-colors flex flex-col gap-2.5">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className={`inline-block border text-[9px] uppercase font-black px-2 py-0.5 rounded-full leading-none tracking-wider ${getCategoryBadgeClass(exp.category)}`}>
                      {getCategoryLabel(exp.category)}
                    </span>
                    <h3 className="font-bold text-gray-850 text-[13.5px] leading-snug break-words">
                      {exp.description}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-black text-sm text-rose-650 block">
                      -{exp.amount.toLocaleString()}đ
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium block mt-0.5">Xuất hóa đơn</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100/50 pt-2 text-[11px]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <div className="flex items-center gap-1 font-mono text-gray-500 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{exp.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate max-w-[140px] font-medium">{exp.operator}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteConfirmId(exp.id)}
                    className="text-gray-400 hover:text-rose-650 active:bg-rose-50/50 p-1.5 rounded-lg transition-all cursor-pointer"
                    title="Xóa hóa đơn chi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-400 font-medium italic text-xs">
              Chưa có kê khai chi tiêu nào đồng bộ bộ lọc hiện tại.
            </div>
          )}
        </div>

        {/* Expense tracker pagination controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/60 select-none">
            <span className="text-xs text-gray-500 font-medium">
              Hiển thị từ <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> tới <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filteredExpenses.length)}</span> trong tổng số <span className="font-bold text-gray-800">{filteredExpenses.length}</span> giao dịch chi
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(page => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    currentPage === page
                      ? 'bg-orange-600 border border-orange-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add New Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden self-center border border-gray-100 animate-scale-up">
            <div className="bg-orange-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Kê Khai Khoản Chi Vận Hành Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-gray-200 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {validationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <span>⚠</span> {validationError}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả chi tiêu *</label>
                <input
                  type="text"
                  required
                  value={formState.description}
                  onChange={e => setFormState({ ...formState, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="VD: Thuê tủ sấy chống ẩm máy ảnh 300L"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số tiền chi tiêu (VND) *</label>
                  <input
                    type="number"
                    required
                    value={formState.amount}
                    onChange={e => setFormState({ ...formState, amount: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                    placeholder="VD: 1500000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ngày chi *</label>
                  <input
                    type="date"
                    required
                    value={formState.date}
                    onChange={e => setFormState({ ...formState, date: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Loại định mục</label>
                  <select
                    value={formState.category}
                    onChange={e => setFormState({ ...formState, category: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-medium text-gray-750"
                  >
                    <option value="Maintenance">Hao mòn bảo dưỡng</option>
                    <option value="Equipment">Mua sắm thiết bị mới</option>
                    <option value="Marketing">Chi phí marketing</option>
                    <option value="Utilities">Điện nước/Hạ tầng</option>
                    <option value="Rent">Địa điểm tủ máy</option>
                    <option value="Other">Các dòng chi phí khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Người làm phiếu chi</label>
                  <input
                    type="text"
                    required
                    value={formState.operator}
                    onChange={e => setFormState({ ...formState, operator: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="VD: Hải Nguyễn"
                  />
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
                  Lưu phiếu chi
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
            <div className="flex items-center gap-3 text-red-655">
              <span className="p-2 bg-red-50 rounded-xl">
                <Trash2 className="w-6 h-6 text-red-600" />
              </span>
              <h3 className="font-bold text-lg text-gray-900">Xóa phiếu chi tiêu</h3>
            </div>
            
            <p className="text-sm text-gray-500">
              Bạn có chắc chắn muốn hủy phiếu chi tiêu <strong>"{expenses.find(e => e.id === deleteConfirmId)?.description}"</strong> trị giá <strong>{expenses.find(e => e.id === deleteConfirmId)?.amount.toLocaleString()}đ</strong>? Phiếu chi này sẽ bị xóa vĩnh viễn khỏi sổ sách kế toán.
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
                  if (onDeleteExpense) {
                    onDeleteExpense(deleteConfirmId);
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
    </div>
  );
}
