import { createClient } from '@supabase/supabase-js';

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
