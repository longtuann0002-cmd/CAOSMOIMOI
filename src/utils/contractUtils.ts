import { RentalContract } from '../types';

/**
 * Trích xuất số thứ tự từ mã hợp đồng (ví dụ: "HD-2026-104" -> 104, "HD-005" -> 5)
 */
export function extractContractSeq(code: string, year?: number): number | null {
  if (!code) return null;
  const cleanCode = code.trim();

  // Mẫu chuẩn: HD-YYYY-XXX (ví dụ: HD-2026-104)
  if (year) {
    const yearPattern = new RegExp(`^HD-${year}-(\\d+)$`, 'i');
    const m = cleanCode.match(yearPattern);
    if (m) {
      const num = parseInt(m[1], 10);
      return isNaN(num) ? null : num;
    }
  }

  // Mẫu tổng quát: HD-YYYY-XXX
  const genYearMatch = cleanCode.match(/^HD-\d{4}-(\\d+)$/i);
  if (genYearMatch) {
    const num = parseInt(genYearMatch[1], 10);
    return isNaN(num) ? null : num;
  }

  // Mẫu rút gọn: HD-XXX
  const shortMatch = cleanCode.match(/^HD-(\\d+)$/i);
  if (shortMatch) {
    const num = parseInt(shortMatch[1], 10);
    return isNaN(num) ? null : num;
  }

  return null;
}

/**
 * Sinh mã hợp đồng tiếp theo duy nhất, không trùng lặp
 * Format: HD-YYYY-XXX (ví dụ: HD-2026-001, HD-2026-105)
 */
export function generateNextContractCode(
  existingContracts: { contractCode?: string; startDate?: string }[],
  targetDate?: string
): string {
  let targetYear = 2026;
  if (targetDate) {
    const d = new Date(targetDate);
    if (!isNaN(d.getFullYear())) targetYear = d.getFullYear();
  } else {
    targetYear = new Date().getFullYear();
  }

  const yearPrefix = `HD-${targetYear}-`;

  // Tập hợp các mã đã tồn tại
  const existingCodeSet = new Set(
    existingContracts.map(c => (c.contractCode || '').trim()).filter(Boolean)
  );

  // Tìm số thứ tự lớn nhất hiện có trong năm
  let maxSeq = 0;
  for (const c of existingContracts) {
    const seq = extractContractSeq(c.contractCode || '', targetYear);
    if (seq !== null && seq > maxSeq) {
      maxSeq = seq;
    }
  }

  // Bắt đầu từ số tiếp theo
  let nextSeq = maxSeq + 1;
  let candidate = `${yearPrefix}${String(nextSeq).padStart(3, '0')}`;

  // Đảm bảo tuyệt đối không va chạm với bất kỳ mã nào trong hệ thống
  while (existingCodeSet.has(candidate)) {
    nextSeq++;
    candidate = `${yearPrefix}${String(nextSeq).padStart(3, '0')}`;
  }

  return candidate;
}

/**
 * Phát hiện và tự động sửa các hợp đồng bị trùng mã hợp đồng
 * Hợp đồng tạo trước (hoặc xuất hiện trước) được giữ mã nguyên vẹn,
 * các hợp đồng trùng mã tiếp theo sẽ được cấp mã mới duy nhất.
 */
export function deduplicateContracts(contracts: RentalContract[]): {
  deduplicated: RentalContract[];
  fixedCount: number;
} {
  if (!contracts || contracts.length === 0) {
    return { deduplicated: [], fixedCount: 0 };
  }

  const seenCodes = new Set<string>();
  const duplicates: RentalContract[] = [];
  const uniqueContracts: RentalContract[] = [];

  // Lần duyệt 1: Phân loại hợp đồng hợp lệ và hợp đồng bị trùng lặp
  for (const c of contracts) {
    const code = (c.contractCode || '').trim();
    if (!code || seenCodes.has(code)) {
      duplicates.push(c);
    } else {
      seenCodes.add(code);
      uniqueContracts.push(c);
    }
  }

  // Nếu không có hợp đồng nào bị trùng mã
  if (duplicates.length === 0) {
    return { deduplicated: contracts, fixedCount: 0 };
  }

  // Lần duyệt 2: Cấp mã mới không trùng cho từng hợp đồng bị trùng
  const fixedList = [...uniqueContracts];
  for (const dup of duplicates) {
    const newCode = generateNextContractCode(fixedList, dup.startDate || dup.createdAt);
    const updatedContract = { ...dup, contractCode: newCode };
    fixedList.push(updatedContract);
  }

  // Giữ lại thứ tự gốc theo thời gian tạo createdAt hoặc id
  fixedList.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.startDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.startDate || 0).getTime();
    return timeB - timeA; // Mới nhất lên đầu
  });

  return {
    deduplicated: fixedList,
    fixedCount: duplicates.length
  };
}

const DELETED_CONTRACTS_KEY = 'camlease_deleted_contract_ids';

/**
 * Lấy danh sách ID và Mã hợp đồng đã bị người dùng xóa vĩnh viễn (Tombstones).
 * Giúp ngăn chặn việc Cloud hoặc thiết bị khác tự động khôi phục lại các đơn đã xóa.
 */
/**
 * Lấy danh sách ID hợp đồng đã bị người dùng xóa vĩnh viễn (Tombstones).
 * CHỈ lưu ID duy nhất (con-*), TUYỆT ĐỐI KHÔNG lưu mã hợp đồng (HD-*) để tránh chặn các đơn tạo mới.
 */
export function getDeletedContractIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CONTRACTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        // Tự động dọn sạch mọi mã HD-* ra khỏi tombstone, chỉ giữ lại ID duy nhất
        const cleanIds = arr.filter(item => typeof item === 'string' && !item.toUpperCase().startsWith('HD-'));
        return new Set(cleanIds);
      }
    }
  } catch (e) {}
  return new Set();
}

/**
 * Ghi nhận các ID vừa bị xóa vào danh sách Tombstones
 */
export function addDeletedContractIds(idsOrCodes: (string | undefined | null)[]): void {
  try {
    const set = getDeletedContractIds();
    for (const item of idsOrCodes) {
      if (item && typeof item === 'string') {
        const clean = item.trim();
        // Không lưu mã HD-* vào tombstone
        if (clean && !clean.toUpperCase().startsWith('HD-')) {
          set.add(clean);
        }
      }
    }
    localStorage.setItem(DELETED_CONTRACTS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

/**
 * Xóa một ID khỏi danh sách Tombstone (dùng khi người dùng cố ý tạo hoặc khôi phục đơn)
 */
export function removeDeletedContractIds(ids: (string | undefined | null)[]): void {
  try {
    const set = getDeletedContractIds();
    let changed = false;
    for (const id of ids) {
      if (id && typeof id === 'string') {
        const clean = id.trim();
        if (set.has(clean)) {
          set.delete(clean);
          changed = true;
        }
      }
    }
    if (changed) {
      localStorage.setItem(DELETED_CONTRACTS_KEY, JSON.stringify(Array.from(set)));
    }
  } catch (e) {}
}

export const KNOWN_MOCK_CONTRACT_IDS = new Set<string>([
  'con-1', 'con-2', 'con-3', 'con-4', 'con-5', 'con-6', 'con-7', 'con-8', 'con-9',
  'mock-con-01', 'mock-con-02', 'mock-con-a1', 'mock-con-a2'
]);

export const KNOWN_MOCK_CONTRACT_CODES = new Set<string>([
  'HD-2026-001', 'HD-2026-002', 'HD-2026-003', 'HD-2026-004', 'HD-2026-005',
  'HD-2026-006', 'HD-2026-007', 'HD-2026-008', 'HD-2026-009',
  'HD-2026-03-01', 'HD-2026-03-02', 'HD-2026-04-01', 'HD-2026-04-02'
]);

/**
 * Kiểm tra xem một hợp đồng có phải là hợp đồng mẫu (mock data) hay không.
 * Các hợp đồng ảo này tuyệt đối không được hiển thị hay lưu trữ.
 */
export function isMockContract(c: any): boolean {
  if (!c) return false;
  const id = typeof c.id === 'string' ? c.id.trim() : '';
  const code = typeof c.contractCode === 'string' ? c.contractCode.trim().toUpperCase() : '';
  if (id && KNOWN_MOCK_CONTRACT_IDS.has(id)) return true;
  if (id && (id.startsWith('mock-con-') || /^con-[1-9]$/.test(id))) return true;
  if (code && KNOWN_MOCK_CONTRACT_CODES.has(code)) {
    if (id && (id.startsWith('mock-con-') || /^con-[1-9]$/.test(id))) return true;
    if (c.customerId && ['cust-1', 'cust-2', 'cust-3', 'cust-4'].includes(c.customerId)) return true;
  }
  return false;
}

/**
 * Hợp nhất thông minh danh sách hợp đồng giữa 2 nguồn (ví dụ Local và Cloud/Thiết bị khác)
 * Đảm bảo:
 * 1. Tuyệt đối KHÔNG BAO GIỜ làm mất hợp đồng của bất kỳ bên nào (Union by id & contractCode).
 * 2. Lọc sạch triệt để các đơn đã xóa vĩnh viễn (Tombstones theo ID) và các đơn ảo (Mock data).
 * 3. Nếu cùng 1 hợp đồng xuất hiện ở cả 2 nơi: ưu tiên bản có thông tin mới nhất.
 * 4. Tự động xử lý xung đột mã hợp đồng nếu 2 thiết bị tạo trùng mã cùng lúc.
 */
export function mergeContracts(
  localList: RentalContract[],
  incomingList: RentalContract[]
): {
  merged: RentalContract[];
  hasChanges: boolean;
  addedCount: number;
} {
  const deletedSet = getDeletedContractIds();

  // Lọc sạch cả localList và incomingList trước khi hợp nhất (CHỈ lọc theo c.id, KHÔNG lọc theo contractCode)
  const cleanLocal = (localList || []).filter(c => 
    c && c.id && 
    !deletedSet.has(c.id) && 
    !isMockContract(c)
  );

  const cleanIncoming = (incomingList || []).filter(c => 
    c && c.id && 
    !deletedSet.has(c.id) && 
    !isMockContract(c)
  );

  if (cleanIncoming.length === 0) {
    return { merged: cleanLocal, hasChanges: false, addedCount: 0 };
  }

  if (cleanLocal.length === 0) {
    const { deduplicated } = deduplicateContracts(cleanIncoming);
    return { merged: deduplicated, hasChanges: true, addedCount: deduplicated.length };
  }

  let hasChanges = false;
  let addedCount = 0;

  // Bản đồ theo ID
  const map = new Map<string, RentalContract>();
  for (const item of cleanLocal) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // Tập hợp các contractCode hiện có
  const codeToIdMap = new Map<string, string>();
  for (const item of cleanLocal) {
    if (item && item.contractCode) {
      codeToIdMap.set(item.contractCode.trim().toUpperCase(), item.id);
    }
  }

  for (const inc of cleanIncoming) {
    if (!inc || !inc.id) continue;

    const existing = map.get(inc.id);
    if (!existing) {
      // Hợp đồng mới từ thiết bị khác / cloud
      let contractToAdd = { ...inc };

      // Kiểm tra xem contractCode có bị trùng với hợp đồng khác không
      const incCode = (contractToAdd.contractCode || '').trim().toUpperCase();
      if (incCode && codeToIdMap.has(incCode) && codeToIdMap.get(incCode) !== inc.id) {
        // Trùng mã với hợp đồng khác: tự cấp mã mới an toàn
        const currentArr = Array.from(map.values());
        const safeCode = generateNextContractCode(currentArr, contractToAdd.startDate || contractToAdd.createdAt);
        contractToAdd.contractCode = safeCode;
      }

      map.set(contractToAdd.id, contractToAdd);
      if (contractToAdd.contractCode) {
        codeToIdMap.set(contractToAdd.contractCode.trim().toUpperCase(), contractToAdd.id);
      }
      hasChanges = true;
      addedCount++;
    } else {
      // Đã có trong map: kiểm tra xem đối tượng nào mới hơn dựa vào updatedAt hoặc trạng thái
      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incTime = new Date(inc.updatedAt || inc.createdAt || 0).getTime();

      // Xác định đối tượng có thông tin cập nhật mới nhất (Ưu tiên bản có updatedAt mới hơn)
      let primary = existing;
      let secondary = inc;

      if (incTime > existingTime) {
        primary = inc;
        secondary = existing;
      }

      // QUY TẮC BẢO TOÀN TRẠNG THÁI: Tuyệt đối không bao giờ để trạng thái hạ cấp từ 'Active'/'Completed' về 'Pending'
      // trừ khi bản ghi Pending có updatedAt mới hơn rõ rệt
      let resolvedStatus = primary.status;
      if (primary.status === 'Pending' && (secondary.status === 'Active' || secondary.status === 'Completed' || secondary.status === 'Overdue')) {
        if (incTime <= existingTime) {
          resolvedStatus = secondary.status;
        }
      }

      const mergedItem: RentalContract = {
        ...secondary,
        ...primary,
        status: resolvedStatus,
        // Giữ lại ghi chú đầy đủ hơn
        note: (primary.note && primary.note.length >= (secondary.note || '').length) ? primary.note : (secondary.note || primary.note),
        paidAmount: primary.paidAmount !== undefined ? primary.paidAmount : secondary.paidAmount,
        depositAmount: primary.depositAmount !== undefined ? primary.depositAmount : secondary.depositAmount,
        updatedAt: primary.updatedAt || secondary.updatedAt || new Date().toISOString()
      };

      if (
        existing.status !== mergedItem.status ||
        existing.paidAmount !== mergedItem.paidAmount ||
        existing.depositAmount !== mergedItem.depositAmount ||
        existing.note !== mergedItem.note
      ) {
        hasChanges = true;
      }
      map.set(existing.id, mergedItem);
    }
  }

  const result = Array.from(map.values());
  // Sắp xếp giảm dần theo thời gian tạo hoặc ngày bắt đầu
  result.sort((a, b) => {
    const timeA = new Date(a.createdAt || a.startDate || 0).getTime();
    const timeB = new Date(b.createdAt || b.startDate || 0).getTime();
    return timeB - timeA;
  });

  const { deduplicated } = deduplicateContracts(result);
  return {
    merged: deduplicated,
    hasChanges,
    addedCount
  };
}
