import React, { useEffect, useState } from 'react';
import { AnalysisResult, TrendInsight, CourseMatch, AgentConfig, StrategyOption } from '../types';
import { matchCurriculum } from '../services/geminiService';
import { BookOpen, User, Star, ArrowRight, RefreshCcw, ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  analysisData: AnalysisResult;
  trendData: TrendInsight[];
  selectedStrategies: StrategyOption[];
  onNext: (matches: CourseMatch[]) => void;
  onBack: () => void;
  agentConfig: AgentConfig | undefined;
  initialData: CourseMatch[];
  apiKey?: string;
  globalModel?: string;
}

export const CurriculumMatching: React.FC<Props> = ({ analysisData, trendData, selectedStrategies, onNext, onBack, agentConfig, initialData, apiKey, globalModel }) => {
  const [matches, setMatches] = useState<CourseMatch[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);

  useEffect(() => {
    if (initialData.length === 0) {
      if (selectedStrategies.length === 0 || selectedStrategies.some(s => s.title.includes('(예시)'))) {
        // Set example data
        setMatches([
          { id: 'm1', moduleName: "Leadership", courseTitle: "(예시) 넥스트 리더십: 디지털 전환기 팀 관리", instructors: ["김철수 수석", "강한나 책임"], selectedInstructors: ["김철수 수석", "강한나 책임"], matchScore: 98, matchReason: "선택하신 AI 인텔리전스 전략에 맞춰, 리더의 디지털 활용 능력을 극대화할 수 있는 커리큘럼입니다.", isExternal: false },
          { id: 'm2', moduleName: "Data Literacy", courseTitle: "(예시) 데이터 리터러시 클리닉", instructors: ["이영희 이사", "정민호 위원"], selectedInstructors: ["이영희 이사", "정민호 위원"], matchScore: 95, matchReason: "실질적인 데이터 분석 도구 활용 능력을 배양하며, 금융권 사례 위주로 구성되어 있습니다.", isExternal: false },
          { id: 'm3', moduleName: "AI Practice", courseTitle: "(예시) 생성형 AI 실무 프롬프트 워크숍", instructors: ["박민수 전문위원", "최지혜 컨설턴트"], selectedInstructors: ["박민수 전문위원", "최지혜 컨설턴트"], matchScore: 88, matchReason: "업무 효율성을 즉각적으로 높일 수 있는 프롬프트 엔지니어링 기법을 전수합니다.", isExternal: false }
        ]);
        setLoading(false);
        return;
      }

      const loadMatches = async () => {
        setLoading(true);
        try {
          const results = await matchCurriculum(
            analysisData.modules,
            trendData,
            selectedStrategies,
            agentConfig?.systemPrompt,
            apiKey,
            agentConfig?.model,
            globalModel
          );
          // Initialize selectedInstructors with all candidates
          const initializedResults = results.map(r => ({
            ...r,
            selectedInstructors: [...r.instructors]
          }));
          setMatches(initializedResults);
        } catch (error) {
          console.error("Curriculum matching failed:", error);
        } finally {
          setLoading(false);
        }
      };
      loadMatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isExampleMode = selectedStrategies.length === 0 || selectedStrategies.some(s => s.title.includes('(예시)'));

  const toggleInstructor = (matchId: string, instructorName: string) => {
    setMatches(prev => prev.map(m => {
      if (m.id === matchId) {
        const isSelected = m.selectedInstructors.includes(instructorName);
        const nextSelected = isSelected
          ? m.selectedInstructors.filter(i => i !== instructorName)
          : [...m.selectedInstructors, instructorName];

        // Ensure at least one is selected if we want to enforce that
        if (nextSelected.length === 0) return m;

        return { ...m, selectedInstructors: nextSelected };
      }
      return m;
    }));
  };

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
            <span className="font-semibold text-blue-600">{agentConfig?.name || '교육 과정 매칭 컨설턴트'}</span>가<br />
            선택하신 <strong>{selectedStrategies.length}개의 전략</strong>에 맞춰 최적의 솔루션을 설계합니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {isExampleMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 animate-pulse">
          <AlertCircle size={20} className="flex-shrink-0" />
          <div className="text-sm">
            <span className="font-bold">예시 모드:</span> 이전 단계의 전략 선택 데이터가 없어 가상의 매칭 결과를 보여줍니다.
          </div>
        </div>
      )}
      <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-blue-50">
          <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
            <BookOpen size={20} />
            과정 및 강사 매칭 결과
          </h3>
          <div className="flex items-center gap-4">
            <span className="text-xs bg-white px-2 py-1 rounded border border-blue-200 text-blue-600 font-semibold">
              Strategies: {selectedStrategies.map(s => s.title).join(', ')}
            </span>
            <button className="text-xs flex items-center gap-1 text-blue-600 hover:underline">
              <RefreshCcw size={12} /> 매칭 다시 실행
            </button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <div key={match.id} className="border border-slate-200 rounded-xl p-5 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group bg-white relative flex flex-col h-full">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                매칭률 {match.matchScore}%
              </div>

              <div className="mb-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{match.moduleName || "Module Recommendation"}</span>
                <h4 className="font-bold text-lg text-slate-900 leading-tight mt-1">{match.courseTitle}</h4>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-xs text-slate-500 font-semibold mb-1">강사 선택 (1~3명)</div>
                {match.instructors.map((instructor) => {
                  const isChecked = match.selectedInstructors.includes(instructor);
                  return (
                    <div
                      key={instructor}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleInstructor(match.id, instructor);
                      }}
                      className={`flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer ${isChecked
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-slate-200 hover:border-blue-200'
                        }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                        {isChecked && <CheckCircle2 size={14} />}
                      </div>
                      <div className="flex items-center gap-2">
                        <User size={14} className={isChecked ? 'text-blue-600' : 'text-slate-400'} />
                        <span className={`text-sm font-medium ${isChecked ? 'text-blue-900' : 'text-slate-600'}`}>
                          {instructor}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
                <span className="text-xs font-medium text-blue-600 group-hover:translate-x-1 transition-transform flex items-center text-nowrap">
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
            <p className="text-sm text-slate-400 mt-1 mb-4">내부 과정 외에<br />다른 대안이 필요하신가요?</p>
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
