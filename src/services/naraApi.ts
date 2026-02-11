import { BidItem, ApiResponse } from '../types';

const BASE_URL = "https://apis.data.go.kr/1230000/ao/PubDataOpnStdService/getDataSetOpnStdBidPblancInfo";

const PAGE_SIZE = 50;
const MAX_PAGES_TO_FETCH = 40;

// Helper to format date to YYYYMMDDHHMM safely
const formatDateForApi = (dateStr: string, isEnd: boolean = false): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';

  const [year, month, day] = parts;
  const time = isEnd ? '2359' : '0000';
  return `${year}${month}${day}${time}`;
};

// Data Normalizer: Maps raw API fields to our standard BidItem interface
const normalizeItem = (raw: any): BidItem => {
  let normalizedDt = raw.bidNtceDt || "";
  if (!normalizedDt && raw.bidNtceDate) {
    const datePart = raw.bidNtceDate.replace(/-/g, '');
    const timePart = (raw.bidNtceBgn || raw.bidBeginTm || "00:00").replace(/:/g, '');
    normalizedDt = `${datePart}${timePart}`;
  }

  const demandInstName = raw.dminsttNm || raw.dmndInsttNm || "";
  const beginDt = raw.bidNtceBgnDt || (raw.bidBeginDate ? `${raw.bidBeginDate.replace(/-/g, '')}${raw.bidBeginTm?.replace(/:/g, '') || '0000'}` : "");
  const endDt = raw.bidNtceEndDt || (raw.bidClseDate ? `${raw.bidClseDate.replace(/-/g, '')}${raw.bidClseTm?.replace(/:/g, '') || '0000'}` : "");

  // Fix broken URLs (some APIs return ^ instead of & in query params)
  let finalUrl = raw.bidNtceUrl || "";
  if (finalUrl.includes('^')) {
    finalUrl = finalUrl.replace(/\^/g, '&');
  }

  return {
    bidNtceNo: raw.bidNtceNo || "",
    bidNtceOrd: raw.bidNtceOrd || "00",
    bidNtceNm: raw.bidNtceNm || "공고명 없음",
    bidNtceDt: normalizedDt,
    ntceInsttNm: raw.ntceInsttNm || "",
    dminsttNm: demandInstName,
    bidNtceBgnDt: beginDt,
    bidNtceEndDt: endDt,
    prtcptPsblRgnNm: raw.prtcptPsblRgnNm || "",
    bidprcPsblIndstrytyNm: raw.bidprcPsblIndstrytyNm || "",
    bidNtceUrl: finalUrl,
    bidNtceSttusNm: raw.bidNtceSttusNm || "",
    bsnsDivNm: raw.bsnsDivNm || "",
    presmptPrce: raw.presmptPrce || raw.asignBdgtAmt || undefined,
  };
};

const fetchSinglePage = async (
  pageNo: number,
  startDate: string,
  endDate: string,
  serviceKey: string
): Promise<{ items: BidItem[], totalCount: number, error?: string, rawUrl?: string }> => {
  try {
    const queryParams = [
      `serviceKey=${serviceKey}`,
      `pageNo=${pageNo}`,
      `numOfRows=${PAGE_SIZE}`,
      `type=json`,
      `bidNtceBgnDt=${formatDateForApi(startDate)}`,
      `bidNtceEndDt=${formatDateForApi(endDate, true)}`
    ].join('&');

    const fetchUrl = `${BASE_URL}?${queryParams}`;

    console.log(`[API] Fetching Page ${pageNo}`);

    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`네트워크 오류: ${response.status}`);

    const text = await response.text();

    if (text.trim().startsWith('<')) {
      const msgMatch = text.match(/<errMsg>(.*?)<\/errMsg>/) || text.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/);
      if (msgMatch) throw new Error(`API 에러: ${msgMatch[1]}`);
      throw new Error("API가 JSON이 아닌 XML을 반환했습니다.");
    }

    let data: ApiResponse;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("JSON 파싱 실패");
    }

    const resultCode = data.response?.header?.resultCode;
    if (resultCode !== "00") throw new Error(`API 코드 오류: ${resultCode}`);

    const bodyItems = data.response?.body?.items;
    let rawItems: any[] = [];

    if (bodyItems) {
      if (Array.isArray(bodyItems)) rawItems = bodyItems;
      else if (Array.isArray(bodyItems.item)) rawItems = bodyItems.item;
      else if (bodyItems.item) rawItems = [bodyItems.item];
    }

    const normalizedItems = rawItems.map(normalizeItem);

    return {
      items: normalizedItems,
      totalCount: data.response?.body?.totalCount || 0,
      rawUrl: fetchUrl
    };
  } catch (err: any) {
    console.warn(`Page ${pageNo} fetch failed:`, err.message);
    return { items: [], totalCount: 0, error: err.message };
  }
};

export const fetchBidNotices = async (
  startDate: string,
  endDate: string,
  apiKey: string,
  shouldEncodeKey: boolean = true,
  userKeyword: string = ''
): Promise<{ items: BidItem[], allItems: BidItem[], totalCount: number, scannedCount: number, error?: string, debugUrl?: string }> => {

  try {
    const trimmedKey = apiKey.trim();
    const serviceKey = shouldEncodeKey ? encodeURIComponent(trimmedKey) : trimmedKey;

    const firstPage = await fetchSinglePage(1, startDate, endDate, serviceKey);
    const debugUrl = firstPage.rawUrl;

    if (firstPage.error) {
      return {
        items: [],
        allItems: [],
        totalCount: 0,
        scannedCount: 0,
        error: firstPage.error,
        debugUrl: debugUrl || `${BASE_URL}?serviceKey=${serviceKey.substring(0, 10)}...`
      };
    }

    let allItems = [...firstPage.items];
    const totalCount = firstPage.totalCount;

    if (totalCount > PAGE_SIZE) {
      const totalPages = Math.ceil(totalCount / PAGE_SIZE);
      const pagesToFetch = Math.min(totalPages, MAX_PAGES_TO_FETCH);

      const promises = [];
      for (let i = 2; i <= pagesToFetch; i++) {
        promises.push(fetchSinglePage(i, startDate, endDate, serviceKey));
      }

      const results = await Promise.all(promises);
      results.forEach(res => {
        if (res.items && res.items.length > 0) {
          allItems = [...allItems, ...res.items];
        }
      });
    }

    // Filter logic: If user provided a keyword, use it. Otherwise, use our defaults.
    const educationKeywords = ['교육', '강의', '컨설팅', 'HRD', '연수', '워크숍', '세미나', '진로', '취업', '캠프'];

    // If user specified a keyword, we filter by that. 
    // If no keyword, we fallback to education filter to keep results relevant for this app's main purpose.
    const finalFilteredItems = allItems.filter(item => {
      const title = item.bidNtceNm || "";
      if (userKeyword) {
        return title.includes(userKeyword);
      }
      return educationKeywords.some(keyword => title.includes(keyword));
    });

    return {
      items: finalFilteredItems,
      allItems: allItems,
      totalCount: finalFilteredItems.length,
      scannedCount: allItems.length,
      debugUrl: debugUrl
    };

  } catch (err: any) {
    return { items: [], allItems: [], totalCount: 0, scannedCount: 0, error: err.message };
  }
};

export const testApiConnection = async (apiKey: string, shouldEncodeKey: boolean): Promise<{ success: boolean, message: string, data?: any }> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Test with a simple query: 1 row, last 30 days
    const trimmedKey = apiKey.trim();
    const serviceKey = shouldEncodeKey ? encodeURIComponent(trimmedKey) : trimmedKey;

    const queryParams = [
      `serviceKey=${serviceKey}`,
      `pageNo=1`,
      `numOfRows=1`,
      `type=json`,
      `bidNtceBgnDt=${formatDateForApi(lastMonth)}`,
      `bidNtceEndDt=${formatDateForApi(today, true)}`
    ].join('&');

    const fetchUrl = `${BASE_URL}?${queryParams}`;
    const response = await fetch(fetchUrl);
    const text = await response.text();

    if (text.trim().startsWith('<')) {
      const msgMatch = text.match(/<errMsg>(.*?)<\/errMsg>/) || text.match(/<returnAuthMsg>(.*?)<\/returnAuthMsg>/);
      if (msgMatch) return { success: false, message: `API 에러 (XML): ${msgMatch[1]}` };
      return { success: false, message: 'API가 JSON이 아닌 XML을 반환했습니다. (키 인증 실패 가능성 높음)' };
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { success: false, message: '응답 데이터 파싱 실패 (JSON 형식 아님)' };
    }

    const resultCode = data.response?.header?.resultCode;
    const resultMsg = data.response?.header?.resultMsg;

    if (resultCode === "00") {
      const totalCount = data.response?.body?.totalCount || 0;
      const firstItem = data.response?.body?.items?.[0] || data.response?.body?.items?.item?.[0];
      const sampleTitle = firstItem ? (firstItem.bidNtceNm || '항목명 없음') : '데이터 없음';

      return {
        success: true,
        message: `연결 성공! (총 ${totalCount}건 검색됨, 첫번째 항목: ${sampleTitle})`,
        data: data
      };
    } else {
      return { success: false, message: `API 에러 코드: ${resultCode} (${resultMsg})` };
    }
  } catch (error: any) {
    return { success: false, message: `네트워크/시스템 에러: ${error.message}` };
  }
};