import React from 'react';
import { Key, Filter, Save, FileText, RefreshCw, RotateCcw, CalendarPlus } from 'lucide-react';

interface SettingsPanelProps {
    showSettings: boolean;
    apiKey: string;
    setApiKey: (key: string) => void;
    shouldEncodeKey: boolean;
    setShouldEncodeKey: (encode: boolean) => void;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    saveOnlyFiltered: boolean;
    setSaveOnlyFiltered: (save: boolean) => void;
    retentionDays: number;
    setRetentionDays: (days: number) => void;
    dataCount: number;
    latestBidDate: string | null;
    loading: boolean;
    onUpdateLatest: () => void;
    onFullReset: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    showSettings,
    apiKey,
    setApiKey,
    shouldEncodeKey,
    setShouldEncodeKey,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    saveOnlyFiltered,
    setSaveOnlyFiltered,
    retentionDays,
    setRetentionDays,
    dataCount,
    latestBidDate,
    loading,
    onUpdateLatest,
    onFullReset
}) => {
    if (!showSettings) return null;

    return (
        <div className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                                <p className="text-xs text-gray-400 mt-1">* '전체 재수집' 시 최근 30일 내 최대 2,000건의 공고를 분석합니다.</p>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                            <h4 className="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-2">
                                <Filter className="w-3 h-3" /> 데이터 최적화 및 보관 설정
                            </h4>

                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="saveFilterToggle"
                                        checked={saveOnlyFiltered}
                                        onChange={(e) => setSaveOnlyFiltered(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <label htmlFor="saveFilterToggle" className="text-xs text-gray-700 font-medium">
                                        <strong>교육 관련 공고만 저장</strong> (교육 키워드 포함 데이터만 수집)
                                    </label>
                                </div>

                                <div className="flex items-center gap-3">
                                    <label className="text-xs text-gray-600 font-medium">데이터 보관 기간:</label>
                                    <select
                                        value={retentionDays}
                                        onChange={(e) => setRetentionDays(Number(e.target.value))}
                                        className="text-xs border-gray-300 rounded p-1 bg-white"
                                    >
                                        <option value={30}>30일</option>
                                        <option value={60}>60일</option>
                                        <option value={90}>90일</option>
                                        <option value={180}>180일</option>
                                        <option value={0}>무제한</option>
                                    </select>
                                    <span className="text-xs text-gray-400">기준일이 지나면 자동 삭제됩니다.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100 gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-indigo-800 font-bold">
                            <Save className="w-5 h-5 fill-indigo-800" />
                            <span>Supabase 클라우드 관리</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                            <div className="text-sm text-indigo-600 flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                저장된 공고: <strong>{dataCount}건</strong>
                            </div>
                            <div className="text-sm text-indigo-600">
                                최신 공고: <strong>{latestBidDate || '없음'}</strong>
                            </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            매일 새벽 4시 자동 동기화 중. 필요 시 수동으로 업데이트하세요.
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                        <button
                            onClick={onFullReset}
                            disabled={loading}
                            className="bg-white hover:bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-lg font-medium shadow-sm transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                            title="기존 DB를 지우고 기간 내 모든 데이터를 다시 받습니다."
                        >
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                            전체 재수집
                        </button>

                        <button
                            onClick={onUpdateLatest}
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
    );
};
