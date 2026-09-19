// Advanced Vietnamese-aware Smart Search Utilities

/**
 * Remove Vietnamese accents/diacritics and convert to clean lowercase Latin string
 * e.g., "Nguyễn Văn Vũ Linh" -> "nguyen van vu linh"
 */
export function removeVietnameseDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, d => (d === 'đ' ? 'd' : 'D'))
    .trim();
}

/**
 * Normalize text for searching: lowercase, stripped accents, unified spacing
 */
export function normalizeSearchText(str: string): string {
  if (!str) return '';
  return removeVietnameseDiacritics(str)
    .toLowerCase()
    .replace(/[\s\-_.,/\\():;]+/g, ' ')
    .trim();
}

/**
 * Normalize phone number: keeps only digits (and handles +84 -> 0)
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length >= 10) {
    digits = '0' + digits.slice(2);
  }
  return digits;
}

/**
 * Check if target text matches the search query.
 * Supports:
 * - Accented and unaccented Vietnamese matching
 * - Multi-word token matching (all words must match)
 * - Phone numbers with dots, spaces, or international codes
 */
export function smartMatch(targetText: string, query: string): boolean {
  if (!query) return true;
  if (!targetText) return false;

  const rawTargetLower = targetText.toLowerCase();
  const rawQueryLower = query.toLowerCase().trim();

  // 1. Direct lowercase match (exact match with accents)
  if (rawTargetLower.includes(rawQueryLower)) return true;

  // 2. Normalized unaccented match
  const normTarget = normalizeSearchText(targetText);
  const normQuery = normalizeSearchText(query);

  if (normTarget.includes(normQuery)) return true;

  // 3. Multi-word tokens matching (AND logic: every search word must appear)
  const tokens = normQuery.split(' ').filter(Boolean);
  if (tokens.length > 1) {
    const allTokensMatch = tokens.every(token => normTarget.includes(token));
    if (allTokensMatch) return true;
  }

  // 4. Digits-only match for phone numbers / codes
  const queryDigits = query.replace(/\D/g, '');
  if (queryDigits.length >= 3) {
    const targetDigits = targetText.replace(/\D/g, '');
    if (targetDigits.includes(queryDigits)) return true;
  }

  return false;
}

/**
 * Calculate match score for sorting results by relevance (higher is better)
 */
export function getMatchScore(targetText: string, query: string): number {
  if (!query || !targetText) return 0;

  const rawTargetLower = targetText.toLowerCase();
  const rawQueryLower = query.toLowerCase().trim();
  const normTarget = normalizeSearchText(targetText);
  const normQuery = normalizeSearchText(query);

  // Exact full match
  if (rawTargetLower === rawQueryLower) return 100;
  if (normTarget === normQuery) return 90;

  // Starts with query
  if (rawTargetLower.startsWith(rawQueryLower)) return 85;
  if (normTarget.startsWith(normQuery)) return 80;

  // Substring exact match
  if (rawTargetLower.includes(rawQueryLower)) return 70;
  if (normTarget.includes(normQuery)) return 60;

  // All tokens matched
  const tokens = normQuery.split(' ').filter(Boolean);
  if (tokens.length > 1 && tokens.every(token => normTarget.includes(token))) {
    return 50;
  }

  return 10;
}

/**
 * Match a RentalContract against query with multi-field search and relevance score
 */
export function matchContract(c: any, query: string): { matched: boolean; score: number } {
  if (!query) return { matched: true, score: 0 };
  if (!c) return { matched: false, score: 0 };

  const q = query.trim();
  const itemsText = (c.items || []).map((i: any) => i.cameraName || '').join(' ');
  const fullText = `${c.contractCode || ''} ${c.customerName || ''} ${c.customerPhone || ''} ${c.customerDocNote || ''} ${itemsText} ${c.status || ''} ${c.customNotes || ''}`;

  if (!smartMatch(fullText, q)) {
    return { matched: false, score: 0 };
  }

  // Calculate highest score among key fields
  const codeScore = getMatchScore(c.contractCode || '', q) + 15;
  const nameScore = getMatchScore(c.customerName || '', q) + 10;
  const phoneScore = getMatchScore(c.customerPhone || '', q) + 10;
  const itemScore = getMatchScore(itemsText, q);

  const finalScore = Math.max(codeScore, nameScore, phoneScore, itemScore);
  return { matched: true, score: finalScore };
}

/**
 * Match a Camera against query
 */
export function matchCamera(cam: any, query: string): { matched: boolean; score: number } {
  if (!query) return { matched: true, score: 0 };
  if (!cam) return { matched: false, score: 0 };

  const q = query.trim();
  const fullText = `${cam.name || ''} ${cam.shortName || ''} ${cam.serialNumber || ''} ${cam.category || ''}`;

  if (!smartMatch(fullText, q)) {
    return { matched: false, score: 0 };
  }

  const nameScore = getMatchScore(cam.name || '', q) + 10;
  const shortScore = getMatchScore(cam.shortName || '', q) + 10;
  const serialScore = getMatchScore(cam.serialNumber || '', q) + 15;

  return { matched: true, score: Math.max(nameScore, shortScore, serialScore) };
}

/**
 * Match a Customer against query
 */
export function matchCustomer(cust: any, query: string): { matched: boolean; score: number } {
  if (!query) return { matched: true, score: 0 };
  if (!cust) return { matched: false, score: 0 };

  const q = query.trim();
  const fullText = `${cust.name || ''} ${cust.phone || ''} ${cust.zaloPhone || ''} ${cust.idCard || ''} ${cust.idNumber || ''} ${cust.email || ''} ${cust.address || ''} ${cust.notes || ''}`;

  if (!smartMatch(fullText, q)) {
    return { matched: false, score: 0 };
  }

  const nameScore = getMatchScore(cust.name || '', q) + 10;
  const phoneScore = getMatchScore(cust.phone || '', q) + 15;
  const idScore = getMatchScore(cust.idCard || cust.idNumber || '', q) + 10;

  return { matched: true, score: Math.max(nameScore, phoneScore, idScore) };
}
