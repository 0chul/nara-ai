import React, { useEffect, useState } from 'react';
import { AnalysisResult, TrendInsight, StrategyOption, StrategyEvaluation, AgentConfig } from '../types';
import { generateStrategyOptions, evaluateStrategies } from '../services/geminiService';
import { Target, ArrowRight, ChevronLeft, ShieldCheck, CheckCircle2, ThumbsUp, ThumbsDown, Zap, AlertCircle } from 'lucide-react';

interface Props {
    analysisData: AnalysisResult;
    trendData: TrendInsight[];
    onNext: (strategies: StrategyOption[]) => void;
    onBack: () => void;
    agentConfig: AgentConfig | undefined;
    qaConfig: AgentConfig | undefined;
    initialSelection: StrategyOption[];
    apiKey?: string;
    globalModel?: string;
}

export const StrategyPlanning: React.FC<Props> = ({ analysisData, trendData, onNext, onBack, agentConfig, qaConfig, initialSelection, apiKey, globalModel }) => {
    const [strategies, setStrategies] = useState<StrategyOption[]>([]);
    const [evaluations, setEvaluations] = useState<StrategyEvaluation[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>(initialSelection.map(s => s.id));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            if (analysisData.programName === 'N/A' || trendData.length === 0 || analysisData.programName.includes('(예시)')) {
                // Set example data
                const mockStrategies: StrategyOption[] = [
                    { id: 's1', title: "(예시) 데이터 기반 인텔리전스 전략", focusArea: "AI & Data", description: "금융 데이터를 인공지능으로 분석하여 실무 의사결정에 즉각 활용하는 실습 중심의 전략입니다.", keyFeatures: ["생성형 AI 업무 자동화 실습", "데이터 리터러시 진단", "비즈니스 케이스 스터디"] },
                    { id: 's2', title: "(예시) 애자일 가치 혁신 전략", focusArea: "Culture", description: "수평적 소통과 빠른 피드백 루프를 통해 조직 전체의 민첩성을 높이는 문화 중심 전략입니다.", keyFeatures: ["애자일 마인드셋 워크숍", "심리적 안정감 진단", "크로스 기능 팀 빌딩"] },
                    { id: 's3', title: "(예시) 맞춤형 성과 코칭 전략", focusArea: "Practical", description: "현업 이슈를 코칭 세션으로 연결하여 즉각적인 성과 개선을 지향하는 현장 밀착형 전략입니다.", keyFeatures: ["1:1 임원 코칭", "실전 피드백 시뮬레이션", "성과 관리 시스템 내재화"] }
                ];
                setStrategies(mockStrategies);

                const mockEvals: StrategyEvaluation[] = [
                    { strategyId: 's1', score: 95, reasoning: "금융권 트렌드와 잘 부합하며 실무 활용도가 매우 높습니다.", pros: ["최신 트렌드 반영", "높은 실용성"], cons: ["기술 인프라 필요"] },
                    { strategyId: 's2', score: 88, reasoning: "조직 문화 개선에는 효과적이나 단기 성과 측정은 어려울 수 있습니다.", pros: ["장기적 토대 마련", "소통 강화"], cons: ["도입 기간 장기화"] },
                    { strategyId: 's3', score: 92, reasoning: "리더들의 실제 고충을 해결하는 데 가장 효과적인 접근법입니다.", pros: ["즉각적 피드백", "개인차 고려"], cons: ["운영 비용 높음"] }
                ];
                setEvaluations(mockEvals);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const generatedStrategies = await generateStrategyOptions(analysisData, trendData, agentConfig?.systemPrompt, apiKey, agentConfig?.model, globalModel);
                setStrategies(generatedStrategies);

                const generatedEvals = await evaluateStrategies(generatedStrategies, qaConfig?.systemPrompt, apiKey, qaConfig?.model, globalModel);
                setEvaluations(generatedEvals);
            } catch (error) {
                console.error("Strategy loading failed:", error);
            } finally {
                setLoading(false);
            }
        };

        if (strategies.length === 0) {
            loadData();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const isExampleMode = analysisData.programName === 'N/A' || analysisData.programName.includes('(예시)');

    const handleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const handleConfirm = () => {
        const selected = strategies.filter(s => selectedIds.includes(s.id));
        if (selected.length > 0) {
            onNext(selected);
        }
    };

    const getEvaluation = (id: string) => evaluations.find(e => e.strategyId === id);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-6">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Target size={24} className="text-purple-600" />
                    </div>
                </div>
                <div className="text-center space-y-2">
                    <h3 className="text-lg font-semibold text-slate-800">제안 전략 수립 및 심사 중...</h3>
                    <p className="text-slate-500">
                        <span className="font-semibold text-purple-600">{agentConfig?.name || '전략 기획자'}</span>가 3가지 전략을 도출하고,<br />
                        <span className="font-semibold text-teal-600">{qaConfig?.name || '심사위원'}</span>이 적합성을 평가하고 있습니다.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-12">
            {isExampleMode && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 animate-pulse">
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <div className="text-sm">
                        <span className="font-bold">예시 모드:</span> 이전 단계의 데이터가 없어 가상의 전략 방향을 보여줍니다.
                    </div>
                </div>
            )}
            <div className="flex justify-between items-end px-1">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Target className="text-purple-600" />
                        제안 전략 선택 (Strategy Selection)
                    </h2>
                    <p className="text-slate-500 mt-1">
                        분석된 데이터와 트렌드를 기반으로 도출된 3가지 전략 방향입니다.
                        QA 에이전트의 평가를 참고하여 최적의 전략을 선택하세요.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {strategies.map((strategy, idx) => {
                    const evaluation = getEvaluation(strategy.id);
                    const isSelected = selectedIds.includes(strategy.id);

                    return (
                        <div
                            key={strategy.id}
                            onClick={() => handleSelect(strategy.id)}
                            className={`relative rounded-xl border-2 transition-all cursor-pointer flex flex-col
                        ${isSelected
                                    ? 'border-purple-600 bg-purple-50/30 shadow-xl ring-2 ring-purple-100 transform -translate-y-1'
                                    : 'border-slate-200 bg-white hover:border-purple-300 hover:shadow-md'
                                }`}
                        >
                            {/* Selection Badge */}
                            {isSelected && (
                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white shadow-md z-10">
                                    <CheckCircle2 size={20} />
                                </div>
                            )}

                            {/* Header */}
                            <div className={`p-5 rounded-t-lg border-b ${isSelected ? 'bg-purple-100/50 border-purple-200' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Option 0{idx + 1}</span>
                                    <span className="text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded text-slate-600">
                                        {strategy.focusArea}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 leading-tight">{strategy.title}</h3>
                            </div>

                            {/* Body */}
                            <div className="p-5 flex-1 space-y-4">
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    {strategy.description}
                                </p>

                                <div className="space-y-2">
                                    {strategy.keyFeatures.map((feat, i) => (
                                        <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                                            <Zap size={14} className="mt-1 text-purple-500 flex-shrink-0" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* QA Audit Section */}
                            {evaluation && (
                                <div className="mx-5 mb-5 p-4 bg-white rounded-xl border border-slate-200 shadow-inner">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                                        <div className="flex items-center gap-2 text-teal-700 font-bold text-sm">
                                            <ShieldCheck size={16} /> QA 심사평
                                        </div>
                                        <div className={`px-2 py-0.5 rounded text-xs font-bold ${evaluation.score >= 90 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                            Score: {evaluation.score}
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-600 italic mb-3">
                                        "{evaluation.reasoning}"
                                    </p>

                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                        <div className="space-y-1">
                                            <span className="font-bold text-green-600 flex items-center gap-1"><ThumbsUp size={10} /> Pros</span>
                                            {evaluation.pros.slice(0, 2).map((p, i) => (
                                                <div key={i} className="text-slate-500 truncate">• {p}</div>
                                            ))}
                                        </div>
                                        <div className="space-y-1">
                                            <span className="font-bold text-red-500 flex items-center gap-1"><ThumbsDown size={10} /> Cons</span>
                                            {evaluation.cons.slice(0, 2).map((c, i) => (
                                                <div key={i} className="text-slate-500 truncate">• {c}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-between pt-4">
                <button
                    onClick={onBack}
                    className="flex items-center gap-1 px-4 py-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors"
                >
                    <ChevronLeft size={16} /> 이전 단계
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={selectedIds.length === 0}
                    className={`px-8 py-3 font-semibold rounded-lg shadow-md transition-all flex items-center gap-2
            ${selectedIds.length > 0
                            ? 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-lg'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                    선택한 전략으로 과정 설계하기 <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};
