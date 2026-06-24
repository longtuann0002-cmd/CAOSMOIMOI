import React, { useState, useMemo, useEffect } from 'react';
import { Camera, RentalContract } from '../types';
import { Search, Plus, Filter, Camera as CameraIcon, CheckCircle, Flame, Server, ShieldCheck, RefreshCw, Trash2, Edit2, ChevronLeft, ChevronRight, Download, FileSpreadsheet } from 'lucide-react';
import { getInitialTieredPrices } from '../utils/pricing';
import RentalFrequencyChart from './RentalFrequencyChart';

interface EquipmentTrackerProps {
  cameras: Camera[];
  onAddCamera: (camera: Camera) => void;
  onUpdateCamera: (camera: Camera) => void;
  onDeleteCamera: (id: string) => void;
  currentUserRole?: string;
  contracts?: RentalContract[];
  systemDate?: string;
}

export default function EquipmentTracker({
  cameras,
  onAddCamera,
  onUpdateCamera,
  onDeleteCamera,
  currentUserRole,
  contracts = [],
  systemDate = '2026-06-17'
}: EquipmentTrackerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [cameraToDelete, setCameraToDelete] = useState<Camera | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [expandedPrices, setExpandedPrices] = useState<Record<string, boolean>>({});

  const togglePricingExpanded = (id: string) => {
    setExpandedPrices(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Form states including tiered pricing fields
  const [formState, setFormState] = useState({
    name: '',
    shortName: '',
    category: 'Body' as Camera['category'],
    dailyRate: 150000,
    price6Hours: 90000,
    price1Day: 150000,
    price2Days: 270000,
    price3Days: 360000,
    price4DaysPlus: 105000,
    status: 'Available' as Camera['status'],
    serialNumber: '',
    description: '',
    image: ''
  });

  const filteredCameras = useMemo(() => {
    return cameras.filter(c => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        c.name.toLowerCase().includes(query) ||
        c.serialNumber.toLowerCase().includes(query) ||
        c.shortName.toLowerCase().includes(query);

      const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [cameras, searchQuery, categoryFilter, statusFilter]);

  // Calculate dynamic device count for each category
  const categoryCounts = useMemo(() => {
    return {
      ALL: cameras.length,
      Body: cameras.filter(c => c.category === 'Body').length,
      Lens: cameras.filter(c => c.category === 'Lens').length,
      Combo: cameras.filter(c => c.category === 'Combo').length,
      Accessory: cameras.filter(c => c.category === 'Accessory').length,
    };
  }, [cameras]);

  // Pagination Configuration
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 6 equipment items per page

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter]);

  const totalPages = Math.ceil(filteredCameras.length / itemsPerPage) || 1;
  const paginatedCameras = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCameras.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCameras, currentPage, itemsPerPage]);

  const handleOpenAddModal = () => {
    setFormState({
      name: '',
      shortName: '',
      category: 'Body',
      dailyRate: 150000,
      price6Hours: 90000,
      price1Day: 150000,
      price2Days: 270000,
      price3Days: 360000,
      price4DaysPlus: 105000,
      status: 'Available',
      serialNumber: '',
      description: '',
      image: ''
    });
    setEditingCamera(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (cam: Camera) => {
    setFormState({
      name: cam.name,
      shortName: cam.shortName,
      category: cam.category,
      dailyRate: cam.dailyRate,
      price6Hours: cam.price6Hours ?? Math.round(cam.dailyRate * 0.6),
      price1Day: cam.price1Day ?? cam.dailyRate,
      price2Days: Math.round((cam.price2Days ?? Math.round(cam.dailyRate * 0.9)) * 2),
      price3Days: Math.round((cam.price3Days ?? Math.round(cam.dailyRate * 0.8)) * 3),
      price4DaysPlus: cam.price4DaysPlus ?? Math.round(cam.dailyRate * 0.7),
      status: cam.status,
      serialNumber: cam.serialNumber,
      description: cam.description || '',
      image: cam.image || ''
    });
    setEditingCamera(cam);
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.shortName || !formState.serialNumber) {
      setValidationError('Vui lòng điền đầy đủ các trường thông tin bắt buộc (*)!');
      return;
    }

    const imageRef = formState.image || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400';
    
    // Chia 2 cho giá ngày thứ 2, chia 3 cho ngày thứ 3 để có đơn giá/ngày đúng (giữ số thập phân chính xác tuyệt đối thay vì làm tròn)
    const savedFormState = {
      ...formState,
      price2Days: formState.price2Days / 2,
      price3Days: formState.price3Days / 3
    };

    if (editingCamera) {
      // Edit
      onUpdateCamera({
        ...editingCamera,
        ...savedFormState,
        image: imageRef
      });
    } else {
      // New
      const newCam: Camera = {
        id: `cam-${Date.now()}`,
        ...savedFormState,
        image: imageRef
      };
      onAddCamera(newCam);
    }
    setShowAddModal(false);
    setValidationError(null);
  };

  const toggleMaintenance = (cam: Camera) => {
    const updatedStatus = cam.status === 'Maintenance' ? 'Available' : 'Maintenance';
    onUpdateCamera({
      ...cam,
      status: updatedStatus
    });
  };

  const handleExportCSV = () => {
    // UTF-8 BOM to prevent font error in Excel for Vietnamese characters
    const BOM = '\uFEFF';
    
    // CSV Header
    const headers = ['Mã Hệ Thống', 'Tên Thiết Bị', 'Tên Viết Tắt', 'Danh Mục', 'Số Serial', 'Giá Thuê 1 Tiếng/Ngày (VND)', 'Trạng Thái', 'Mô Tả'];
    
    // Rows using filteredCameras so it matches searched/filtered list view context perfectly!
    const rows = filteredCameras.map(cam => {
      let categoryVN = cam.category;
      if (cam.category === 'Body') categoryVN = 'Thân máy';
      else if (cam.category === 'Lens') categoryVN = 'Ống kính';
      else if (cam.category === 'Combo') categoryVN = 'Bộ máy (Combo)';
      else if (cam.category === 'Accessory') categoryVN = 'Phụ kiện';

      let statusVN = cam.status;
      if (cam.status === 'Available') statusVN = 'Sẵn sàng';
      else if (cam.status === 'Rented') statusVN = 'Đang cho thuê';
      else if (cam.status === 'Maintenance') statusVN = 'Đang bảo trì';

      return [
        cam.id,
        `"${cam.name.replace(/"/g, '""')}"`,
        `"${cam.shortName.replace(/"/g, '""')}"`,
        categoryVN,
        `"${cam.serialNumber.replace(/"/g, '""')}"`,
        cam.dailyRate,
        statusVN,
        `"${(cam.description || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = BOM + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `bao_cao_kho_thiet_bi_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Biểu đồ tần suất thuê thiết bị trong tháng gần nhất bằng D3 */}
      <RentalFrequencyChart
        cameras={cameras}
        contracts={contracts}
        systemDate={systemDate}
      />

      {/* Search and filter tools */}
      <div className="bg-white border border-gray-150 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-xl font-black text-gray-850 flex items-center gap-2 select-none">
              <CameraIcon className="text-orange-600 w-4.5 h-4.5 sm:w-5 bg-orange-50 p-1 rounded-md sm:bg-transparent sm:p-0" /> Quản Lý Đội Thiết Bị (Kho Máy)
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-normal">
              Kiểm tra theo dõi tình trạng thiết bị máy ảnh, ống kính và bảo trì định kỳ tránh hư hại.
            </p>
          </div>
          <div className={`grid ${currentUserRole === 'admin' ? 'grid-cols-2' : 'grid-cols-1'} sm:flex sm:flex-wrap gap-2 w-full sm:w-auto`}>
            <button
              onClick={handleExportCSV}
              className="bg-slate-50 border border-gray-200 text-gray-700 font-extrabold sm:font-semibold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm flex items-center justify-center gap-1.5 hover:bg-slate-100 hover:text-gray-900 transition-all cursor-pointer shadow-4xs"
              title="Xuất định dạng CSV tải về"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" /> Xuất bản CSV
            </button>
            {currentUserRole === 'admin' && (
              <button
                onClick={handleOpenAddModal}
                className="bg-orange-600 text-white font-extrabold sm:font-medium px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm flex items-center justify-center gap-1.5 hover:bg-orange-700 transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Thêm thiết bị
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo tên máy, số serial, viết tắt..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8.5 pr-4 py-1.5 sm:py-2.5 text-xs sm:text-sm w-full border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-400/80"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="text-sm w-full border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Tất cả danh mục</option>
              <option value="Body">Thân máy (Body)</option>
              <option value="Lens">Ống kính (Lens)</option>
              <option value="Combo">Combo Bộ máy</option>
              <option value="Accessory">Phụ kiện kèm theo</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm w-full border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Available">Sẵn sàng (Available)</option>
              <option value="Rented">Đang cho thuê (Rented)</option>
              <option value="Maintenance">Đang bảo trì (Maintenance)</option>
            </select>
          </div>
        </div>

        {/* Dynamic Category Pill Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pt-3.5 border-t border-gray-100/80">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-2 select-none">
            Lọc Đội Thiết Bị:
          </span>
          {[
            { id: 'ALL', name: 'Tất cả thiết bị', count: categoryCounts.ALL, color: 'bg-orange-600 border-orange-600 text-white' },
            { id: 'Body', name: 'Máy ảnh / Thân máy', count: categoryCounts.Body, color: 'bg-blue-600 border-blue-600 text-white' },
            { id: 'Lens', name: 'Ống kính (Lens)', count: categoryCounts.Lens, color: 'bg-purple-600 border-purple-600 text-white' },
            { id: 'Combo', name: 'Bộ máy (Combo)', count: categoryCounts.Combo, color: 'bg-indigo-600 border-orange-500 text-white' },
            { id: 'Accessory', name: 'Phụ kiện máy ảnh', count: categoryCounts.Accessory, color: 'bg-emerald-600 border-emerald-600 text-white' },
          ].map(cat => {
            const isSelected = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
                  isSelected
                    ? `${cat.color} shadow-xs scale-102`
                    : 'bg-gray-55/60 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-200/80 text-gray-600'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Equipment Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {paginatedCameras.map(cam => (
          <div key={cam.id} className="bg-white border border-gray-150/65 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              {/* Product Image and tags */}
              <div className="h-36 sm:h-44 md:h-48 overflow-hidden relative bg-gray-100">
                <img
                  src={cam.image}
                  alt={cam.name}
                  className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                  <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wider">
                    {cam.category === 'Body' ? 'Thân máy' :
                     cam.category === 'Lens' ? 'Ống kính' :
                     cam.category === 'Combo' ? 'Bộ Gear' : 'Phụ kiện'}
                  </span>
                  <span className="bg-orange-600 text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {cam.shortName}
                  </span>
                </div>
                
                {/* Status Overlay Bubble */}
                <div className="absolute top-2.5 right-2.5 text-xs">
                  <span className={`inline-block font-bold text-[10px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm ${
                    cam.status === 'Available' ? 'bg-emerald-500 text-white' :
                    cam.status === 'Rented' ? 'bg-blue-600 text-white' :
                    'bg-amber-500 text-white'
                  }`}>
                    {cam.status === 'Available' ? 'Có sẵn' :
                     cam.status === 'Rented' ? 'Đang thuê' : 'Bảo trì'}
                  </span>
                </div>
              </div>

              {/* Product text details */}
              <div className="p-4 sm:p-5 space-y-3.5">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base hover:text-orange-600 transition-colors line-clamp-1">{cam.name}</h3>
                  <div className="text-gray-400 font-mono text-[11px] sm:text-xs mt-0.5 flex justify-between">
                    <span>S/N: {cam.serialNumber}</span>
                  </div>
                </div>

                <p className="text-gray-500 text-[11px] sm:text-xs line-clamp-2 h-7 sm:h-8">
                  {cam.description || 'Chưa cung cấp mô tả chi tiết cho sản phẩm.'}
                </p>

                {/* Dynamic Tiered Rates info */}
                {/* Desktop Version: Always visible */}
                <div className="hidden md:block border-t border-gray-100 pt-3 space-y-1.5 bg-gray-55/70 p-3 rounded-xl border border-gray-200/50">
                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-extrabold uppercase tracking-wider pb-0.5 border-b border-gray-200">
                    <span>Thời hạn</span>
                    <span>Đơn giá/ngày (Hoặc buổi)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-[11px] font-semibold">
                    <div className="flex justify-between items-center bg-amber-50/70 px-2 py-1 rounded-lg border border-amber-200/30 col-span-2 mb-1 shadow-3xs">
                      <span className="text-amber-850 font-extrabold">Thuê ngắn hạn (6 tiếng):</span>
                      <span className="font-mono text-amber-700 font-extrabold">{(cam.price6Hours ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.6)).toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">Thuê 1 ngày:</span>
                      <span className="font-mono text-gray-800 font-bold">{(cam.price1Day ?? cam.dailyRate).toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">Thuê 2 ngày:</span>
                      <span className="font-mono text-gray-800 font-bold">{Math.round((cam.price2Days ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.9)) * 2).toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">Thuê 3 ngày:</span>
                      <span className="font-mono text-gray-800 font-bold">{Math.round((cam.price3Days ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.8)) * 3).toLocaleString()}đ</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-medium">Từ 4 ngày:</span>
                      <span className="font-mono text-orange-600 font-extrabold">{(cam.price4DaysPlus ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.7)).toLocaleString()}đ/ngày</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Version: Collapsed by default, elegant toggle button */}
                <div className="block md:hidden border-t border-gray-100/60 pt-2.5">
                  <div className="flex justify-between items-center bg-orange-50/40 p-2 sm:p-2.5 rounded-xl border border-orange-100/40">
                    <div>
                      <span className="text-[9px] text-gray-500 font-extrabold block uppercase tracking-wide">Giá ngày cơ bản</span>
                      <span className="text-xs sm:text-sm font-extrabold text-orange-600">
                        {(cam.price1Day ?? cam.dailyRate).toLocaleString()}đ
                        <span className="text-[9px] font-normal text-gray-400">/ngày</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePricingExpanded(cam.id)}
                      className="px-2.5 py-1.5 text-[9px] sm:text-[10px] bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-95 transition-all font-bold cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {expandedPrices[cam.id] ? 'Thu gọn bảng giá' : 'Bảng giá lũy tiến'}
                      <span className="text-[8px] text-gray-400 transition-transform duration-200" style={{ transform: expandedPrices[cam.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </button>
                  </div>

                  {expandedPrices[cam.id] && (
                    <div className="mt-2 space-y-1.5 bg-gray-55/70 p-2.5 rounded-xl border border-gray-200/50 text-[10px] sm:text-[11px] font-medium transition-all duration-300">
                      <div className="flex justify-between items-center text-[9px] text-gray-400 font-bold uppercase tracking-wider pb-0.5 border-b border-gray-200">
                        <span>Thời hạn</span>
                        <span>Đơn giá/ngày (hoặc buổi)</span>
                      </div>
                      <div className="flex justify-between items-center bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/30 font-bold">
                        <span className="text-amber-850 font-extrabold">Ngắn hạn (6 tiếng):</span>
                        <span className="font-mono text-amber-700 font-extrabold">{(cam.price6Hours ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.6)).toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-gray-500">Thuê 1 ngày:</span>
                        <span className="font-mono text-gray-800 font-bold">{(cam.price1Day ?? cam.dailyRate).toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-gray-500">Thuê 2 ngày:</span>
                        <span className="font-mono text-gray-800 font-bold">{Math.round((cam.price2Days ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.9)) * 2).toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-gray-500">Thuê 3 ngày:</span>
                        <span className="font-mono text-gray-800 font-bold">{Math.round((cam.price3Days ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.8)) * 3).toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-gray-500">Từ 4 ngày:</span>
                        <span className="font-mono text-orange-600 font-extrabold">{(cam.price4DaysPlus ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.7)).toLocaleString()}đ/ngày</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status and Admin tools bar */}
            <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-gray-50/90 border-t border-gray-100 flex items-center justify-between gap-1.5">
              {currentUserRole === 'admin' ? (
                <>
                  <button
                    onClick={() => handleOpenEditModal(cam)}
                    className="text-gray-650 hover:text-orange-600 p-2 hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                    title="Sửa thông tin (Admin)"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleMaintenance(cam)}
                    className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                      cam.status === 'Maintenance'
                        ? 'bg-emerald-55 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                    }`}
                    title={cam.status === 'Maintenance' ? 'Chuyển sang Sẵn sàng hoạt động' : 'Chuyển sang trạng thái Đang bảo trì'}
                  >
                    {cam.status === 'Maintenance' ? 'Xong bảo dưỡng' : 'Cần bảo trì'}
                  </button>

                  <button
                    onClick={() => {
                      if (cam.status === 'Rented') {
                        setDeleteError(`Thiết bị "${cam.name}" hiện đang trong trạng thái ĐANG THUÊ (Rented) bởi khách hàng. Vui lòng hoàn tất thu hồi hoặc xử lý hợp đồng của thiết bị này trước khi xóa khỏi hệ thống.`);
                        setCameraToDelete(cam);
                      } else {
                        setDeleteError(null);
                        setCameraToDelete(cam);
                      }
                    }}
                    className="text-gray-400 hover:text-red-650 p-2 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                    title="Xóa máy"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold text-gray-500 bg-gray-200/50 px-2 rounded-md py-1 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-gray-550 shrink-0" /> Chế độ xem (Staff)
                  </span>

                  <button
                    onClick={() => toggleMaintenance(cam)}
                    className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-all cursor-pointer ${
                      cam.status === 'Maintenance'
                        ? 'bg-emerald-55 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                    }`}
                    title={cam.status === 'Maintenance' ? 'Chuyển sang Sẵn sàng hoạt động' : 'Báo hành/Cần bảo trì'}
                  >
                    {cam.status === 'Maintenance' ? 'Hoàn tất bảo dưỡng' : 'Báo hỏng/Cần bảo trì'}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {filteredCameras.length === 0 && (
          <div className="col-span-full bg-white border border-gray-150 p-12 text-center rounded-2xl text-gray-400 italic font-medium">
            Không tìm thấy máy móc nào trùng khớp với bộ lọc của bạn.
          </div>
        )}
      </div>

      {/* Pagination controls for equipment */}
      {totalPages > 1 && (
        <div className="bg-white border border-gray-150 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs select-none">
          <span className="text-xs text-gray-500 font-medium">
            Hiển thị từ <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> tới <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filteredCameras.length)}</span> trong tổng số <span className="font-bold text-gray-800">{filteredCameras.length}</span> thiết bị
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

      {/* Add / Edit Machine Popup Form */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden self-center border border-gray-100 animate-scale-up">
            <div className="bg-orange-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <CameraIcon className="w-5 h-5" /> {editingCamera ? 'Cập Nhật Thiết Bị' : 'Thêm Máy Mới Vào Kho'}
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
                <label className="block text-xs font-bold text-gray-700 mb-1">Tên thiết bị đầy đủ *</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={e => setFormState({ ...formState, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="VD: Canon EOS R50 Body"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tên viết tắt (Shorthand) *</label>
                  <input
                    type="text"
                    required
                    value={formState.shortName}
                    onChange={e => setFormState({ ...formState, shortName: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="VD: R50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số Serial (S/N) *</label>
                  <input
                    type="text"
                    required
                    value={formState.serialNumber}
                    onChange={e => setFormState({ ...formState, serialNumber: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="VD: CAN-R50-1039"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Danh mục phân loại</label>
                  <select
                    value={formState.category}
                    onChange={e => setFormState({ ...formState, category: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-medium text-gray-750"
                  >
                    <option value="Body">Thân máy (Body)</option>
                    <option value="Lens">Ống kính (Lens)</option>
                    <option value="Combo">Combo Trọn bộ</option>
                    <option value="Accessory">Phụ kiện khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Báo giá thuê gốc / Ngày (VND) *</label>
                  <input
                    type="number"
                    required
                    value={formState.dailyRate}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      setFormState(prev => ({
                        ...prev,
                        dailyRate: val,
                        price6Hours: Math.round(val * 0.6),
                        price1Day: val,
                        price2Days: Math.round(val * 0.9) * 2,
                        price3Days: Math.round(val * 0.8) * 3,
                        price4DaysPlus: Math.round(val * 0.7)
                      }));
                    }}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                    placeholder="Nhập giá thuê cơ bản"
                  />
                </div>
              </div>

              {/* Tiered pricing block */}
              <div className="border border-orange-100 rounded-xl p-3 bg-orange-50/20 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-orange-850 uppercase tracking-wider">Cấu hình giá thuê theo số ngày</h4>
                  <button
                    type="button"
                    onClick={() => {
                      const base = formState.price1Day || formState.dailyRate;
                      setFormState(prev => ({
                        ...prev,
                        price6Hours: Math.round(base * 0.6),
                        price1Day: base,
                        price2Days: Math.round(base * 0.9) * 2,
                        price3Days: Math.round(base * 0.8) * 3,
                        price4DaysPlus: Math.round(base * 0.7)
                      }));
                    }}
                    className="text-[10px] text-orange-655 hover:text-orange-855 font-bold flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-orange-200 shadow-3xs"
                  >
                    ⚙️ Tự động giảm dần (60% - 100% - 90% - 80% - 70%)
                  </button>
                </div>
                <p className="text-[10.5px] text-gray-500 leading-normal font-medium">
                  Hệ thống tự động tính tổng tiền thuê đơn hàng bằng cách tra cứu các mức giá/ngày dưới đây tương ứng với tổng số ngày thuê:
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2 bg-amber-55/40 p-2.5 rounded-xl border border-amber-200/50">
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">🔥 Giá thuê ngắn hạn (6 tiếng)</label>
                    <input
                      type="number"
                      value={formState.price6Hours}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormState(prev => ({ ...prev, price6Hours: val }));
                      }}
                      className="w-full border border-amber-300 bg-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none font-mono text-amber-950 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-650 mb-0.5">Giá thuê 1 ngày (mốc chuẩn)</label>
                    <input
                      type="number"
                      value={formState.price1Day}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormState(prev => ({ ...prev, price1Day: val, dailyRate: val }));
                      }}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-650 mb-0.5">Giá thuê 2 ngày (VND)</label>
                    <input
                      type="number"
                      value={formState.price2Days}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormState(prev => ({ ...prev, price2Days: val }));
                      }}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-650 mb-0.5">Giá thuê 3 ngày (VND)</label>
                    <input
                      type="number"
                      value={formState.price3Days}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormState(prev => ({ ...prev, price3Days: val }));
                      }}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-650 mb-0.5">Giá từ ngày thứ 4 (VND/ngày)</label>
                    <input
                      type="number"
                      value={formState.price4DaysPlus}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setFormState(prev => ({ ...prev, price4DaysPlus: val }));
                      }}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tình trạng phục vụ</label>
                  <select
                    value={formState.status}
                    onChange={e => setFormState({ ...formState, status: e.target.value as any })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white text-gray-750 font-medium"
                  >
                    <option value="Available">Sẵn sàng (Available)</option>
                    <option value="Rented">Đang được khách thuê (Rented)</option>
                    <option value="Maintenance">Bảo dưỡng bảo trì (Maintenance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Đường dẫn ảnh mô tả (URL)</label>
                  <input
                    type="text"
                    value={formState.image}
                    onChange={e => setFormState({ ...formState, image: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Link Unsplash hoặc bỏ trống"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả thông số chi tiết sản phẩm</label>
                <textarea
                  value={formState.description}
                  onChange={e => setFormState({ ...formState, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="Viết cấu hình máy, độ cảm biến, số shot..."
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
                  {editingCamera ? 'Lưu thay đổi' : 'Thêm thiết bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {cameraToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-gray-100 animate-scale-up">
            <div className="bg-rose-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-base flex items-center gap-2">
                ⚠️ Xác nhận xóa thiết bị
              </h3>
              <button
                type="button"
                onClick={() => {
                  setCameraToDelete(null);
                  setDeleteError(null);
                }}
                className="text-white hover:text-rose-100 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-4 border-t border-gray-50">
              {deleteError ? (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 text-amber-850 p-4 rounded-xl text-xs font-semibold leading-relaxed">
                    {deleteError}
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraToDelete(null);
                        setDeleteError(null);
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-750 font-bold text-xs px-4 py-2.5 rounded-lg border border-gray-200 transition-all cursor-pointer"
                    >
                      Đã hiểu và Đóng lại
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-650 text-sm font-medium leading-relaxed">
                    Bạn có chắc chắn muốn xóa thiết bị <strong className="text-red-700 font-black">{cameraToDelete.name}</strong> (S/N: {cameraToDelete.serialNumber}) ra khỏi hệ thống quản lý kho?
                  </p>
                  <div className="bg-gray-50 border border-gray-150 p-3.5 rounded-xl text-xs text-gray-500 leading-relaxed font-semibold">
                    🔍 <strong>Lưu ý:</strong> Hành động này không thể hoàn tác. Tên thiết bị trong các hợp đồng trong quá khứ vẫn sẽ được giữ nguyên dạng văn bản thô để đảm bảo tính minh bạch hóa đơn.
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setCameraToDelete(null)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-4 py-2.5 rounded-lg border border-gray-200 transition-all cursor-pointer"
                    >
                      Bỏ qua
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteCamera(cameraToDelete.id);
                        setCameraToDelete(null);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg border border-rose-600 transition-all shadow-xs cursor-pointer"
                    >
                      Xác nhận xóa hoàn toàn
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
