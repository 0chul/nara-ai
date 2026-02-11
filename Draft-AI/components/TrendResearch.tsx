import React, { useEffect, useState } from 'react';
import { AnalysisResult, TrendInsight, AgentConfig } from '../types';
import { fetchTrendInsights } from '../services/geminiService';
import { TrendingUp, ArrowRight, ChevronLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  analysisData: AnalysisResult;
  onNext: (trends: TrendInsight[]) => void;
  onBack: () => void;
  agentConfig: AgentConfig | undefined;
  initialData: TrendInsight[];
  apiKey?: string;
  globalModel?: string;
}

export const TrendResearch: React.FC<Props> = ({ analysisData, onNext, onBack, agentConfig, initialData, apiKey, globalModel }) => {
  const [trends, setTrends] = useState<TrendInsight[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);

  useEffect(() => {
    if (initialData.length === 0) {
        const loadTrends = async () => {
        const results = await fetchTrendInsights(analysisData.modules, agentConfig?.systemPrompt, apiKey, agentConfig?.model, globalModel);
        setTrends(results);
        setLoading(false);
        };
        loadTrends();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp size={24} className="text-indigo-600" />
          </div>
        </div>
        <div className="text-center space-y-2">
           <h3 className="text-lg font-semibold text-slate-800">시장 트렌드 분석 중...</h3>
           <p className="text-slate-500">
             <span className="font-semibold text-indigo-600">{agentConfig?.name || '트렌드 인사이트 연구원'}</span>가 최신 HRD 및 산업 동향을 검색하고 있습니다.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <TrendingUp size={20} />
            트렌드 리서치 인사이트
          </h3>
          <span className="text-xs font-semibold bg-indigo-200 text-indigo-800 px-2 py-1 rounded">By {agentConfig?.name}</span>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
                {trends.map((trend, idx) => (
                    <div key={idx} className="flex gap-4 p-4 border border-slate-100 rounded-lg hover:shadow-md transition-shadow bg-slate-50">
                        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-indigo-600 font-bold border border-indigo-100">
                            {idx + 1}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 mb-1">{trend.topic}</h4>
                            <p className="text-sm text-slate-600 mb-2">{trend.insight}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span>출처: {trend.source}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span>연관도: {trend.relevanceScore}%</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-inner">
                <h4 className="text-sm font-semibold text-slate-600 mb-4 text-center">주제별 관심도 분석</h4>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="topic" hide />
                            <YAxis />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{fill: 'transparent'}}
                            />
                            <Bar dataKey="relevanceScore" radius={[4, 4, 0, 0]}>
                                {trends.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899'][index % 3]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </section>

      <div className="flex justify-between pt-4">
        <button 
            onClick={onBack}
            className="flex items-center gap-1 px-4 py-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors"
        >
            <ChevronLeft size={16} /> 이전 단계
        </button>
        <button 
          onClick={() => onNext(trends)}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
        >
          트렌드 기반 전략 수립하기 <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};