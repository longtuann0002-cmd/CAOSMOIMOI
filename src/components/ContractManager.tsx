import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RentalContract, Camera, ContractStatus, BankConfig, ContractTemplate } from '../types';
import { Search, Plus, Filter, Calendar, FileText, Check, AlertCircle, RefreshCw, X, ShieldAlert, Phone, Briefcase, Trash2, CreditCard, Settings, Download, Image as ImageIcon, ChevronLeft, ChevronRight, FileSpreadsheet, Copy } from 'lucide-react';
import { getCameraRateForDuration, checkBookingConflict } from '../utils/pricing';
import { loadStoredData, saveStoredData } from '../utils/mockData';
import { toPng } from 'html-to-image';

interface ContractManagerProps {
  contracts: RentalContract[];
  cameras: Camera[];
  onAddContract: (contract: RentalContract) => void;
  onUpdateContractStatus: (id: string, status: ContractStatus, note?: string, paidAmount?: number) => void;
  onDeleteContract?: (id: string) => void;
  onUpdateContractNote?: (id: string, note: string) => void;
  systemDate: string;
}

export const VIET_BANKS = [
  { id: 'MB', name: 'MB Bank (Quân Đội)' },
  { id: 'VCB', name: 'Vietcombank (Ngoại Thương)' },
  { id: 'TCB', name: 'Techcombank (Kỹ Thương)' },
  { id: 'ACB', name: 'ACB (Á Châu)' },
  { id: 'BIDV', name: 'BIDV (Đầu tư & Phát triển)' },
  { id: 'ICB', name: 'Vietinbank (Công Thương)' },
  { id: 'VBA', name: 'Agribank (Nông nghiệp)' },
  { id: 'TPB', name: 'TPBank (Tiên Phong)' },
  { id: 'VPB', name: 'VPBank (Thịnh Vượng)' },
  { id: 'VIB', name: 'VIB (Quốc Tế)' },
  { id: 'STB', name: 'Sacombank' },
];

export const renderDocTypeLabel = (docType: string) => {
  switch (docType) {
    case 'CCCD': return 'Giữ CCCD gốc';
    case 'CCCD_And_1M': return 'Giữ CCCD + 1 triệu';
    case 'GPLX': return 'Giữ bằng lái (GPLX)';
    case 'Passport': return 'Giữ hộ chiếu (Passport)';
    case 'CashDeposit': return 'Đặt cọc tiền mặt';
    case 'Other': return 'Thế chấp tài sản khác';
    default: return docType;
  }
};

const getBankBin = (id: string): string => {
  const bins: Record<string, string> = {
    'MB': '970422',
    'VCB': '970436',
    'TCB': '970407',
    'ACB': '970416',
    'BIDV': '970418',
    'ICB': '970415',
    'VBA': '970405',
    'TPB': '970423',
    'VPB': '970432',
    'VIB': '970441',
    'STB': '970403'
  };
  return bins[id] || id;
};

export default function ContractManager({
  contracts,
  cameras,
  onAddContract,
  onUpdateContractStatus,
  onDeleteContract,
  onUpdateContractNote,
  systemDate
}: ContractManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<RentalContract | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [customAlertMessage, setCustomAlertMessage] = useState<string | null>(null);

  // States for inline quick notes
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');

  const handleSaveNote = (id: string) => {
    if (onUpdateContractNote) {
      onUpdateContractNote(id, noteDraft.trim());
    }
    setEditingNoteId(null);
    setNoteDraft('');
  };

  // Bank information & QR configuration states
  const [bankConfig, setBankConfig] = useState<BankConfig>(() =>
    loadStoredData('rental_bank_config', {
      bankId: 'MB',
      accountNo: '0387532321',
      accountName: 'TIEM ANH NHA CAO'
    })
  );
  const [showBankSettings, setShowBankSettings] = useState(false);
  const [qrAmountOption, setQrAmountOption] = useState<'remaining' | 'deposit50' | 'full' | 'custom'>('remaining');
  const [customQrAmount, setCustomQrAmount] = useState<number | null>(null);

  const handleUpdateBankConfig = (newConfig: BankConfig) => {
    setBankConfig(newConfig);
    saveStoredData('rental_bank_config', newConfig);
  };

  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportImage = (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      setCustomAlertMessage('Không tìm thấy dữ liệu để xuất ảnh!');
      return;
    }
    
    setIsExporting(true);
    
    setTimeout(() => {
      toPng(element, {
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          margin: '0',
          borderRadius: '12px',
        }
      })
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = filename;
          link.href = dataUrl;
          link.click();
          setIsExporting(false);
        })
        .catch((err) => {
          console.error('Lỗi khi xuất ảnh:', err);
          setCustomAlertMessage('Không thể tạo file ảnh. Vui lòng tải lại trang và thử lại!');
          setIsExporting(false);
        });
    }, 200);
  };

  const handleExportCSV = () => {
    if (filteredContracts.length === 0) {
      setCustomAlertMessage('Không có dữ liệu hợp đồng nào để xuất!');
      return;
    }

    const BOM = '\uFEFF';
    const headers = [
      'Mã Hợp Đồng',
      'Tên Khách Hàng',
      'Số Điện Thoại',
      'Loại Giấy Tờ',
      'Thông Tin Giấy Tờ',
      'Thiết Bị Thuê',
      'Ngày Bàn Giao',
      'Ngày Trả Dự Kiến',
      'Thời Hạn',
      'Tổng Tiền Thuê (VND)',
      'Đã Thanh Toán (VND)',
      'Tiền Đặt Cọc (VND)',
      'Trạng Thái',
      'Ghi Chú',
      'Ngày Lập'
    ];

    const rows = filteredContracts.map(c => {
      const cameraNames = c.items.map(item => item.cameraName).join(' + ');
      const durationText = c.is6Hours ? `Trong ngày (về trước ${c.returnTime || '18:00'})` : 'Hàng ngày';
      
      let statusVN = c.status;
      if (c.status === 'Pending') statusVN = 'Chờ bàn giao';
      else if (c.status === 'Active') statusVN = 'Đang thuê';
      else if (c.status === 'Completed') statusVN = 'Đã trả máy';
      else if (c.status === 'Overdue') statusVN = 'Quá hạn trả';
      else if (c.status === 'Cancelled') statusVN = 'Đã hủy';

      return [
        c.contractCode,
        `"${c.customerName.replace(/"/g, '""')}"`,
        `"${c.customerPhone.replace(/"/g, '""')}"`,
        c.customerDocType,
        `"${(c.customerDocNote || '').replace(/"/g, '""')}"`,
        `"${cameraNames.replace(/"/g, '""')}"`,
        c.startDate,
        c.endDate,
        `"${durationText.replace(/"/g, '""')}"`,
        c.totalPrice,
        c.paidAmount,
        c.depositAmount,
        statusVN,
        `"${(c.note || '').replace(/"/g, '""')}"`,
        c.createdAt ? new Date(c.createdAt).toLocaleDateString('vi-VN') : ''
      ];
    });

    const csvContent = BOM + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_don_thue_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // New Contract form state
  const [newContractForm, setNewContractForm] = useState({
    customerName: '',
    customerPhone: '',
    customerDocType: 'CCCD' as const,
    customerDocNote: '',
    selectedCameraIds: [] as string[],
    startDate: systemDate,
    endDate: systemDate,
    is6Hours: false,
    returnTime: '18:00',
    depositAmount: 0,
    paidAmount: 0,
    discountPercent: 0, // Tỷ lệ tự giảm giá (%)
    note: ''
  });

  const [prevCalculatedTotal, setPrevCalculatedTotal] = useState(0);

  // Predefined Contract/Rental Form templates (Mẫu đơn thuê sẵn có)
  const DEFAULT_TEMPLATES: ContractTemplate[] = useMemo(() => [
    {
      id: 'tpl-1',
      templateName: '📸 Canon Vlog Sinh Viên (6 tiếng)',
      customerName: 'Nguyễn Khánh Vy',
      customerPhone: '0965312389',
      customerDocType: 'CCCD',
      customerDocNote: 'Thẻ sinh viên gốc + CCCD đối chiếu chụp ảnh lưu file',
      selectedCameraIds: ['cam-1', 'cam-5'], // Canon R50 + Sigma 56mm f/1.4
      is6Hours: true,
      returnTime: '17:00',
      depositAmount: 2000000,
      paidAmountPct: 0,
      paidAmount: 0,
      note: 'Học viên câu lạc bộ chụp ảnh thường niên. Hỗ trợ mượn kèm sạc dự phòng + thẻ nhớ 32GB miễn phí.',
      durationDays: 1
    },
    {
      id: 'tpl-2',
      templateName: '🎥 Sự Kiện Sony Chuyên Nghiệp (2 ngày)',
      customerName: 'Phan Anh Đức',
      customerPhone: '0933441122',
      customerDocType: 'Other',
      customerDocNote: 'Giữ xe máy Wave S đỏ biển 29X3-128.91 + Đăng ký xe gốc chính chủ',
      selectedCameraIds: ['cam-3', 'cam-4'], // Sony A7M4 + Sony 24-70GM II
      is6Hours: false,
      returnTime: '18:00',
      depositAmount: 15000000,
      paidAmountPct: 50,
      paidAmount: 750000,
      note: 'Chuẩn bị sẵn 4 pin sạc đầy hơi, dock sạc đôi & thẻ nhớ 128GB chuyên dụng chụp ảnh sự kiện RAW liên tục.',
      durationDays: 2
    },
    {
      id: 'tpl-3',
      templateName: '🎞️ Nghệ Thuật Fujifilm Classic (1 ngày)',
      customerName: 'Lê Minh Tú',
      customerPhone: '0988776655',
      customerDocType: 'Passport',
      customerDocNote: 'Passport gốc chính chủ',
      selectedCameraIds: ['cam-2'], // Fuji XS10
      is6Hours: false,
      returnTime: '18:00',
      depositAmount: 5000000,
      paidAmountPct: 100,
      paidAmount: 250000,
      note: 'Hỗ trợ reset thiết bị cài sẵn profile giả lập màu phim Classic Chrome của tiệm.',
      durationDays: 1
    }
  ], []);

  const [customTemplates, setCustomTemplates] = useState<ContractTemplate[]>(() => 
    loadStoredData('custom_contract_templates', [])
  );

  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveTemplateForm, setShowSaveTemplateForm] = useState(false);

  const allTemplates = useMemo(() => {
    return [...DEFAULT_TEMPLATES, ...customTemplates];
  }, [DEFAULT_TEMPLATES, customTemplates]);

  const handleApplyTemplate = (tpl: ContractTemplate) => {
    // Determine dynamic rate for the items in the template using the right duration
    const tplDays = tpl.durationDays || (tpl.is6Hours ? 1 : 1);
    const dailyTotal = tpl.selectedCameraIds.reduce((sum, id) => {
      const cam = cameras.find(c => c.id === id);
      return sum + (cam ? getCameraRateForDuration(cam, tplDays, tpl.is6Hours) : 0);
    }, 0);

    const calculatedTotalRate = tpl.is6Hours ? dailyTotal : dailyTotal * tplDays;
    let computedPaid = tpl.paidAmount;
    if (tpl.paidAmountPct > 0) {
      computedPaid = Math.round(calculatedTotalRate * (tpl.paidAmountPct / 100));
    }

    const calculatedEndDate = () => {
      if (tpl.is6Hours) return systemDate;
      const d = new Date(systemDate + 'T00:00:00');
      d.setDate(d.getDate() + (tplDays - 1));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    setNewContractForm({
      customerName: tpl.customerName,
      customerPhone: tpl.customerPhone,
      customerDocType: tpl.customerDocType,
      customerDocNote: tpl.customerDocNote,
      selectedCameraIds: tpl.selectedCameraIds.filter(id => cameras.some(c => c.id === id)),
      startDate: systemDate,
      endDate: calculatedEndDate(), 
      is6Hours: tpl.is6Hours,
      returnTime: tpl.returnTime || '18:00',
      depositAmount: tpl.depositAmount,
      paidAmount: computedPaid,
      discountPercent: tpl.discountPercent || 0,
      note: tpl.note
    });

    setCustomAlertMessage(`Đã đặt và áp dụng thành công mẫu đơn hàng: "${tpl.templateName}" vào biểu mẫu nhập hợp đồng!`);
  };

  const handleSaveAsTemplate = () => {
    if (!newContractForm.customerName || newContractForm.selectedCameraIds.length === 0) {
      setCustomAlertMessage('Vui lòng nhập tối thiểu tên khách thuê và chọn ít nhất 1 thiết bị để lưu mẫu đơn thuê!');
      return;
    }

    const nameToUse = newTemplateName.trim() || `Mẫu đơn của ${newContractForm.customerName}`;
    const newTpl: ContractTemplate = {
      id: `tpl-custom-${Date.now()}`,
      templateName: `📝 ${nameToUse}`,
      customerName: newContractForm.customerName,
      customerPhone: newContractForm.customerPhone,
      customerDocType: newContractForm.customerDocType,
      customerDocNote: newContractForm.customerDocNote,
      selectedCameraIds: [...newContractForm.selectedCameraIds],
      is6Hours: newContractForm.is6Hours,
      returnTime: newContractForm.returnTime,
      depositAmount: newContractForm.depositAmount,
      paidAmountPct: 0,
      paidAmount: newContractForm.paidAmount,
      discountPercent: newContractForm.discountPercent,
      note: newContractForm.note,
      durationDays: calculatedDays
    };

    const updated = [...customTemplates, newTpl];
    setCustomTemplates(updated);
    saveStoredData('custom_contract_templates', updated);
    setNewTemplateName('');
    setShowSaveTemplateForm(false);
    setCustomAlertMessage(`Đã khởi tạo và ghi nhớ mẫu đơn thuê mới thành công: "${nameToUse}"!`);
  };

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    saveStoredData('custom_contract_templates', updated);
  };

  // Filters calculation
  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        c.customerName.toLowerCase().includes(query) ||
        c.customerPhone.includes(query) ||
        c.contractCode.toLowerCase().includes(query);

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = c.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [contracts, searchQuery, statusFilter]);

  // Pagination Configuration
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredContracts.length / itemsPerPage) || 1;
  
  const paginatedContracts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContracts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContracts, currentPage, itemsPerPage]);

  // Handle building new contract total rate
  const calculatedDays = useMemo(() => {
    if (newContractForm.is6Hours) return 1; // 6-hour is considered 1 event
    if (!newContractForm.startDate || !newContractForm.endDate) return 0;
    const start = new Date(newContractForm.startDate);
    const end = new Date(newContractForm.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }, [newContractForm.startDate, newContractForm.endDate, newContractForm.is6Hours]);

  const calculatedTotal = useMemo(() => {
    const dailyTotal = newContractForm.selectedCameraIds.reduce((sum, id) => {
      const cam = cameras.find(c => c.id === id);
      return sum + (cam ? getCameraRateForDuration(cam, calculatedDays, newContractForm.is6Hours) : 0);
    }, 0);
    const totalBeforeDiscount = newContractForm.is6Hours ? dailyTotal : dailyTotal * calculatedDays;
    const discountAmount = Math.round(totalBeforeDiscount * ((newContractForm.discountPercent || 0) / 100));
    return Math.max(0, totalBeforeDiscount - discountAmount);
  }, [newContractForm.selectedCameraIds, calculatedDays, newContractForm.is6Hours, newContractForm.discountPercent, cameras]);

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
    return newContractForm.selectedCameraIds.reduce((sum, id) => sum + getCameraRecommendedDeposit(id), 0);
  }, [newContractForm.selectedCameraIds]);

  // Synchronize dynamic reservation deposit value, defaulting to exactly 50% of calculated total price
  useEffect(() => {
    if (calculatedTotal !== prevCalculatedTotal) {
      const prevHalfPrice = Math.round(prevCalculatedTotal * 0.5);
      if (newContractForm.paidAmount === 0 || newContractForm.paidAmount === prevHalfPrice) {
        setNewContractForm(prev => ({
          ...prev,
          paidAmount: Math.round(calculatedTotal * 0.5)
        }));
      }
      setPrevCalculatedTotal(calculatedTotal);
    }
  }, [calculatedTotal, prevCalculatedTotal, newContractForm.paidAmount]);

  const handleCreateContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContractForm.selectedCameraIds.length === 0) {
      setCustomAlertMessage('Vui lòng chọn ít nhất một máy ảnh/ống kính!');
      return;
    }

    if (!newContractForm.is6Hours && newContractForm.endDate < newContractForm.startDate) {
      setCustomAlertMessage('Ngày trả dự kiến không thể nhỏ hơn ngày bàn giao!');
      return;
    }

    const conflict = checkBookingConflict(
      newContractForm.selectedCameraIds,
      newContractForm.startDate,
      newContractForm.is6Hours ? newContractForm.startDate : newContractForm.endDate,
      newContractForm.is6Hours,
      contracts
    );
    if (conflict.hasConflict) {
      setCustomAlertMessage(conflict.message);
      return;
    }

    const items = newContractForm.selectedCameraIds.map(id => {
      const cam = cameras.find(c => c.id === id);
      return {
        cameraId: id,
        cameraName: cam?.name || 'Thiết bị',
        dailyRate: cam ? getCameraRateForDuration(cam, calculatedDays, newContractForm.is6Hours) : 0,
        quantity: 1
      };
    });

    const newCode = `HD-2026-${String(contracts.length + 1).padStart(3, '0')}`;

    const contract: RentalContract = {
      id: `con-${Date.now()}`,
      contractCode: newCode,
      customerId: `cust-${Date.now()}`,
      customerName: newContractForm.customerName,
      customerPhone: newContractForm.customerPhone,
      customerDocType: newContractForm.customerDocType,
      customerDocNote: newContractForm.customerDocNote,
      items,
      startDate: newContractForm.startDate,
      endDate: newContractForm.is6Hours ? newContractForm.startDate : newContractForm.endDate,
      is6Hours: newContractForm.is6Hours,
      returnTime: newContractForm.is6Hours ? newContractForm.returnTime : undefined,
      totalPrice: calculatedTotal,
      discountPercent: newContractForm.discountPercent,
      paidAmount: newContractForm.paidAmount,
      depositAmount: newContractForm.depositAmount,
      status: 'Pending',
      note: newContractForm.note,
      createdAt: new Date().toISOString()
    };

    onAddContract(contract);
    setShowAddModal(false);
    // Reset form
    setNewContractForm({
      customerName: '',
      customerPhone: '',
      customerDocType: 'CCCD',
      customerDocNote: '',
      selectedCameraIds: [],
      startDate: systemDate,
      endDate: systemDate,
      is6Hours: false,
      returnTime: '18:00',
      depositAmount: 0,
      paidAmount: 0,
      discountPercent: 0,
      note: ''
    });
  };

  const getStatusBadgeClass = (status: ContractStatus) => {
    switch (status) {
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Overdue':
        return 'bg-rose-100 text-rose-800 border-rose-200 animate-pulse';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: ContractStatus) => {
    switch (status) {
      case 'Pending': return 'Chờ bàn giao';
      case 'Active': return 'Đang thuê';
      case 'Completed': return 'Đã hoàn thành';
      case 'Overdue': return 'Quá hạn trả';
      case 'Cancelled': return 'Đã hủy đơn';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="bg-white border border-gray-150 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5 sm:space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base sm:text-xl font-black text-gray-850 flex items-center gap-2 select-none">
              <FileText className="text-orange-600 w-4.5 h-4.5 sm:w-5 bg-orange-50 p-1 rounded-md sm:bg-transparent sm:p-0" /> Quản Lý Hợp Đồng Thuê Máy
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 leading-normal">
              Kiểm tra tính trạng hợp đồng, lưu trữ thủ tục hồ sơ thế chấp và thu tiền cọc khách hàng.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              className="bg-slate-50 border border-gray-200 text-gray-700 font-extrabold sm:font-semibold px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm flex items-center justify-center gap-1.5 hover:bg-slate-100 hover:text-gray-900 transition-all cursor-pointer shadow-4xs"
              title="Xuất định dạng CSV danh sách đã lọc"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" /> Xuất bản CSV
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-600 text-white font-extrabold sm:font-medium px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm flex items-center justify-center gap-1.5 hover:bg-orange-700 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" /> Lập hợp đồng
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm theo mã HĐ, tên khách hàng, SĐT..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8.5 pr-4 py-1.5 sm:py-2.5 text-xs sm:text-sm w-full border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder-gray-400/80"
            />
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <Filter className="h-4 w-4 text-gray-500 shrink-0" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm w-full border border-gray-200 rounded-xl p-2 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Pending">Chờ giao máy (Pending)</option>
              <option value="Active">Đang cho thuê (Active)</option>
              <option value="Completed">Đã trả máy (Completed)</option>
              <option value="Overdue">Quá hạn trả (Overdue)</option>
              <option value="Cancelled">Đã hủy bỏ (Cancelled)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contracts Table/List */}
      <div className="bg-white border border-gray-150/70 rounded-2xl shadow-sm overflow-hidden">
        {/* Mobile View Card List */}
        <div className="block lg:hidden divide-y divide-gray-100 bg-gray-50/50">
          {paginatedContracts.length > 0 ? (
            paginatedContracts.map(c => {
              const duration = Math.max(1, Math.ceil((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
              return (
                <div key={c.id} className="p-4 sm:p-5 space-y-3 hover:bg-slate-50/30 transition bg-white first:rounded-t-2xl last:rounded-b-2xl">
                  {/* Top section: Code & Status */}
                  <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <span className="font-mono font-bold text-xs text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200">
                      {c.contractCode}
                    </span>
                    <span className={`inline-block border text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full shadow-3xs ${getStatusBadgeClass(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </span>
                  </div>

                  {/* Customer Information with Avatar */}
                  <div className="flex items-start gap-3 pt-0.5">
                    <div className="w-9 h-9 rounded-full bg-orange-100/80 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0 border border-orange-200/45 uppercase select-none">
                      {c.customerName.trim().split(' ').pop()?.slice(0, 2) || 'KH'}
                    </div>
                    <div className="space-y-1 flex-grow">
                      <div className="text-sm font-extrabold text-gray-900">
                        {c.customerName}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5Check">
                        <a href={`tel:${c.customerPhone}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-100/60 rounded-lg text-[11px] text-orange-700 font-mono font-bold transition-all shrink-0">
                          <Phone className="w-3 h-3 text-orange-500 fill-orange-500/10" /> {c.customerPhone}
                        </a>
                        <span className="text-[10px] text-gray-500 bg-gray-50 border border-gray-200/50 px-1.5 py-0.5 rounded font-bold">
                          {renderDocTypeLabel(c.customerDocType)}: {c.customerDocNote || 'Chưa có thông tin'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Equipment list */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none">Thiết bị thuê:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.items.map((i, idx) => (
                        <span key={idx} className="bg-orange-50/70 text-orange-700 border border-orange-100 text-[10px] sm:text-xs px-2 py-0.5 rounded-lg font-bold inline-flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-orange-400" /> {i.cameraName}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Timings */}
                  <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-150/60 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 font-bold text-gray-700">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 font-semibold" />
                      <span>{c.startDate}{c.is6Hours ? '' : ` đến ${c.endDate}`}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-500 border-t border-gray-100 pt-1.5 font-medium">
                      <span>Thời hạn thuê:</span>
                      <span className={c.is6Hours ? 'font-extrabold text-amber-700 bg-amber-50 border border-amber-250 text-[10px] px-2 py-0.5 rounded shadow-3xs inline-block' : 'font-bold text-gray-650'}>{c.is6Hours ? `⚡ 6 Tiếng (Trả: ${c.returnTime || '18:00'})` : `${duration} ngày`}</span>
                    </div>
                  </div>

                  {/* Pricing details */}
                  <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium">Tổng tiền thuê:</span>
                      <span className="font-mono font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        {c.discountPercent ? (
                          <span className="text-[9px] font-sans font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 rounded-sm">
                            -{c.discountPercent}%
                          </span>
                        ) : null}
                        {c.totalPrice.toLocaleString()}đ
                      </span>
                    </div>
                    {c.status === 'Pending' ? (
                      <>
                        <div className="flex items-center justify-between text-xs text-amber-850 bg-amber-50/40 px-1 rounded-sm">
                          <span className="font-medium">Số cọc giữ máy cần đóng:</span>
                          <span className="font-mono font-bold">
                            {c.paidAmount.toLocaleString()}đ
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-gray-100">
                          <span className="text-gray-500 font-medium">Thực tế đã thanh toán:</span>
                          <span className="font-mono font-bold text-gray-400">
                            0đ
                          </span>
                        </div>
                        {/* Remaining debt & deposit details */}
                        <div className="pt-1 select-none flex items-center justify-between gap-2">
                          <div className="text-[10px] text-gray-400 font-medium">
                            Cọc thế chấp: <strong className="text-gray-750">{c.depositAmount > 0 ? `${c.depositAmount.toLocaleString()}đ` : 'Không có'}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200/70 px-2 py-0.5 rounded-md font-bold shadow-3xs">
                              Chờ cọc {c.paidAmount.toLocaleString()}đ
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs pb-1 border-b border-gray-100">
                          <span className="text-gray-500 font-medium">Đã thanh toán:</span>
                          <span className="font-mono font-bold text-emerald-600">
                            {c.paidAmount.toLocaleString()}đ
                          </span>
                        </div>
                        {/* Remaining debt & deposit details */}
                        <div className="pt-1 select-none flex items-center justify-between gap-2">
                          <div className="text-[10px] text-gray-400 font-medium">
                            Cọc thế chấp: <strong className="text-gray-750">{c.depositAmount > 0 ? `${c.depositAmount.toLocaleString()}đ` : 'Không có'}</strong>
                          </div>
                          <div>
                            {c.totalPrice - c.paidAmount > 0 ? (
                              <span className="text-[10px] bg-red-50 text-red-700 border border-red-200/70 px-2 py-0.5 rounded-md font-bold shadow-3xs">
                                Còn nợ: {(c.totalPrice - c.paidAmount).toLocaleString()}đ
                              </span>
                            ) : (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200/70 px-2 py-0.5 rounded-md font-bold shadow-3xs">
                                ✓ Đã thanh toán đủ
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Ghi chú nhanh (Quick Notes for mobile) */}
                  <div className="pt-1">
                    {editingNoteId === c.id ? (
                      <div className="flex items-center gap-1.5 bg-amber-50/60 p-1.5 rounded-lg border border-amber-200">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-orange-500 font-sans font-medium text-gray-800"
                          placeholder="Ghi chú nhanh..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveNote(c.id);
                            if (e.key === 'Escape') setEditingNoteId(null);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(c.id)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          title="Lưu"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Hủy"
                        >
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1 group/note">
                        {c.note ? (
                          <div className="text-xs text-amber-800 bg-amber-50/50 border border-amber-100/80 px-3 py-2 rounded-xl flex items-start justify-between gap-1.5 w-full font-medium leading-relaxed relative pr-8">
                            <span className="break-words">{c.note}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingNoteId(c.id);
                                setNoteDraft(c.note || '');
                              }}
                              className="absolute right-2 top-2 p-1 text-gray-400 hover:text-orange-600 hover:bg-white rounded-md border border-gray-200 shadow-3xs transition-all cursor-pointer"
                              title="Chỉnh sửa ghi chú"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingNoteId(c.id);
                              setNoteDraft('');
                            }}
                            className="text-xs text-gray-500 hover:text-orange-600 font-bold flex items-center gap-1 hover:underline transition bg-gray-50/40 hover:bg-orange-50/30 border border-gray-250 border-dashed py-1.5 px-3 rounded-lg cursor-pointer w-full justify-center"
                          >
                            <Plus className="w-3.5 h-3.5 text-gray-400" /> Thêm ghi chú nhanh
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedContract(c)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 text-orange-600 hover:text-white hover:bg-orange-600 border border-orange-200 hover:border-orange-600 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs active:scale-[0.98] h-10"
                    >
                      Xem chi tiết & Xử lý
                    </button>
                    {onDeleteContract && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirmId(c.id);
                        }}
                        className="text-red-500 hover:text-white hover:bg-red-500 border border-red-100 hover:border-red-550 w-10 h-10 rounded-xl transition-all cursor-pointer shrink-0 flex items-center justify-center"
                        title="Xóa Hợp Đồng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-405 font-medium italic text-xs bg-white rounded-2xl">
              Không tìm thấy hợp đồng nào đáp ứng điều kiện.
            </div>
          )}
        </div>

        {/* Desktop View Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold text-xs select-none uppercase tracking-wider">
                <th className="px-6 py-4">Mã Hợp Đồng</th>
                <th className="px-6 py-4">Khách Hàng</th>
                <th className="px-6 py-4">Thiết Bị Thuê</th>
                <th className="px-6 py-4">Thời Gian Thuê</th>
                <th className="px-6 py-4 text-right">Tổng Chi Phí</th>
                <th className="px-6 py-4 text-center">Trạng Thái</th>
                <th className="px-6 py-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {paginatedContracts.length > 0 ? (
                paginatedContracts.map(c => {
                  const duration = Math.max(1, Math.ceil((new Date(c.endDate).getTime() - new Date(c.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-gray-900">{c.contractCode}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-850">{c.customerName}</div>
                        <div className="text-gray-400 font-mono text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" /> {c.customerPhone}
                        </div>
                        
                        {/* Inline Quick Notes (Ghi chú nhanh) */}
                        <div className="mt-2 pt-1.5 border-t border-gray-100/80">
                          {editingNoteId === c.id ? (
                            <div className="flex items-center gap-1 max-w-[210px] bg-amber-50/60 p-1 rounded-lg border border-amber-200">
                              <input
                                type="text"
                                value={noteDraft}
                                onChange={(e) => setNoteDraft(e.target.value)}
                                className="w-full text-xs px-2 py-1 bg-white border border-gray-300 rounded-md focus:outline-hidden focus:border-orange-500 font-sans font-medium text-gray-800"
                                placeholder="Ghi chú nhanh..."
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveNote(c.id);
                                  if (e.key === 'Escape') setEditingNoteId(null);
                                }}
                              />
                              <button
                                onClick={() => handleSaveNote(c.id)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                title="Lưu"
                              >
                                <Check className="w-3 h-3 stroke-[2.5]" />
                              </button>
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                title="Hủy"
                              >
                                <X className="w-3 h-3 stroke-[2.5]" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-1 group/note max-w-[215px]">
                              {c.note ? (
                                <div className="text-xs text-amber-800 bg-amber-50/70 border border-amber-100/90 px-2 py-1 rounded-lg flex items-start justify-between gap-1 w-full font-medium leading-normal relative pr-6">
                                  <span className="break-all" title={c.note}>{c.note}</span>
                                  <button
                                    onClick={() => {
                                      setEditingNoteId(c.id);
                                      setNoteDraft(c.note || '');
                                    }}
                                    className="absolute right-1 top-1 p-0.5 text-gray-400 hover:text-orange-600 hover:bg-white rounded border border-gray-200 shadow-3xs transition-all cursor-pointer opacity-0 group-hover/note:opacity-100"
                                    title="Chỉnh sửa ghi chú"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingNoteId(c.id);
                                    setNoteDraft('');
                                  }}
                                  className="text-[10px] text-gray-400 hover:text-orange-600 font-bold flex items-center gap-1 hover:underline transition-colors py-0.5 px-2 rounded-md bg-gray-50/40 hover:bg-orange-50/30 border border-gray-200 border-dashed cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5 text-gray-400" /> Thêm ghi chú nhanh
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-[220px] truncate" title={c.items.map(i => i.cameraName).join(', ')}>
                          {c.items.map((i, idx) => (
                            <span key={idx} className="inline-block bg-orange-50 text-orange-700 border border-orange-100 text-xs px-2 py-0.5 rounded-md font-medium mr-1 mb-1">
                              {i.cameraName}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-700 font-medium">{c.startDate}{c.is6Hours ? '' : ` đến ${c.endDate}`}</div>
                        <div className="text-gray-400 text-xs">Thời hạn: <span className={c.is6Hours ? 'font-extrabold text-amber-700 bg-amber-50 border border-amber-200 text-[11px] px-1.5 py-0.5 rounded shadow-3xs inline-block' : 'font-bold text-gray-650'}>{c.is6Hours ? `⚡ 6 Tiếng (Trả: ${c.returnTime || '18:00'})` : `${duration} ngày`}</span></div>
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                        <div className="flex items-center justify-end gap-1.5">
                          {c.discountPercent ? (
                            <span className="text-[10px] font-sans font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                              -{c.discountPercent}%
                            </span>
                          ) : null}
                          <span>{c.totalPrice.toLocaleString()}đ</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-sans font-normal">
                          {c.status === 'Pending' ? (
                            <span className="text-amber-700 font-bold inline-block bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]" title="Khoản cọc giữ máy cần chuyển khoản để hoàn thiện duyệt lịch">
                              Sẽ cọc: {c.paidAmount.toLocaleString()}đ (Chưa đóng)
                            </span>
                          ) : (
                            <>
                              Đã thanh toán: <span className="text-emerald-600 font-semibold">{c.paidAmount.toLocaleString()}đ</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block border text-[11px] font-bold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(c.status)}`}>
                          {getStatusLabel(c.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedContract(c)}
                            className="text-orange-600 hover:text-white hover:bg-orange-600 border border-orange-200 hover:border-orange-600 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                          >
                            Xem chi tiết / Xử lý
                          </button>
                          {onDeleteContract && (
                            <button
                              onClick={() => {
                                setDeleteConfirmId(c.id);
                              }}
                              className="text-red-500 hover:text-white hover:bg-red-500 border border-red-100 hover:border-red-550 p-1.5 rounded-lg transition-all cursor-pointer"
                              title="Xóa Hợp Đồng"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400 font-medium italic">
                    Không tìm thấy hợp đồng nào đáp ứng điều kiện.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Contract manager pagination controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/60 select-none">
            <span className="text-xs text-gray-500 font-medium">
              Hiển thị từ <span className="font-bold text-gray-800">{(currentPage - 1) * itemsPerPage + 1}</span> tới <span className="font-bold text-gray-800">{Math.min(currentPage * itemsPerPage, filteredContracts.length)}</span> trong tổng số <span className="font-bold text-gray-800">{filteredContracts.length}</span> hợp đồng
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

      {/* Contract Detail & Status Transition Modal */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden self-center animate-scale-up border border-gray-100 flex flex-col max-h-[92vh] sm:max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-orange-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <h3 className="font-extrabold text-sm sm:text-lg flex items-center gap-1.5 truncate">
                  <FileText className="w-4.5 h-4.5 sm:w-5 sm:h-5 shrink-0" /> <span className="truncate">Hợp đồng {selectedContract.contractCode}</span>
                </h3>
                <p className="text-[10px] sm:text-xs text-white/80 mt-0.5 truncate">Lập lúc: {new Date(selectedContract.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                className="text-white hover:text-gray-200 text-xl sm:text-2xl font-bold p-1.5 cursor-pointer leading-none shrink-0"
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6 flex-1 overflow-y-auto">
              {/* Overdue Alert banner */}
              {selectedContract.status === 'Overdue' && (
                <div className="bg-rose-50 border border-rose-200 p-3 sm:p-3.5 rounded-xl flex items-start gap-2 text-rose-800">
                  <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm">Hợp đồng này đang bị QUÁ HẠN TRẢ máy!</h5>
                    <p className="text-[11px] sm:text-xs mt-1">
                      Hãy gọi máy liên hệ ngay cho khách hàng: <span className="font-bold font-mono text-gray-950 underline">{selectedContract.customerPhone}</span>. Lập biên bản phụ thu nếu máy trả muộn so với cam kết ban đầu.
                    </p>
                  </div>
                </div>
              )}

              <div id="contract-receipt-capture" className="bg-white p-3.5 sm:p-5 rounded-2xl border border-gray-150/60 shadow-3xs space-y-4 sm:space-y-6">
                {/* Visual Invoice Title for image export */}
                <div className="text-center border-b border-gray-150 pb-3 sm:pb-4">
                  <span className="text-[9px] sm:text-[10px] bg-orange-100 text-orange-850 font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">Hóa đơn bàn giao / Thanh toán</span>
                  <p className="text-[11px] sm:text-xs text-gray-500 font-mono mt-1.5">Mã HĐ: <span className="font-bold text-gray-800">{selectedContract.contractCode}</span> | Ngày lập: {new Date(selectedContract.createdAt).toLocaleString('vi-VN')}</p>
                </div>

                {/* Grid 1: Customer details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-gray-50/50 p-3 sm:p-4 border border-gray-100 rounded-xl">
                  <div className="space-y-1">
                    <h4 className="text-[10px] sm:text-xs uppercase font-bold text-gray-400 mb-1">Thông tin khách thuê</h4>
                    <p className="font-extrabold text-gray-900 text-sm sm:text-base">{selectedContract.customerName}</p>
                    <p className="text-xs text-gray-500 font-mono">SĐT: {selectedContract.customerPhone}</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                      Thế chấp: <span className="bg-white px-2 py-0.5 rounded text-gray-800 border border-gray-200 font-bold text-[10px] sm:text-xs shadow-3xs">{renderDocTypeLabel(selectedContract.customerDocType)}</span>
                    </p>
                    {selectedContract.customerDocNote && (
                      <p className="text-xs text-amber-900 bg-amber-50/70 border border-amber-100 p-2 rounded mt-2 font-mono leading-relaxed max-w-full break-words">
                        {selectedContract.customerDocNote}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-[10px] sm:text-xs uppercase font-bold text-gray-400 mb-1">Thông tin thời hạn</h4>
                    <div className="space-y-1.5 text-xs sm:text-sm text-gray-750">
                      <p className="flex justify-between items-center gap-2">
                        <span className="text-gray-500">Bắt đầu:</span>
                        <strong className="text-gray-800 text-right font-medium">{selectedContract.startDate}</strong>
                      </p>
                      <p className="flex justify-between items-start gap-2">
                        <span className="text-gray-500 shrink-0">Trả máy dự kiến:</span>
                        <strong className="text-gray-800 text-right font-medium">{selectedContract.is6Hours ? 'Gói 6 tiếng trong ngày' : selectedContract.endDate}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Rental Items detail */}
                <div>
                  <h4 className="text-[10px] sm:text-xs uppercase font-bold text-gray-400 mb-1.5">Danh sách thiết bị thuê</h4>
                  <div className="border border-gray-155 rounded-xl overflow-hidden divide-y divide-gray-100 shadow-4xs font-sans">
                    {selectedContract.items.map((i, idx) => (
                      <div key={idx} className="p-2.5 sm:p-3 bg-white flex justify-between items-center text-xs sm:text-sm gap-2">
                        <div className="font-semibold text-gray-800 truncate flex-1 min-w-0" title={i.cameraName}>{i.cameraName}</div>
                        <div className="text-right font-bold text-gray-700 shrink-0 font-sans">
                          {Math.round(i.dailyRate).toLocaleString()}đ <span className="text-[10px] text-gray-450 font-normal">{selectedContract.is6Hours ? '/6h' : '/ngày'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Summary Block */}
                <div className="bg-orange-50/45 border border-orange-100 p-3 sm:p-4 rounded-xl space-y-2">
                  {selectedContract.discountPercent ? (
                    <div className="flex justify-between items-center text-xs sm:text-sm">
                      <span className="text-gray-500 font-medium leading-tight">Giảm giá tự động:</span>
                      <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded text-xs shrink-0 whitespace-nowrap">-{selectedContract.discountPercent}%</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-start sm:items-center text-xs sm:text-sm gap-2">
                    <span className="text-gray-600 font-medium leading-tight">Tổng tiền thuê dự kiến:</span>
                    <span className="font-bold text-gray-900 text-sm sm:text-base font-sans shrink-0 whitespace-nowrap">{selectedContract.totalPrice.toLocaleString()}đ</span>
                  </div>
                  <div className="flex justify-between items-start sm:items-center text-xs sm:text-sm border-t border-orange-100/40 pt-2 text-gray-650 gap-2">
                    <span className="leading-tight">Trị giá cọc thế chấp (VNĐ cọc):</span>
                    <span className="font-semibold text-gray-800 font-sans shrink-0 whitespace-nowrap">{selectedContract.depositAmount.toLocaleString()}đ</span>
                  </div>
                  
                  {selectedContract.status === 'Pending' ? (
                    <>
                      <div className="flex justify-between items-start sm:items-center text-xs sm:text-sm border-t border-orange-100/40 pt-2 text-gray-650 gap-2">
                        <span className="leading-tight font-medium text-amber-850 bg-amber-50 px-1 rounded-sm">Số tiền khách cần cọc để giữ máy ({selectedContract.totalPrice > 0 ? Math.round((selectedContract.paidAmount / selectedContract.totalPrice) * 100) : 0}%):</span>
                        <span className="font-bold text-amber-700 font-sans shrink-0 whitespace-nowrap">{selectedContract.paidAmount.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-start sm:items-center text-xs sm:text-sm border-t border-orange-100/40 pt-2 text-gray-650 gap-2">
                        <span className="leading-tight">Thực tế khách đã thanh toán:</span>
                        <span className="font-semibold text-gray-400 font-sans shrink-0 whitespace-nowrap">0đ <span className="text-[10px]">(Chưa cọc)</span></span>
                      </div>
                      <div className="flex justify-between items-start sm:items-center text-xs sm:text-sm border-t border-orange-200 pt-2 font-bold text-gray-900 gap-2">
                        <span className="leading-tight">Còn lại cần thanh toán khi nhận máy:</span>
                        <span className="text-rose-600 text-sm sm:text-base font-extrabold font-sans shrink-0 whitespace-nowrap">{(selectedContract.totalPrice - selectedContract.paidAmount).toLocaleString()}đ</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-start sm:items-center text-xs sm:text-sm border-t border-orange-100/40 pt-2 text-gray-650 gap-2">
                        <span className="leading-tight">Khách cọc đặt giữ máy trước ({selectedContract.totalPrice > 0 ? Math.round((selectedContract.paidAmount / selectedContract.totalPrice) * 100) : 0}%):</span>
                        <span className="font-bold text-emerald-700 font-sans shrink-0 whitespace-nowrap">{selectedContract.paidAmount.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-start sm:items-center text-xs sm:text-sm border-t border-orange-200 pt-2 font-bold text-gray-900 gap-2">
                        <span className="leading-tight">Dư nợ còn lại đã thu / cần thu:</span>
                        <span className="text-rose-600 text-sm sm:text-base font-extrabold font-sans shrink-0 whitespace-nowrap">{(selectedContract.totalPrice - selectedContract.paidAmount).toLocaleString()}đ</span>
                      </div>
                    </>
                  )}
                </div>

                </div>

              {selectedContract.note && (
                <div className="text-xs sm:text-sm">
                  <span className="font-bold text-gray-700">Yêu cầu đặc biệt bổ sung:</span>
                  <p className="bg-amber-50/40 p-2.5 rounded border border-amber-100 text-xs text-gray-600 mt-1 italic font-sans">{selectedContract.note}</p>
                </div>
              )}

              {/* Status Update Quick Controls */}
              <div className="border-t border-gray-150 pt-4 space-y-3 shrink-0">
                <h4 className="text-[10px] sm:text-xs uppercase font-extrabold text-gray-400 tracking-wider">VẬN HÀNH TRẠNG THÁI HỢP ĐỒNG</h4>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  {selectedContract.status === 'Pending' && (
                    <>
                      <button
                        onClick={() => {
                          onUpdateContractStatus(selectedContract.id, 'Active', 'Bàn giao thiết bị và chụp ảnh lưu hồ sơ cọc.');
                          setSelectedContract(null);
                        }}
                        className="bg-blue-600 text-white font-bold px-4 py-2.5 sm:py-2 rounded-xl text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                      >
                        <Check className="w-4 h-4 text-white" /> Bàn giao máy (Bắt đầu thuê)
                      </button>
                      <button
                        onClick={() => {
                          onUpdateContractStatus(selectedContract.id, 'Cancelled', 'Khách hàng hủy đặt lịch do thay đổi kế hoạch.');
                          setSelectedContract(null);
                        }}
                        className="bg-gray-100 border border-gray-200 text-gray-750 font-bold px-4 py-2.5 sm:py-2 rounded-xl text-xs hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                      >
                        <X className="w-4 h-4 text-gray-450" /> Hủy đặt lịch (Cancel)
                      </button>
                    </>
                  )}

                  {selectedContract.status === 'Active' && (
                    <>
                      <button
                        onClick={() => {
                          onUpdateContractStatus(selectedContract.id, 'Completed', 'Mọi thiết bị được thu hồi đầy đủ và thanh toán tất toán toàn bộ.', selectedContract.totalPrice);
                          setSelectedContract(null);
                        }}
                        className="bg-emerald-600 text-white font-bold px-4 py-2.5 sm:py-2 rounded-xl text-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                      >
                        <Check className="w-4 h-4 text-white" /> Nhận máy & Tất toán xong
                      </button>
                      <button
                        onClick={() => {
                          onUpdateContractStatus(selectedContract.id, 'Overdue', 'Hợp đồng trễ hạn chưa trả, liên hệ chưa phản hồi.');
                          setSelectedContract(null);
                        }}
                        className="bg-rose-100 text-rose-700 font-bold px-4 py-2.5 sm:py-2 rounded-xl text-xs hover:bg-rose-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-500" /> Báo quá hạn (Overdue)
                      </button>
                    </>
                  )}

                  {selectedContract.status === 'Overdue' && (
                    <button
                      onClick={() => {
                        onUpdateContractStatus(selectedContract.id, 'Completed', 'Đã thu hồi thành công sau thời gian trễ hạn. Thu thêm phụ thu.', selectedContract.totalPrice);
                        setSelectedContract(null);
                      }}
                      className="bg-emerald-600 text-white font-bold px-4 py-2.5 sm:py-2 rounded-xl text-xs hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                    >
                      <Check className="w-4 h-4 text-white" /> Tất toán nhận lại máy (Đã thu hồi)
                    </button>
                  )}

                  {selectedContract.status === 'Completed' && (
                    <p className="text-gray-400 text-xs italic flex items-center gap-2 py-1">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" /> Hợp đồng đã hoàn thành chu trình thanh toán & thu hồi thiết bị.
                    </p>
                  )}

                  {selectedContract.status === 'Cancelled' && (
                    <p className="text-gray-400 text-xs italic flex items-center gap-2 py-1">
                      <X className="w-4 h-4 text-gray-450 shrink-0" /> Hợp đồng này đã bị hủy bỏ.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Print Simulate buttons */}
            <div className="bg-gray-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center border-t border-gray-150 shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  className="bg-white hover:bg-gray-100 border border-gray-250 text-gray-750 font-bold text-xs px-3 py-2.5 sm:py-2 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-4xs min-h-[40px]"
                  onClick={() => setCustomAlertMessage(`Đang chuẩn bị in hợp đồng ${selectedContract.contractCode}... Vui lòng kết nối máy in để in bản cứng kèm chữ ký.`)}
                >
                  In Hợp Đồng (Bản cứng)
                </button>

                <button
                  type="button"
                  disabled={isExporting}
                  onClick={() => handleExportImage('contract-receipt-capture', `${selectedContract.contractCode}_thong_tin_thue.png`)}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold text-xs px-3 py-2.5 sm:py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-4xs border border-transparent min-h-[40px]"
                >
                  <ImageIcon className="w-4 h-4" /> {isExporting ? 'Đang tạo...' : 'Xuất ảnh Hợp đồng'}
                </button>

                {onDeleteContract && (
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteConfirmId(selectedContract.id);
                    }}
                    className="text-red-600 hover:text-red-850 hover:bg-red-500/10 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-transparent hover:border-red-100 px-3 py-2 sm:py-1.5 rounded-xl transition-all min-h-[40px]"
                  >
                    Xóa Hợp Đồng
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedContract(null)}
                className="bg-gray-800 text-white hover:bg-gray-900 border border-transparent font-bold text-xs px-5 py-2.5 sm:py-2 rounded-xl transition-colors cursor-pointer text-center min-h-[40px]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Contract Form Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden self-center border border-gray-100">
            <div className="bg-orange-600 px-6 py-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="w-5 h-5" /> Lập Hợp Đồng Thuê Máy Mới
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white hover:text-gray-200 font-bold text-xl cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Họ tên khách hàng *</label>
                  <input
                    type="text"
                    required
                    value={newContractForm.customerName}
                    onChange={e => setNewContractForm({ ...newContractForm, customerName: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={newContractForm.customerPhone}
                    onChange={e => setNewContractForm({ ...newContractForm, customerPhone: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="0912xxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Loại cọc thế chấp</label>
                  <select
                    value={newContractForm.customerDocType}
                    onChange={e => {
                      const val = e.target.value as any;
                      const nextData = { ...newContractForm, customerDocType: val };
                      if (val === 'CCCD_And_1M') {
                        nextData.depositAmount = 1000000;
                        if (!newContractForm.customerDocNote || newContractForm.customerDocNote === 'Giữ CCCD gốc') {
                          nextData.customerDocNote = 'Giữ CCCD gốc + 1.000.000đ';
                        }
                      }
                      setNewContractForm(nextData);
                    }}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none bg-white font-medium text-gray-700"
                  >
                    <option value="CCCD">Giữ căn cước (CCCD)</option>
                    <option value="CCCD_And_1M">Giữ căn cước (CCCD) và 1 triệu đồng</option>
                    <option value="GPLX">Giữ bằng lái (GPLX)</option>
                    <option value="Passport">Giữ hộ chiếu (Passport)</option>
                    <option value="CashDeposit">Đặt cọc tiền mặt</option>
                    <option value="Other">Thế chấp xe máy / Tài sản khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả cọc thế chấp</label>
                  <input
                    type="text"
                    value={newContractForm.customerDocNote}
                    onChange={e => setNewContractForm({ ...newContractForm, customerDocNote: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="VD: CCCD chính chủ + xe máy Wave đỏ"
                  />
                </div>
              </div>

              {/* Equipment Multi Check selectors */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Thiết bị thuê trong đơn *</label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-[140px] overflow-y-auto space-y-2 bg-gray-50/50">
                  {cameras.map(cam => {
                    const isSelected = newContractForm.selectedCameraIds.includes(cam.id);
                    return (
                      <label key={cam.id} className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium hover:text-orange-600 transition-colors">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setNewContractForm({
                                ...newContractForm,
                                selectedCameraIds: newContractForm.selectedCameraIds.filter(id => id !== cam.id)
                              });
                            } else {
                              setNewContractForm({
                                ...newContractForm,
                                selectedCameraIds: [...newContractForm.selectedCameraIds, cam.id]
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
                            {newContractForm.is6Hours 
                              ? `${(cam.price6Hours ?? Math.round((cam.price1Day ?? cam.dailyRate) * 0.6)).toLocaleString()}đ /6h`
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
                      setNewContractForm(prev => ({ ...prev, is6Hours: false }));
                    }}
                    className={`p-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer border text-center flex flex-col items-center justify-center gap-0.5 ${
                      !newContractForm.is6Hours
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                        : 'bg-white hover:bg-gray-55 text-gray-650 border-gray-200'
                    }`}
                  >
                    <span>📅 Thuê theo ngày</span>
                    <span className={`text-[10px] font-normal ${!newContractForm.is6Hours ? 'text-orange-100' : 'text-gray-400'}`}>
                      Tính theo mốc ngày (ưu đãi lũy tiến)
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewContractForm(prev => ({ ...prev, is6Hours: true, endDate: prev.startDate }));
                    }}
                    className={`p-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer border text-center flex flex-col items-center justify-center gap-0.5 ${
                      newContractForm.is6Hours
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white hover:bg-amber-50/30 text-amber-800 border-amber-200/50'
                    }`}
                  >
                    <span>⚡ Thuê nhanh 6 tiếng</span>
                    <span className={`text-[10px] font-normal ${newContractForm.is6Hours ? 'text-amber-100' : 'text-amber-650'}`}>
                      Mức phí ngắn hạn trong ngày
                    </span>
                  </button>
                </div>
              </div>

              {/* Rent dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ngày bàn giao *</label>
                  <input
                    type="date"
                    required
                    value={newContractForm.startDate}
                    onChange={e => {
                      const d = e.target.value;
                      setNewContractForm(prev => ({
                        ...prev,
                        startDate: d,
                        endDate: prev.is6Hours ? d : prev.endDate
                      }));
                    }}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    {newContractForm.is6Hours ? 'Giờ trả dự kiến (24h) *' : 'Ngày trả dự kiến *'}
                  </label>
                  {newContractForm.is6Hours ? (
                    <div className="flex gap-2">
                      <div className="flex-1 border border-amber-200 bg-amber-50/20 text-amber-800 rounded-lg p-2 text-[10px] font-bold flex items-center justify-center h-[38px] cursor-not-allowed border-dashed">
                        ⏱️ Trả trong ngày
                      </div>
                      <input
                        type="time"
                        required
                        value={newContractForm.returnTime}
                        onChange={e => setNewContractForm({ ...newContractForm, returnTime: e.target.value })}
                        className="w-[124px] border border-amber-300 bg-amber-55/40 rounded-lg px-2 py-1.5 text-sm font-bold text-amber-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        title="Vui lòng nhập giờ trả máy hẹn trước"
                      />
                    </div>
                  ) : (
                    <input
                      type="date"
                      required
                      min={newContractForm.startDate}
                      value={newContractForm.endDate}
                      onChange={e => setNewContractForm({ ...newContractForm, endDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Money section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Giá trị cọc quy đổi (VND)</label>
                  <input
                    type="number"
                    value={newContractForm.depositAmount || ''}
                    onChange={e => setNewContractForm({ ...newContractForm, depositAmount: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                    placeholder="VD: 5000000"
                  />
                  {calculatedRecommendedDeposit > 0 && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => setNewContractForm({ ...newContractForm, depositAmount: calculatedRecommendedDeposit })}
                        className="text-[10px] text-amber-700 hover:text-amber-800 bg-amber-50/55 hover:bg-amber-100 border border-amber-200/50 px-1.5 py-0.5 rounded-md font-bold transition-all cursor-pointer inline-block text-left"
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
                    value={newContractForm.paidAmount || ''}
                    onChange={e => setNewContractForm({ ...newContractForm, paidAmount: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                    placeholder="VD: 500000"
                  />
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => setNewContractForm({ ...newContractForm, paidAmount: Math.round(calculatedTotal * 0.5) })}
                      className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all cursor-pointer text-center ${
                        newContractForm.paidAmount === Math.round(calculatedTotal * 0.5)
                          ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs font-extrabold'
                          : 'bg-amber-50/50 hover:bg-amber-100/70 text-amber-800 border-amber-200'
                      }`}
                      title="Thu trước 50% tiền thuê làm cọc giữ chỗ"
                    >
                      Cọc 50% ({(Math.round(calculatedTotal * 0.5)).toLocaleString()}đ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewContractForm({ ...newContractForm, paidAmount: 0 })}
                      className={`flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg border transition-all cursor-pointer text-center ${
                        newContractForm.paidAmount === 0
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
 
              {/* Special Discount & Note Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tự giảm giá cho khách (%)</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={newContractForm.discountPercent || ''}
                      onChange={e => {
                        const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                        setNewContractForm({ ...newContractForm, discountPercent: val });
                      }}
                      className="w-16 border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none font-mono"
                      placeholder="0"
                    />
                    <div className="flex-1 flex gap-1 overflow-x-auto py-0.5 no-scrollbar">
                      {[0, 5, 10, 15, 20, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setNewContractForm({ ...newContractForm, discountPercent: pct })}
                          className={`px-2 py-1 text-xs font-bold rounded-md border transition-all cursor-pointer shrink-0 ${
                            newContractForm.discountPercent === pct
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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ghi chú phụ kiện đi kèm / yêu cầu của khách</label>
                  <input
                    type="text"
                    value={newContractForm.note}
                    onChange={e => setNewContractForm({ ...newContractForm, note: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    placeholder="Cho mượn thêm pin, thẻ nhớ, tủ hút ẩm..."
                  />
                </div>
              </div>

              {/* Calculated price breakdown card */}
              {calculatedDays > 0 && calculatedTotal > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-amber-50/40 border border-orange-100 rounded-xl p-3 text-xs text-orange-850 flex justify-between items-center font-medium shadow-2xs">
                  <div>
                    <span className="font-extrabold text-orange-900">Chi tiết tạm tính:</span>{' '}
                    {newContractForm.selectedCameraIds.length} thiết bị &times;{' '}
                    {newContractForm.is6Hours ? 'Gói thuê 6 tiếng' : `${calculatedDays} ngày`}
                  </div>
                  <div className="font-mono font-black text-sm text-orange-700">
                    {calculatedTotal.toLocaleString()} đ
                  </div>
                </div>
              )}

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
                  Tạo hợp đồng
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
                  setSelectedContract(null); // Close detail modal if open
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
            <div className="flex items-center gap-2.5 text-orange-600">
              <span className="p-2 bg-orange-50 rounded-xl">
                <FileText className="w-5 h-5 text-orange-600" />
              </span>
              <h4 className="font-bold text-base text-gray-900">Thông báo hệ thống</h4>
            </div>
            <p className="text-sm text-gray-655 leading-relaxed">{customAlertMessage}</p>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setCustomAlertMessage(null)}
                className="bg-orange-600 text-white font-medium px-5 py-2 rounded-xl text-sm hover:bg-orange-700 transition-all cursor-pointer"
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
