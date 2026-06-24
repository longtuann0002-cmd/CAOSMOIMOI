export interface Camera {
  id: string;
  name: string; // e.g. "Canon EOS R50"
  shortName: string; // e.g. "R50"
  category: 'Body' | 'Lens' | 'Combo' | 'Accessory';
  dailyRate: number; // Daily price in VND, e.g. 150000
  price6Hours?: number; // Giá thuê 6 tiếng
  price1Day?: number; // Giá thuê 1 ngày
  price2Days?: number; // Giá thuê 2 ngày
  price3Days?: number; // Giá thuê 3 ngày
  price4DaysPlus?: number; // Giá thuê từ ngày thứ 4
  status: 'Available' | 'Rented' | 'Maintenance';
  serialNumber: string;
  image?: string;
  description?: string;
}

export type ContractStatus = 'Pending' | 'Active' | 'Completed' | 'Overdue' | 'Cancelled';

export interface RentalContract {
  id: string;
  contractCode: string; // e.g. "HD-2026-001"
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerDocType: 'CCCD' | 'GPLX' | 'Passport' | 'CashDeposit' | 'CCCD_And_1M' | 'Other';
  customerDocNote?: string; // e.g. "Giữ CCCD gốc + Xe máy"
  items: {
    cameraId: string;
    cameraName: string;
    dailyRate: number;
    quantity: number;
  }[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  is6Hours?: boolean; // Tiêu chí thuê 6 tiếng (nửa ngày)
  returnTime?: string; // Giờ trả khi thuê 6 tiếng (VD: "18:00")
  totalPrice: number;
  discountPercent?: number; // Tỷ lệ giảm giá (%)
  paidAmount: number;
  depositAmount: number; // Tiền cọc hoặc tài sản cọc quy đổi
  status: ContractStatus;
  note?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  idNumber?: string; // CCCD / Passport number
  trustLevel: 'High' | 'Medium' | 'Low';
  rentalCount: number;
  notes?: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: 'Maintenance' | 'Equipment' | 'Marketing' | 'Utilities' | 'Rent' | 'Other';
  operator: string;
}

export interface BankConfig {
  bankId: string;
  accountNo: string;
  accountName: string;
}

export interface ContractTemplate {
  id: string;
  templateName: string;
  customerName: string;
  customerPhone: string;
  customerDocType: 'CCCD' | 'GPLX' | 'Passport' | 'CashDeposit' | 'CCCD_And_1M' | 'Other';
  customerDocNote: string;
  selectedCameraIds: string[];
  is6Hours: boolean;
  returnTime: string;
  depositAmount: number;
  paidAmountPct: number;
  paidAmount: number;
  discountPercent?: number; // Tỷ lệ giảm giá (%)
  note: string;
  durationDays?: number;
}

