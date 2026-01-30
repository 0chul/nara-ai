import React, { useState, useEffect } from 'react';
import { fetchBidNotices } from './services/api';
import { saveBids, getAllBids, clearBids, getLatestBid } from './services/db';
import { BidItem } from './types';
import { BidCard } from './components/BidCard';
import { ErrorAlert } from './components/ErrorAlert';
import { StatusPieChart } from './components/StatusPieChart';
import { StatsChart } from './components/StatsChart';
import { Search, Settings, RefreshCw, Database, ExternalLink, Globe2, Key, Save, Filter, CheckCircle2, RotateCcw, CalendarPlus, BarChart3 } from 'lucide-react';

const App: React.FC = () => {
  // Auto-set date range: Last 30 days to get enough data
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(lastMonth);
  const [endDate, setEndDate] = useState(today);
  
  const [apiKey, setApiKey] = useState("07OoWggXTIVlamzKLV9cL9D3AmHJ0hU2glIVBAhayDo35JayhvW4zGgfnhXzPGoiiL1y3TES+a2DsvSD0CAslw=="); 
  const [shouldEncodeKey, setShouldEncodeKey] = useState(true);
  const [useProxy, setUseProxy] = useState(true);
  
  const [showSettings, setShowSettings] = useState(false);
  const [filterTarget, setFilterTarget] = useState(false); // Filter for Seoul & Interior
  
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugUrl, setDebugUrl] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [data, setData] = useState<BidItem[]>([]);

  // Initialize data from Local DB on mount
  useEffect(() => {
    refreshDataFromDb();
  }, []);

  const refreshDataFromDb = async () => {
    const savedBids = await getAllBids();
    if (savedBids.length > 0) {
      setData(savedBids);
      setHasSearched(true);
    }
  };

  // Helper to convert YYYYMMDD... to YYYY-MM-DD
  const parseDbDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length < 8) return '';
    return `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`;
  };

  // Mode 1: Incremental Update (Latest DB date -> Today)
  const handleUpdateLatest = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    setDebugUrl(null);

    if (!apiKey) {
      setError("서비스 키가 필요합니다.");
      setLoading(false);
      return;
    }

    try {
      // 1. Determine Start Date
      const latestBid = await getLatestBid();
      let fetchStart = startDate;
      
      if (latestBid && latestBid.bidNtceDt) {
        // If we have data, start from the latest date found in DB
        // We fetch the same day again to catch any updates/additions on that day,
        // Dexie.bulkPut will handle duplicates nicely (upsert).
        fetchStart = parseDbDate(latestBid.bidNtceDt);
        console.log(`[App] Found latest bid date: ${fetchStart}. Starting update from there.`);
      } else {
        console.log(`[App] No existing data. Starting full fetch from ${startDate}`);
      }

      // Check if up to date
      if (fetchStart === today && latestBid) {
        // Check timestamps if you wanted to be more precise, but for daily batches:
        // Let's allow re-fetching 'today' just in case.
      }

      // 2. Fetch
      setStatusMessage(`${fetchStart} 부터 ${endDate} 까지 데이터를 확인 중...`);
      const result = await fetchBidNotices(fetchStart, endDate, apiKey, useProxy, shouldEncodeKey);

      if (result.debugUrl) setDebugUrl(result.debugUrl);

      if (result.error) {
        setError(result.error);
      } else {
        const newItems = result.items || [];
        if (newItems.length > 0) {
          // 3. Save (Append/Upsert)
          await saveBids(newItems);
          await refreshDataFromDb();
          setStatusMessage(`업데이트 완료! ${newItems.length}건의 공고가 갱신/추가되었습니다.`);
        } else {
          setStatusMessage("새로운 공고가 없습니다. (최신 상태)");
        }
        setHasSearched(true);
      }
    } catch (e: any) {
      setError(e.message || "업데이트 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  // Mode 2: Full Refresh (Wipe DB -> Fetch All)
  const handleFullReset = async () => {
    if (!window.confirm("저장된 모든 데이터를 삭제하고 처음부터 다시 수집하시겠습니까?\n(데이터 양에 따라 시간이 걸릴 수 있습니다)")) {
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage("기존 데이터를 삭제하고 전체 기간을 재수집합니다...");
    setDebugUrl(null);

    if (!apiKey) {
      setError("서비스 키가 필요합니다.");
      setLoading(false);
      return;
    }

    try {
      // 1. Clear DB
      await clearBids();
      setData([]);

      // 2. Fetch
      const result = await fetchBidNotices(startDate, endDate, apiKey, useProxy, shouldEncodeKey);
      
      if (result.debugUrl) setDebugUrl(result.debugUrl);

      if (result.error) {
        setError(result.error);
      } else {
        const newItems = result.items || [];
        if (newItems.length > 0) {
          await saveBids(newItems);
          await refreshDataFromDb();
          setStatusMessage(`전체 수집 완료! 총 ${newItems.length}건이 저장되었습니다.`);
        } else {
          setStatusMessage("해당 기간에 조회된 데이터가 없습니다.");
        }
        setHasSearched(true);
      }
    } catch (e: any) {
      setError(e.message || "전체 수집 중 오류 발생");
    } finally {
      setLoading(false);
    }
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
                  (Incremental DB Update)
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
                     <div className="mb-4">
                        <h4 className="text-xs font-semibold text-gray-600 mb-2">전체 수집 기준 기간</h4>
                        <div className="flex items-center gap-2">
                            <input 
                                type="date" 
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                            <span className="text-gray-400">~</span>
                            <input 
                                type="date" 
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">* '전체 재수집' 시에만 이 기간이 사용됩니다. '업데이트'는 자동으로 DB 마지막 날짜부터 오늘까지 수집합니다.</p>
                     </div>

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
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100 gap-4">
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 text-indigo-800 font-bold">
                  <Save className="w-5 h-5 fill-indigo-800" />
                  <span>로컬 DB 관리</span>
               </div>
               <div className="text-sm text-indigo-600">
                 마지막 데이터: <strong>{data.length > 0 ? (data[0].bidNtceDt ? parseDbDate(data[0].bidNtceDt) : '날짜 없음') : '없음'}</strong>
               </div>
               <div className="text-xs text-gray-500 mt-1">
                 '최신 공고 업데이트'는 마지막 날짜 이후 데이터만 가져옵니다.
               </div>
            </div>
            
            <div className="flex items-center gap-2 self-end md:self-auto">
              {/* Full Refresh Button */}
              {showSettings && (
                  <button 
                  onClick={handleFullReset}
                  disabled={loading}
                  className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                  title="기존 DB를 지우고 기간 내 모든 데이터를 다시 받습니다."
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  전체 재수집
                </button>
              )}

              {/* Incremental Update Button (Primary) */}
              <button 
                onClick={handleUpdateLatest}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-lg whitespace-nowrap"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CalendarPlus className="w-5 h-5" />}
                {loading ? '수집 중...' : '최신 공고 업데이트'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <ErrorAlert message={error} debugUrl={debugUrl} />
        
        {/* Success/Status Message */}
        {statusMessage && !error && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">{statusMessage}</p>
            </div>
        )}

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
                마지막 API 요청 URL 확인 (디버그용)
              </a>
           </div>
        )}

        {/* Analytics Charts */}
        {hasSearched && data.length > 0 && !loading && (
          <div className="mb-8">
             <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-bold text-gray-800">데이터 분석</h2>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatusPieChart data={data} />
                <StatsChart data={data} />
             </div>
          </div>
        )}

        {/* List Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                보관함 (Local DB)
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
                {filterTarget ? '조건에 맞는 공고가 없습니다' : '저장된 데이터가 없습니다'}
              </h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
                {filterTarget 
                    ? '수집된 데이터 중 서울 및 실내건축공사업(4990) 공고가 없습니다.' 
                    : '상단의 업데이트 버튼을 눌러 데이터를 수집해주세요.'}
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
                상단의 '최신 공고 업데이트' 버튼을 눌러주세요.<br/>
                기존 데이터를 유지하고 최신 내역만 추가합니다.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;