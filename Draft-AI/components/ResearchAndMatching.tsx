
import React, { useEffect, useState } from 'react';
import { AnalysisResult, TrendInsight, CourseMatch, AgentConfig } from '../types';
import { fetchTrendInsights, matchCurriculum } from '../services/geminiService';
import { TrendingUp, BookOpen, User, Star, ArrowRight, RefreshCcw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  analysisData: AnalysisResult;
  onNext: (trends: TrendInsight[], matches: CourseMatch[]) => void;
  agentConfigs: AgentConfig[];
}

export const ResearchAndMatching: React.FC<Props> = ({ analysisData, onNext, agentConfigs }) => {
  const [trends, setTrends] = useState<TrendInsight[]>([]);
  const [matches, setMatches] = useState<CourseMatch[]>([]);
  const [loading, setLoading] = useState(true);

  // Find specific agents
  const trendAgent = agentConfigs.find(a => a.id === 'trend-researcher');
  const matchAgent = agentConfigs.find(a => a.id === 'curriculum-matcher');

  useEffect(() => {
    const processStrategy = async () => {
      // Execute sequentially so trends can inform curriculum matching
      const trendResults = await fetchTrendInsights(analysisData.modules, trendAgent?.systemPrompt);
      setTrends(trendResults);

      const matchResults = await matchCurriculum(
        analysisData.modules, 
        trendResults, 
        null, 
        matchAgent?.systemPrompt
      );
      setMatches(matchResults);
      
      setLoading(false);
    };
    processStrategy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <TrendingUp size={24} className="text-blue-600" />
          </div>
        </div>
        <div className="text-center space-y-2">
           <h3 className="text-lg font-semibold text-slate-800">AI 에이전트 협업 중...</h3>
           <p className="text-slate-500">
             <span className="font-semibold text-blue-600">{trendAgent?.name}</span>가 시장 동향을 분석하고,<br/>
             <span className="font-semibold text-blue-600">{matchAgent?.name}</span>가 최적의 강사를 찾고 있습니다.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Trend Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
          <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <TrendingUp size={20} />
            트렌드 리서치 인사이트
          </h3>
          <span className="text-xs font-semibold bg-indigo-200 text-indigo-800 px-2 py-1 rounded">By {trendAgent?.name}</span>
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

      {/* Matching Section */}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
          <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <BookOpen size={20} />
            과정 및 강사 매칭 결과
          </h3>
          <button className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
            <RefreshCcw size={12} /> 매칭 다시 실행
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matches.map((match) => (
                <div key={match.id} className="border border-slate-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group bg-white relative">
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                        매칭률 {match.matchScore}%
                    </div>
                    
                    <div className="mb-4">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Module Recommendation</span>
                        <h4 className="font-bold text-lg text-slate-900 leading-tight mt-1">{match.courseTitle}</h4>
                    </div>
                    
                    <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                            <User size={20} />
                        </div>
                        <div>
                            <div className="text-xs text-slate-500">추천 강사</div>
                            <div className="font-semibold text-slate-800">{match.instructor}</div>
                        </div>
                    </div>

                    <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                        {match.matchReason}
                    </p>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                        <div className="flex gap-0.5">
                             {[...Array(5)].map((_, i) => (
                                 <Star key={i} size={14} className={i < Math.round(match.matchScore / 20) ? "text-amber-400 fill-amber-400" : "text-slate-300"} />
                             ))}
                        </div>
                        <span className="text-xs font-medium text-blue-600 group-hover:translate-x-1 transition-transform flex items-center">
                            선택됨 <ArrowRight size={12} className="ml-1" />
                        </span>
                    </div>
                </div>
            ))}
            
            {/* Add External Option Card */}
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer min-h-[300px]">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
                    <User size={24} />
                </div>
                <h4 className="font-semibold text-slate-600">외부 강사 찾기</h4>
                <p className="text-sm text-slate-400 mt-1 mb-4">내부 과정 외에<br/>다른 대안이 필요하신가요?</p>
                <button className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:border-slate-400 shadow-sm">
                    파트너 풀 검색
                </button>
            </div>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button 
          onClick={() => onNext(trends, matches)}
          className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          제안서 초안 생성하기 <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
