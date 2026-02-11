import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex justify-center items-center gap-2 mt-12 pb-12">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 bg-white shadow-sm transition-all"
            >
                <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
                {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    // Logic to show a limited window: 1, current-2 to current+2, last
                    if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 2 && page <= currentPage + 2)
                    ) {
                        return (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${currentPage === page
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {page}
                            </button>
                        );
                    } else if (page === currentPage - 3 || page === currentPage + 3) {
                        return <span key={page} className="px-1 text-gray-400">...</span>;
                    }
                    return null;
                })}
            </div>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 bg-white shadow-sm transition-all"
            >
                <ChevronRight className="w-5 h-5" />
            </button>
        </div>
    );
};
