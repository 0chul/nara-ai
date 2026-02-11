
import React, { useEffect, useState } from 'react';
import { AnalysisResult, TrendInsight, StrategyOption, StrategyEvaluation, AgentConfig } from '../types';
import { generateStrategyOptions, evaluateStrategies } from '../services/geminiService';
import { Target, ArrowRight, ChevronLeft, ShieldCheck, CheckCircle2, ThumbsUp, ThumbsDown, Zap } from 'lucide-react';

interface Props {
  analysisData: AnalysisResult;
  trendData: TrendInsight[];
  onNext: (strategy: StrategyOption) => void;
  onBack: () => void;
  agentConfig: AgentConfig | undefined;
  qaConfig: AgentConfig | undefined;
  initialSelection: StrategyOption | null;
  apiKey?: string;
  globalModel?: string;
}

export const StrategyPlanning: React.FC<Props> = ({ analysisData, trendData, onNext, onBack, agentConfig, qaConfig, initialSelection, apiKey, globalModel }) => {
  const [strategies, setStrategies] = useState<StrategyOption[]>([]);
  const [evaluations, setEvaluations] = useState<StrategyEvaluation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelection?.id || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        // 1. Generate 3 Strategic Options
        const generatedStrategies = await generateStrategyOptions(analysisData, trendData, agentConfig?.systemPrompt, apiKey);
        setStrategies(generatedStrategies);

        // 2. Evaluate them using QA Agent
        const generatedEvals = await evaluateStrategies(generatedStrategies, qaConfig?.systemPrompt, apiKey);
        setEvaluations(generatedEvals);
        
        setLoading(false);
    };

    if (strategies.length === 0) {
        loadData();
    } else {
        setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (id: string) => {
      setSelectedId(id);
  };

  const handleConfirm = () => {
      const selected = strategies.find(s => s.id === selectedId);
      if (selected) {
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
             <span className="font-semibold text-purple-600">{agentConfig?.name || '전략 기획자'}</span>가 3가지 전략을 도출하고,<br/>
             <span className="font-semibold text-teal-600">{qaConfig?.name || '심사위원'}</span>이 적합성을 평가하고 있습니다.
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
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
              const isSelected = selectedId === strategy.id;
              
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
                                    <span className="font-bold text-green-600 flex items-center gap-1"><ThumbsUp size={10}/> Pros</span>
                                    {evaluation.pros.slice(0, 2).map((p, i) => (
                                        <div key={i} className="text-slate-500 truncate">• {p}</div>
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    <span className="font-bold text-red-500 flex items-center gap-1"><ThumbsDown size={10}/> Cons</span>
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
          disabled={!selectedId}
          className={`px-8 py-3 font-semibold rounded-lg shadow-md transition-all flex items-center gap-2
            ${selectedId 
                ? 'bg-slate-900 hover:bg-slate-800 text-white hover:shadow-lg' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
        >
          선택한 전략으로 과정 설계하기 <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
