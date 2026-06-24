import React, { useState, useMemo, useEffect } from 'react';
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

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const query = searchQuery.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.idNumber && c.idNumber.toLowerCase().includes(query))
      );
    });
  }, [customers, searchQuery]);

  // Pagination Configuration
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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
              Tra cứu hồ sơ khách hàng, xếp hạng độ tin cậy để quyết định mức độ thế chấp hoặc cọc thế chấp.
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
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedCustomers.map(cust => {
          const sortedContracts = (contracts || [])
            .filter(contract => 
              contract.customerPhone === cust.phone
            )
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

          return (
            <div key={cust.id} className="bg-white border border-gray-150/70 rounded-xl p-4 shadow-2xs space-y-3 flex flex-col justify-between hover:shadow-sm transition-all hover:border-gray-300">
              <div className="space-y-2.5">
                <div className="flex justify-between items-start gap-1">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5 truncate" title={cust.name}>
                      {cust.name}
                    </h3>
                    
                    {/* Trust Level Indicator badge */}
                    <span className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full mt-1 border ${
                      cust.trustLevel === 'High' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      cust.trustLevel === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      <Shield className="w-2.5 h-2.5" />
                      {cust.trustLevel === 'High' ? 'Cao' : cust.trustLevel === 'Medium' ? 'Trung bình' : 'Nguy cơ'}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-bold text-indigo-750 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg inline-block">
                      ⏱ {sortedContracts.length || cust.rentalCount} Đơn thuê
                    </span>
                  </div>
                </div>

                {/* Personal contact parameters list */}
                <div className="space-y-1.5 text-xs text-gray-655 border-t border-gray-100 pt-2.5">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-gray-800 font-bold">{cust.phone}</span>
                  </div>

                  {cust.email && (
                    <div className="flex items-center gap-1.5 truncate" title={cust.email}>
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

                  {cust.idNumber && (
                    <div className="flex items-center gap-1.5 font-mono text-[11px] truncate">
                      <span className="font-sans font-bold text-gray-400">CCCD:</span>
                      <span className="truncate">{cust.idNumber}</span>
                    </div>
                  )}

                  {cust.address && (
                    <div className="flex items-start gap-1.5 text-[11px]">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
                      <span className="truncate" title={cust.address}>{cust.address}</span>
                    </div>
                  )}
                </div>

                {cust.notes && (
                  <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-155/50 text-[11px] text-amber-900 font-mono leading-relaxed max-h-[60px] overflow-y-auto" title={cust.notes}>
                    ✏️ {cust.notes}
                  </div>
                )}

                {/* Lịch sử đơn thuê trực quan theo lần */}
                <div className="pt-2.5 border-t border-dashed border-gray-150 space-y-2">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block">
                    Đơn thuê gần đây ({sortedContracts.length})
                  </span>
                  {sortedContracts.length === 0 ? (
                    <p className="text-[11px] text-gray-400 italic">Chưa phát sinh đơn thuê</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[142px] overflow-y-auto pr-0.5 scrollbar-thin">
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
                            className="bg-gray-50/75 border border-gray-200/60 rounded-lg p-2 hover:border-orange-200 hover:bg-orange-50/10 cursor-pointer transition text-[11px] space-y-1 group"
                          >
                            <div className="flex justify-between items-center gap-1">
                              <span className="font-mono font-extrabold text-orange-600 truncate group-hover:text-orange-700">
                                {contract.contractCode}
                              </span>
                              <span className={`px-1 rounded text-[8.5px] font-bold border ${statusConfig.bg}`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-750 font-sans">
                                Lần thuê {nthRental}
                              </span>
                              <span className="font-mono text-gray-500 text-[10px]">
                                {contract.totalPrice.toLocaleString()}đ
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono flex justify-between items-center">
                              <span>{new Date(contract.startDate).toLocaleDateString('vi-VN')}</span>
                              <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1 py-0.2 rounded font-sans font-medium">
                                {contract.items.length} thiết bị
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      {sortedContracts.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerForHistory(cust)}
                          className="text-[10px] font-bold text-indigo-650 hover:text-indigo-800 transition block text-center w-full pt-1"
                        >
                          Xem thêm {sortedContracts.length - 2} đơn khác...
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions panel */}
              <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForHistory(cust)}
                  className="bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-150 px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1 flex-1 text-center"
                  title="Xem toàn bộ lịch sử đơn hàng và lần thuê"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>Chi tiết ({sortedContracts.length} đơn)</span>
                </button>

                <button
                  onClick={() => handleOpenEditModal(cust)}
                  className="text-orange-600 hover:text-white border border-orange-200 hover:bg-orange-600 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer text-center shrink-0"
                >
                  Sửa
                </button>

                {onDeleteCustomer && (
                  <button
                    onClick={() => {
                      setDeleteConfirmId(cust.id);
                    }}
                    className="text-gray-400 hover:text-rose-650 p-2 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0 border border-transparent hover:border-rose-100"
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
          <div className="col-span-full bg-white border border-gray-150 p-12 text-center rounded-2xl text-gray-400 italic font-medium">
            Không tìm thấy hồ sơ khách hàng nào phù hợp với từ khóa này.
          </div>
        )}
      </div>

      {/* Pagination controls for customers */}
      {totalPages > 1 && (
        <div className="bg-white border border-gray-150 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs select-none">
          <span className="text-xs text-gray-500 font-medium">
            Hiển thị từ <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> tới <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filteredCustomers.length)}</span> trong tổng số <span className="font-bold text-gray-800">{filteredCustomers.length}</span> hồ sơ khách hàng
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

      {/* Customer Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden self-center border border-gray-100 animate-scale-up">
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
        </div>
      )}

      {/* Customer detailed order history modal */}
      {selectedCustomerForHistory && (() => {
        const sortedContracts = (contracts || [])
          .filter(contract => 
            contract.customerPhone === selectedCustomerForHistory.phone
          )
          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        // Reverse to show newest orders first
        const displayContracts = [...sortedContracts].reverse();

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 animate-fade-in">
            <div className="bg-slate-50 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-gray-150 animate-scale-up">
              {/* Modal Header */}
              <div className="bg-indigo-600 text-white px-5 py-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <span className="p-1.5 bg-indigo-500/30 rounded-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </span>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg">Hồ Sơ & Lịch Sử Đơn Thuê Máy khép kín</h3>
                    <p className="text-xs text-indigo-100">
                      Khách hàng: <span className="font-extrabold text-white text-sm">{selectedCustomerForHistory.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForHistory(null)}
                  className="text-white hover:text-gray-200 font-extrabold text-2xl p-1 hover:bg-indigo-700/50 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 select-none">
                {/* Profile detail section */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-3xs grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <Shield className="w-3 h-3" />
                          Mức tín nhiệm: {selectedCustomerForHistory.trustLevel === 'High' ? 'Cao' : selectedCustomerForHistory.trustLevel === 'Medium' ? 'Trung bình' : 'Nguy cơ'}
                        </span>
                        <span className="text-xs font-bold text-indigo-750 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full">
                          Tổng cộng {sortedContracts.length} đơn hàng
                        </span>
                      </div>
                    </div>
                    {selectedCustomerForHistory.notes && (
                      <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-xs text-amber-900 font-mono mt-2 italic leading-normal">
                        📝 Lưu ý: {selectedCustomerForHistory.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Orders section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 tracking-wider uppercase">
                      Danh sách đơn thuê máy (Thời gian lùi dần)
                    </h3>
                  </div>

                  {displayContracts.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 italic">
                      Chưa phát sinh bất kỳ đơn thuê nào trên hệ thống.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {displayContracts.map((contract) => {
                        const origIndex = sortedContracts.findIndex(c => c.id === contract.id);
                        const sequenceNum = origIndex !== -1 ? origIndex + 1 : sortedContracts.length;
                        
                        const diffTime = Math.abs(new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime());
                        const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

                        const statusStyles = 
                          contract.status === 'Completed' ? { bg: 'bg-green-500/10 text-green-700 border-green-200', label: 'Hoàn thành' } :
                          contract.status === 'Active' ? { bg: 'bg-blue-500/10 text-blue-700 border-blue-200 font-bold', label: 'Đang thuê' } :
                          contract.status === 'Overdue' ? { bg: 'bg-rose-500/10 text-rose-700 border-rose-200 animate-pulse', label: 'Quá hạn trả' } :
                          contract.status === 'Pending' ? { bg: 'bg-amber-500/10 text-amber-700 border-amber-200', label: 'Chờ nhận máy' } :
                          { bg: 'bg-gray-500/10 text-gray-500 border-gray-200', label: 'Đã hủy đơn' };

                        return (
                          <div 
                            key={contract.id} 
                            className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all space-y-3"
                          >
                            {/* Contract Card Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-indigo-600 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg">
                                  Hợp đồng {contract.contractCode}
                                </span>
                                <span className="bg-orange-50 text-orange-700 border border-orange-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                  ⭐ Lần thuê thứ {sequenceNum}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusStyles.bg}`}>
                                  ● {statusStyles.label}
                                </span>
                              </div>
                            </div>

                            {/* Contract Time Parameter */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-gray-150">
                              <div className="space-y-1">
                                <div className="text-gray-400 font-bold">Thời hạn thuê máy:</div>
                                <div className="text-gray-800 font-medium flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{new Date(contract.startDate).toLocaleDateString('vi-VN')}</span>
                                  <span className="text-gray-400 font-light">đến</span>
                                  <span>{new Date(contract.endDate).toLocaleDateString('vi-VN')}</span>
                                </div>
                              </div>
                              <div className="space-y-1 text-left sm:text-right">
                                <div className="text-gray-400 font-bold">Hình thức thuê:</div>
                                <div className="text-gray-800 font-extrabold text-sm text-indigo-750">
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                              <div className="bg-slate-50 border border-gray-200 p-2 rounded-xl">
                                <div className="text-[10px] text-gray-400 font-extrabold uppercase">Giá trị đơn hàng</div>
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
                              <div className="bg-indigo-50/40 border border-indigo-100 p-2 rounded-xl col-span-2 sm:col-span-1">
                                <div className="text-[10px] text-indigo-605 font-extrabold uppercase text-indigo-700">Bảo đảm thế chấp</div>
                                <div className="font-mono text-[11px] text-indigo-700 font-bold truncate" title={contract.customerDocNote || `${contract.customerDocType === 'CCCD_And_1M' ? 'Giữ CCCD + 1 triệu' : contract.customerDocType}: ${contract.depositAmount.toLocaleString()}đ`}>
                                  {contract.customerDocNote || `${contract.customerDocType === 'CCCD_And_1M' ? 'Giữ CCCD + 1 triệu' : contract.customerDocType === 'CCCD' ? 'Giữ CCCD' : contract.customerDocType} (Trị giá ${contract.depositAmount.toLocaleString()}đ)`}
                                </div>
                              </div>
                            </div>

                            {/* Optional notes */}
                            {contract.note && (
                              <div className="bg-amber-50 border border-amber-100 text-[11px] p-2 rounded-lg text-amber-900 font-mono italic">
                                📌 Chú thích nghiệp vụ: {contract.note}
                              </div>
                            )}
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
                  className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-6 py-2 rounded-xl text-sm shadow-sm transition cursor-pointer"
                >
                  Đóng hồ sơ
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
