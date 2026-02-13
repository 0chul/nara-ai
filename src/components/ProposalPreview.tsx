import React, { useEffect, useState } from 'react';
import { AnalysisResult, TrendInsight, CourseMatch, ProposalSlide, AgentConfig, QualityAssessment } from '../types';
import { generateProposalContent, evaluateProposalQuality } from '../services/geminiService';
import { Download, Check, Maximize2, ShieldCheck, AlertCircle, ChevronLeft, RefreshCw } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  analysis: AnalysisResult;
  trends: TrendInsight[];
  matches: CourseMatch[];
  agentConfigs: AgentConfig[];
  apiKey?: string;
  globalModel?: string;
  onBack?: () => void;
}

export const ProposalPreview: React.FC<Props> = ({ analysis, trends, matches, agentConfigs, apiKey, globalModel, onBack }) => {
  const [slides, setSlides] = useState<ProposalSlide[]>([]);
  const [assessment, setAssessment] = useState<QualityAssessment | null>(null);
  const [generating, setGenerating] = useState(true);
  const [evaluating, setEvaluating] = useState(true);

  const qaAgent = agentConfigs.find(a => a.id === 'qa-agent');

  useEffect(() => {
    const createDraft = async () => {
      if (analysis.programName === 'N/A' || matches.length === 0 || analysis.programName.includes('(예시)')) {
        // Set example data
        setSlides([
          { id: 1, title: "(예시) 2025 미래 리더십 역량 강화", content: "Executive Summary: 본 제안은 디지털 전환기 리더의 역할 변화를 선도하기 위한 맞춤형 통합 솔루션을 제시합니다.", type: 'cover' },
          { id: 2, title: "(예시) 시장 분석 및 인사이트", content: "Global Trend: AI 내재화와 스킬 기반 조직으로의 변화가 가속화되고 있으며, 리더의 소통 방식 또한 이에 맞춰 진화해야 합니다.", type: 'trend' },
          { id: 3, title: "(예시) 핵심 교육 커리큘럼", content: "Module 1: 리더십 마인드셋 (강사: 김철수, 강한나), Module 2: 변화 관리 (강사: 이영희, 정민호), Module 3: 성과 코칭 시뮬레이션 (강사: 박민수, 최지혜)", type: 'curriculum' }
        ]);
        setAssessment({
          complianceScore: 92,
          complianceReason: "RFP 요건을 충실히 반영하고 있습니다.",
          instructorExpertiseScore: 88,
          instructorExpertiseReason: "분야별 최적의 전문가가 배정되었습니다.",
          industryMatchScore: 95,
          industryMatchReason: "해당 도메인의 특화 지식이 잘 녹아있습니다.",
          totalScore: 91,
          overallComment: "전반적으로 완성도가 높으며 실현 가능성이 돋보이는 제안서입니다.",
          assessmentDate: new Date().toISOString()
        });
        setGenerating(false);
        setEvaluating(false);
        return;
      }

      setGenerating(true);
      setEvaluating(true);
      try {
        // Generate slides
        const content = await generateProposalContent(analysis, trends, matches, apiKey);
        setSlides(content);
        setGenerating(false);

        // Run Quality Assessment
        const qualityResult = await evaluateProposalQuality(analysis, matches, qaAgent?.systemPrompt, apiKey, qaAgent?.model, globalModel);
        setAssessment(qualityResult);
      } catch (error) {
        console.error("Proposal generation failed:", error);
      } finally {
        setEvaluating(false);
        setGenerating(false);
      }
    };
    createDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReevaluate = async () => {
    if (analysis.programName.includes('(예시)')) return;
    setEvaluating(true);
    try {
      const qualityResult = await evaluateProposalQuality(analysis, matches, qaAgent?.systemPrompt, apiKey, qaAgent?.model, globalModel);
      setAssessment(qualityResult);
    } catch (error) {
      console.error("Re-evaluation failed:", error);
    } finally {
      setEvaluating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    return "text-amber-600";
  };

  const isExampleMode = analysis.programName === 'N/A' || analysis.programName.includes('(예시)');

  if (generating) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="flex space-x-2 mb-4">
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
        </div>
        <h3 className="text-xl font-bold text-slate-800">제안서 조립 중...</h3>
        <p className="text-slate-500 mt-2">PPTX 템플릿에 분석된 데이터와 추천 과정을 입히고 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      {isExampleMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-800 animate-pulse">
          <AlertCircle size={20} className="flex-shrink-0" />
          <div className="text-sm">
            <span className="font-bold">예시 모드:</span> 이전 단계의 데이터가 없어 가상의 제안서 결과를 보여줍니다.
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">제안서 초안 (Draft)</h2>
          <p className="text-slate-500">자동 생성된 슬라이드를 확인하고 다운로드하세요.</p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-3 text-slate-600 hover:text-slate-800 font-medium transition-colors"
            >
              <ChevronLeft size={20} />
              이전
            </button>
          )}
          <button className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-md font-semibold transition-all">
            <Download size={20} />
            PPTX 다운로드
          </button>
        </div>
      </div>

      {/* Quality Assessment Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-teal-50">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold text-teal-900 flex items-center gap-2">
              <ShieldCheck size={20} />
              제안서 품질 평가 리포트
            </h3>
            {assessment?.assessmentDate && (
              <span className="text-xs text-teal-600 font-medium bg-teal-100/50 px-2 py-0.5 rounded-full border border-teal-100">
                {new Date(assessment.assessmentDate).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-teal-200 text-teal-800 px-2 py-1 rounded mr-2">By {qaAgent?.name}</span>
            <button
              onClick={handleReevaluate}
              disabled={evaluating || isExampleMode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-teal-700 text-xs font-bold border border-teal-200 rounded hover:bg-teal-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              <RefreshCw size={12} className={evaluating ? "animate-spin" : ""} />
              다시 점검하기
            </button>
          </div>
        </div>

        {evaluating ? (
          <div className="p-8 text-center text-slate-500 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-3"></div>
            <span>품질 검수 중입니다...</span>
          </div>
        ) : assessment ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Radar Chart */}
            <div className="h-64 flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                  { subject: '데이터 준수', A: assessment.complianceScore, fullMark: 100 },
                  { subject: '강사 전문성', A: assessment.instructorExpertiseScore, fullMark: 100 },
                  { subject: '산업 적합성', A: assessment.industryMatchScore, fullMark: 100 },
                ]}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 12, fontWeight: 'bold' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar name="Score" dataKey="A" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.5} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
              <div className="absolute top-1 right-1 bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-xs font-bold">
                Total: {assessment.totalScore}점
              </div>
            </div>

            {/* Score Details */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-slate-700">기존 제안서 데이터 준수 (Data Compliance)</span>
                  <span className={`text-sm font-bold ${getScoreColor(assessment.complianceScore)}`}>{assessment.complianceScore}점</span>
                </div>
                <p className="text-xs text-slate-600">{assessment.complianceReason}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-slate-700">강사 전문 분야 매칭 (Expertise Match)</span>
                  <span className={`text-sm font-bold ${getScoreColor(assessment.instructorExpertiseScore)}`}>{assessment.instructorExpertiseScore}점</span>
                </div>
                <p className="text-xs text-slate-600">{assessment.instructorExpertiseReason}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-bold text-slate-700">산업 분야 매칭 (Industry Fit)</span>
                  <span className={`text-sm font-bold ${getScoreColor(assessment.industryMatchScore)}`}>{assessment.industryMatchScore}점</span>
                </div>
                <p className="text-xs text-slate-600">{assessment.industryMatchReason}</p>
              </div>

              <div className="flex gap-2 text-sm text-slate-700 bg-teal-50 p-3 rounded-md border border-teal-100 mt-2">
                <AlertCircle size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                <span><strong>총평:</strong> {assessment.overallComment}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-red-500">평가 정보를 불러오는데 실패했습니다.</div>
        )}
      </div>

      {/* Slide Preview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {slides.map((slide) => (
          <div key={slide.id} className="group bg-white aspect-video rounded-lg shadow-sm border border-slate-200 overflow-hidden relative hover:shadow-xl hover:border-blue-300 transition-all">
            {/* Mock Slide Header */}
            <div className="h-12 bg-slate-900 flex items-center px-4 justify-between">
              <div className="w-20 h-3 bg-slate-700 rounded-sm"></div>
              <div className="text-[10px] text-slate-400">Expert Consulting</div>
            </div>

            {/* Slide Body Preview */}
            <div className="p-5 flex flex-col h-[calc(100%-3rem)]">
              <h4 className="text-sm font-bold text-slate-800 mb-2 line-clamp-1">{slide.title}</h4>
              <div className="flex-1 bg-slate-50 rounded p-2 text-[10px] text-slate-500 whitespace-pre-line overflow-hidden border border-slate-100">
                {slide.content}
              </div>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <button className="bg-white text-slate-900 px-4 py-2 rounded-full shadow-lg text-sm font-bold flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all">
                <Maximize2 size={16} /> 크게 보기
              </button>
            </div>

            {/* Page Number */}
            <div className="absolute bottom-2 right-3 text-[10px] text-slate-400">{slide.id}</div>
          </div>
        ))}
      </div>

      <div className="mt-12 bg-slate-100 rounded-xl p-6 flex items-start gap-4">
        <div className="p-3 bg-white rounded-full text-blue-600 shadow-sm">
          <Check size={24} />
        </div>
        <div>
          <h4 className="font-bold text-slate-800 text-lg">작업 완료</h4>
          <p className="text-slate-600 mt-1 mb-4">
            제안서 작성이 90% 자동화되었습니다. 다운로드 후 PPT에서 디자인 미세 조정 및 최종 검토를 수행해주세요.<br />
            생성된 내용은 사내 지식 허브에 저장되어 다음 제안 시 참고자료로 활용됩니다.
          </p>
          <div className="flex gap-3">
            <button className="text-sm text-slate-500 underline hover:text-slate-800">새 프로젝트 시작하기</button>
            <button className="text-sm text-slate-500 underline hover:text-slate-800">이력 보기</button>
          </div>
        </div>
      </div>
    </div>
  );
};