import React, { useState, useEffect } from 'react';
import { BidItem } from '../types';
import { getAllBids } from '../services/naraDb';
import { fetchBidNotices } from '../services/naraApi';
import { Search, RefreshCw, Calendar, Building2, MapPin, ExternalLink, CheckCircle2, Pin } from 'lucide-react';

interface NaraBidBrowserProps {
    onSelectBid: (bid: BidItem) => void;
    onClose: () => void;
    apiKey: string;
    shouldEncodeKey: boolean;
}

export const NaraBidBrowser: React.FC<NaraBidBrowserProps> = ({ onSelectBid, onClose, apiKey, shouldEncodeKey }) => {
    const [bids, setBids] = useState<BidItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('교육');
    const [selectedBid, setSelectedBid] = useState<BidItem | null>(null);

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
        const savedBids = await getAllBids();
        setBids(savedBids);
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            // Fetch from API (last 30 days)
            const today = new Date().toISOString().split('T')[0];
            const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            if (!apiKey) {
                alert('나라장터 서비스 키가 설정되지 않았습니다. [에이전트 설정]에서 키를 입력해주세요.');
                setLoading(false);
                return;
            }

            const result = await fetchBidNotices(startDate, endDate, apiKey, shouldEncodeKey, searchKeyword);

            if (result.error) {
                alert(`나라장터 조회 실패: ${result.error}\n\n[도움말] 서비스 키의 인코딩 문제일 수 있습니다. '에이전트 설정'에서 '서비스 키 자동 인코딩' 설정을 변경해 보세요.`);
                setLoading(false);
                return;
            }

            if (result.items) {
                // Filter by keyword
                const filtered = searchKeyword
                    ? result.items.filter(bid => bid.bidNtceNm.includes(searchKeyword))
                    : result.items;
                setBids(filtered);
            }
        } catch (error) {
            console.error('Failed to fetch bids:', error);
        } finally {
            setLoading(false);
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

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">나라장터 입찰 공고 선택</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl"
                        >
                            ×
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="pl-9 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                            <span className="text-gray-400">~</span>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="pl-9 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    placeholder="검색어 입력 (빈칸 시 기본 필터링)"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 min-w-[100px] justify-center"
                            >
                                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                검색
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bid List */}
                <div className="flex-1 overflow-y-auto p-6">
                    {bids.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <p>검색 결과가 없습니다.</p>
                            <p className="text-sm mt-2">키워드를 입력하고 검색 버튼을 눌러주세요.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {bids.map((bid) => (
                                <div
                                    key={`${bid.bidNtceNo}-${bid.bidNtceOrd}`}
                                    onClick={() => setSelectedBid(bid)}
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all relative ${selectedBid?.bidNtceNo === bid.bidNtceNo
                                        ? 'border-blue-500 bg-blue-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                        }`}
                                >
                                    {bid.isPinned && (
                                        <div className="absolute -top-2 -left-2 bg-blue-600 text-white p-1 rounded-lg shadow-md z-10">
                                            <Pin size={12} className="fill-white" />
                                        </div>
                                    )}
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-900 mb-2">{bid.bidNtceNm}</h3>
                                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <Building2 className="w-4 h-4" />
                                                    <span>{bid.ntceInsttNm}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    <span>{bid.prtcptPsblRgnNm || '전국'}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    <span>{formatDate(bid.bidNtceBgnDt)} ~ {formatDate(bid.bidNtceEndDt)}</span>
                                                </div>
                                                {bid.presmptPrce && (
                                                    <div className="text-blue-600 font-semibold">
                                                        예산: {bid.presmptPrce}원
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <a
                                            href={bid.bidNtceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-gray-400 hover:text-blue-600"
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSelectBid}
                        disabled={!selectedBid}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        이 공고로 제안서 작성
                    </button>
                </div>
            </div>
        </div>
    );
};
