
import React, { useEffect, useState } from 'react';
import { AnalysisResult, TrendInsight, CourseMatch, AgentConfig, StrategyOption } from '../types';
import { matchCurriculum } from '../services/geminiService';
import { BookOpen, User, Star, ArrowRight, RefreshCcw, ChevronLeft } from 'lucide-react';

interface Props {
  analysisData: AnalysisResult;
  trendData: TrendInsight[];
  selectedStrategy: StrategyOption | null;
  onNext: (matches: CourseMatch[]) => void;
  onBack: () => void;
  agentConfig: AgentConfig | undefined;
  initialData: CourseMatch[];
  apiKey?: string;
  globalModel?: string;
}

export const CurriculumMatching: React.FC<Props> = ({ analysisData, trendData, selectedStrategy, onNext, onBack, agentConfig, initialData, apiKey, globalModel }) => {
  const [matches, setMatches] = useState<CourseMatch[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);

  useEffect(() => {
    if (initialData.length === 0) {
        const loadMatches = async () => {
            // Pass the selected strategy to inform the matching logic
            const results = await matchCurriculum(
                analysisData.modules, 
                trendData, 
                selectedStrategy, 
                agentConfig?.systemPrompt, 
                apiKey, 
                agentConfig?.model, 
                globalModel
            );
            setMatches(results);
            setLoading(false);
        };
        loadMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen size={24} className="text-blue-600" />
          </div>
        </div>
        <div className="text-center space-y-2">
           <h3 className="text-lg font-semibold text-slate-800">전략 기반 교육 과정 매칭 중...</h3>
           <p className="text-slate-500">
             <span className="font-semibold text-blue-600">{agentConfig?.name || '교육 과정 매칭 컨설턴트'}</span>가<br/>
             선택하신 <strong>{selectedStrategy?.title}</strong> 전략에 맞춰 최적의 솔루션을 설계합니다.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
          <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <BookOpen size={20} />
            과정 및 강사 매칭 결과
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-600 font-semibold">
                Strategy: {selectedStrategy?.title}
            </span>
            <button className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
                <RefreshCcw size={12} /> 매칭 다시 실행
            </button>
          </div>
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

      <div className="flex justify-between pt-4">
        <button 
            onClick={onBack}
            className="flex items-center gap-1 px-4 py-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors"
        >
            <ChevronLeft size={16} /> 이전 단계
        </button>
        <button 
          onClick={() => onNext(matches)}
          className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          제안서 초안 생성하기 <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
