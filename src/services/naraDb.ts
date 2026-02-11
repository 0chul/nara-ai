import { supabase } from './supabase';
import { BidItem } from '../types';

// Helper to save items (Upsert to Supabase)
export const saveBids = async (items: BidItem[]) => {
  if (!items || items.length === 0) return;
  try {
    // Deduplicate items in this batch to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time" error
    // This happens if the same (bidNtceNo, bidNtceOrd) pair appears twice in the array being saved.
    const uniqueItemsMap = new Map<string, BidItem>();
    items.forEach(item => {
      const key = `${item.bidNtceNo}-${item.bidNtceOrd}`;
      uniqueItemsMap.set(key, item);
    });

    const uniqueItems = Array.from(uniqueItemsMap.values());

    const { error } = await supabase
      .from('bids')
      .upsert(uniqueItems, { onConflict: 'bidNtceNo, bidNtceOrd' });

    if (error) throw error;
    console.log(`[Supabase] Saved ${uniqueItems.length} unique items.`);
  } catch (error) {
    console.error("[Supabase] Failed to save bids:", error);
    throw error;
  }
};

// Helper to get all items sorted by pinned first, then date descending
export const getAllBids = async (): Promise<BidItem[]> => {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .order('isPinned', { ascending: false })
      .order('bidNtceDt', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[Supabase] Failed to retrieve bids:", error);
    return [];
  }
};

// Helper to toggle pin status
export const toggleBidPin = async (bidNo: string, bidOrd: string, isPinned: boolean) => {
  try {
    const { error } = await supabase
      .from('bids')
      .update({ isPinned })
      .match({ bidNtceNo: bidNo, bidNtceOrd: bidOrd });

    if (error) throw error;
  } catch (error) {
    console.error("[Supabase] Failed to toggle pin:", error);
    throw error;
  }
};

// Helper to get the most recent bid item (based on bidNtceDt)
export const getLatestBid = async (): Promise<BidItem | undefined> => {
  try {
    const { data, error } = await supabase
      .from('bids')
      .select('*')
      .order('bidNtceDt', { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : undefined;
  } catch (error) {
    console.error("[Supabase] Failed to get latest bid:", error);
    return undefined;
  }
};

// Helper to clear DB (Delete all rows)
export const clearBids = async () => {
  try {
    const { error } = await supabase
      .from('bids')
      .delete()
      .neq('bidNtceNo', ''); // Delete everything where bidNtceNo is not empty

    if (error) throw error;
  } catch (error) {
    console.error("[Supabase] Failed to clear bids:", error);
  }
};

// Helper to delete old bids (Retention Policy)
export const cleanupOldBids = async (days: number) => {
  if (days <= 0) return;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Format to YYYYMMDDHHMM (matches bidNtceDt)
    const year = cutoffDate.getFullYear();
    const month = String(cutoffDate.getMonth() + 1).padStart(2, '0');
    const day = String(cutoffDate.getDate()).padStart(2, '0');
    const cutoffStr = `${year}${month}${day}0000`;

    console.log(`[Supabase] Cleaning up bids older than ${cutoffStr} (${days} days)`);

    const { error } = await supabase
      .from('bids')
      .delete()
      .lt('bidNtceDt', cutoffStr);

    if (error) throw error;
    console.log(`[Supabase] Cleaned up old records.`);
  } catch (error) {
    console.error("[Supabase] Failed to cleanup old bids:", error);
  }
};

// Helper to test DB connection
export const testDbConnection = async (): Promise<{ success: boolean, message: string }> => {
  try {
    const { count, error } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true });

    if (error) {
      return { success: false, message: `DB 오류: ${error.message} (코드: ${error.code})` };
    }

    return { success: true, message: `연결 성공! (현재 DB에 ${count || 0}건의 공고가 저장되어 있습니다.)` };
  } catch (error: any) {
    return { success: false, message: `시스템 오류: ${error.message}` };
  }
};