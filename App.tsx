import React, { useState, useEffect } from 'react';
import { fetchBidNotices } from './services/api';
import { saveBids, getAllBids, clearBids } from './services/db';
import { BidItem } from './types';
import { BidCard } from './components/BidCard';
import { ErrorAlert } from './components/ErrorAlert';
import { Search, Settings, RefreshCw, Database, ExternalLink, Globe2, Key, Save, Filter, CheckCircle2 } from 'lucide-react';

const App: React.FC = () => {
  // Auto-set date range: Last 30 days to get enough data
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate] = useState(lastMonth);
  const [endDate] = useState(today);
  
  const [apiKey, setApiKey] = useState("07OoWggXTIVlamzKLV9cL9D3AmHJ0hU2glIVBAhayDo35JayhvW4zGgfnhXzPGoiiL1y3TES+a2DsvSD0CAslw=="); 
  const [shouldEncodeKey, setShouldEncodeKey] = useState(true);
  const [useProxy, setUseProxy] = useState(true);
  
  const [showSettings, setShowSettings] = useState(false);
  const [filterTarget, setFilterTarget] = useState(false); // Filter for Seoul & Interior
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [data, setData] = useState<BidItem[]>([]);

  // Initialize data from Local DB on mount
  useEffect(() => {
    const loadFromDb = async () => {
      const savedBids = await getAllBids();
      if (savedBids.length > 0) {
        setData(savedBids);
        setHasSearched(true); // Treat existing data as a "search result"
      }
    };
    loadFromDb();
  }, []);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setDebugUrl(null);
    
    // NOTE: We do NOT clear data immediately to prevent flickering if refresh fails
    // setHasSearched(true); 

    if (!apiKey) {
      setError("서비스 키가 필요합니다.");
      setLoading(false);
      return;
    }

    // 1. Fetch from API
    const result = await fetchBidNotices(startDate, endDate, apiKey, useProxy, shouldEncodeKey);

    // Always set debugUrl if available
    if (result.debugUrl) {
      setDebugUrl(result.debugUrl);
    }

    if (result.error) {
      setError(result.error);
      // Even if error, keep showing old DB data if available
    } else {
      // 2. Success - Save to DB
      const newItems = result.items || [];
      if (newItems.length > 0) {
        // Replace the DB content with new search results to keep it consistent with the "Search" action.
        await clearBids(); 
        await saveBids(newItems);
        
        // 3. Load from DB to Display (Single Source of Truth)
        const dbItems = await getAllBids();
        setData(dbItems);
        setHasSearched(true);
      } else {
         // 0 results from API
         setData([]);
         setHasSearched(true);
      }
    }
    setLoading(false);
  };

  // Helper to check conditions
  const isTargetBid = (item: BidItem) => {
    const isSeoul = item.prtcptPsblRgnNm?.includes("서울");
    const isInterior = item.bidprcPsblIndstrytyNm?.includes("실내건축") || item.bidprcPsblIndstrytyNm?.includes("4990");
    return isSeoul && isInterior;
  };

  // Calculate count of target items
  const targetCount = data.filter(isTargetBid).length;

  // Filter Logic
  const filteredData = data.filter(item => {
    if (!filterTarget) return true;
    return isTargetBid(item);
  });

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 text-white p-2 rounded-lg">
                <Search className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                나라장터 <span className="text-blue-600">입찰 검색</span>
                <span className="ml-2 text-sm font-normal text-gray-500 hidden sm:inline-block">
                  (전체 공고 조회 & 로컬 DB 저장)
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                title="설정"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {showSettings && (
             <div className="mb-6 p-5 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2">
                  <Key className="w-4 h-4 text-gray-500" /> API 및 연결 설정
                </h3>
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">인증키 (Service Key)</label>
                    <input 
                      type="text" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono bg-white p-2.5"
                      placeholder="공공데이터포털 인증키 입력"
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <input 
                            type="checkbox" 
                            id="encodeToggle"
                            checked={shouldEncodeKey}
                            onChange={(e) => setShouldEncodeKey(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="encodeToggle" className="text-xs text-gray-600 select-none">
                            <strong>인증키 URL 인코딩 적용</strong> (일반 인증키 Decoding 입력 시 체크, %가 포함된 키는 체크 해제)
                        </label>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <input 
                        type="checkbox" 
                        id="proxyToggle"
                        checked={useProxy}
                        onChange={(e) => setUseProxy(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="proxyToggle" className="text-sm font-medium text-gray-700 select-none flex items-center gap-1.5">
                        <Globe2 className="w-4 h-4 text-gray-500" />
                        브라우저 CORS 우회 (Proxy 사용)
                        </label>
                    </div>
                  </div>
                </div>
             </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 text-indigo-800 font-bold">
                  <Save className="w-5 h-5 fill-indigo-800" />
                  <span>로컬 DB 연동됨</span>
               </div>
               <div className="text-sm text-indigo-600">
                 API 데이터를 <strong>로컬 DB(IndexedDB)</strong>에 저장하고 불러옵니다.
               </div>
               <div className="text-xs text-gray-500 mt-1">
                 데이터 기간: {startDate} ~ {endDate}
               </div>
            </div>
            
            <button 
              onClick={handleFetch}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-lg"
            >
              {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? '데이터 요청' : '데이터 요청'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <ErrorAlert message={error} debugUrl={debugUrl} />
        
        {/* Debug Info Link for Success Case (if no error but we want to see URL) */}
        {!error && debugUrl && hasSearched && (
           <div className="mb-4 text-right">
             <a 
                href={debugUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                API 요청 URL 확인 (디버그용)
              </a>
           </div>
        )}

        {/* List Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                수집된 최신 공고 (Local DB)
              </h2>
            </div>
            
            {/* Target Filter Button */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setFilterTarget(!filterTarget)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                        filterTarget 
                        ? 'bg-red-50 text-red-600 border-red-200 ring-2 ring-red-100' 
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                >
                    {filterTarget ? <CheckCircle2 className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
                    서울 + 실내건축(4990)
                    {targetCount > 0 && (
                      <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                        filterTarget ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {targetCount}건
                      </span>
                    )}
                </button>
                <span className="text-xs text-gray-400 text-right whitespace-nowrap">
                표시: {filteredData.length} / 전체: {data.length}
                </span>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
              <div className="relative mb-4">
                <RefreshCw className="w-12 h-12 animate-spin text-blue-500" />
              </div>
              <p className="font-medium text-gray-800 text-lg">데이터를 수집하고 DB에 저장 중입니다</p>
              <p className="text-sm mt-2 text-gray-500">잠시만 기다려주세요...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-500">데이터 수집 중 오류가 발생했습니다.<br/>상단의 오류 메시지를 확인해주세요.</p>
                {data.length > 0 && (
                    <p className="mt-2 text-sm text-blue-600">이전 수집된 데이터({data.length}건)를 표시합니다.</p>
                )}
            </div>
          ) : filteredData.length > 0 ? (
            <div className="grid gap-4">
              {filteredData.map((item) => (
                <BidCard key={`${item.bidNtceNo}-${item.bidNtceOrd}`} item={item} />
              ))}
            </div>
          ) : hasSearched ? (
            <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-300">
               <div className="bg-gray-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <Database className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg mb-1">
                {filterTarget ? '조건에 맞는 공고가 없습니다' : '검색 결과가 없습니다'}
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
                {filterTarget 
                    ? '수집된 데이터 중 서울 및 실내건축공사업(4990) 공고가 없습니다.' 
                    : 'API가 반환한 데이터가 없습니다. (0건)'}
              </p>
              {filterTarget && (
                  <button 
                    onClick={() => setFilterTarget(false)}
                    className="text-blue-600 hover:underline text-sm font-medium"
                  >
                    필터 해제하고 전체 보기
                  </button>
              )}
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-300">
               <div className="bg-gray-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <Database className="w-7 h-7 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-bold text-lg mb-1">데이터 요청 대기</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
                상단의 '데이터 요청' 버튼을 눌러주세요.<br/>
                API 연결 상태를 확인하기 위해 <strong>모든 공고</strong>를 가져옵니다.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
