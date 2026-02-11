import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Database, CheckCircle2 } from 'lucide-react';
import { BidItem } from '../../types';
import { BidCard } from '../BidCard';
import { Pagination } from './Pagination';

interface BidListProps {
    data: BidItem[];
    loading: boolean;
    error: string | null;
    hasSearched: boolean;
}

export const BidList: React.FC<BidListProps> = ({ data, loading, error, hasSearched }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Reset to page 1 when data changes
    useEffect(() => {
        setCurrentPage(1);
    }, [data]);

    const totalPages = Math.ceil(data.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 600, behavior: 'smooth' });
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        보관함 (Supabase Cloud)
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5">전체 {data.length}건 중 {startIndex + 1}-{Math.min(startIndex + itemsPerPage, data.length)}건 표시</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 cursor-default">
                        <CheckCircle2 className="w-4 h-4" />
                        교육/컨설팅 공고
                        {data.length > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-800">
                                {data.length}
                            </span>
                        )}
                    </div>
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
                    <p className="text-gray-500">데이터 수집 중 오류가 발생했습니다.<br />상단의 오류 메시지를 확인해주세요.</p>
                    {data.length > 0 && (
                        <p className="mt-2 text-sm text-blue-600">이전 수집된 데이터({data.length}건)를 표시합니다.</p>
                    )}
                </div>
            ) : paginatedData.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {paginatedData.map((item) => (
                            <BidCard key={`${item.bidNtceNo}-${item.bidNtceOrd}`} item={item} />
                        ))}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </>
            ) : hasSearched ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg mb-1">
                        저장된 데이터가 없습니다
                    </h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
                        상단의 업데이트 버튼을 눌러 데이터를 수집해주세요.
                    </p>
                </div>
            ) : (
                <div className="text-center py-24 bg-white rounded-xl border border-dashed border-gray-300">
                    <div className="bg-gray-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                        <Database className="w-7 h-7 text-gray-400" />
                    </div>
                    <h3 className="text-gray-900 font-bold text-lg mb-1">데이터 요청 대기</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
                        상단의 '최신 공고 업데이트' 버튼을 눌러주세요.<br />
                        기존 데이터를 유지하고 최신 내역만 추가합니다.
                    </p>
                </div>
            )}
        </div>
    );
};
