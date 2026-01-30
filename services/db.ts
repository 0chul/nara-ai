import Dexie, { Table } from 'dexie';
import { BidItem } from '../types';

export class BidDatabase extends Dexie {
  // 'bids' table will store BidItem objects
  bids!: Table<BidItem>; 

  constructor() {
    super('BidDatabase');
    // Define schema
    // [bidNtceNo+bidNtceOrd]: Compound primary key to ensure uniqueness of each bid version
    // bidNtceDt: Indexed for sorting by date
    (this as any).version(1).stores({
      bids: '[bidNtceNo+bidNtceOrd], bidNtceDt, bidNtceNm' 
    });
  }
}

export const db = new BidDatabase();

// Helper to save items
export const saveBids = async (items: BidItem[]) => {
  if (!items || items.length === 0) return;
  try {
    // bulkPut performs an upsert (update if exists, insert if new)
    await db.bids.bulkPut(items);
    console.log(`[DB] Saved ${items.length} items to local database.`);
  } catch (error) {
    console.error("[DB] Failed to save bids:", error);
  }
};

// Helper to get all items sorted by date descending
export const getAllBids = async (): Promise<BidItem[]> => {
  try {
    const items = await db.bids.orderBy('bidNtceDt').reverse().toArray();
    return items;
  } catch (error) {
    console.error("[DB] Failed to retrieve bids:", error);
    return [];
  }
};

// Helper to clear DB
export const clearBids = async () => {
  await db.bids.clear();
};