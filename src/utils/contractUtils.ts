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
export function getDeletedContractIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CONTRACTS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (e) {}
  return new Set();
}

/**
 * Ghi nhận các ID và Mã hợp đồng vừa bị xóa vào danh sách Tombstones
 */
export function addDeletedContractIds(idsOrCodes: (string | undefined | null)[]): void {
  try {
    const set = getDeletedContractIds();
    for (const item of idsOrCodes) {
      if (item && typeof item === 'string') {
        const clean = item.trim();
        if (clean) {
          set.add(clean);
          set.add(clean.toUpperCase());
        }
      }
    }
    localStorage.setItem(DELETED_CONTRACTS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

/**
 * Hợp nhất thông minh danh sách hợp đồng giữa 2 nguồn (ví dụ Local và Cloud/Thiết bị khác)
 * Đảm bảo:
 * 1. Tuyệt đối KHÔNG BAO GIỜ làm mất hợp đồng của bất kỳ bên nào (Union by id & contractCode).
 * 2. Nếu cùng 1 hợp đồng xuất hiện ở cả 2 nơi: ưu tiên bản có thông tin mới nhất.
 * 3. Tự động xử lý xung đột mã hợp đồng nếu 2 thiết bị tạo trùng mã cùng lúc.
 */
export function mergeContracts(
  localList: RentalContract[],
  incomingList: RentalContract[]
): {
  merged: RentalContract[];
  hasChanges: boolean;
  addedCount: number;
} {
  if (!Array.isArray(incomingList) || incomingList.length === 0) {
    return { merged: localList || [], hasChanges: false, addedCount: 0 };
  }

  if (!Array.isArray(localList) || localList.length === 0) {
    const { deduplicated } = deduplicateContracts(incomingList);
    return { merged: deduplicated, hasChanges: true, addedCount: deduplicated.length };
  }

  let hasChanges = false;
  let addedCount = 0;

  // Bản đồ theo ID
  const map = new Map<string, RentalContract>();
  for (const item of localList) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }

  // Tập hợp các contractCode hiện có
  const codeToIdMap = new Map<string, string>();
  for (const item of localList) {
    if (item && item.contractCode) {
      codeToIdMap.set(item.contractCode.trim().toUpperCase(), item.id);
    }
  }

  const deletedSet = getDeletedContractIds();

  for (const inc of incomingList) {
    if (!inc || !inc.id) continue;

    // BỎ QUA NẾU HỢP ĐỒNG ĐÃ BỊ XÓA VĨNH VIỄN
    const incCode = (inc.contractCode || '').trim().toUpperCase();
    if (deletedSet.has(inc.id) || (incCode && deletedSet.has(incCode))) {
      continue;
    }

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
      // Đã có trong map: kiểm tra xem incoming có cập nhật gì mới không
      const localTime = new Date(existing.createdAt || 0).getTime();
      const incTime = new Date(inc.createdAt || 0).getTime();
      
      const isStatusChanged = existing.status !== inc.status;
      const isPaidChanged = existing.paidAmount !== inc.paidAmount;
      const isDepositChanged = existing.depositAmount !== inc.depositAmount;
      const isNoteChanged = existing.note !== inc.note;

      if (isStatusChanged || isPaidChanged || isDepositChanged || isNoteChanged) {
        // Có sự thay đổi: ưu tiên hợp nhất các trường có giá trị
        const mergedItem: RentalContract = {
          ...existing,
          ...inc,
          // Giữ note dài hơn nếu có
          note: (inc.note && inc.note.length > (existing.note || '').length) ? inc.note : existing.note,
          paidAmount: inc.paidAmount !== undefined ? inc.paidAmount : existing.paidAmount,
          depositAmount: inc.depositAmount !== undefined ? inc.depositAmount : existing.depositAmount,
          status: inc.status || existing.status
        };
        map.set(existing.id, mergedItem);
        hasChanges = true;
      }
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
