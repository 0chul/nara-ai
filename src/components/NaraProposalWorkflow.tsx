import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnalysisResult, AgentConfig, AppStep, NaraDocumentSection, NaraSubmissionDraft, RFPMetadata } from '../types';
import { generateNaraSubmissionDraft } from '../services/geminiService';
import { BidFormCandidate, discoverBidForms, downloadBidFormFile, fillHwpxTemplate } from '../services/hwpxFormService';
import { FileText, FileCheck2, ClipboardCheck, ChevronLeft, ChevronRight, Building2, Calendar, ExternalLink, CheckCircle2, RefreshCw, Upload, Download, FileDown } from 'lucide-react';

interface Props {
  analysisData: AnalysisResult;
  sourceFile: RFPMetadata | null;
  agentConfig?: AgentConfig;
  apiKey?: string;
  globalModel?: string;
  onBackToDashboard: () => void;
  onUpdateDraftStep?: (step: AppStep) => void;
}

const WORKFLOW_STEPS = [
  { id: 'review', title: '입찰 공고 요건 정리', appStep: AppStep.ANALYSIS, icon: FileText },
  { id: 'compose', title: 'HWPX 양식 본문 작성', appStep: AppStep.STRATEGY, icon: FileCheck2 },
  { id: 'finalize', title: '제출 패키지 점검', appStep: AppStep.PREVIEW, icon: ClipboardCheck }
] as const;

type WorkflowStepIndex = 0 | 1 | 2;

export const NaraProposalWorkflow: React.FC<Props> = ({
  analysisData,
  sourceFile,
  agentConfig,
  apiKey,
  globalModel,
  onBackToDashboard,
  onUpdateDraftStep
}) => {
  const [stepIndex, setStepIndex] = useState<WorkflowStepIndex>(0);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<NaraSubmissionDraft | null>(null);
  const [sections, setSections] = useState<NaraDocumentSection[]>([]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [formCandidates, setFormCandidates] = useState<BidFormCandidate[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const sourceBid = sourceFile?.bidData;
  const isExampleMode = analysisData.programName === 'N/A' || !sourceBid;
  const currentStep = WORKFLOW_STEPS[stepIndex];

  const progressPercentage = useMemo(() => ((stepIndex + 1) / WORKFLOW_STEPS.length) * 100, [stepIndex]);

  const loadDraft = useCallback(async () => {
    setLoading(true);
    try {
      const result = await generateNaraSubmissionDraft(
        analysisData,
        sourceBid,
        agentConfig?.systemPrompt,
        apiKey,
        agentConfig?.model,
        globalModel
      );
      setDraft(result);
      setSections(result.sections);
    } catch (error) {
      console.error('Failed to build Nara HWPX draft:', error);
    } finally {
      setLoading(false);
    }
  }, [analysisData, sourceBid, agentConfig, apiKey, globalModel]);

  const applyFormCandidate = useCallback(async (candidate: BidFormCandidate) => {
    if (!(candidate.hwpx || candidate.extension.toLowerCase() === 'hwpx')) {
      setFormError('현재 자동 적용은 HWPX 파일만 지원합니다.');
      return;
    }

    setLoadingTemplate(true);
    setFormError(null);
    setFormMessage(null);
    try {
      const downloaded = await downloadBidFormFile(candidate.fileUrl);
      const normalizedName = downloaded.fileName.toLowerCase().endsWith('.hwpx')
        ? downloaded.fileName
        : `${downloaded.fileName}.hwpx`;

      const fetchedFile = new File([downloaded.blob], normalizedName, {
        type: downloaded.blob.type || 'application/octet-stream'
      });

      setTemplateFile(fetchedFile);
      setFormMessage(`자동 불러오기 완료: ${normalizedName}`);
    } catch (error) {
      console.error('Failed to apply detected bid form:', error);
      setFormError(error instanceof Error ? error.message : '양식 파일 불러오기에 실패했습니다.');
    } finally {
      setLoadingTemplate(false);
    }
  }, []);

  const loadBidForms = useCallback(async (autoApplyHwpx: boolean = false) => {
    if (!sourceBid?.bidNtceNo) {
      setFormError('선택된 공고 정보가 없어 양식 자동 조회를 진행할 수 없습니다.');
      return;
    }

    setLoadingForms(true);
    setFormError(null);
    setFormMessage(null);

    try {
      const candidates = await discoverBidForms({
        bidNtceNo: sourceBid.bidNtceNo,
        bidNtceOrd: sourceBid.bidNtceOrd,
        bidNtceUrl: sourceBid.bidNtceUrl,
        apiKey,
        shouldEncodeKey: true
      });

      setFormCandidates(candidates);

      if (autoApplyHwpx) {
        const hwpxCandidate = candidates.find(item => item.hwpx || item.extension.toLowerCase() === 'hwpx');
        if (hwpxCandidate) {
          await applyFormCandidate(hwpxCandidate);
        } else {
          setFormMessage('HWPX 양식은 자동으로 찾지 못했습니다. 수동 업로드를 사용해주세요.');
        }
      }
    } catch (error) {
      console.error('Failed to discover bid forms:', error);
      setFormError(error instanceof Error ? error.message : '공고 양식 자동 조회에 실패했습니다.');
    } finally {
      setLoadingForms(false);
    }
  }, [apiKey, applyFormCandidate, sourceBid]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    onUpdateDraftStep?.(currentStep.appStep);
  }, [currentStep, onUpdateDraftStep]);

  useEffect(() => {
    setTemplateFile(null);
    setFormCandidates([]);
    setFormMessage(null);
    setFormError(null);

    if (!sourceBid?.bidNtceNo) {
      return;
    }

    void loadBidForms(false);
  }, [loadBidForms, sourceBid?.bidNtceNo]);

  const moveStep = (next: number) => {
    if (next < 0 || next > 2) {
      return;
    }
    setStepIndex(next as WorkflowStepIndex);
  };

  const handleSectionChange = (sectionId: string, content: string) => {
    setSections(prev => prev.map(section => (
      section.id === sectionId ? { ...section, content } : section
    )));
  };

  const buildTemplateFieldMap = (): Record<string, string> => {
    if (!draft) {
      return {};
    }

    const sectionMap = sections.reduce<Record<string, string>>((acc, section) => {
      acc[section.id] = section.content;
      acc[section.title] = section.content;
      return acc;
    }, {});

    return {
      ...sectionMap,
      bidTitle: draft.bidTitle,
      bidNoticeNo: draft.bidNoticeNo,
      issuingAgency: draft.issuingAgency,
      programName: analysisData.programName,
      objectives: analysisData.objectives.join(', '),
      schedule: analysisData.schedule,
      location: analysisData.location
    };
  };

  const handleExportHwpx = async () => {
    if (!draft) {
      return;
    }

    if (!templateFile) {
      setExportError('먼저 공고문 제공 HWPX 양식을 업로드하거나 자동 불러오기를 실행해주세요.');
      return;
    }

    setExportError(null);
    setExporting(true);
    try {
      const outputFileName = `${draft.bidNoticeNo || 'nara'}-filled.hwpx`;
      const blob = await fillHwpxTemplate(templateFile, buildTemplateFieldMap(), outputFileName);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = outputFileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('HWPX export failed:', error);
      setExportError(error instanceof Error ? error.message : 'HWPX 생성 중 오류가 발생했습니다.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <h3 className="text-lg font-semibold text-slate-800">나라장터 제출용 HWPX 초안 생성 중...</h3>
        <p className="text-sm text-slate-500">공고문 구조에 맞춰 필수 항목을 정리하고 있습니다.</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="bg-white rounded-xl border border-red-100 p-6 text-red-600">
        HWPX 초안을 생성하지 못했습니다. 다시 시도해주세요.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">나라장터 입찰 서류 작성 워크플로우</h2>
            <p className="text-slate-500 mt-1">사기업 제안서(PPT)와 분리된 HWPX 양식 전용 흐름입니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100">
              문서 형식: {draft.documentType}
            </span>
            {isExampleMode && (
              <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-100">
                예시 모드
              </span>
            )}
          </div>
        </div>

        <div className="mt-6">
          <div className="w-full h-2 bg-slate-100 rounded-full">
            <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${progressPercentage}%` }}></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            {WORKFLOW_STEPS.map((step, index) => {
              const Icon = step.icon;
              const active = index === stepIndex;
              const completed = index < stepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => setStepIndex(index as WorkflowStepIndex)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    active
                      ? 'border-blue-300 bg-blue-50'
                      : completed
                        ? 'border-green-200 bg-green-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm text-slate-800">
                    <Icon size={16} />
                    {step.title}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {stepIndex === 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900">입찰 공고 핵심정보</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
              <div className="text-slate-500 mb-1">공고명</div>
              <div className="font-semibold text-slate-900">{draft.bidTitle}</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
              <div className="text-slate-500 mb-1">공고번호</div>
              <div className="font-semibold text-slate-900">{draft.bidNoticeNo}</div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-start gap-2">
              <Building2 size={16} className="text-slate-500 mt-0.5" />
              <div>
                <div className="text-slate-500 mb-1">발주기관</div>
                <div className="font-semibold text-slate-900">{draft.issuingAgency}</div>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-start gap-2">
              <Calendar size={16} className="text-slate-500 mt-0.5" />
              <div>
                <div className="text-slate-500 mb-1">입찰기간 정보</div>
                <div className="font-semibold text-slate-900">{analysisData.schedule}</div>
              </div>
            </div>
          </div>

          {sourceBid?.bidNtceUrl && (
            <a
              href={sourceBid.bidNtceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              원문 공고 열기 <ExternalLink size={14} />
            </a>
          )}
        </section>
      )}

      {stepIndex === 1 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">HWPX 양식 본문 초안</h3>
            <button
              onClick={() => void loadDraft()}
              className="text-xs font-semibold px-3 py-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1"
            >
              <RefreshCw size={12} />
              새로 정리
            </button>
          </div>
          <div className="space-y-4">
            {sections.map(section => (
              <div key={section.id} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="font-semibold text-slate-800">{section.title}</div>
                  {section.required && (
                    <span className="text-[11px] font-bold bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full">
                      필수
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-xs text-slate-500">{section.templateHint}</p>
                  <textarea
                    value={section.content}
                    onChange={(event) => handleSectionChange(section.id, event.target.value)}
                    className="w-full min-h-[110px] p-3 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {stepIndex === 2 && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">HWPX 양식 파일 적용</h3>
              <p className="text-sm text-slate-500 mb-4">
                발주기관에서 제공한 HWPX 템플릿을 업로드하면 작성한 내용을 필드/토큰에 자동 주입합니다.
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">공고 첨부 양식 자동 불러오기</p>
                    <p className="text-xs text-slate-500">선택한 공고의 첨부파일 중 HWPX 양식을 자동 조회/적용합니다.</p>
                  </div>
                  <button
                    onClick={() => void loadBidForms(true)}
                    disabled={loadingForms || loadingTemplate || !sourceBid?.bidNtceNo}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-blue-200 text-blue-700 bg-white hover:bg-blue-50 disabled:text-slate-400 disabled:border-slate-200"
                  >
                    {loadingForms || loadingTemplate ? <RefreshCw size={12} className="animate-spin" /> : <FileDown size={12} />}
                    양식 자동 불러오기
                  </button>
                </div>

                <div className="space-y-2 max-h-44 overflow-auto pr-1">
                  {formCandidates.length === 0 ? (
                    <p className="text-xs text-slate-500">조회된 첨부 양식이 없습니다. 필요 시 아래에서 수동 업로드를 진행해주세요.</p>
                  ) : (
                    formCandidates.map(candidate => (
                      <div key={candidate.fileUrl} className="flex items-center justify-between gap-2 border border-slate-200 bg-white rounded px-3 py-2">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-800 truncate">{candidate.fileName}</div>
                          <div className="text-[11px] text-slate-500">{candidate.source} · .{candidate.extension}</div>
                        </div>
                        <button
                          onClick={() => void applyFormCandidate(candidate)}
                          disabled={loadingTemplate || !(candidate.hwpx || candidate.extension.toLowerCase() === 'hwpx')}
                          className="shrink-0 text-[11px] px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:text-slate-400"
                        >
                          이 양식 사용
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {formMessage && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1.5">{formMessage}</div>
                )}
                {formError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-2 py-1.5">{formError}</div>
                )}
              </div>

              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer text-sm font-semibold text-slate-700">
                <Upload size={14} />
                HWPX 템플릿 업로드
                <input
                  type="file"
                  accept=".hwpx"
                  className="hidden"
                  onChange={(event) => {
                    const picked = event.target.files?.[0] ?? null;
                    setTemplateFile(picked);
                    setFormMessage(picked ? `수동 업로드 완료: ${picked.name}` : null);
                    setFormError(null);
                  }}
                />
              </label>
              {templateFile && (
                <div className="mt-3 text-sm text-slate-600">
                  선택 파일: <span className="font-semibold">{templateFile.name}</span>
                </div>
              )}

              <button
                onClick={() => void handleExportHwpx()}
                disabled={exporting || !templateFile}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-semibold"
              >
                {exporting ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                HWPX 생성/다운로드
              </button>
              {exportError && (
                <div className="mt-3 text-sm text-red-600">{exportError}</div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-4">필수 첨부서류 체크</h3>
              <div className="space-y-3">
                {draft.requiredAttachments.map((attachment, index) => (
                  <div key={attachment} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle2 size={16} className="text-green-600" />
                    <span>{index + 1}. {attachment}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-3">양식 준수 점검표</h3>
              <div className="space-y-2">
                {draft.complianceChecklist.map(item => (
                  <div key={item} className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-2">작성 가이드</h4>
              <ul className="space-y-1.5 text-sm text-slate-600">
                {draft.writingGuidelines.map(guideline => (
                  <li key={guideline}>- {guideline}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {stepIndex !== 2 && exportError && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-700">
          {exportError}
        </div>
      )}

      <div className="flex justify-between items-center">
        <button
          onClick={() => (stepIndex === 0 ? onBackToDashboard() : moveStep(stepIndex - 1))}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ChevronLeft size={16} />
          {stepIndex === 0 ? '대시보드로' : '이전 단계'}
        </button>

        <button
          onClick={() => (stepIndex === 2 ? onBackToDashboard() : moveStep(stepIndex + 1))}
          className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
        >
          {stepIndex === 2 ? '작성 완료' : '다음 단계'}
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
