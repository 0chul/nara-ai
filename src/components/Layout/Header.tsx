import React from 'react';
import { Search, Settings } from 'lucide-react';

interface HeaderProps {
    onToggleSettings: () => void;
    showSettings: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSettings, showSettings }) => {
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-600 text-white p-2 rounded-lg">
                            <Search className="w-5 h-5" />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                            엑스퍼트컨설팅 <span className="text-blue-600">교육 입찰 검색</span>
                            <span className="ml-2 text-sm font-normal text-gray-500 hidden sm:inline-block">
                                (Supabase Cloud Sync)
                            </span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onToggleSettings}
                            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                            title="설정"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
