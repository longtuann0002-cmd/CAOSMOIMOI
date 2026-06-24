import React, { useState, useEffect, useRef } from 'react';
import { Camera, RentalContract, Customer, Expense, ContractStatus } from './types';
import {
  loadStoredData,
  saveStoredData,
  INITIAL_CAMERAS,
  INITIAL_CUSTOMERS,
  INITIAL_CONTRACTS,
  INITIAL_EXPENSES
} from './utils/mockData';
import { isSupabaseConfigured, syncToSupabase, fetchFromSupabase } from './utils/supabase';


// Component imports
import BookingCalendar from './components/BookingCalendar';
import ContractManager from './components/ContractManager';
import EquipmentTracker from './components/EquipmentTracker';
import RevenueDashboard from './components/RevenueDashboard';
import CustomerManager from './components/CustomerManager';
import ExpenseTracker from './components/ExpenseTracker';
import NotificationCenter from './components/NotificationCenter';
import { ToastContainer, Toast as ToastType } from './components/ToastNotification';

// Icons
import {
  Calendar,
  FileText,
  Camera as CameraIcon,
  TrendingUp,
  Users,
  DollarSign,
  CameraOff,
  Aperture,
  Film,
  Sparkles,
  Smile,
  Upload,
  Edit3,
  Check,
  X,
  Image as ImageIcon,
  LogOut,
  Lock,
  Key,
  User,
  UserPlus,
  Eye,
  EyeOff,
  UserCheck,
  Settings,
  ShieldCheck,
  UserMinus,
  ChevronRight,
  Database,
  Download,
  RefreshCw,
  Trash2,
  Save,
  FileDown,
  FileUp
} from 'lucide-react';

const DEFAULT_USERS = [
  { id: '1', username: 'admin', password: '12345', fullName: 'Quản trị viên', role: 'admin', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces' },
  { id: '2', username: 'nhanvien', password: '123', fullName: 'Kỹ thuật viên', role: 'staff', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces' }
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&h=120&fit=crop&crop=faces'
];

export default function App() {
  // Authentication & Users State
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    const loaded = loadStoredData('registeredUsers', DEFAULT_USERS);
    // Ensure admin user exists with 'admin' role and has password '12345' or handles both
    const hasAdmin = loaded.some((u: any) => u.username.toLowerCase() === 'admin');
    if (!hasAdmin) {
      return [
        { id: '1', username: 'admin', password: '12345', fullName: 'Quản trị viên', role: 'admin', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces' },
        ...loaded
      ];
    } else {
      return loaded.map((u: any) => 
        u.username.toLowerCase() === 'admin' 
          ? { ...u, role: 'admin', password: u.password === 'password' ? '12345' : u.password } 
          : u
      );
    }
  });
  const [currentUser, setCurrentUser] = useState(() =>
    loadStoredData('currentUser', null)
  );

  // Authentication Input States
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register Input States
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState<'admin' | 'staff'>('staff');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');

  // Dropdown / Modal Controls for Profile & Account Administration
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [sidebarDropdownOpen, setSidebarDropdownOpen] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showManageUsersModal, setShowManageUsersModal] = useState(false);
  const [showChangeAvatarModal, setShowChangeAvatarModal] = useState(false);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState('');

  // Backup & Snapshot States
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [snapshots, setSnapshots] = useState<any[]>(() =>
    loadStoredData('camlease_snapshots', [])
  );
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forgot Password States
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotFullName, setForgotFullName] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Users Form states
  const [newStaffUser, setNewStaffUser] = useState({ username: '', password: '', fullName: '', role: 'staff' });
  const [staffError, setStaffError] = useState('');
  
  // Change password form states
  const [changePasswordState, setChangePasswordState] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changePasswordError, setChangePasswordError] = useState('');
  const [changePasswordSuccess, setChangePasswordSuccess] = useState('');

  // Load states from localStorage or use rich mock dataset
  const [cameras, setCameras] = useState<Camera[]>(() =>
    loadStoredData('cameras', INITIAL_CAMERAS)
  );
  const [contracts, setContracts] = useState<RentalContract[]>(() => {
    const loaded = loadStoredData('contracts', INITIAL_CONTRACTS);
    const migrationKey = 'camlease_historical_contracts_migrated_v1';
    if (!localStorage.getItem(migrationKey)) {
      localStorage.setItem(migrationKey, 'true');
      const missingMockContracts = INITIAL_CONTRACTS.filter(
        item => item.id.startsWith('mock-con-') && !loaded.some(loadedItem => loadedItem.id === item.id)
      );
      if (missingMockContracts.length > 0) {
        return [...loaded, ...missingMockContracts];
      }
    }
    return loaded;
  });
  const [customers, setCustomers] = useState<Customer[]>(() =>
    loadStoredData('customers', INITIAL_CUSTOMERS)
  );
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const loaded = loadStoredData('expenses', INITIAL_EXPENSES);
    const migrationKey = 'camlease_historical_expenses_migrated_v1';
    if (!localStorage.getItem(migrationKey)) {
      localStorage.setItem(migrationKey, 'true');
      const missingMockExpenses = INITIAL_EXPENSES.filter(
        item => item.id.startsWith('mock-exp-') && !loaded.some(loadedItem => loadedItem.id === item.id)
      );
      if (missingMockExpenses.length > 0) {
        return [...loaded, ...missingMockExpenses];
      }
    }
    return loaded;
  });

  // Active view tab state (default to 'calendar' as shown in screenshot)
  const [activeTab, setActiveTab] = useState<'calendar' | 'contracts' | 'equipment' | 'revenue' | 'customers' | 'expenses'>('calendar');

  // Toasts state & actions
  const [toasts, setToasts] = useState<ToastType[]>([]);

  const addToast = (title: string, type: 'success' | 'info' | 'warning' | 'error' = 'success', description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, title, type, description }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Logo & Branding customization states
  const [logoText, setLogoText] = useState<string>(() =>
    loadStoredData('logoText', 'TIỆM ẢNH NHÀ CAOS')
  );
  const [logoSubtitle, setLogoSubtitle] = useState<string>(() =>
    loadStoredData('logoSubtitle', 'CHO THUÊ MÁY ẢNH GIÁ RẺ')
  );
  const [logoIconType, setLogoIconType] = useState<'camera' | 'aperture' | 'film' | 'sparkles' | 'smile' | 'image' | 'upload'>(() =>
    loadStoredData('logoIconType', 'camera')
  );
  const [logoIconColor, setLogoIconColor] = useState<string>(() =>
    loadStoredData('logoIconColor', '#ea580c')
  );
  const [logoBase64, setLogoBase64] = useState<string>(() =>
    loadStoredData('logoBase64', '')
  );
  const [showLogoModal, setShowLogoModal] = useState<boolean>(false);

  // simulated system date for operations & notifications
  const [systemDate, setSystemDate] = useState<string>(() => {
    const todayStr = new Date().toLocaleDateString('sv'); // Format YYYY-MM-DD
    return loadStoredData('systemDate', todayStr);
  });

  // Currently focused date highlights (Default to the nearest booking/schedule date relative to systemDate!)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const loadedContracts = loadStoredData('contracts', INITIAL_CONTRACTS) as RentalContract[];
    if (!loadedContracts || loadedContracts.length === 0) {
      return '2026-06-17';
    }
    const currentSystemDate = loadStoredData('systemDate', '2026-06-17');
    const systemTime = new Date(currentSystemDate).getTime();
    let closestDate = currentSystemDate;
    let minDiff = Infinity;

    loadedContracts.forEach((c: RentalContract) => {
      [c.startDate, c.endDate].forEach(dStr => {
        if (!dStr) return;
        const dTime = new Date(dStr).getTime();
        if (isNaN(dTime)) return;
        const diff = Math.abs(dTime - systemTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestDate = dStr;
        }
      });
    });

    return closestDate;
  });

  // Sync data states to local storage and Supabase
  useEffect(() => {
    saveStoredData('cameras', cameras);
    if (isSupabaseConfigured) {
      syncToSupabase('cameras', cameras);
    }
  }, [cameras]);

  useEffect(() => {
    saveStoredData('contracts', contracts);
    if (isSupabaseConfigured) {
      syncToSupabase('contracts', contracts);
    }
  }, [contracts]);

  useEffect(() => {
    saveStoredData('customers', customers);
    if (isSupabaseConfigured) {
      syncToSupabase('customers', customers);
    }
  }, [customers]);

  useEffect(() => {
    saveStoredData('expenses', expenses);
    if (isSupabaseConfigured) {
      syncToSupabase('expenses', expenses);
    }
  }, [expenses]);

  useEffect(() => {
    saveStoredData('systemDate', systemDate);
  }, [systemDate]);

  useEffect(() => {
    saveStoredData('logoText', logoText);
  }, [logoText]);

  useEffect(() => {
    saveStoredData('logoSubtitle', logoSubtitle);
  }, [logoSubtitle]);

  useEffect(() => {
    saveStoredData('logoIconType', logoIconType);
  }, [logoIconType]);

  useEffect(() => {
    saveStoredData('logoIconColor', logoIconColor);
  }, [logoIconColor]);

  useEffect(() => {
    saveStoredData('logoBase64', logoBase64);
  }, [logoBase64]);

  useEffect(() => {
    saveStoredData('registeredUsers', registeredUsers);
    if (isSupabaseConfigured) {
      syncToSupabase('registeredUsers', registeredUsers);
    }
  }, [registeredUsers]);

  useEffect(() => {
    saveStoredData('currentUser', currentUser);
  }, [currentUser]);

  useEffect(() => {
    saveStoredData('camlease_snapshots', snapshots);
    if (isSupabaseConfigured) {
      syncToSupabase('camlease_snapshots', snapshots);
    }
  }, [snapshots]);

  // Load initial data block asynchronously from Supabase if configured or seed if empty
  useEffect(() => {
    if (isSupabaseConfigured) {
      const loadInitialSupabaseData = async () => {
        try {
          const cloudCameras = await fetchFromSupabase('cameras');
          const cloudContracts = await fetchFromSupabase('contracts');
          const cloudCustomers = await fetchFromSupabase('customers');
          const cloudExpenses = await fetchFromSupabase('expenses');
          const cloudUsers = await fetchFromSupabase('registeredUsers');
          const cloudSnapshots = await fetchFromSupabase('camlease_snapshots');

          if (cloudCameras) setCameras(cloudCameras);
          if (cloudContracts) setContracts(cloudContracts);
          if (cloudCustomers) setCustomers(cloudCustomers);
          if (cloudExpenses) setExpenses(cloudExpenses);
          if (cloudUsers) setRegisteredUsers(cloudUsers);
          if (cloudSnapshots) setSnapshots(cloudSnapshots);

          if (cloudCameras || cloudContracts || cloudCustomers || cloudExpenses) {
            // Synchronized successfully, no toast notification displayed
          } else {
            console.log('[Supabase] Initializing store seed records on cloud');
            await syncToSupabase('cameras', cameras);
            await syncToSupabase('contracts', contracts);
            await syncToSupabase('customers', customers);
            await syncToSupabase('expenses', expenses);
            await syncToSupabase('registeredUsers', registeredUsers);
            await syncToSupabase('camlease_snapshots', snapshots);
          }
        } catch (err) {
          console.error('[Supabase] Sync boot error, falling back locally', err);
          addToast('Đồng bộ Supabase thất bại. Đang chạy chế độ Local Offline.', 'warning');
        }
      };
      loadInitialSupabaseData();
    }
  }, []);

  // Operations: BACKUP & RESTORE
  const handleExportBackup = () => {
    try {
      const backupData = {
        version: "1.0",
        backupDate: new Date().toISOString(),
        systemDate,
        cameras,
        contracts,
        customers,
        expenses,
        registeredUsers,
        logoText,
        logoSubtitle,
        logoIconType,
        logoIconColor,
        logoBase64
      };
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `camlease_backup_${systemDate || new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('Xuất tệp sao lưu thành công!', 'success', 'Tệp sao lưu .json đã được tạo và tải xuống thiết bị.');
    } catch (err: any) {
      addToast('Lỗi xuất tệp sao lưu', 'error', err?.message || 'Có lỗi xảy ra khi tạo tệp sao lưu.');
    }
  };

  const handleImportBackup = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Dữ liệu không đúng định dạng JSON.');
      }
      if (!Array.isArray(parsed.cameras) && !Array.isArray(parsed.contracts)) {
        throw new Error('Định dạng tệp sao lưu không hợp lệ. Thiếu cấu trúc danh mục thiết bị hoặc hợp đồng.');
      }

      // Restore states safely
      if (Array.isArray(parsed.cameras)) setCameras(parsed.cameras);
      if (Array.isArray(parsed.contracts)) setContracts(parsed.contracts);
      if (Array.isArray(parsed.customers)) setCustomers(parsed.customers);
      if (Array.isArray(parsed.expenses)) setExpenses(parsed.expenses);
      if (Array.isArray(parsed.registeredUsers)) setRegisteredUsers(parsed.registeredUsers);
      if (parsed.systemDate) setSystemDate(parsed.systemDate);
      if (parsed.logoText !== undefined) setLogoText(parsed.logoText);
      if (parsed.logoSubtitle !== undefined) setLogoSubtitle(parsed.logoSubtitle);
      if (parsed.logoIconType !== undefined) setLogoIconType(parsed.logoIconType);
      if (parsed.logoIconColor !== undefined) setLogoIconColor(parsed.logoIconColor);
      if (parsed.logoBase64 !== undefined) setLogoBase64(parsed.logoBase64);

      setImportError('');
      addToast('Nhập dữ liệu thành công!', 'success', 'Toàn bộ dữ liệu hệ thống đã được phục hồi từ tệp tin.');
      return true;
    } catch (err: any) {
      const errMsg = err?.message || 'Không thể đọc tệp tin. Vui lòng kiểm tra lại định dạng.';
      setImportError(errMsg);
      addToast('Khôi phục thất bại', 'error', errMsg);
      return false;
    }
  };

  const handleCreateLocalSnapshot = (name: string) => {
    const trimmedName = name.trim();
    const finalName = trimmedName || `Bản sao lưu nhanh #${snapshots.length + 1} (${new Date().toLocaleTimeString('vi-VN')} ${new Date().toLocaleDateString('vi-VN')})`;
    
    const newSnapshot = {
      id: `snap-${Date.now()}`,
      name: finalName,
      date: new Date().toISOString(),
      systemDate,
      data: {
        cameras,
        contracts,
        customers,
        expenses,
        registeredUsers,
        logoText,
        logoSubtitle,
        logoIconType,
        logoIconColor,
        logoBase64
      }
    };

    setSnapshots(prev => [newSnapshot, ...prev]);
    setNewSnapshotName('');
    addToast('Tạo điểm khôi phục nhanh thành công!', 'success', `Điểm "${finalName}" đã được lưu trữ vào bộ nhớ trình duyệt.`);
  };

  const handleRestoreSnapshot = (snap: any) => {
    try {
      if (!snap || !snap.data) {
        throw new Error('Dữ liệu điểm khôi phục bị hỏng.');
      }
      const data = snap.data;
      if (Array.isArray(data.cameras)) setCameras(data.cameras);
      if (Array.isArray(data.contracts)) setContracts(data.contracts);
      if (Array.isArray(data.customers)) setCustomers(data.customers);
      if (Array.isArray(data.expenses)) setExpenses(data.expenses);
      if (Array.isArray(data.registeredUsers)) setRegisteredUsers(data.registeredUsers);
      if (snap.systemDate) setSystemDate(snap.systemDate);
      if (data.logoText !== undefined) setLogoText(data.logoText);
      if (data.logoSubtitle !== undefined) setLogoSubtitle(data.logoSubtitle);
      if (data.logoIconType !== undefined) setLogoIconType(data.logoIconType);
      if (data.logoIconColor !== undefined) setLogoIconColor(data.logoIconColor);
      if (data.logoBase64 !== undefined) setLogoBase64(data.logoBase64);

      addToast('Khôi phục thành công!', 'success', `Hệ thống đã phục hồi về trạng thái của điểm: "${snap.name}".`);
    } catch (err: any) {
      addToast('Lỗi khôi phục dữ liệu', 'error', err?.message || 'Không thể phục hồi điểm này.');
    }
  };

  const handleDeleteSnapshot = (id: string, name: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== id));
    addToast('Đã xóa bản ghi sao lưu', 'info', `Yêu cầu gỡ bỏ "${name}" đã được thực hiện.`);
  };

  // Operations: CONTRACTS
  const handleAddContract = (newContract: RentalContract) => {
    setContracts(prev => [newContract, ...prev]);

    // Automatically update camera statuses depending on starting date of contract
    // (If contract starts today, mark cameras as Rented, but actually we maintain dynamically inside lists)
    setCameras(prevCams =>
      prevCams.map(cam => {
        const isRented = newContract.items.some(item => item.cameraId === cam.id);
        if (isRented && newContract.status === 'Active') {
          return { ...cam, status: 'Rented' as const };
        }
        return cam;
      })
    );

    // Increment customer count or add new customer if it has been completed
    setCustomers(prevCusts => {
      const exists = prevCusts.some(
        cust => cust.phone === newContract.customerPhone
      );
      if (newContract.status === 'Completed' && !exists) {
        const newCustomer: Customer = {
          id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: newContract.customerName,
          phone: newContract.customerPhone,
          idNumber: newContract.customerDocType === 'CCCD' ? newContract.customerDocNote?.match(/\d+/)?.[0] || '' : '',
          email: '',
          address: '',
          trustLevel: 'Medium',
          rentalCount: 1,
          notes: newContract.customerDocNote 
            ? `Hồ sơ tự động tạo từ hợp đồng thuê xong ${newContract.contractCode}. Giấy tờ: ${newContract.customerDocNote}`
            : `Hồ sơ tự động tạo từ hợp đồng thuê xong ${newContract.contractCode}.`
        };
        return [...prevCusts, newCustomer];
      }

      return prevCusts.map(cust => {
        if (cust.phone === newContract.customerPhone) {
          return { ...cust, rentalCount: cust.rentalCount + 1 };
        }
        return cust;
      });
    });

    addToast(
      'Tạo mới hợp đồng thành công!',
      'success',
      `Mã hợp đồng: ${newContract.contractCode} | Khách hàng: ${newContract.customerName}`
    );
  };

  const handleUpdateContractStatus = (id: string, status: ContractStatus, note?: string, paidAmount?: number) => {
    const targetContract = contracts.find(c => c.id === id);
    if (targetContract) {
      const statusLabels: Record<ContractStatus, string> = {
        'Pending': 'Chờ duyệt',
        'Active': 'Đang thuê',
        'Completed': 'Hoàn thành',
        'Overdue': 'Quá hạn',
        'Cancelled': 'Đã hủy'
      };
      const label = statusLabels[status] || status;
      addToast(
        'Cập nhật trạng thái hợp đồng',
        'info',
        `Hợp đồng ${targetContract.contractCode} đã chuyển sang trạng thái: "${label}"`
      );
    }

    // If the contract is completed, make sure the customer enters the profiles directory
    if (status === 'Completed') {
      const c = contracts.find(item => item.id === id);
      if (c) {
        setCustomers(prevCusts => {
          const exists = prevCusts.some(
            cust => cust.phone === c.customerPhone
          );
          if (!exists) {
            // Count contracts for this customer
            const customerContractsCount = contracts.filter(
              ct => ct.customerPhone === c.customerPhone
            ).length;

            const newCustomer: Customer = {
              id: `cust-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              name: c.customerName,
              phone: c.customerPhone,
              idNumber: c.customerDocType === 'CCCD' ? c.customerDocNote?.match(/\d+/)?.[0] || '' : '',
              email: '',
              address: '',
              trustLevel: 'Medium',
              rentalCount: customerContractsCount || 1,
              notes: c.customerDocNote 
                ? `Hồ sơ tự động tạo từ hợp đồng thuê xong ${c.contractCode}. Giấy tờ: ${c.customerDocNote}`
                : `Hồ sơ tự động tạo từ hợp đồng thuê xong ${c.contractCode}.`
            };
            return [...prevCusts, newCustomer];
          }
          return prevCusts;
        });
      }
    }

    setContracts(prev =>
      prev.map(c => {
        if (c.id === id) {
          let finalNote = note ? `${c.note || ''}\n[Trạng thái]: ${note}` : c.note;
          let finalPaidAmount = c.paidAmount;

          if (status === 'Active') {
            const extra = c.totalPrice - c.paidAmount;
            if (extra > 0) {
              finalNote = `${finalNote || ''}\n[Hệ thống]: Khách nhận máy, thanh toán nốt ${extra.toLocaleString()}đ còn lại (Đặc tả 50% còn lại).`;
              finalPaidAmount = c.totalPrice;
            } else {
              finalPaidAmount = c.totalPrice;
            }
          } else if (paidAmount !== undefined) {
            finalPaidAmount = paidAmount;
          }

          const updatedContract = {
            ...c,
            status,
            note: finalNote,
            paidAmount: finalPaidAmount
          };

          // Adjust camera statuses based on contract transition
          if (status === 'Completed' || status === 'Cancelled') {
            setCameras(prevCams =>
              prevCams.map(cam => {
                const wasRented = c.items.some(i => i.cameraId === cam.id);
                if (wasRented) {
                  return { ...cam, status: 'Available' as const };
                }
                return cam;
              })
            );
          } else if (status === 'Active') {
            setCameras(prevCams =>
              prevCams.map(cam => {
                const isRented = c.items.some(i => i.cameraId === cam.id);
                if (isRented) {
                  return { ...cam, status: 'Rented' as const };
                }
                return cam;
              })
            );
          }

          return updatedContract;
        }
        return c;
      })
    );
  };

  const handleUpdateContractNote = (id: string, note: string) => {
    setContracts(prev =>
      prev.map(c => {
        if (c.id === id) {
          return { ...c, note };
        }
        return c;
      })
    );
  };

  const handleDeleteContract = (id: string) => {
    const contractToDelete = contracts.find(c => c.id === id);
    if (!contractToDelete) return;

    // Remove the contract from the list
    const updatedContracts = contracts.filter(c => c.id !== id);
    setContracts(updatedContracts);

    // Adjust camera statuses based on remaining Active and Overdue contracts
    setCameras(prevCams =>
      prevCams.map(cam => {
        const wasRented = contractToDelete.items.some(i => i.cameraId === cam.id);
        if (wasRented) {
          // See if any of the remaining contracts keep this camera rented
          const isStillRented = updatedContracts.some(
            c => (c.status === 'Active' || c.status === 'Overdue') && c.items.some(i => i.cameraId === cam.id)
          );
          if (!isStillRented) {
            return { ...cam, status: 'Available' as const };
          }
        }
        return cam;
      })
    );

    // Decrement customer's rental count
    setCustomers(prevCusts =>
      prevCusts.map(cust => {
        if (cust.phone === contractToDelete.customerPhone) {
          return { ...cust, rentalCount: Math.max(0, cust.rentalCount - 1) };
        }
        return cust;
      })
    );
  };

  // Operations: CAMERAS
  const handleAddCamera = (newCam: Camera) => {
    setCameras(prev => [...prev, newCam]);
  };

  const handleUpdateCamera = (updatedCam: Camera) => {
    setCameras(prev => prev.map(c => (c.id === updatedCam.id ? updatedCam : c)));
  };

  const handleDeleteCamera = (id: string) => {
    setCameras(prev => prev.filter(c => c.id !== id));
  };

  // Operations: CUSTOMERS
  const handleAddCustomer = (newCust: Customer) => {
    setCustomers(prev => [...prev, newCust]);
  };

  const handleUpdateCustomer = (updatedCust: Customer) => {
    setCustomers(prev => prev.map(c => (c.id === updatedCust.id ? updatedCust : c)));
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  // Operations: EXPENSES
  const handleAddExpense = (newExp: Expense) => {
    setExpenses(prev => [newExp, ...prev]);
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  // Operations: AUTHENTICATION
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    const username = regUsername.trim().toLowerCase();
    const fullName = regFullName.trim();
    const password = regPassword;

    if (!username || !fullName || !password) {
      setRegisterError('Vui lòng điền đầy đủ các trường thông tin!');
      return;
    }

    if (password.length < 3) {
      setRegisterError('Mật khẩu đăng ký phải từ 3 ký tự trở lên!');
      return;
    }

    const userExists = registeredUsers.some(
      u => u.username.toLowerCase() === username
    );

    if (userExists) {
      setRegisterError('Tên tài khoản (username) này đã tồn tại!');
      return;
    }

    const newUser = {
      id: `user-${Date.now()}`,
      username,
      password,
      fullName,
      role: regRole,
      avatar: regRole === 'admin' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces' 
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces'
    };

    const updatedUsers = [...registeredUsers, newUser];
    setRegisteredUsers(updatedUsers);
    saveStoredData('registeredUsers', updatedUsers);

    setRegisterSuccess('Đăng ký tài khoản thành công! Tự động chuyển về đăng nhập...');
    
    // Auto-fill login credentials for exceptional ease of use
    setUsernameInput(username);
    setPasswordInput(password);

    setRegUsername('');
    setRegPassword('');
    setRegFullName('');
    setRegRole('staff');

    setTimeout(() => {
      setIsRegisterMode(false);
      setRegisterError('');
      setRegisterSuccess('');
    }, 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const username = usernameInput.trim().toLowerCase();
    const foundUser = registeredUsers.find(
      (u: any) => u.username.toLowerCase() === username && (u.password === passwordInput || (username === 'admin' && (passwordInput === '12345' || passwordInput === 'password')))
    );
    if (foundUser) {
      // Force admin role for username 'admin'
      const activeUser = username === 'admin' ? { ...foundUser, role: 'admin' } : foundUser;
      setCurrentUser(activeUser);
      setLoginError('');
      setUsernameInput('');
      setPasswordInput('');
    } else {
      setLoginError('Tài khoản hoặc mật khẩu không chính xác!');
    }
  };

  const handleAutofill = (user: string, pass: string) => {
    setUsernameInput(user);
    setPasswordInput(pass);
    setLoginError('');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setProfileDropdownOpen(false);
  };

  const handleChangeAvatar = (newAvatarUrl: string) => {
    if (!newAvatarUrl) return;

    const updatedUsers = registeredUsers.map(u => {
      if (u.id === currentUser?.id) {
        return { ...u, avatar: newAvatarUrl };
      }
      return u;
    });
    setRegisteredUsers(updatedUsers);

    setCurrentUser(prev => prev ? { ...prev, avatar: newAvatarUrl } : null);
    addToast('Đã cập nhật ảnh đại diện thành công!', 'success');
    setShowChangeAvatarModal(false);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');
    setChangePasswordSuccess('');

    if (!changePasswordState.oldPassword) {
      setChangePasswordError('Vui lòng nhập mật khẩu hiện tại!');
      return;
    }
    if (changePasswordState.oldPassword !== currentUser?.password) {
      setChangePasswordError('Mật khẩu hiện tại không chính xác!');
      return;
    }
    if (!changePasswordState.newPassword) {
      setChangePasswordError('Mật khẩu mới không được để trống!');
      return;
    }
    if (changePasswordState.newPassword.length < 3) {
      setChangePasswordError('Mật khẩu mới phải có ít nhất 3 ký tự!');
      return;
    }
    if (changePasswordState.newPassword !== changePasswordState.confirmPassword) {
      setChangePasswordError('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }

    // Save updated users list
    const updatedUsers = registeredUsers.map(u => {
      if (u.id === currentUser?.id) {
        return { ...u, password: changePasswordState.newPassword };
      }
      return u;
    });

    setRegisteredUsers(updatedUsers);
    
    // Update active currentUser session state
    setCurrentUser(prev => prev ? { ...prev, password: changePasswordState.newPassword } : null);
    setChangePasswordSuccess('Chúc mừng! Đã đổi mật khẩu thành công!');
    setChangePasswordState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleVerifyForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotUsername.trim() || !forgotFullName.trim()) {
      setForgotError('Vui lòng điền đầy đủ thông tin yêu cầu!');
      return;
    }

    const matchedUser = registeredUsers.find(
      u => u.username.toLowerCase() === forgotUsername.trim().toLowerCase() &&
           u.fullName.toLowerCase() === forgotFullName.trim().toLowerCase()
    );

    if (!matchedUser) {
      setForgotError('Không tìm thấy tài khoản khớp với thông tin cung cấp!');
      return;
    }

    setForgotStep(2);
  };

  const handleResetForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotNewPassword) {
      setForgotError('Vui lòng nhập mật khẩu mới!');
      return;
    }

    if (forgotNewPassword.length < 3) {
      setForgotError('Mật khẩu mới phải có ít nhất 3 ký tự!');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }

    const updatedUsers = registeredUsers.map(u => {
      if (u.username.toLowerCase() === forgotUsername.trim().toLowerCase() &&
          u.fullName.toLowerCase() === forgotFullName.trim().toLowerCase()) {
        return { ...u, password: forgotNewPassword };
      }
      return u;
    });

    setRegisteredUsers(updatedUsers);
    addToast('Đặt lại mật khẩu thành công! Hãy đăng nhập.', 'success');
    
    // Clear forgot states
    setForgotUsername('');
    setForgotFullName('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotStep(1);
    setShowForgotPasswordModal(false);
  };

  const handleAddNewStaff = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError('');

    const username = newStaffUser.username.trim().toLowerCase();
    const fullName = newStaffUser.fullName.trim();
    const password = newStaffUser.password;
    const role = newStaffUser.role;

    if (!username || !password || !fullName) {
      setStaffError('Vui lòng nhập đầy đủ tất cả thông tin!');
      return;
    }

    if (username.length < 3) {
      setStaffError('Tên tài khoản phải dài từ 3 ký tự trở lên!');
      return;
    }

    if (registeredUsers.some(u => u.username.toLowerCase() === username)) {
      setStaffError('Tên tài khoản này đã được sử dụng!');
      return;
    }

    const newUserObj = {
      id: Date.now().toString(),
      username,
      password,
      fullName,
      role,
      avatar: role === 'admin' 
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces'
    };

    setRegisteredUsers(prev => [...prev, newUserObj]);
    setNewStaffUser({ username: '', password: '', fullName: '', role: 'staff' });
    setStaffError('Đã tạo tài khoản thành công!');
  };

  const handleDeleteStaff = (id: string) => {
    setRegisteredUsers(prev => prev.filter(u => u.id !== id));
    setStaffError('Đã xóa tài khoản thành công!');
  };

  // If user is not authenticated, render the glorious login experience screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row antialiased relative overflow-hidden select-none">
        
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>

        {/* Left decoration panel with customizable brand colors and Unsplash setup - Hidden on Mobile */}
        <div className="hidden md:flex md:w-5/12 lg:w-6/12 xl:w-7/12 bg-slate-900 text-white relative flex-col justify-between p-8 lg:p-16 border-r border-slate-800/80">
          <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400 via-rose-600 to-indigo-900"></div>
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity pointer-events-none" 
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&auto=format&fit=crop&q=80')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/10 opacity-70 pointer-events-none"></div>

          {/* Dynamic Top Brand section */}
          <div className="flex items-center gap-3.5 relative z-10 bg-slate-950/40 backdrop-blur-md p-4 rounded-3xl border border-white/10 w-fit">
            {logoIconType === 'upload' && logoBase64 ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center shadow-xl">
                <img src={logoBase64} alt="Custom Logo" className="w-full h-full object-cover" />
              </div>
            ) : (
              <span 
                className="w-14 h-14 rounded-2xl text-white shadow-xl flex items-center justify-center transition scale-100 hover:scale-105 font-bold"
                style={{ backgroundColor: logoIconColor }}
              >
                {logoIconType === 'aperture' && <Aperture className="w-8 h-8" />}
                {logoIconType === 'film' && <Film className="w-8 h-8" />}
                {logoIconType === 'sparkles' && <Sparkles className="w-8 h-8 text-yellow-300" />}
                {logoIconType === 'smile' && <Smile className="w-8 h-8" />}
                {logoIconType === 'image' && <ImageIcon className="w-8 h-8" />}
                {(logoIconType === 'camera' || logoIconType === 'upload') && <CameraIcon className="w-8 h-8" />}
              </span>
            )}
            <div className="leading-tight pr-4">
              <span className="font-sans font-black text-white text-lg tracking-widest block uppercase">
                {logoText || 'TIỆM ẢNH NHÀ CAOS'}
              </span>
              <span className="text-[10px] text-slate-300 font-mono block tracking-widest uppercase mt-0.5">{logoSubtitle || 'CHO THUÊ MÁY ẢNH GIÁ RẺ'}</span>
            </div>
          </div>

          {/* Welcome Message Text Block */}
          <div className="my-6 md:my-0 space-y-4 md:space-y-6 max-w-xl relative z-10 md:mt-auto md:mb-auto pt-4 md:pt-0">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 text-[10px] font-bold text-orange-400 border border-orange-500/30 rounded-full bg-orange-500/10 uppercase tracking-widest leading-none">
              <ShieldCheck className="w-3.5 h-3.5 mr-0.5 animate-pulse" /> Phiên bản máy chủ đám mây bảo mật
            </span>
            <div className="space-y-3 md:space-y-4">
              <h2 className="text-2xl sm:text-3xl lg:text-5xl font-display font-black text-white tracking-tight leading-none animate-fade-in">
                Quản lý Cho thuê <br className="hidden md:inline" /> 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200">Thiết bị Studio</span>
              </h2>
              <p className="hidden sm:block text-slate-300 text-sm leading-relaxed font-normal">
                Hệ sinh thái chuyên nghiệp hỗ trợ vận hành tối ưu khâu đặt máy chụp ảnh, lens, đèn quay chụp, quản toán hợp đồng, thu nợ, báo biểu doanh số thực chuẩn xác nhất.
              </p>
            </div>

            {/* List of elegant key benefits - Hidden on mobile/tablets to keep login quick */}
            <div className="hidden md:block space-y-3.5 pt-4 border-t border-slate-800/50 max-w-lg">
              <div className="flex items-start gap-3">
                <span className="p-1 rounded-lg bg-orange-500/15 border border-orange-500/20 text-orange-400 mt-0.5 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Đặt lịch biểu quan hợp nhất (Smart Calendar)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Xếp lịch camera, lens theo thời gian thực trực quan, hoàn toàn chống trùng lặp lịch thiết bị.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="p-1 rounded-lg bg-orange-500/15 border border-orange-500/20 text-orange-400 mt-0.5 shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">Quản trị khách hàng & Tổng hợp doanh thu</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Chụp báo cáo tài chính doanh thu, chi phí phát sinh, công nợ xấu và khấu hao kho thiết bị.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer of decorative block */}
          <div className="hidden sm:flex relative z-10 text-[11px] text-slate-500 select-none items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>© 2026 {logoText || 'TIỆM ẢNH NHÀ CAOS'} Enterprise Suite • Kết nối máy chủ an toàn</span>
          </div>
        </div>

        {/* Right authentic login sheet form */}
        <div className="flex-grow bg-slate-950 flex flex-col justify-center p-3.5 xs:p-5 sm:p-12 lg:p-16 relative z-10 min-h-screen">
          
          {/* Ambient Glow behind the card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="max-w-md w-full mx-auto relative z-10">
            
            {/* Mobile-only beautiful branding logotype */}
            <div className="flex md:hidden items-center justify-center gap-2.5 mb-7 select-none animate-fade-in">
              {logoIconType === 'upload' && logoBase64 ? (
                <div className="w-11 h-11 rounded-xl overflow-hidden border border-white/20 bg-slate-900 flex items-center justify-center shadow-lg shadow-orange-500/10 shrink-0">
                  <img src={logoBase64} alt="Custom Logo" className="w-full h-full object-cover" />
                </div>
              ) : (
                <span 
                  className="w-11 h-11 rounded-xl text-white shadow-lg flex items-center justify-center shadow-orange-500/10 shrink-0 font-bold"
                  style={{ backgroundColor: logoIconColor }}
                >
                  {logoIconType === 'aperture' && <Aperture className="w-6.5 h-6.5" />}
                  {logoIconType === 'film' && <Film className="w-6.5 h-6.5" />}
                  {logoIconType === 'sparkles' && <Sparkles className="w-6.5 h-6.5 text-yellow-300" />}
                  {logoIconType === 'smile' && <Smile className="w-6.5 h-6.5" />}
                  {logoIconType === 'image' && <ImageIcon className="w-6.5 h-6.5" />}
                  {(logoIconType === 'camera' || logoIconType === 'upload') && <CameraIcon className="w-6.5 h-6.5" />}
                </span>
              )}
              <div className="leading-tight text-left">
                <span className="font-sans font-black text-white text-base tracking-widest block uppercase">
                  {logoText || 'TIỆM ẢNH NHÀ CAOS'}
                </span>
                <span className="text-[9px] text-orange-400 font-mono block tracking-widest uppercase font-bold mt-0.5">{logoSubtitle || 'CHO THUÊ MÁY ẢNH GIÁ RẺ'}</span>
              </div>
            </div>
            
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 p-5 xs:p-7 sm:p-9 rounded-2xl shadow-2xl space-y-4 xs:space-y-5 transition duration-300 hover:border-slate-700/60 hover:shadow-[0_0_50px_-12px_rgba(249,115,22,0.15)]">
              
              {!isRegisterMode ? (
                // LOGIN Giao diện
                <>
                  <div className="space-y-2 select-none">
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-lg border border-orange-500/25 inline-block leading-none">
                      Hệ thống vận hành
                    </span>
                    <h3 className="text-2xl font-black text-white tracking-tight">Đăng nhập cổng kết nối</h3>
                    <p className="text-slate-400 text-xs">Vui lòng nhập tài khoản và mật khẩu được cấp để làm việc.</p>
                  </div>

                  {/* ERROR FLASH */}
                  {loginError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl text-xs text-rose-450 font-medium flex items-center gap-2.5">
                      <span className="p-1 bg-rose-500/20 text-rose-400 rounded-lg shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                      <span>{loginError}</span>
                    </div>
                  )}

                  {/* FORM COMPONENT */}
                  <form onSubmit={handleLogin} className="space-y-4">
                    
                    {/* Username field */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tên tài khoản (Username)</label>
                      <div className="relative group">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 transition-colors group-focus-within:text-orange-400">
                          <User className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value)}
                          placeholder="ví dụ: admin"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Password field */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <label className="font-bold text-slate-400 uppercase tracking-wider">Mật khẩu (Password)</label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotUsername('');
                            setForgotFullName('');
                            setForgotNewPassword('');
                            setForgotConfirmPassword('');
                            setForgotStep(1);
                            setForgotError('');
                            setForgotSuccess('');
                            setShowForgotPasswordModal(true);
                          }}
                          className="font-bold text-orange-400 hover:text-orange-300 hover:underline transition-colors cursor-pointer animate-pulse"
                        >
                          Quên mật khẩu?
                        </button>
                      </div>
                      <div className="relative group">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 transition-colors group-focus-within:text-orange-400">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder-slate-6o0 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 transition-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-lg shadow-orange-950/10 hover:brightness-110 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2 cursor-pointer mt-2"
                      style={{ backgroundColor: logoIconColor }}
                    >
                      <UserCheck className="w-4 h-4" />
                      Truy cập hệ thống
                    </button>

                  </form>

                  {/* SIGN UP TOGGLE */}
                  <div className="text-center text-xs text-slate-400 select-none pt-1 border-t border-slate-800/40">
                    Chưa có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(true);
                        setRegisterError('');
                        setRegisterSuccess('');
                      }}
                      className="text-orange-400 font-bold hover:text-orange-300 transition-colors hover:underline cursor-pointer"
                    >
                      Đăng ký tài khoản mới ngay
                    </button>
                  </div>

                  {/* PRESENTS AUTOFILLS Badges */}
                  <div className="pt-2.5 space-y-2 border-t border-slate-800/30">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block text-center">Tài khoản dùng thử Demo</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      
                      {/* Admin Quick button */}
                      <button
                        type="button"
                        onClick={() => handleAutofill('admin', '12345')}
                        className="p-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-left hover:bg-slate-950 hover:border-orange-500/40 hover:shadow-md transition duration-200 flex flex-col justify-between cursor-pointer group"
                      >
                        <div className="w-full flex items-center justify-between mb-1.5">
                          <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/15 leading-none">Admin</span>
                          <User className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-white block group-hover:text-orange-400 transition-colors truncate">Tài khoản Quản trị</span>
                          <span className="text-[9px] text-slate-500 font-mono block truncate">admin / 12345</span>
                        </div>
                      </button>

                      {/* Staff Quick button */}
                      <button
                        type="button"
                        onClick={() => handleAutofill('nhanvien', '123')}
                        className="p-2.5 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-left hover:bg-slate-950 hover:border-orange-500/40 hover:shadow-md transition duration-200 flex flex-col justify-between cursor-pointer group"
                      >
                        <div className="w-full flex items-center justify-between mb-1.5">
                          <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/15 leading-none">Staff</span>
                          <User className="w-3 h-3 text-slate-600 group-hover:text-emerald-450 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold text-white block group-hover:text-orange-400 transition-colors truncate">Tài khoản Nhân viên</span>
                          <span className="text-[9px] text-slate-500 font-mono block truncate">nhanvien / 123</span>
                        </div>
                      </button>

                    </div>
                  </div>
                </>
              ) : (
                // REGISTER Giao diện
                <>
                  <div className="space-y-2 select-none">
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20 inline-block leading-none">
                      Đăng ký thành viên
                    </span>
                    <h3 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      <UserPlus className="w-6 h-6 text-orange-400" />
                      Đăng ký mới
                    </h3>
                    <p className="text-slate-400 text-xs">Vui lòng điền thông tin để đăng ký thành viên hệ thống.</p>
                  </div>

                  {/* ERROR/SUCCESS FLASH */}
                  {registerError && (
                    <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl text-xs text-rose-450 font-medium flex items-center gap-2 animate-pulse">
                      <span className="p-1 bg-rose-500/20 text-rose-450 rounded-md shrink-0">
                        <Lock className="w-3.5 h-3.5" />
                      </span>
                      <span>{registerError}</span>
                    </div>
                  )}
                  {registerSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl text-xs text-emerald-400 font-semibold flex items-center gap-2 animate-pulse">
                      <span className="p-1 bg-emerald-500/20 text-emerald-450 rounded-md shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </span>
                      <span>{registerSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-4">
                    
                    {/* Họ và tên */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Họ và tên nhân viên</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                          <User className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="ví dụ: Trần Văn C"
                          className="w-full pl-9.5 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder-slate-650 focus:outline-hidden focus:border-orange-500 transition-all font-sans"
                        />
                      </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tên đăng nhập (Username)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                          <User className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={regUsername}
                          onChange={(e) => setRegUsername(e.target.value)}
                          placeholder="ví dụ: nhanvien_c"
                          className="w-full pl-9.5 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-bold text-white placeholder-slate-650 focus:outline-hidden focus:border-orange-500 transition-all font-mono lowercase"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mật khẩu (Password)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                          <Lock className="w-4 h-4" />
                        </span>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Tối thiểu 3 ký tự..."
                          className="w-full pl-9.5 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-sm font-bold text-white placeholder-slate-650 focus:outline-hidden focus:border-orange-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Role segment */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vai trò thành viên</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRegRole('staff')}
                          className={`flex-grow py-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            regRole === 'staff'
                              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 font-extrabold'
                              : 'border-slate-800 text-slate-400 hover:bg-slate-950 bg-transparent'
                          }`}
                        >
                          Nhân viên (Staff)
                        </button>
                        <button
                          type="button"
                          onClick={() => setRegRole('admin')}
                          className={`flex-grow py-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                            regRole === 'admin'
                              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-extrabold'
                              : 'border-slate-800 text-slate-400 hover:bg-slate-950 bg-transparent'
                          }`}
                        >
                          Quản trị (Admin)
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-lg hover:filter hover:brightness-110 active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2 cursor-pointer mt-4"
                      style={{ backgroundColor: logoIconColor }}
                    >
                      <UserPlus className="w-4 h-4" />
                      Đăng ký tài khoản
                    </button>

                  </form>

                  {/* BACK TO LOGIN */}
                  <div className="text-center text-xs text-slate-400 pt-2 select-none border-t border-slate-800/40">
                    Đã có tài khoản?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setRegisterError('');
                        setRegisterSuccess('');
                      }}
                    >
                      Quay lại đăng nhập
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPasswordModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
            <div className="bg-slate-900 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col text-slate-100">
              
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 select-none">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg border border-orange-500/20">
                    <Key className="w-4.5 h-4.5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-white text-base">Khôi phục mật khẩu</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {forgotStep === 1 ? 'Xác minh thông tin tài khoản của bạn' : 'Thiết lập mật khẩu mới cho tài khoản'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowForgotPasswordModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {forgotError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-450 font-medium flex items-center gap-2.5">
                    <span className="shrink-0 p-1 bg-rose-500/20 text-rose-400 rounded-md">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotStep === 1 ? (
                  // STEP 1: VERIFICATION FORM
                  <form onSubmit={handleVerifyForgotPassword} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Tên tài khoản (Username)
                      </label>
                      <input
                        type="text"
                        required
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        placeholder="Nhập tên tài khoản của bạn"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-hidden focus:border-orange-500 transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Họ và tên đã đăng ký
                      </label>
                      <input
                        type="text"
                        required
                        value={forgotFullName}
                        onChange={(e) => setForgotFullName(e.target.value)}
                        placeholder="Nhập họ và tên đầy đủ của bạn"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-hidden focus:border-orange-500 transition-all"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3 select-none">
                      <button
                        type="button"
                        onClick={() => setShowForgotPasswordModal(false)}
                        className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Tiếp theo</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </form>
                ) : (
                  // STEP 2: RESET PASSWORD FORM
                  <form onSubmit={handleResetForgotPassword} className="space-y-4">
                    <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider">Tài khoản xác minh:</span>
                      <span className="text-sm font-bold text-orange-400 font-mono block">{forgotUsername}</span>
                      <span className="text-[11px] text-slate-300 block">{forgotFullName}</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Mật khẩu mới
                      </label>
                      <input
                        type="password"
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Mật khẩu từ 3 ký tự trở lên"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-hidden focus:border-orange-500 transition-all font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Xác nhận mật khẩu mới
                      </label>
                      <input
                        type="password"
                        required
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-semibold text-white placeholder-slate-600 focus:outline-hidden focus:border-orange-500 transition-all font-mono"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3 select-none">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="px-4 py-2 border border-slate-800 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        Quay lại
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Xác minh đặt lại</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 flex font-sans select-none antialiased w-full overflow-hidden">
      
      {/* PERSISTENT LEFT SIDEBAR - Visible on medium screens and up */}
      <aside className="hidden md:flex flex-col w-20 lg:w-[280px] bg-[#0b0f19] text-white shrink-0 h-screen sticky top-0 border-r border-slate-800/40 transition-all duration-300">
        
        {/* Top Header Section: Tiệm ảnh Caos logo */}
        <div 
          onClick={() => setShowLogoModal(true)}
          className="px-3 py-6 lg:px-6 border-b border-slate-800/40 flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-3.5 cursor-pointer hover:bg-white/5 transition duration-300"
          title="Thay đổi Logo & Thương hiệu"
        >
          {logoIconType === 'upload' && logoBase64 ? (
            <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-800 flex items-center justify-center bg-white shrink-0 shadow-md relative">
              <img src={logoBase64} alt="Custom Logo" className="w-full h-full object-cover animate-fade-in" />
            </div>
          ) : (
            <span 
              className="w-14 h-14 rounded-full text-white shrink-0 shadow-md flex items-center justify-center font-bold"
              style={{ backgroundColor: logoIconColor }}
            >
              {logoIconType === 'aperture' && <Aperture className="w-8 h-8" />}
              {logoIconType === 'film' && <Film className="w-8 h-8" />}
              {logoIconType === 'sparkles' && <Sparkles className="w-8 h-8 text-yellow-300" />}
              {logoIconType === 'smile' && <Smile className="w-8 h-8" />}
              {logoIconType === 'image' && <ImageIcon className="w-8 h-8" />}
              {(logoIconType === 'camera' || logoIconType === 'upload') && <CameraIcon className="w-8 h-8" />}
            </span>
          )}
          <div className="leading-tight hidden lg:block">
            <span className="font-display font-black text-white text-[15.5px] tracking-tight block uppercase">
              {logoText || 'TIỆM ẢNH NHÀ CAOS'}
            </span>
            <span className="text-[10px] text-slate-400 font-bold block tracking-wider uppercase mt-0.5">
              {logoSubtitle || 'CHO THUÊ MÁY ẢNH GIÁ RẺ'}
            </span>
          </div>
        </div>

        {/* Menu Title */}
        <div className="px-6 pt-5 pb-2 text-[11px] font-black uppercase tracking-widest text-slate-500 hidden lg:block">
          Menu chính
        </div>
        <div className="pt-2 pb-1 border-b border-slate-800/25 md:block lg:hidden"></div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-2.5 lg:px-4 space-y-2 lg:space-y-1.5 overflow-y-auto scrollbar-none py-3">
          
          {/* Calendar (Lịch máy) */}
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`w-full rounded-xl transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-between p-2 lg:p-3.5 cursor-pointer min-h-[52px] lg:min-h-0 ${
              activeTab === 'calendar'
                ? 'bg-orange-600 text-white shadow-md font-semibold font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
              <Calendar className={`w-5 h-5 lg:w-5.5 lg:h-5.5 shrink-0 ${activeTab === 'calendar' ? 'text-white' : 'text-slate-400'}`} />
              <div className="leading-tight hidden lg:block text-left">
                <span className="block text-[13.5px] font-extrabold tracking-tight">Lịch máy</span>
                <span className={`text-[11px] block mt-0.5 ${activeTab === 'calendar' ? 'text-orange-100 font-medium' : 'text-slate-500'}`}>Xem lịch đặt thiết bị</span>
              </div>
              <span className="text-[9.5px] font-bold block lg:hidden uppercase tracking-tight scale-90 whitespace-nowrap opacity-80">Lịch</span>
            </div>
            {activeTab === 'calendar' && <ChevronRight className="w-4.5 h-4.5 text-white hidden lg:block" />}
          </button>

          {/* Contracts (Đơn thuê) */}
          <button
            type="button"
            onClick={() => setActiveTab('contracts')}
            className={`w-full rounded-xl transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-between p-2 lg:p-3.5 cursor-pointer min-h-[52px] lg:min-h-0 ${
              activeTab === 'contracts'
                ? 'bg-orange-600 text-white shadow-md font-semibold font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
              <FileText className={`w-5 h-5 lg:w-5.5 lg:h-5.5 shrink-0 ${activeTab === 'contracts' ? 'text-white' : 'text-slate-400'}`} />
              <div className="leading-tight hidden lg:block text-left">
                <span className="block text-[13.5px] font-extrabold tracking-tight">Đơn thuê</span>
                <span className={`text-[11px] block mt-0.5 ${activeTab === 'contracts' ? 'text-orange-100 font-medium' : 'text-slate-500'}`}>Hợp đồng & trạng thái</span>
              </div>
              <span className="text-[9.5px] font-bold block lg:hidden uppercase tracking-tight scale-90 whitespace-nowrap opacity-80">Đơn</span>
            </div>
            {activeTab === 'contracts' && <ChevronRight className="w-4.5 h-4.5 text-white hidden lg:block" />}
          </button>

          {/* Equipment (Thiết bị) */}
          <button
            type="button"
            onClick={() => setActiveTab('equipment')}
            className={`w-full rounded-xl transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-between p-2 lg:p-3.5 cursor-pointer min-h-[52px] lg:min-h-0 ${
              activeTab === 'equipment'
                ? 'bg-orange-600 text-white shadow-md font-semibold font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
              <CameraIcon className={`w-5 h-5 lg:w-5.5 lg:h-5.5 shrink-0 ${activeTab === 'equipment' ? 'text-white' : 'text-slate-400'}`} />
              <div className="leading-tight hidden lg:block text-left">
                <span className="block text-[13.5px] font-extrabold tracking-tight">Thiết bị</span>
                <span className={`text-[11px] block mt-0.5 ${activeTab === 'equipment' ? 'text-orange-100 font-medium' : 'text-slate-500'}`}>Kho máy & lens</span>
              </div>
              <span className="text-[9.5px] font-bold block lg:hidden uppercase tracking-tight scale-90 whitespace-nowrap opacity-80">Thiết bị</span>
            </div>
            {activeTab === 'equipment' && <ChevronRight className="w-4.5 h-4.5 text-white hidden lg:block" />}
          </button>

          {/* Customers (Khách hàng) */}
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`w-full rounded-xl transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-between p-2 lg:p-3.5 cursor-pointer min-h-[52px] lg:min-h-0 ${
              activeTab === 'customers'
                ? 'bg-orange-600 text-white shadow-md font-semibold font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
              <Users className={`w-5 h-5 lg:w-5.5 lg:h-5.5 shrink-0 ${activeTab === 'customers' ? 'text-white' : 'text-slate-400'}`} />
              <div className="leading-tight hidden lg:block text-left">
                <span className="block text-[13.5px] font-extrabold tracking-tight">Khách hàng</span>
                <span className={`text-[11px] block mt-0.5 ${activeTab === 'customers' ? 'text-orange-100 font-medium' : 'text-slate-500'}`}>Hồ sơ đối tác</span>
              </div>
              <span className="text-[9.5px] font-bold block lg:hidden uppercase tracking-tight scale-90 whitespace-nowrap opacity-80">Khách</span>
            </div>
            {activeTab === 'customers' && <ChevronRight className="w-4.5 h-4.5 text-white hidden lg:block" />}
          </button>

          {/* Revenue (Doanh thu) */}
          <button
            type="button"
            onClick={() => setActiveTab('revenue')}
            className={`w-full rounded-xl transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-between p-2 lg:p-3.5 cursor-pointer min-h-[52px] lg:min-h-0 ${
              activeTab === 'revenue'
                ? 'bg-orange-600 text-white shadow-md font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
              <TrendingUp className={`w-5 h-5 lg:w-5.5 lg:h-5.5 shrink-0 ${activeTab === 'revenue' ? 'text-white' : 'text-slate-400'}`} />
              <div className="leading-tight hidden lg:block text-left">
                <span className="block text-[13.5px] font-extrabold tracking-tight">Doanh thu</span>
                <span className={`text-[11px] block mt-0.5 ${activeTab === 'revenue' ? 'text-orange-100 font-medium' : 'text-slate-500'}`}>Báo cáo tài chính</span>
              </div>
              <span className="text-[9.5px] font-bold block lg:hidden uppercase tracking-tight scale-90 whitespace-nowrap opacity-80">D.Thu</span>
            </div>
            {activeTab === 'revenue' && <ChevronRight className="w-4.5 h-4.5 text-white hidden lg:block" />}
          </button>

          {/* Expenses (Khoản chi) */}
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`w-full rounded-xl transition-all flex flex-col lg:flex-row items-center justify-center lg:justify-between p-2 lg:p-3.5 cursor-pointer min-h-[52px] lg:min-h-0 ${
              activeTab === 'expenses'
                ? 'bg-orange-600 text-white shadow-md font-semibold font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5 font-medium'
            }`}
          >
            <div className="flex flex-col lg:flex-row items-center gap-1 lg:gap-3">
              <DollarSign className={`w-5 h-5 lg:w-5.5 lg:h-5.5 shrink-0 ${activeTab === 'expenses' ? 'text-white' : 'text-slate-400'}`} />
              <div className="leading-tight hidden lg:block text-left">
                <span className="block text-[13.5px] font-extrabold tracking-tight">Khoản chi</span>
                <span className={`text-[11px] block mt-0.5 ${activeTab === 'expenses' ? 'text-orange-100 font-medium' : 'text-slate-500'}`}>Chi phí phát sinh</span>
              </div>
              <span className="text-[9.5px] font-bold block lg:hidden uppercase tracking-tight scale-90 whitespace-nowrap opacity-80">Chi</span>
            </div>
            {activeTab === 'expenses' && <ChevronRight className="w-4.5 h-4.5 text-white hidden lg:block" />}
          </button>

        </nav>

        {/* System Date Box */}
        <div className="mx-4 mb-4 bg-slate-900 border border-slate-800/80 p-3.5 rounded-xl select-none hidden lg:block">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-orange-500"></span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400">
              Ngày hệ thống
            </span>
          </div>
          <div className="text-sm font-black font-mono text-white mt-1 pointer-events-none">
            <span>{systemDate}</span>
          </div>
        </div>

        {/* Bottom User Profile Section */}
        <div className="relative p-3 lg:p-4 border-t border-slate-800/50 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-2.5 bg-slate-950/40">
          <div 
            onClick={() => setSidebarDropdownOpen(!sidebarDropdownOpen)}
            className="flex flex-col lg:flex-row items-center gap-2 lg:gap-2.5 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
            title="Tài khoản & Thiết lập"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
              <img 
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="text-center lg:text-left leading-tight min-w-0 hidden lg:block">
              <span className="block text-xs font-black text-white truncate max-w-[120px]">
                {currentUser?.fullName}
              </span>
              <span className="text-[9px] text-[#ea580c] font-bold uppercase tracking-wider block">
                ADMIN
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarDropdownOpen(!sidebarDropdownOpen)}
            className="hidden lg:block p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer shrink-0 relative"
            title="Tài khoản & Thiết lập"
          >
            <Settings className="w-4.5 h-4.5" />
          </button>

          {/* Sidebar-specific Profile Dropdown - opens upwards */}
          {sidebarDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40 cursor-default" onClick={() => setSidebarDropdownOpen(false)} />
              <div className="absolute left-3 bottom-full mb-2 w-60 bg-[#111827] border border-slate-800 rounded-xl shadow-2xl py-2 z-50 text-left text-xs text-slate-200 animate-fade-in">
                <div className="px-3 py-2 border-b border-slate-800 font-bold block bg-slate-950/60 text-white leading-snug">
                  {currentUser?.fullName}
                  <span className="block text-[10px] text-slate-500 mt-0.5 font-normal select-all">@{currentUser?.username}</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => { setSidebarDropdownOpen(false); setShowChangePasswordModal(true); }}
                  className="w-full px-3 py-3 hover:bg-slate-800/80 hover:text-white text-left font-bold block transition"
                >
                  Đổi mật khẩu
                </button>
                <button
                  type="button"
                  onClick={() => { setSidebarDropdownOpen(false); setShowChangeAvatarModal(true); }}
                  className="w-full px-3 py-3 hover:bg-slate-800/80 hover:text-white text-left font-bold block transition"
                >
                  Đổi ảnh đại diện
                </button>
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => { setSidebarDropdownOpen(false); setShowManageUsersModal(true); }}
                    className="w-full px-3 py-3 hover:bg-slate-800/80 hover:text-white text-left font-bold block transition"
                  >
                    Quản lý tài khoản
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setSidebarDropdownOpen(false); setShowBackupModal(true); }}
                  className="w-full px-3 py-3 hover:bg-slate-800/80 text-orange-400 hover:text-orange-300 font-extrabold block text-left transition"
                >
                  Sao lưu & Khôi phục
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  type="button"
                  onClick={() => { setSidebarDropdownOpen(false); handleLogout(); }}
                  className="w-full px-3 py-3 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 font-bold text-left block transition"
                >
                  Đăng xuất
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE PANORAMA */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* TOP PATH HEADER BAR */}
        <header className="bg-white/85 backdrop-blur-md border-b border-gray-150/75 sticky top-0 z-30 px-3 py-2 md:px-6 md:py-3.5 flex items-center justify-between select-none">
          
          {/* Breadcrumb path */}
          <div className="flex items-center gap-1 sm:gap-2 text-xs text-gray-500 font-bold">
            <span className="hidden sm:inline text-slate-400 font-bold uppercase tracking-wider text-[10px]">Hệ thống vận hành</span>
            <span className="hidden sm:inline text-slate-300">›</span>
            <span className="text-slate-800 font-black uppercase tracking-wider text-[11px] sm:text-[10px] sm:text-slate-700">
              {activeTab === 'calendar' && 'Lịch máy'}
              {activeTab === 'contracts' && 'Đơn thuê'}
              {activeTab === 'equipment' && 'Thiết bị'}
              {activeTab === 'revenue' && 'Doanh thu'}
              {activeTab === 'customers' && 'Khách hàng'}
              {activeTab === 'expenses' && 'Khoản chi'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Notification & User Panel for both Mobile & Desktop */}
            <div 
              className="bg-orange-50/95 border border-orange-105/80 text-orange-950 px-2.5 sm:px-3.5 py-1 rounded-full flex items-center gap-1.5 text-[10px] sm:text-xs font-extrabold shrink-0 select-none shadow-3xs"
              title="Ngày hoạt động của hệ thống"
            >
              <Calendar className="w-3.5 h-3.5 text-orange-600" />
              <span>Hệ thống: <span className="font-mono font-black">{systemDate}</span></span>
            </div>
            
            <NotificationCenter
              contracts={contracts}
              cameras={cameras}
              onUpdateContractStatus={handleUpdateContractStatus}
              systemDate={systemDate}
              setSystemDate={setSystemDate}
            />

            {/* Profile Dropdown for safety / logout */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden border border-gray-200 bg-white flex items-center justify-center cursor-pointer"
              >
                <img 
                  src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                />
              </button>
              
              {profileDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setProfileDropdownOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 text-left text-xs text-gray-800 animate-fade-in">
                    <div className="px-3 py-2 border-b border-gray-150 font-bold block bg-gray-50 text-gray-900 leading-snug">
                      {currentUser?.fullName}
                      <span className="block text-[10px] text-gray-400 mt-0.5 font-normal select-all">@{currentUser?.username}</span>
                    </div>
                    
                    {/* General profile links */}
                    <button
                      type="button"
                      onClick={() => { setProfileDropdownOpen(false); setShowChangePasswordModal(true); }}
                      className="w-full px-3 py-2 hover:bg-orange-50 text-left font-bold block"
                    >
                      Đổi mật khẩu
                    </button>
                    <button
                      type="button"
                      onClick={() => { setProfileDropdownOpen(false); setShowChangeAvatarModal(true); }}
                      className="w-full px-3 py-2 hover:bg-orange-50 text-left font-bold block"
                    >
                      Đổi ảnh đại diện
                    </button>
                    {currentUser?.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => { setProfileDropdownOpen(false); setShowManageUsersModal(true); }}
                        className="w-full px-3 py-2 hover:bg-orange-50 text-left font-bold block"
                      >
                        Quản lý tài khoản
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => { setProfileDropdownOpen(false); setShowBackupModal(true); }}
                      className="w-full px-3 py-2 hover:bg-orange-50 text-left text-orange-600 font-extrabold block"
                    >
                      Sao lưu & Khôi phục
                    </button>
                    <div className="border-t border-gray-150/85 my-1" />
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-3 py-2 hover:bg-rose-50 text-rose-600 font-bold text-left block"
                    >
                      Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* MOBILE NAVIGATION BAR - iOS Style with safe area padding */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] pb-[calc(11px+env(safe-area-inset-bottom))] pt-2 px-1 flex justify-around items-center select-none">
          {/* Lịch máy */}
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-[10px] font-extrabold ${
              activeTab === 'calendar' ? 'text-orange-600 scale-102' : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <Calendar className={`w-5 h-5 mb-1 transition-transform ${activeTab === 'calendar' ? 'text-orange-600 scale-110' : 'text-gray-400'}`} />
            <span>Lịch máy</span>
          </button>
          
          {/* Đơn thuê */}
          <button
            type="button"
            onClick={() => setActiveTab('contracts')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-[10px] font-extrabold ${
              activeTab === 'contracts' ? 'text-orange-600 scale-102' : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <FileText className={`w-5 h-5 mb-1 transition-transform ${activeTab === 'contracts' ? 'text-orange-600 scale-110' : 'text-gray-400'}`} />
            <span>Đơn thuê</span>
          </button>

          {/* Thiết bị */}
          <button
            type="button"
            onClick={() => setActiveTab('equipment')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-[10px] font-extrabold ${
              activeTab === 'equipment' ? 'text-orange-600 scale-102' : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <CameraIcon className={`w-5 h-5 mb-1 transition-transform ${activeTab === 'equipment' ? 'text-orange-600 scale-110' : 'text-gray-400'}`} />
            <span>Thiết bị</span>
          </button>

          {/* Khách hàng */}
          <button
            type="button"
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-[10px] font-extrabold ${
              activeTab === 'customers' ? 'text-orange-600 scale-102' : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <Users className={`w-5 h-5 mb-1 transition-transform ${activeTab === 'customers' ? 'text-orange-600 scale-110' : 'text-gray-400'}`} />
            <span>Khách</span>
          </button>

          {/* Doanh thu */}
          <button
            type="button"
            onClick={() => setActiveTab('revenue')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-[10px] font-extrabold ${
              activeTab === 'revenue' ? 'text-orange-600 scale-102' : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <TrendingUp className={`w-5 h-5 mb-1 transition-transform ${activeTab === 'revenue' ? 'text-orange-600 scale-110' : 'text-gray-400'}`} />
            <span>Doanh thu</span>
          </button>

          {/* Khoản chi */}
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-all text-[10px] font-extrabold ${
              activeTab === 'expenses' ? 'text-orange-600 scale-102' : 'text-gray-400 active:text-gray-600'
            }`}
          >
            <DollarSign className={`w-5 h-5 mb-1 transition-transform ${activeTab === 'expenses' ? 'text-orange-600 scale-110' : 'text-gray-400'}`} />
            <span>Khoản chi</span>
          </button>
        </div>

        {/* MAIN BODY AREA */}
        <main className="flex-grow w-full px-4 sm:px-6 md:px-8 py-6 pb-26 md:pb-6 overflow-y-auto">
          {/* Header row in main panel content */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 sm:pb-4 mb-4 sm:mb-6 border-b border-gray-150">
            <div className="space-y-0.5">
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-[#ea580c] font-display">HỆ THỐNG VẬN HÀNH</span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                {activeTab === 'calendar' && 'Lịch máy'}
                {activeTab === 'contracts' && 'Hợp đồng & Đơn thuê'}
                {activeTab === 'equipment' && 'Kho thiết bị'}
                {activeTab === 'revenue' && 'Báo cáo doanh thu'}
                {activeTab === 'customers' && 'Hồ sơ khách hàng'}
                {activeTab === 'expenses' && 'Nhật ký khoản chi'}
              </h1>
            </div>
            
            <div className="text-[10px] sm:text-xs text-gray-500 font-bold bg-white border border-gray-150 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl shadow-3xs flex items-center gap-1.5 self-start sm:self-auto select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse inline-block"></span>
              <span>Cập nhật mới nhất:</span>
              <span className="text-gray-800 font-extrabold">Hôm nay</span>
            </div>
          </div>

          <div className="transition-all duration-200">
            {activeTab === 'calendar' && (
              <BookingCalendar
                cameras={cameras}
                contracts={contracts}
                onAddContract={handleAddContract}
                onDeleteContract={currentUser?.role === 'admin' ? handleDeleteContract : undefined}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                systemDate={systemDate}
              />
            )}

            {activeTab === 'contracts' && (
              <ContractManager
                contracts={contracts}
                cameras={cameras}
                onAddContract={handleAddContract}
                onUpdateContractStatus={handleUpdateContractStatus}
                onDeleteContract={currentUser?.role === 'admin' ? handleDeleteContract : undefined}
                onUpdateContractNote={handleUpdateContractNote}
                systemDate={systemDate}
              />
            )}

            {activeTab === 'equipment' && (
              <EquipmentTracker
                cameras={cameras}
                onAddCamera={handleAddCamera}
                onUpdateCamera={handleUpdateCamera}
                onDeleteCamera={handleDeleteCamera}
                currentUserRole={currentUser?.role}
                contracts={contracts}
                systemDate={systemDate}
              />
            )}

            {activeTab === 'revenue' && (
              currentUser?.role === 'admin' ? (
                <RevenueDashboard
                  contracts={contracts}
                  expenses={expenses}
                  cameras={cameras}
                />
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-150 shadow-xs">
                  <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900">Không có quyền truy cập</h3>
                  <p className="text-sm text-gray-500 mt-1">Vui lòng đăng nhập tài khoản Quản trị viên (Admin) để xem báo cáo tài chính.</p>
                </div>
              )
            )}

            {activeTab === 'customers' && (
              <CustomerManager
                customers={customers}
                contracts={contracts}
                onAddCustomer={handleAddCustomer}
                onUpdateCustomer={handleUpdateCustomer}
                onDeleteCustomer={currentUser?.role === 'admin' ? handleDeleteCustomer : undefined}
              />
            )}

            {activeTab === 'expenses' && (
              currentUser?.role === 'admin' ? (
                <ExpenseTracker
                  expenses={expenses}
                  onAddExpense={handleAddExpense}
                  onDeleteExpense={handleDeleteExpense}
                />
              ) : (
                <div className="bg-white rounded-2xl p-8 text-center border border-gray-150 shadow-xs">
                  <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900">Không có quyền truy cập</h3>
                  <p className="text-sm text-gray-500 mt-1">Vui lòng đăng nhập tài khoản Quản trị viên (Admin) để quản lý ngân sách khoản chi.</p>
                </div>
              )
            )}
          </div>
        </main>

      </div>

      {/* Modern Logo Customization Modal */}
      {showLogoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-gray-150 flex justify-between items-center bg-gray-50/70 select-none">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Cài đặt Logo & Thương hiệu</h3>
                <p className="text-xs text-gray-400 mt-0.5">Tùy chỉnh biểu tượng, tên thương hiệu hiển thị trên thanh tiêu đề</p>
              </div>
              <button
                onClick={() => setShowLogoModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Content - Scrollable if small screen */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* BRAND LOGO PREVIEW BOX */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/60 text-center flex flex-col items-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">Xem trước hiển thị (Header)</span>
                <div className="bg-white border border-gray-150 p-4 rounded-xl shadow-sm inline-flex items-center gap-3.5 min-w-[240px] justify-center">
                  {logoIconType === 'upload' && logoBase64 ? (
                    <div className="w-14 h-14 rounded-full overflow-hidden border border-gray-150 flex items-center justify-center bg-white shrink-0 shadow-xs">
                      <img src={logoBase64} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <span 
                      className="w-14 h-14 rounded-full text-white shrink-0 flex items-center justify-center font-bold shadow-xs"
                      style={{ backgroundColor: logoIconColor }}
                    >
                      {logoIconType === 'aperture' && <Aperture className="w-8 h-8" />}
                      {logoIconType === 'film' && <Film className="w-8 h-8" />}
                      {logoIconType === 'sparkles' && <Sparkles className="w-8 h-8 text-yellow-200" />}
                      {logoIconType === 'smile' && <Smile className="w-8 h-8" />}
                      {logoIconType === 'image' && <ImageIcon className="w-8 h-8" />}
                      {(logoIconType === 'camera' || logoIconType === 'upload') && <CameraIcon className="w-8 h-8" />}
                    </span>
                  )}
                  <div className="leading-tight text-left">
                    <span className="font-display font-black text-gray-950 text-[15.5px] tracking-tight block uppercase">
                      {logoText || 'TIỆM ẢNH NHÀ CAOS'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold block tracking-wider uppercase mt-0.5">
                      {logoSubtitle || 'CHO THUÊ MÁY ẢNH GIÁ RẺ'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form entries */}
              <div className="space-y-4">
                
                {/* Brand Name Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Tên thương hiệu chính</label>
                  <input
                    type="text"
                    maxLength={20}
                    value={logoText}
                    onChange={(e) => setLogoText(e.target.value)}
                    placeholder="ví dụ: CAMLEASE"
                    className="w-full px-3 py-2 text-sm border border-gray-250 rounded-lg focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-semibold"
                  />
                </div>

                {/* Tagline / Subtitle Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Dòng chữ phụ (Subtitle/Version)</label>
                  <input
                    type="text"
                    maxLength={30}
                    value={logoSubtitle}
                    onChange={(e) => setLogoSubtitle(e.target.value)}
                    placeholder="ví dụ: SYSTEM v1.0"
                    className="w-full px-3 py-2 text-sm border border-gray-250 rounded-lg focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono text-gray-650 text-xs"
                  />
                </div>

                {/* Icon option selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Phương thức & Kiểu biểu tượng (Icon)</label>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    
                    {/* Camera */}
                    <button
                      type="button"
                      onClick={() => setLogoIconType('camera')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        logoIconType === 'camera'
                          ? 'border-orange-500 bg-orange-50/40 text-orange-600 font-bold'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <CameraIcon className="w-5 h-5" />
                      <span className="text-[10px]">Máy ảnh</span>
                    </button>

                    {/* Aperture */}
                    <button
                      type="button"
                      onClick={() => setLogoIconType('aperture')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        logoIconType === 'aperture'
                          ? 'border-orange-500 bg-orange-50/40 text-orange-600 font-bold'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Aperture className="w-5 h-5" />
                      <span className="text-[10px]">Khẩu độ</span>
                    </button>

                    {/* Film */}
                    <button
                      type="button"
                      onClick={() => setLogoIconType('film')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        logoIconType === 'film'
                          ? 'border-orange-500 bg-orange-50/40 text-orange-600 font-bold'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Film className="w-5 h-5" />
                      <span className="text-[10px]">Cuộn phim</span>
                    </button>

                    {/* Sparkles */}
                    <button
                      type="button"
                      onClick={() => setLogoIconType('sparkles')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        logoIconType === 'sparkles'
                          ? 'border-orange-500 bg-orange-50/40 text-orange-600 font-bold'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Sparkles className="w-5 h-5" />
                      <span className="text-[10px]">Lấp lánh</span>
                    </button>

                    {/* Smile */}
                    <button
                      type="button"
                      onClick={() => setLogoIconType('smile')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        logoIconType === 'smile'
                          ? 'border-orange-500 bg-orange-50/40 text-orange-600 font-bold'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Smile className="w-5 h-5" />
                      <span className="text-[10px]">Thân thiện</span>
                    </button>

                    {/* Image */}
                    <button
                      type="button"
                      onClick={() => setLogoIconType('image')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition ${
                        logoIconType === 'image'
                          ? 'border-orange-500 bg-orange-50/40 text-orange-600 font-bold'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-[10px]">Hình ảnh</span>
                    </button>

                    {/* Custom upload Trigger */}
                    <button
                      type="button"
                      onClick={() => setLogoIconType('upload')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all col-span-2 ${
                        logoIconType === 'upload'
                          ? 'border-orange-500 bg-orange-50/40 text-orange-600 font-bold'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <Upload className="w-4 h-4 shrink-0" />
                        <span className="text-[10px] truncate max-w-[80px]">
                          {logoBase64 ? 'Đã tải ảnh' : 'Tải ảnh lên'}
                        </span>
                      </div>
                      <span className="text-[9px] text-gray-400 font-normal truncate">Logo tự chọn (.png/.jpg)</span>
                    </button>
                    
                  </div>

                  {/* Real upload file block */}
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-150 flex items-center justify-between gap-4 text-xs">
                    <div className="min-w-0">
                      <span className="block font-semibold text-gray-700">Tải tệp ảnh lên</span>
                      <span className="text-[10px] text-gray-400 block truncate">Khuyên dùng tỷ lệ 1:1, ảnh nhỏ, trong suốt</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        id="logo-upload-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoBase64(reader.result as string);
                              setLogoIconType('upload');
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="logo-upload-input"
                        className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-250 px-2.5 py-1.5 rounded-lg font-bold text-[11px] cursor-pointer transition shrink-0 inline-block text-center"
                      >
                        Chọn tệp
                      </label>
                      {logoBase64 && (
                        <button
                          type="button"
                          onClick={() => {
                            setLogoBase64('');
                            if (logoIconType === 'upload') {
                              setLogoIconType('camera');
                            }
                          }}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg border border-rose-150 transition cursor-pointer"
                          title="Xóa ảnh tự chọn"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Icon Background colors selection - only showing if NOT custom picture */}
                {logoIconType !== 'upload' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Màu nền biểu tượng</label>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {[
                        { color: '#ea580c', name: 'Cam' },
                        { color: '#2563eb', name: 'Xanh dương' },
                        { color: '#dc2626', name: 'Đỏ thẫm' },
                        { color: '#059669', name: 'Xanh lá' },
                        { color: '#4f46e5', name: 'Tím Indigo' },
                        { color: '#d97706', name: 'Vàng hổ phách' },
                        { color: '#1f2937', name: 'Xám đậm' },
                        { color: '#db2777', name: 'Hồng sen' }
                      ].map((item) => (
                        <button
                          key={item.color}
                          type="button"
                          onClick={() => setLogoIconColor(item.color)}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition hover:scale-110 cursor-pointer border border-black/10 relative"
                          style={{ backgroundColor: item.color }}
                          title={item.name}
                        >
                          {logoIconColor === item.color && (
                            <Check className="w-4 h-4 text-white drop-shadow-xs" />
                          )}
                        </button>
                      ))}
                      
                      {/* Custom color picker */}
                      <div className="flex items-center gap-1.5 ml-2 border-l border-gray-200 pl-3">
                        <input
                          type="color"
                          id="logo-color-picker"
                          value={logoIconColor}
                          onChange={(e) => setLogoIconColor(e.target.value)}
                          className="w-6 h-6 p-0 border-0 rounded-md cursor-pointer outline-none shrink-0"
                        />
                        <label htmlFor="logo-color-picker" className="text-[10px] text-gray-500 font-mono font-bold uppercase cursor-pointer">
                          {logoIconColor}
                        </label>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4.5 border-t border-gray-150 bg-gray-50/60 flex items-center justify-between gap-3 select-none">
              <button
                type="button"
                onClick={() => {
                  setLogoText('CAMLEASE');
                  setLogoSubtitle('SYSTEM v1.0');
                  setLogoIconType('camera');
                  setLogoIconColor('#ea580c');
                  setLogoBase64('');
                }}
                className="text-xs text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                Khôi phục mặc định
              </button>

              <button
                type="button"
                onClick={() => setShowLogoModal(false)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs cursor-pointer"
              >
                Hoàn tất
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-gray-150 flex justify-between items-center bg-gray-50/70 select-none">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                  <Key className="w-4.5 h-4.5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Đổi mật khẩu</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Đặt lại khóa an toàn cho tài khoản cá nhân của bạn</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Content Form */}
            <form onSubmit={handleChangePassword}>
              <div className="p-6 space-y-4">
                
                {/* FEEDBACK LABELS */}
                {changePasswordError && (
                  <div className="bg-rose-50 border border-rose-150 p-3 rounded-xl text-xs text-rose-600 font-medium">
                    {changePasswordError}
                  </div>
                )}
                {changePasswordSuccess && (
                  <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl text-xs text-emerald-650 font-semibold">
                    {changePasswordSuccess}
                  </div>
                )}

                {/* Old password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    required
                    value={changePasswordState.oldPassword}
                    onChange={(e) => setChangePasswordState(prev => ({ ...prev, oldPassword: e.target.value }))}
                    placeholder="Nhập khóa hiện tại..."
                    className="w-full px-3 py-2 text-sm border border-gray-250 rounded-lg focus:outline-hidden focus:border-orange-500 font-mono text-gray-800"
                  />
                </div>

                {/* New password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={changePasswordState.newPassword}
                    onChange={(e) => setChangePasswordState(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Mật khẩu mới (tối thiểu 3 ký tự)..."
                    className="w-full px-3 py-2 text-sm border border-gray-250 rounded-lg focus:outline-hidden focus:border-orange-500 font-mono text-gray-800"
                  />
                </div>

                {/* Confirm password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider font-sans">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    required
                    value={changePasswordState.confirmPassword}
                    onChange={(e) => setChangePasswordState(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Xác nhận lại khóa mới..."
                    className="w-full px-3 py-2 text-sm border border-gray-250 rounded-lg focus:outline-hidden focus:border-orange-500 font-mono text-gray-800"
                  />
                </div>

              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 border-t border-gray-155 bg-gray-50/70 flex items-center justify-end gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setShowChangePasswordModal(false)}
                  className="px-3.5 py-1.5 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-900 transition cursor-pointer"
                >
                  Đóng lại
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                >
                  Cập nhật mật khẩu
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Change Avatar Modal */}
      {showChangeAvatarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col">
            
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-gray-150 flex justify-between items-center bg-gray-50/70 select-none">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                  <User className="w-4.5 h-4.5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Đổi ảnh đại diện</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Tải ảnh tùy chọn hoặc chọn ảnh từ bộ sưu tập cao cấp có sẵn</p>
                </div>
              </div>
              <button
                onClick={() => setShowChangeAvatarModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Custom Content */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
              
              {/* Central Premium Circle Preview */}
              <div className="text-center space-y-1.5 select-none">
                <div className="w-20 h-20 rounded-full border-4 border-orange-500/20 p-0.5 shadow-md flex items-center justify-center overflow-hidden mx-auto bg-gray-50">
                  <img 
                    src={selectedAvatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces'} 
                    alt="Preview avatar" 
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces';
                    }}
                  />
                </div>
                <span className="inline-block px-2.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-500 text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Xem trước ảnh hiển thị
                </span>
              </div>

              {/* Upload image form */}
              <div className="bg-gray-50/80 border border-gray-150 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <span className="block font-bold text-xs text-gray-700 uppercase tracking-wider">Tải ảnh lên từ máy</span>
                    <span className="text-[10px] text-gray-400 block truncate">Hỗ trợ tệp PNG, JPG, JPEG tiện lợi</span>
                  </div>
                  <div className="shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      id="avatar-file-upload-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setSelectedAvatarUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <label
                      htmlFor="avatar-file-upload-input"
                      className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-250 px-3.5 py-2 rounded-lg font-bold text-xs cursor-pointer transition inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-gray-500" />
                      <span>Chọn tệp ảnh</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Presets Gallery Grid */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Chọn nhanh từ bộ sưu tập</label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                  {PRESET_AVATARS.map((presetUrl, idx) => {
                    const isSelected = selectedAvatarUrl === presetUrl;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAvatarUrl(presetUrl)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-orange-500 scale-95 shadow-md ring-2 ring-orange-500/10' 
                            : 'border-transparent hover:border-gray-300 hover:scale-105'
                        }`}
                      >
                        <img src={presetUrl} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-orange-600/10 flex items-center justify-center">
                            <span className="bg-orange-600 text-white rounded-full p-0.5 shadow-sm">
                              <Check className="w-3 h-3" />
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manual URL Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Đường dẫn ảnh tùy ý (URL)</label>
                <input
                  type="text"
                  value={selectedAvatarUrl.startsWith('data:') ? '' : selectedAvatarUrl}
                  onChange={(e) => setSelectedAvatarUrl(e.target.value)}
                  placeholder="Dán liên kết ảnh từ Internet (ví dụ: https://...)"
                  className="w-full px-3 py-2 text-sm border border-gray-250 rounded-lg focus:outline-hidden focus:border-orange-500 text-gray-800"
                />
              </div>

            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-gray-155 bg-gray-50/70 flex items-center justify-end gap-3 select-none">
              <button
                type="button"
                onClick={() => setShowChangeAvatarModal(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-900 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleChangeAvatar(selectedAvatarUrl)}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
              >
                Lưu cập nhật
              </button>
            </div>

          </div>
        </div>
      )}



      {/* Admin User / Account Management Modal */}
      {showManageUsersModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-gray-150 flex justify-between items-center bg-gray-50/70 select-none">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-650 rounded-lg">
                  <UserPlus className="w-4.5 h-4.5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Quản lý Tài khoản Hệ thống</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Thêm, xóa và giám sát thông tin nội bộ của các kỹ thuật viên vận hành</p>
                </div>
              </div>
              <button
                onClick={() => setShowManageUsersModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Split Content: Add User and User List */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
              
              {/* Left Column: Form to register a user */}
              <div className="md:w-5/12 space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100 select-none">
                  Đăng ký tài khoản mới
                </h4>

                {staffError && (
                  <div className={`p-2.5 rounded-lg text-xs font-semibold ${
                    staffError.includes('thành công') 
                      ? 'bg-emerald-50 text-emerald-650 border border-emerald-150' 
                      : 'bg-rose-50 text-rose-650 border border-rose-150'
                  }`}>
                    {staffError}
                  </div>
                )}

                <form onSubmit={handleAddNewStaff} className="space-y-3.5 text-xs font-medium">
                  
                  {/* Full Name */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-705">Họ và tên nhân viên</label>
                    <input
                      type="text"
                      required
                      value={newStaffUser.fullName}
                      onChange={(e) => setNewStaffUser(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="ví dụ: Nguyễn Văn A"
                      className="w-full px-2.5 py-2 border border-gray-250 rounded-lg text-xs font-semibold text-gray-800"
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-705">Tên đăng nhập (Username)</label>
                    <input
                      type="text"
                      required
                      value={newStaffUser.username}
                      onChange={(e) => setNewStaffUser(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="ví dụ: nhanvien_a"
                      className="w-full px-2.5 py-2 border border-gray-250 rounded-lg text-xs font-bold text-gray-800 font-mono lowercase"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-705">Mật khẩu cấp ban đầu</label>
                    <input
                      type="text"
                      required
                      value={newStaffUser.password}
                      onChange={(e) => setNewStaffUser(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mật khẩu truy cập..."
                      className="w-full px-2.5 py-2 border border-gray-250 rounded-lg text-xs font-bold text-gray-800 font-mono"
                    />
                  </div>

                  {/* Role selection */}
                  <div className="space-y-1">
                    <label className="block font-bold text-gray-705">Phân cấp vai trò</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setNewStaffUser(prev => ({ ...prev, role: 'staff' }))}
                        className={`flex-grow py-1.5 rounded-lg border text-[11px] font-bold transition text-center ${
                          newStaffUser.role === 'staff'
                            ? 'border-green-500 bg-green-50/40 text-green-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50 bg-white'
                        }`}
                      >
                        Nhân viên (Staff)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewStaffUser(prev => ({ ...prev, role: 'admin' }))}
                        className={`flex-grow py-1.5 rounded-lg border text-[11px] font-bold transition text-center ${
                          newStaffUser.role === 'admin'
                            ? 'border-indigo-500 bg-indigo-50/40 text-indigo-700'
                            : 'border-gray-200 text-gray-500 hover:bg-gray-50 bg-white'
                        }`}
                      >
                        Quản trị (Admin)
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-850 transition flex items-center justify-center gap-1.5 mt-2 cursor-pointer text-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Đăng ký tài khoản
                  </button>

                </form>

              </div>

              {/* Right Column: User list visualization */}
              <div className="flex-1 space-y-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider pb-2 border-b border-gray-100 select-none">
                  Danh sách tài khoản ({registeredUsers.length})
                </h4>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {registeredUsers.map((user: any) => (
                    <div 
                      key={user.id} 
                      className={`p-3 border rounded-xl flex items-center justify-between gap-3 transition-colors ${
                        user.id === currentUser?.id ? 'border-orange-250 bg-orange-50/15' : 'border-gray-150 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-gray-150">
                          <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-gray-950 truncate block">
                              {user.fullName}
                            </span>
                            {user.id === currentUser?.id && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 border border-amber-200/50 px-1 py-0.5 rounded-md font-bold uppercase shrink-0 leading-none">
                                Bạn
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gray-450 mt-0.5">
                            <span className="font-mono text-[10px] text-gray-500">@{user.username}</span>
                            <span>•</span>
                            <span className="font-mono text-[10px] text-gray-400">MK: <span className="font-bold text-indigo-500">{user.password}</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Role & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          user.role === 'admin' 
                            ? 'bg-indigo-50 text-indigo-650 border border-indigo-150/40' 
                            : 'bg-green-50 text-green-650 border border-green-150/40'
                        }`}>
                          {user.role}
                        </span>
                        
                        {/* Remove actions - cannot delete yourself */}
                        {user.id !== currentUser?.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của [${user.fullName}]?`)) {
                                handleDeleteStaff(user.id);
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-150 transition cursor-pointer"
                            title="Xóa tài khoản này"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <div className="w-7 h-7" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

              </div>

            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-gray-150 bg-gray-50/60 flex items-center justify-end select-none">
              <button
                type="button"
                onClick={() => setShowManageUsersModal(false)}
                className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs px-4 py-2 rounded-lg transition"
              >
                Hoàn tất
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Sao lưu & Khôi phục Dữ liệu Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-gray-150 flex justify-between items-center bg-gray-50/70 select-none">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-orange-50 text-orange-600 rounded-lg">
                  <Database className="w-4.5 h-4.5" />
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Sao lưu & Khôi phục dữ liệu</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Tải tệp tin sao lưu hoặc quản lý điểm khôi phục nhanh cục bộ</p>
                </div>
              </div>
              <button
                onClick={() => setShowBackupModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* 1. TẢI VỀ & NHẬP TỆP SAO LƯU */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5">
                  <FileDown className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Quản lý tệp tin sao lưu (.json)</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Xuất dữ liệu hệ thống (thiết bị, đơn thuê, đối tác, khoản chi) thành tệp tin JSON tải về máy cá nhân của bạn để cất giữ an toàn.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1.5">
                  
                  {/* Export Button */}
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex flex-col items-center justify-center p-4 border border-indigo-100 bg-indigo-50/25 rounded-xl hover:bg-indigo-50/55 hover:border-indigo-200 transition cursor-pointer text-center group"
                  >
                    <Download className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-sm text-indigo-950">Xuất dữ liệu (.json)</span>
                    <span className="text-[10px] text-indigo-550 mt-1">Tải xuống tệp lưu trữ</span>
                  </button>

                   {/* Import Button with file input */}
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const content = evt.target?.result as string;
                            if (content) {
                              if (confirm('CẢNH BÁO: Việc khôi phục dữ liệu từ tệp tin sẽ thay thế TOÀN BỘ dữ liệu hiện tại trên hệ thống. Bạn có muốn tiếp tục?')) {
                                handleImportBackup(content);
                              }
                            }
                            e.target.value = '';
                          };
                          reader.readAsText(file);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center p-4 border border-dashed border-gray-200 hover:border-orange-300 bg-gray-50/50 hover:bg-orange-50/20 rounded-xl transition cursor-pointer text-center group h-full w-full"
                    >
                      <Upload className="w-6 h-6 text-gray-400 group-hover:text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-sm text-gray-800">Nhập dữ liệu từ máy</span>
                      <span className="text-[10px] text-gray-400 mt-1">Hỗ trợ định dạng .json</span>
                    </button>
                  </div>

                </div>

                {importError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-xs text-red-650 rounded-xl font-medium mt-2">
                    🚫 Lỗi khôi phục: {importError}
                  </div>
                )}
              </div>

              {/* 2. ĐIỂM SAO LƯU NHANH CỤC BỘ */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-orange-500" />
                  <span>Điểm khôi phục nhanh (Lập tức)</span>
                </h4>
                <p className="text-xs text-gray-500">
                  Lưu tạm một bản sao lưu toàn bộ dữ liệu hiện tại trên bộ nhớ trình duyệt máy khách (LocalStorage). Giúp bạn khôi phục lại trạng thái cũ ngay lập tức nếu thao tác nhầm lẫn.
                </p>

                {/* Form to Create Snapshot */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    maxLength={50}
                    value={newSnapshotName}
                    onChange={(e) => setNewSnapshotName(e.target.value)}
                    placeholder="ví dụ: Trước khi chốt doanh số tháng..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-250 rounded-lg focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-semibold text-gray-800"
                  />
                  <button
                    type="button"
                    onClick={() => handleCreateLocalSnapshot(newSnapshotName)}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-lg transition shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu nhanh</span>
                  </button>
                </div>

                {/* Snapshot List */}
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                  {snapshots.length === 0 ? (
                    <div className="p-6 border border-dashed border-gray-150 rounded-xl text-center text-xs text-gray-400 select-none">
                      Chưa có điểm khôi phục nhanh nào được lưu trữ cục bộ.
                    </div>
                  ) : (
                    snapshots.map((snap) => (
                      <div 
                        key={snap.id}
                        className="bg-gray-50 border border-gray-200/80 rounded-xl p-3 flex justify-between items-center gap-4 hover:border-gray-300 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="block font-bold text-xs text-gray-900 truncate">
                            {snap.name}
                          </span>
                          <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-400 font-mono mt-1">
                            <span className="font-sans font-medium text-indigo-500 bg-indigo-50 border border-indigo-100/30 px-1 py-0.2 rounded shrink-0">
                              Hệ thống: {snap.systemDate || 'Không rõ'}
                            </span>
                            <span>•</span>
                            <span className="truncate">Lưu lúc: {new Date(snap.date).toLocaleString('vi-VN')}</span>
                          </div>
                          
                          {/* Snapshot indicators */}
                          {snap.data && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] font-bold text-gray-500 font-mono mt-1.5 uppercase tracking-wider">
                              <span className="bg-slate-150 text-gray-600 rounded px-1.5 py-0.5">{(snap.data.contracts || []).length} Đơn lẻ</span>
                              <span className="bg-slate-150 text-gray-600 rounded px-1.5 py-0.5">{(snap.data.cameras || []).length} Thiết bị</span>
                              <span className="bg-slate-150 text-gray-600 rounded px-1.5 py-0.5">{(snap.data.customers || []).length} Khách hàng</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 select-none">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Khôi phục toàn bộ trạng thái hệ thống về điểm chụp: "${snap.name}"? Dữ liệu hiện tại chưa được lưu sẽ mất.`)) {
                                handleRestoreSnapshot(snap);
                              }
                            }}
                            className="bg-white hover:bg-green-50 text-gray-650 hover:text-green-700 border border-gray-200 hover:border-green-300 text-[10.5px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-0.5 shrink-0"
                            title="Khôi phục trạng thái này"
                          >
                            <RefreshCw className="w-3 h-3 text-green-600 shrink-0" />
                            <span>Phục hồi</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap.id, snap.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0 cursor-pointer border border-transparent hover:border-red-150"
                            title="Xóa điểm chụp này"
                          >
                            <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4.5 border-t border-gray-150 bg-gray-50/70 flex items-center justify-end select-none">
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow-xs"
              >
                Hoàn tất cài đặt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Global Toast Notifications Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
