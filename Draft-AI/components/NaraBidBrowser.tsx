import React, { useState, useEffect } from 'react';
import { BidItem } from '../types';
import { getAllBids } from '../services/naraDb';
import { fetchBidNotices } from '../services/naraApi';
import { Search, RefreshCw, Calendar, Building2, MapPin, ExternalLink, CheckCircle2 } from 'lucide-react';

interface NaraBidBrowserProps {
    onSelectBid: (bid: BidItem) => void;
    onClose: () => void;
}

export const NaraBidBrowser: React.FC<NaraBidBrowserProps> = ({ onSelectBid, onClose }) => {
    const [bids, setBids] = useState<BidItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchKeyword, setSearchKeyword] = useState('교육');
    const [selectedBid, setSelectedBid] = useState<BidItem | null>(null);

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

            const apiKey = import.meta.env.VITE_NARA_API_KEY || '';
            const result = await fetchBidNotices(lastMonth, today, apiKey, true);

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
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="키워드 검색 (예: 교육, 컨설팅, 워크숍)"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            검색
                        </button>
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
                                    className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedBid?.bidNtceNo === bid.bidNtceNo
                                            ? 'border-blue-500 bg-blue-50 shadow-md'
                                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                                        }`}
                                >
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
