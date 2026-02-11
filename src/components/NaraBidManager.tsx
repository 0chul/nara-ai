import React, { useState, useEffect } from 'react';
import { BidItem } from '../types';
import { getAllBids, toggleBidPin, saveBids } from '../services/naraDb';
import { fetchBidNotices } from '../services/naraApi';
import { Search, RefreshCw, Calendar, Building2, MapPin, ExternalLink, CheckCircle2, Pin, PinOff, Inbox } from 'lucide-react';

interface NaraBidManagerProps {
    onSelectBid: (bid: BidItem) => void;
    onClose: () => void;
    apiKey: string;
    shouldEncodeKey: boolean;
    onRefreshPinned?: () => void;
}

export const NaraBidManager: React.FC<NaraBidManagerProps> = ({ onSelectBid, apiKey, shouldEncodeKey, onRefreshPinned }) => {
    const [bids, setBids] = useState<BidItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('교육');
    const [selectedBid, setSelectedBid] = useState<BidItem | null>(null);
    const [scannedCount, setScannedCount] = useState<number | null>(null);

    // Period state (Default last 30 days)
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    // Load bids from DB on mount
    useEffect(() => {
        loadBidsFromDb();
    }, []);

    const loadBidsFromDb = async () => {
        setLoading(true);
        const savedBids = await getAllBids();
        setBids(savedBids);
        setLoading(false);
    };

    const handleSearch = async () => {
        setLoading(true);
        try {

            if (!apiKey) {
                alert('나라장터 서비스 키가 설정되지 않았습니다. [에이전트 설정]에서 키를 입력해주세요.');
                setLoading(false);
                return;
            }

            // If empty keyword, we use "education" fallback in the API service
            const result = await fetchBidNotices(startDate, endDate, apiKey, shouldEncodeKey, searchKeyword);

            if (result.error) {
                alert(`나라장터 조회 실패: ${result.error}\n\n[도움말] 서비스 키의 인코딩 문제일 수 있습니다. '에이전트 설정'에서 '서비스 키 자동 인코딩' 설정을 변경해 보세요.`);
                setLoading(false);
                return;
            }

            if (result.items) {
                // Merge with existing pins if any
                const existingBids = await getAllBids();
                const pinnedMap = new Map(existingBids.filter(b => b.isPinned).map(b => [`${b.bidNtceNo}-${b.bidNtceOrd}`, true]));

                // Mark all retrieved items with their pinned status from DB
                const updatedAllItems = result.allItems.map(item => ({
                    ...item,
                    isPinned: pinnedMap.has(`${item.bidNtceNo}-${item.bidNtceOrd}`)
                }));

                // Save ALL items to database (to ensure visibility in other views/searches)
                await saveBids(updatedAllItems);

                // Filter for current view (UI filtering)
                const filtered = result.items.map(item => ({
                    ...item,
                    isPinned: pinnedMap.has(`${item.bidNtceNo}-${item.bidNtceOrd}`)
                }));

                setBids(filtered);
                setScannedCount(result.scannedCount);
            }
        } catch (error) {
            console.error('Failed to fetch bids:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePin = async (e: React.MouseEvent, bid: BidItem) => {
        e.stopPropagation();
        const newPinStatus = !bid.isPinned;
        try {
            await toggleBidPin(bid.bidNtceNo, bid.bidNtceOrd, newPinStatus);
            setBids(prev => prev.map(b =>
                (b.bidNtceNo === bid.bidNtceNo && b.bidNtceOrd === bid.bidNtceOrd)
                    ? { ...b, isPinned: newPinStatus }
                    : b
            ).sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
            }));
            if (onRefreshPinned) onRefreshPinned();
        } catch (error) {
            alert('핀 상태 변경에 실패했습니다.');
        }
    };

    const handleSelectBid = () => {
        if (selectedBid) {
            onSelectBid(selectedBid);
        }
    };

    const formatDate = (dateStr: string): string => {
        if (!dateStr || dateStr.length < 8) return '';
        return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
    };

    const pinnedCount = bids.filter(b => b.isPinned).length;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">나라장터 입찰 관리</h1>
                    <p className="text-slate-500 mt-1">교육 및 컨설팅 관련 최신 입찰 공고를 확인하고 유망한 건을 핀업하세요.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
                        <Pin size={18} className="text-blue-600 fill-blue-600" />
                        <span className="text-blue-800 font-semibold">핀업된 공고: {pinnedCount}건</span>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Dates */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-40"
                            />
                        </div>
                        <span className="text-slate-400">~</span>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-40"
                            />
                        </div>
                    </div>

                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="검색어 또는 빈칸 입력 (빈칸 시 교육/HRD 중심 조회)"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                        />
                    </div>

                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[140px]"
                    >
                        {loading ? <RefreshCw className="animate-spin" size={20} /> : <Search size={20} />}
                        공고 조회
                    </button>
                    <button
                        onClick={loadBidsFromDb}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                    >
                        저장된 공고 불러오기
                    </button>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>💡 팁: 검색어를 입력하지 않으면 '교육, HRD, 컨설팅' 등 관련 분야 공고를 자동으로 필터링합니다.</p>
                    {scannedCount !== null && (
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span>API 연동 정상: 총 {scannedCount}건 스캔됨 ({bids.length}건 조건 일치)</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Content List */}
            {loading && bids.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24">
                    <RefreshCw size={48} className="text-blue-600 animate-spin mb-4" />
                    <p className="text-slate-500 font-medium">최신 입찰 데이터를 불러오는 중입니다...</p>
                </div>
            ) : bids.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {bids.map((bid) => (
                        <div
                            key={`${bid.bidNtceNo}-${bid.bidNtceOrd}`}
                            onClick={() => setSelectedBid(bid)}
                            className={`group relative bg-white border-2 rounded-2xl p-6 transition-all cursor-pointer hover:shadow-xl ${selectedBid?.bidNtceNo === bid.bidNtceNo ? 'border-blue-500 shadow-md ring-1 ring-blue-500/20' : 'border-slate-100 hover:border-slate-300 shadow-sm'
                                }`}
                        >
                            {bid.isPinned && (
                                <div className="absolute -top-3 -left-3 bg-blue-600 text-white p-2 rounded-xl shadow-lg z-10">
                                    <Pin size={16} className="fill-white" />
                                </div>
                            )}

                            <div className="flex justify-between items-start gap-4 mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${bid.bidNtceSttusNm.includes('마감') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
                                            }`}>
                                            {bid.bidNtceSttusNm}
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                            {bid.bidNtceNo}-{bid.bidNtceOrd}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                                        {bid.bidNtceNm}
                                    </h3>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={(e) => handleTogglePin(e, bid)}
                                        className={`p-2.5 rounded-xl transition-all ${bid.isPinned
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600'
                                            }`}
                                        title={bid.isPinned ? "핀 제거" : "유망 공고로 핀업"}
                                    >
                                        {bid.isPinned ? <PinOff size={20} /> : <Pin size={20} />}
                                    </button>
                                    <a
                                        href={bid.bidNtceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-2.5 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl transition-all"
                                        title="원본 공고 보기"
                                    >
                                        <ExternalLink size={20} />
                                    </a>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6">
                                <div className="flex items-center gap-2 text-slate-600">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                        <Building2 size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">발주처</span>
                                        <span className="text-sm font-medium">{bid.ntceInsttNm}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                        <MapPin size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">지역/업종</span>
                                        <span className="text-sm font-medium truncate max-w-[150px]">{bid.prtcptPsblRgnNm || '전국'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">응찰 기간</span>
                                        <span className="text-sm font-medium">{formatDate(bid.bidNtceBgnDt)} ~ {formatDate(bid.bidNtceEndDt)}</span>
                                    </div>
                                </div>
                                {bid.presmptPrce && (
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <span className="text-xs font-bold">₩</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tight">추정가격</span>
                                            <span className="text-sm font-bold text-blue-700">{Number(bid.presmptPrce).toLocaleString()}원</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {selectedBid?.bidNtceNo === bid.bidNtceNo && (
                                <div className="mt-6 pt-6 border-t border-slate-100 flex justify-end animate-fade-in">
                                    <button
                                        onClick={handleSelectBid}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                                    >
                                        <CheckCircle2 size={18} />
                                        이 공고로 제안서 작성 시작
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-32 flex flex-col items-center justify-center text-center px-6">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6">
                        <Inbox size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">조회된 공고가 없습니다</h3>
                    <p className="text-slate-500 max-w-sm mb-8">
                        교육 및 컨설팅 키워드로 검색하거나, '공고 조회' 버튼을 눌러 나라장터의 최신 데이터를 가져오세요.
                    </p>
                    <button
                        onClick={handleSearch}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25"
                    >
                        최신 공고 가져오기
                    </button>
                </div>
            )}
        </div>
    );
};
