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
