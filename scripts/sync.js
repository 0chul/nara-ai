import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const NARA_API_KEY = "07OoWggXTIVlamzKLV9cL9D3AmHJ0hU2glIVBAhayDo35JayhvW4zGgfnhXzPGoiiL1y3TES+a2DsvSD0CAslw==";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BASE_URL = "https://apis.data.go.kr/1230000/ao/PubDataOpnStdService/getDataSetOpnStdBidPblancInfo";

async function sync() {
    console.log("🚀 Starting Daily Sync...");

    try {
        // 1. Get Latest Date from DB
        const { data: latestData } = await supabase
            .from('bids')
            .select('bidNtceDt')
            .order('bidNtceDt', { ascending: false })
            .limit(1);

        let startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '') + "0000";
        if (latestData && latestData.length > 0) {
            startDate = latestData[0].bidNtceDt;
            console.log(`📡 Resuming from last record date: ${startDate}`);
        }

        const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '') + "2359";

        // 2. Fetch from Nara API (First 10 pages for sync)
        let allItems = [];
        for (let page = 1; page <= 10; page++) {
            const url = `${BASE_URL}?serviceKey=${encodeURIComponent(NARA_API_KEY)}&pageNo=${page}&numOfRows=100&type=json&bidNtceBgnDt=${startDate}&bidNtceEndDt=${endDate}`;

            const res = await fetch(url);
            const json = await res.json();

            const items = json.response?.body?.items?.item || json.response?.body?.items || [];
            const rawItems = Array.isArray(items) ? items : [items].filter(Boolean);

            if (rawItems.length === 0) break;

            // Normalize & Filter (Seoul Only)
            const filtered = rawItems.filter(raw => {
                return (raw.prtcptPsblRgnNm || "").includes("서울");
            }).map(raw => ({
                bidNtceNo: raw.bidNtceNo,
                bidNtceOrd: raw.bidNtceOrd,
                bidNtceNm: raw.bidNtceNm,
                bidNtceDt: raw.bidNtceDt || (raw.bidNtceDate?.replace(/-/g, '') + (raw.bidNtceBgn?.replace(/:/g, '') || "0000")),
                ntceInsttNm: raw.ntceInsttNm,
                dminsttNm: raw.dminsttNm || raw.dmndInsttNm,
                bidNtceBgnDt: raw.bidNtceBgnDt,
                bidNtceEndDt: raw.bidNtceEndDt,
                prtcptPsblRgnNm: raw.prtcptPsblRgnNm,
                bidprcPsblIndstrytyNm: raw.bidprcPsblIndstrytyNm,
                bidNtceUrl: raw.bidNtceUrl ? raw.bidNtceUrl.replace(/\^/g, '&') : "",
                bidNtceSttusNm: raw.bidNtceSttusNm,
                bsnsDivNm: raw.bsnsDivNm,
                presmptPrce: raw.presmptPrce || raw.asignBdgtAmt
            }));

            allItems = [...allItems, ...filtered];
            console.log(`📄 Page ${page}: Found ${filtered.length} matching items.`);
        }

        // 3. Upsert to Supabase
        if (allItems.length > 0) {
            // Deduplicate
            const uniqueMap = new Map();
            allItems.forEach(item => uniqueMap.set(`${item.bidNtceNo}-${item.bidNtceOrd}`, item));
            const uniqueItems = Array.from(uniqueMap.values());

            const { error } = await supabase.from('bids').upsert(uniqueItems, { onConflict: 'bidNtceNo, bidNtceOrd' });
            if (error) throw error;
            console.log(`✅ Successfully synced ${uniqueItems.length} items to Supabase.`);
        } else {
            console.log("ℹ️ No new items found today.");
        }

    } catch (err) {
        console.error("❌ Sync Failed:", err);
        process.exit(1);
    }
}

sync();
