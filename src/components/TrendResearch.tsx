import React, { useEffect, useState } from 'react';
import { AnalysisResult, TrendInsight, AgentConfig } from '../types';
import { fetchTrendInsights } from '../services/geminiService';
import { TrendingUp, ArrowRight, ChevronLeft, AlertCircle } from 'lucide-react';
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
    if (initialData.length === 0 && analysisData.modules.length > 0 && analysisData.modules[0] !== 'N/A') {
      const loadTrends = async () => {
        const results = await fetchTrendInsights(analysisData.modules, agentConfig?.systemPrompt, apiKey, agentConfig?.model, globalModel);
        setTrends(results);
        setLoading(false);
      };
      loadTrends();
    } else if (initialData.length === 0) {
      // Set example data
      setTrends([
        { topic: "(예시) 퓨처 리더십 (Future Leadership)", insight: "불확실성 시대의 리더는 '지시'보다 '지원'하는 서번트 리더십과 디지털 문해력을 동시에 갖추어야 합니다.", source: "Gartner 2025 리더십 리포트", relevanceScore: 98 },
        { topic: "(예시) AI-Native 워크플레이스", insight: "단순 툴 활용을 넘어 업무 프로세스 전반에 AI를 내재화하는 실용적 DT 교육 수요가 급증하고 있습니다.", source: "HBR 디지털 트랜스포메이션 가이드", relevanceScore: 92 },
        { topic: "(예시) 스킬 기반 조직 (Skill-based Org)", insight: "직무(Job) 중심에서 보유 역량(Skill) 중심으로 인재를 배치하고 육성하는 전략이 글로벌 트렌드입니다.", source: "World Economic Forum 퓨처 잡 리포트", relevanceScore: 85 }
      ]);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isExampleMode = analysisData.programName === 'N/A' || analysisData.programName.includes('(예시)');

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
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {isExampleMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 animate-pulse">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-bold">예시 모드:</span> 이전 단계의 분석 데이터가 없어 가상의 트렌드 정보를 보여줍니다.
          </div>
        </div>
      )}
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
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="relevanceScore" radius={[4, 4, 0, 0]}>
                    {trends.map((_entry, index) => (
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