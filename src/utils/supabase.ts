import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { mergeContracts } from './contractUtils';
import { RentalContract } from '../types';

// Retrieve Supabase environment credentials using safe typing
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

// Safely evaluate if Supabase is properly configured in settings
export const isSupabaseConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'YOUR_SUPABASE_URL' &&
  !supabaseUrl.toLowerCase().includes('placeholder') &&
  !supabaseUrl.toLowerCase().includes('your_supabase') &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20 &&
  supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE'
);

// Initialize Supabase client
export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;


/**
 * Synchronize data state to Supabase cloud database
 * @param key LocalStorage matched key
 * @param data Array or Object data block to serialize
 * @returns Success status indicator
 */
export async function syncToSupabase(key: string, data: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('camlease_store')
      .upsert(
        { 
          key, 
          value: JSON.stringify(data), 
          updated_at: new Date().toISOString() 
        }, 
        { onConflict: 'key' }
      );
    
    if (error) {
      console.warn(`[Supabase] Sync failed for "${key}":`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Supabase] Exception syncing "${key}":`, err);
    return false;
  }
}

/**
 * Fetch synchronized data state from Supabase cloud database
 * @param key LocalStorage matched key
 * @returns Parsed JSON data or null if empty/unavailable
 */
export async function fetchFromSupabase(key: string): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('camlease_store')
      .select('value')
      .eq('key', key)
      .maybeSingle(); // Prevents throwing 406 on no records found
    
    if (error) {
      console.warn(`[Supabase] Fetch failed for "${key}":`, error.message);
      return null;
    }
    
    if (data && data.value) {
      return JSON.parse(data.value);
    }
  } catch (err) {
    console.error(`[Supabase] Exception fetching "${key}":`, err);
  }
  return null;
}

/**
 * Đồng bộ hợp đồng lên Supabase AN TOÀN TUYỆT ĐỐI (Chống lưu đè):
 * Đọc dữ liệu hiện tại trên Supabase, gộp (merge) thông minh trước khi lưu.
 * Không bao giờ làm mất bất kỳ đơn hàng nào do thiết bị khác vừa tạo.
 */
export async function safeSyncContractsToSupabase(
  contracts: RentalContract[]
): Promise<{ success: boolean; mergedContracts: RentalContract[] }> {
  if (!supabase) return { success: false, mergedContracts: contracts };

  try {
    // 1. Đọc dữ liệu đang có trên Cloud
    const cloudContracts = await fetchFromSupabase('contracts');
    let finalContracts = contracts;

    if (Array.isArray(cloudContracts) && cloudContracts.length > 0) {
      const { merged } = mergeContracts(contracts, cloudContracts);
      finalContracts = merged;
    }

    // 2. Ghi bản đã gộp đầy đủ lên Supabase
    const { error } = await supabase
      .from('camlease_store')
      .upsert(
        { 
          key: 'contracts', 
          value: JSON.stringify(finalContracts), 
          updated_at: new Date().toISOString() 
        }, 
        { onConflict: 'key' }
      );

    if (error) {
      console.warn('[Supabase] safeSyncContracts failed:', error.message);
      return { success: false, mergedContracts: contracts };
    }

    return { success: true, mergedContracts: finalContracts };
  } catch (err) {
    console.error('[Supabase] Exception in safeSyncContracts:', err);
    return { success: false, mergedContracts: contracts };
  }
}

/**
 * Lắng nghe thay đổi thời gian thực từ Supabase Realtime
 * Giúp mọi thiết bị (máy tính, điện thoại) tự động nhận đơn mới ngay lập tức
 */
export function subscribeToSupabaseChanges(
  onUpdate: (key: string, data: any) => void
): () => void {
  if (!supabase) return () => {};

  let channel: RealtimeChannel | null = null;
  try {
    channel = supabase
      .channel('camlease_store_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'camlease_store'
        },
        (payload: any) => {
          const newRow = payload?.new;
          if (newRow && newRow.key && newRow.value) {
            try {
              const parsed = JSON.parse(newRow.value);
              onUpdate(newRow.key, parsed);
            } catch (e) {
              console.warn('[Supabase Realtime] Parse error:', e);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Supabase Realtime] Connected successfully');
        }
      });
  } catch (err) {
    console.warn('[Supabase Realtime] Subscribe failed:', err);
  }

  return () => {
    if (channel && supabase) {
      supabase.removeChannel(channel);
    }
  };
}
