import { Camera, RentalContract, Customer, Expense } from '../types';

export const INITIAL_CAMERAS: Camera[] = [
  {
    id: 'cam-1',
    name: 'Canon EOS R50',
    shortName: 'R50',
    category: 'Body',
    dailyRate: 150000,
    price6Hours: 90000,
    price1Day: 150000,
    price2Days: 140000,
    price3Days: 130000,
    price4DaysPlus: 120000,
    status: 'Available',
    serialNumber: 'CAN-R50-982194',
    description: 'Máy ảnh Mirrorless nhỏ gọn, cảm biến APS-C 24.2MP, quay video 4K tuyệt hảo.',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'cam-2',
    name: 'Fujifilm X-S10',
    shortName: 'XS10',
    category: 'Body',
    dailyRate: 250000,
    price6Hours: 150000,
    price1Day: 250000,
    price2Days: 230000,
    price3Days: 210000,
    price4DaysPlus: 190000,
    status: 'Available',
    serialNumber: 'FUJI-XS10-65412',
    description: 'Máy ảnh chống rung 5 trục (IBIS), giả lập màu phim đặc trưng nhà Fuji.',
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'cam-3',
    name: 'Sony Alfa 7 IV (A7M4)',
    shortName: 'A74',
    category: 'Body',
    dailyRate: 450000,
    price6Hours: 270000,
    price1Day: 450000,
    price2Days: 420000,
    price3Days: 390000,
    price4DaysPlus: 350000,
    status: 'Available',
    serialNumber: 'SONY-A74-12903',
    description: 'Máy ảnh Full-frame chuyên nghiệp 33MP, lấy nét thời gian thực siêu đỉnh.',
    image: 'https://images.unsplash.com/photo-1616440347437-b1c73416efc2?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'cam-4',
    name: 'Sony FE 24-70mm f/2.8 GM II',
    shortName: '2470GM',
    category: 'Lens',
    dailyRate: 300000,
    price6Hours: 180000,
    price1Day: 300000,
    price2Days: 280005,
    price3Days: 260000,
    price4DaysPlus: 240000,
    status: 'Available',
    serialNumber: 'SONY-L-2470-3311',
    description: 'Ống kính zoom tiêu chuẩn G Master thế hệ hai siêu nét, khẩu độ f/2.8 toàn dải.',
    image: 'https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'cam-5',
    name: 'Sigma 56mm f/1.4 DC DN',
    shortName: 'SG56',
    category: 'Lens',
    dailyRate: 100000,
    price6Hours: 60000,
    price1Day: 100000,
    price2Days: 90000,
    price3Days: 80000,
    price4DaysPlus: 70000,
    status: 'Available',
    serialNumber: 'SIG-56-88741',
    description: 'Ống kính chụp chân dung xóa phông hoàn hảo cho máy ảnh crop APS-C.',
    image: 'https://images.unsplash.com/photo-1607462109225-6b64ae2dd3cb?auto=format&fit=crop&q=80&w=400'
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Nguyễn Văn Hải',
    phone: '0912345678',
    email: 'facebook.com/hai.photography',
    address: '12 Cầu Giấy, Quận Cầu Giấy, Hà Nội',
    idNumber: '001095034512',
    trustLevel: 'High',
    rentalCount: 12,
    notes: 'Khách quen uy tín, thường xuyên chuẩn bị sẵn tài sản thế chấp.'
  },
  {
    id: 'cust-2',
    name: 'Lê Minh Tú',
    phone: '0988776655',
    email: 'facebook.com/minhtu.le',
    address: '45 Lê Lợi, Quận 1, TP Hồ Chí Minh',
    idNumber: '079093012114',
    trustLevel: 'High',
    rentalCount: 5,
    notes: 'Yêu cầu giữ máy sạch sẽ khi bàn giao.'
  },
  {
    id: 'cust-3',
    name: 'Phan Anh Đức',
    phone: '0933441122',
    email: 'facebook.com/anhduc.phan',
    address: '88 Quang Trung, Quận Gò Vấp, TP Hồ Chí Minh',
    idNumber: '079301014152',
    trustLevel: 'Medium',
    rentalCount: 2,
    notes: 'Thanh toán sòng phẳng, đúng hạn.'
  },
  {
    id: 'cust-4',
    name: 'Trần Thị Thảo',
    phone: '0905123456',
    email: 'facebook.com/thaotran96',
    address: '320 Trưng Nữ Vương, Quận Hải Châu, Đà Nẵng',
    idNumber: '048096001294',
    trustLevel: 'Low',
    rentalCount: 1,
    notes: 'Đã từng trễ máy 4 tiếng không thông báo trước.'
  }
];

// Let's seed initial contracts covering the schedule from May 2026 as shown in the screenshot.
// Remember current date in Vietnamese locale is 2026-06-17, so May 2026 is last month.
export const INITIAL_CONTRACTS: RentalContract[] = [
  {
    id: 'con-1',
    contractCode: 'HD-2026-001',
    customerId: 'cust-1',
    customerName: 'Nguyễn Văn Hải',
    customerPhone: '0912345678',
    customerDocType: 'CCCD',
    customerDocNote: 'Giữ CCCD gốc + Xe máy Wave',
    items: [
      { cameraId: 'cam-1', cameraName: 'Canon EOS R50', dailyRate: 150000, quantity: 1 },
      { cameraId: 'cam-2', cameraName: 'Fujifilm X-S10', dailyRate: 250000, quantity: 1 }
    ],
    startDate: '2026-05-01',
    endDate: '2026-05-01', // Kín lịch May 1st
    totalPrice: 400000,
    paidAmount: 400000,
    depositAmount: 15000000, // Giá trị xe máy ước tính
    status: 'Completed',
    note: 'Đã trả máy đầy đủ, không xước xát.',
    createdAt: '2026-04-30T15:00:00Z'
  },
  {
    id: 'con-2',
    contractCode: 'HD-2026-002',
    customerId: 'cust-2',
    customerName: 'Lê Minh Tú',
    customerPhone: '0988776655',
    customerDocType: 'CashDeposit',
    customerDocNote: 'Đặt cọc 5.000.000đ tiền mặt',
    items: [
      { cameraId: 'cam-2', cameraName: 'Fujifilm X-S10', dailyRate: 250000, quantity: 1 },
      { cameraId: 'cam-1', cameraName: 'Canon EOS R50', dailyRate: 150000, quantity: 1 }
    ],
    startDate: '2026-05-02',
    endDate: '2026-05-02', // Partial booking: XS10 00:00-08:00, R50 00:00-08:00
    totalPrice: 400000,
    paidAmount: 400000,
    depositAmount: 5000000,
    status: 'Completed',
    note: 'Thuê sự kiện sáng sớm. Trả máy lúc 8h sáng.',
    createdAt: '2026-05-01T20:00:00Z'
  },
  {
    id: 'con-3',
    contractCode: 'HD-2026-003',
    customerId: 'cust-3',
    customerName: 'Phan Anh Đức',
    customerPhone: '0933441122',
    customerDocType: 'Passport',
    customerDocNote: 'Giữ hộ chiếu bảo lãnh gốc',
    items: [
      { cameraId: 'cam-2', cameraName: 'Fujifilm X-S10', dailyRate: 250000, quantity: 1 }
    ],
    startDate: '2026-05-03',
    endDate: '2026-05-04', // May 3 (06:00 to midnight) and May 4 (midnight to 06:00)
    totalPrice: 500000,
    paidAmount: 500000,
    depositAmount: 0,
    status: 'Completed',
    note: 'Khách gửi hộ chiếu.',
    createdAt: '2026-05-02T18:30:00Z'
  },
  {
    id: 'con-4',
    contractCode: 'HD-2026-004',
    customerId: 'cust-1',
    customerName: 'Nguyễn Văn Hải',
    customerPhone: '0912345678',
    customerDocType: 'CCCD',
    customerDocNote: 'Giữ CCCD gốc',
    items: [
      { cameraId: 'cam-1', cameraName: 'Canon EOS R50', dailyRate: 150000, quantity: 1 }
    ],
    startDate: '2026-05-05',
    endDate: '2026-05-13', // May 5 (12:00 to midnight) to May 13 (all day)
    totalPrice: 1350000,
    paidAmount: 1350000,
    depositAmount: 0,
    status: 'Completed',
    note: 'Bản giao từ trưa ngày 5.',
    createdAt: '2026-05-04T10:00:00Z'
  },
  {
    id: 'con-5',
    contractCode: 'HD-2026-005',
    customerId: 'cust-4',
    customerName: 'Trần Thị Thảo',
    customerPhone: '0905123456',
    customerDocType: 'CCCD',
    customerDocNote: 'Giữ CCCD + hộ khẩu gốc',
    items: [
      { cameraId: 'cam-1', cameraName: 'Canon EOS R50', dailyRate: 150000, quantity: 1 },
      { cameraId: 'cam-2', cameraName: 'Fujifilm X-S10', dailyRate: 250000, quantity: 1 }
    ],
    startDate: '2026-05-14',
    endDate: '2026-05-16', // May 14 to May 16 (both machines, overlapping)
    totalPrice: 1200000,
    paidAmount: 1200000,
    depositAmount: 2000000,
    status: 'Completed',
    createdAt: '2026-05-13T09:00:00Z'
  },
  {
    id: 'con-6',
    contractCode: 'HD-2026-006',
    customerId: 'cust-2',
    customerName: 'Lê Minh Tú',
    customerPhone: '0988776655',
    customerDocType: 'CCCD',
    items: [
      { cameraId: 'cam-1', cameraName: 'Canon EOS R50', dailyRate: 150000, quantity: 1 },
      { cameraId: 'cam-2', cameraName: 'Fujifilm X-S10', dailyRate: 250000, quantity: 1 }
    ],
    startDate: '2026-05-17',
    endDate: '2026-05-20', // May 17 to May 20 (Canon all day, Fuji variable times)
    totalPrice: 1600000,
    paidAmount: 1600000,
    depositAmount: 0,
    status: 'Completed',
    createdAt: '2026-05-16T17:00:00Z'
  },
  // Let's add some current contracts for June 2026 so they are "Active" and "Overdue" or "Pending"
  {
    id: 'con-7',
    contractCode: 'HD-2026-007',
    customerId: 'cust-1',
    customerName: 'Nguyễn Văn Hải',
    customerPhone: '0912345678',
    customerDocType: 'CCCD',
    customerDocNote: 'Giữ CCCD gốc',
    items: [
      { cameraId: 'cam-3', cameraName: 'Sony Alfa 7 IV (A7M4)', dailyRate: 450000, quantity: 1 },
      { cameraId: 'cam-4', cameraName: 'Sony FE 24-70mm f/2.8 GM II', dailyRate: 300000, quantity: 1 }
    ],
    startDate: '2026-06-15',
    endDate: '2026-06-20', // Active during current mock date (2026-06-17)
    totalPrice: 3750000,
    paidAmount: 1500000, // Đã đặt cọc một phần tiền thuê
    depositAmount: 10000000,
    status: 'Active',
    note: 'Bộ Gear sịn chụp tiệc cưới. Khách giữ máy cẩn thận.',
    createdAt: '2026-06-14T08:30:00Z'
  },
  {
    id: 'con-8',
    contractCode: 'HD-2026-008',
    customerId: 'cust-4',
    customerName: 'Trần Thị Thảo',
    customerPhone: '0905123456',
    customerDocType: 'CCCD',
    customerDocNote: 'Giữ CCCD gốc',
    items: [
      { cameraId: 'cam-5', cameraName: 'Sigma 56mm f/1.4 DC DN', dailyRate: 100000, quantity: 1 }
    ],
    startDate: '2026-06-10',
    endDate: '2026-06-15', // Overdue as of mock date 2026-06-17
    totalPrice: 500000,
    paidAmount: 0,
    depositAmount: 1000000,
    status: 'Overdue',
    note: 'Chưa liên lạc được để thu hồi máy. Khách tắt máy.',
    createdAt: '2026-06-09T14:20:00Z'
  },
  {
    id: 'con-9',
    contractCode: 'HD-2026-009',
    customerId: 'cust-3',
    customerName: 'Phan Anh Đức',
    customerPhone: '0933441122',
    customerDocType: 'Passport',
    items: [
      { cameraId: 'cam-1', cameraName: 'Canon EOS R50', dailyRate: 150000, quantity: 1 }
    ],
    startDate: '2026-06-18',
    endDate: '2026-06-22', // Pending (Starts tomorrow)
    totalPrice: 600000,
    paidAmount: 200000,
    depositAmount: 0,
    status: 'Pending',
    note: 'Đã cọc trước 200k giữ máy.',
    createdAt: '2026-06-16T11:00:00Z'
  },
  {
    id: 'mock-con-m1',
    contractCode: 'HD-2026-03-01',
    customerId: 'cust-1',
    customerName: 'Nguyễn Văn Hải',
    customerPhone: '0912345678',
    customerDocType: 'CCCD',
    customerDocNote: 'Giữ CCCD gốc + Xe máy Wave',
    startDate: '2026-03-05',
    endDate: '2026-03-08',
    totalPrice: 2500000,
    paidAmount: 2500000,
    status: 'Completed',
    items: [{ cameraId: 'cam-1', cameraName: 'Canon EOS R50', dailyRate: 150000, quantity: 2 }],
    is6Hours: false,
    depositAmount: 5000000,
    note: 'Khách quen giữ máy kỹ.',
    createdAt: '2026-03-04T10:00:00Z'
  },
  {
    id: 'mock-con-m2',
    contractCode: 'HD-2026-03-02',
    customerId: 'cust-2',
    customerName: 'Lê Minh Tú',
    customerPhone: '0988776655',
    customerDocType: 'CCCD',
    customerDocNote: 'Bằng lái xe máy',
    startDate: '2026-03-18',
    endDate: '2026-03-19',
    totalPrice: 2000000,
    paidAmount: 2000000,
    status: 'Completed',
    items: [{ cameraId: 'cam-4', cameraName: 'Sony FE 24-70mm f/2.8 GM II', dailyRate: 300000, quantity: 1 }],
    is6Hours: false,
    depositAmount: 8000000,
    note: 'Chụp mẫu studio.',
    createdAt: '2026-03-17T14:30:00Z'
  },
  {
    id: 'mock-con-a1',
    contractCode: 'HD-2026-04-01',
    customerId: 'cust-3',
    customerName: 'Phan Anh Đức',
    customerPhone: '0933441122',
    customerDocType: 'CCCD',
    customerDocNote: 'CCCD + Xe máy Wave',
    startDate: '2026-04-03',
    endDate: '2026-04-06',
    totalPrice: 3800000,
    paidAmount: 3800000,
    status: 'Completed',
    items: [{ cameraId: 'cam-3', cameraName: 'Sony Alfa 7 IV (A7M4)', dailyRate: 450000, quantity: 1 }],
    is6Hours: false,
    depositAmount: 12000000,
    note: 'Làm sòng phẳng.',
    createdAt: '2026-04-02T09:00:00Z'
  },
  {
    id: 'mock-con-a2',
    contractCode: 'HD-2026-04-02',
    customerId: 'cust-4',
    customerName: 'Trần Thị Thảo',
    customerPhone: '0905123456',
    customerDocType: 'CCCD',
    customerDocNote: 'Thế chấp hộ khẩu',
    startDate: '2026-04-22',
    endDate: '2026-04-24',
    totalPrice: 2400000,
    paidAmount: 2400000,
    status: 'Completed',
    items: [{ cameraId: 'cam-2', cameraName: 'Fujifilm X-S10', dailyRate: 250000, quantity: 1 }],
    is6Hours: false,
    depositAmount: 6000000,
    note: 'Trễ hạn nhẹ nhưng đã cam kết trả bù.',
    createdAt: '2026-04-21T16:00:00Z'
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'mock-exp-m1',
    category: 'Maintenance',
    amount: 1200000,
    date: '2026-03-12',
    description: 'Hút ẩm sâu, Lau bụi mốc kính Canon RF 24-70mm',
    operator: 'Người vận hành'
  },
  {
    id: 'mock-exp-m2',
    category: 'Marketing',
    amount: 800000,
    date: '2026-03-24',
    description: 'Quảng cáo Fanpage phục vụ mùa kỷ yếu',
    operator: 'Hải Nguyễn'
  },
  {
    id: 'mock-exp-a1',
    category: 'Equipment',
    amount: 2500000,
    date: '2026-04-05',
    description: 'Sắm thêm tủ chống ẩm Andbon AD-80S',
    operator: 'Nguyễn Văn Hải (Vận hành)'
  },
  {
    id: 'mock-exp-a2',
    category: 'Other',
    amount: 1000000,
    date: '2026-04-28',
    description: 'Mua đồ đóng gói chuyên dụng, chống sốc túi máy',
    operator: 'Hệ thống'
  },
  {
    id: 'exp-1',
    description: 'Mua bổ sung hộp chống ẩm Eureka 40L',
    amount: 1850000,
    date: '2026-05-10',
    category: 'Equipment',
    operator: 'Nguyễn Văn Hải (Vận hành)'
  },
  {
    id: 'exp-2',
    description: 'Bảo dưỡng vệ sinh cảm biến Canon R50 và Lens Sigma',
    amount: 450000,
    date: '2026-05-15',
    category: 'Maintenance',
    operator: 'Lê Minh Tú'
  },
  {
    id: 'exp-3',
    description: 'Chi phí đóng tiền mạng cáp quang Viettel',
    amount: 220000,
    date: '2026-06-05',
    category: 'Utilities',
    operator: 'Hệ thống'
  },
  {
    id: 'exp-4',
    description: 'Chi phí marketing chạy quảng cáo Fanpage Facebook tháng 5',
    amount: 3000000,
    date: '2026-05-25',
    category: 'Marketing',
    operator: 'Hải Nguyễn'
  },
  {
    id: 'exp-5',
    description: 'Thuê mặt bằng đặt tủ máy ảnh tháng 6',
    amount: 5000000,
    date: '2026-06-01',
    category: 'Rent',
    operator: 'Hệ thống'
  }
];

export function loadStoredData<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`Error reading ${key} from localStorage`, e);
  }
  return defaultVal;
}

export function saveStoredData<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to localStorage`, e);
  }
}
