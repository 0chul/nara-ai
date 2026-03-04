import React, { useEffect, useState } from 'react';
import { StepIndicator } from './components/StepIndicator';
import { Session } from '@supabase/supabase-js';
import { FileUploader } from './components/FileUploader';
import { RequirementsReview } from './components/RequirementsReview';
import { TrendResearch } from './components/TrendResearch';
import { StrategyPlanning } from './components/StrategyPlanning';
import { CurriculumMatching } from './components/CurriculumMatching';
import { ProposalPreview } from './components/ProposalPreview';
import { AgentManagement } from './components/AgentManagement';
import { KnowledgeHub } from './components/KnowledgeHub';
import { Dashboard } from './components/Dashboard';
import { NaraBidBrowser } from './components/NaraBidBrowser';
import { NaraBidManager } from './components/NaraBidManager';
import { NaraStepIndicator } from './components/NaraStepIndicator';
import { NaraRequirementWorkflow } from './components/NaraRequirementWorkflow';
import { NaraGenerateWorkflow } from './components/NaraGenerateWorkflow';
import { ReportPortfolio } from './components/reports/ReportPortfolio';
import {
  AppStep,
  RFPMetadata,
  AnalysisResult,
  TrendInsight,
  CourseMatch,
  AgentConfig,
  PastProposal,
  InstructorProfile,
  ProposalDraft,
  StrategyOption,
  BidItem,
  UserProfile,
  BidRequirementSession,
  NaraWorkflowStage
} from './types';
import { Briefcase, Database, FileText, LayoutDashboard, LogOut, Search, Settings, ShieldAlert, User } from 'lucide-react';
import { convertBidToRFP } from './services/bidTransformer';
import { getAllBids } from './services/naraDb';
import { ensureUserProfile, getCurrentSession, onAuthStateChanged, signInWithPassword, signOut } from './services/authService';
import { loadWorkspace, saveWorkspace } from './services/userWorkspace';
import { migrateWorkspaceToSupabaseOnce, mirrorWorkspaceToSupabase } from './services/workflowDraftService';
import { mapNaraRequirementsToAnalysis } from './services/naraAnalysisMapper';
import { loadBidRequirementSessionLocal, loadLatestBidRequirementSession } from './services/naraBidRequirementService';

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const ENV_GEMINI_API_KEY = String((import.meta as any)?.env?.VITE_GEMINI_API_KEY ?? __APP_ENV_GEMINI_API_KEY__).trim();
const ENV_NARA_API_KEY = String((import.meta as any)?.env?.VITE_NARA_API_KEY ?? __APP_ENV_NARA_API_KEY__).trim();
const ENV_NARA_SHOULD_ENCODE = String((import.meta as any)?.env?.VITE_NARA_SHOULD_ENCODE_KEY ?? __APP_ENV_NARA_SHOULD_ENCODE_KEY__).trim();

const parseBooleanEnv = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(normalized);
};

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'rfp-analyst',
    name: 'RFP Analyst',
    role: 'Extract grounded program requirements from uploaded RFP documents.',
    model: DEFAULT_MODEL,
    temperature: 0.2,
    systemPrompt:
      'You are an expert RFP analyst. Extract key information from the provided proposal request document. Identify Program Name, Objectives, Target Audience, Schedule, and requested Modules.',
    guardrails: ['Do not invent facts not present in the source text.', 'Flag ambiguous schedules and dates.']
  },
  {
    id: 'trend-researcher',
    name: 'Trend Researcher',
    role: 'Find recent market and HRD trends relevant to the program topic.',
    model: DEFAULT_MODEL,
    temperature: 0.6,
    systemPrompt:
      'Analyze provided topics and generate recent enterprise-relevant trends with concise sources.',
    guardrails: ['Prefer recent sources (within 3 years).', 'Avoid generic, unsupported claims.']
  },
  {
    id: 'strategy-planner',
    name: 'Strategy Planner',
    role: 'Generate distinct proposal strategy options from analysis and trends.',
    model: DEFAULT_MODEL,
    temperature: 0.7,
    systemPrompt:
      'Generate three distinct proposal strategies (technology, culture, practical execution) aligned to client context.',
    guardrails: ['Strategies must be distinct.', 'Align to client industry and constraints.']
  },
  {
    id: 'curriculum-matcher',
    name: 'Curriculum Matcher',
    role: 'Map required modules to curriculum and instructors.',
    model: DEFAULT_MODEL,
    temperature: 0.3,
    systemPrompt:
      'Match required modules to practical courses and instructor profiles. Return score and rationale for each match.',
    guardrails: ['Ensure each module has at least one instructor.', 'Provide concrete matching rationale.']
  },
  {
    id: 'proposal-assembler',
    name: 'Proposal Assembler',
    role: 'Draft structured proposal slide content.',
    model: DEFAULT_MODEL,
    temperature: 0.4,
    systemPrompt:
      'Generate professional proposal slide draft content using concise, persuasive business language.',
    guardrails: ['Keep language professional.', 'Use clear section structure.']
  },
  {
    id: 'qa-agent',
    name: 'QA Auditor',
    role: 'Evaluate proposal quality and risk before finalization.',
    model: DEFAULT_MODEL,
    temperature: 0.1,
    systemPrompt:
      'Evaluate proposal quality objectively on compliance, expertise fit, and industry fit. Return scores and rationale.',
    guardrails: ['Be critical and objective.', 'Do not hallucinate data.']
  }
];

const EMPTY_PROPOSALS: PastProposal[] = [];
const EMPTY_INSTRUCTORS: InstructorProfile[] = [];
const EMPTY_DRAFTS: ProposalDraft[] = [];

type AppView = 'dashboard' | 'wizard' | 'agents' | 'knowledge' | 'nara' | 'reports';
type WorkflowType = 'enterprise' | 'nara-bid';

const EMPTY_ANALYSIS_RESULT: AnalysisResult = {
  clientName: 'N/A',
  industry: 'N/A',
  department: 'N/A',
  programName: 'N/A',
  objectives: [],
  targetAudience: 'N/A',
  schedule: 'N/A',
  location: 'N/A',
  modules: [],
  specialRequests: ''
};

const NARA_STAGE_ORDER: NaraWorkflowStage[] = [
  NaraWorkflowStage.REQUIREMENTS_EXTRACT,
  NaraWorkflowStage.REQUIREMENTS_APPROVAL,
  NaraWorkflowStage.ANALYSIS_REVIEW,
  NaraWorkflowStage.RESEARCH,
  NaraWorkflowStage.STRATEGY,
  NaraWorkflowStage.CURRICULUM,
  NaraWorkflowStage.GENERATE_PREVIEW
];

const naraStageToAppStep = (stage: NaraWorkflowStage): AppStep => {
  switch (stage) {
    case NaraWorkflowStage.RESEARCH:
      return AppStep.RESEARCH;
    case NaraWorkflowStage.STRATEGY:
      return AppStep.STRATEGY;
    case NaraWorkflowStage.CURRICULUM:
      return AppStep.CURRICULUM;
    case NaraWorkflowStage.GENERATE_PREVIEW:
      return AppStep.PREVIEW;
    default:
      return AppStep.ANALYSIS;
  }
};

const legacyAppStepToNaraStage = (step: AppStep): NaraWorkflowStage => {
  if (step <= AppStep.ANALYSIS) return NaraWorkflowStage.REQUIREMENTS_EXTRACT;
  if (step === AppStep.RESEARCH) return NaraWorkflowStage.RESEARCH;
  if (step === AppStep.STRATEGY) return NaraWorkflowStage.STRATEGY;
  if (step === AppStep.CURRICULUM) return NaraWorkflowStage.CURRICULUM;
  return NaraWorkflowStage.GENERATE_PREVIEW;
};

const createDraft = (step: AppStep, files: RFPMetadata[], analysis: AnalysisResult | null = null): ProposalDraft => ({
  id: Date.now().toString(),
  lastUpdated: new Date(),
  step,
  naraStage: undefined,
  naraAnalysisId: undefined,
  naraRequirementReady: undefined,
  files,
  analysis,
  trends: [],
  selectedStrategies: [],
  matches: []
});

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);

  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<RFPMetadata[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [trends, setTrends] = useState<TrendInsight[]>([]);
  const [selectedStrategies, setSelectedStrategies] = useState<StrategyOption[]>([]);
  const [matches, setMatches] = useState<CourseMatch[]>([]);

  const [view, setView] = useState<AppView>('dashboard');
  const [drafts, setDrafts] = useState<ProposalDraft[]>(EMPTY_DRAFTS);
  const [showNaraBrowser, setShowNaraBrowser] = useState(false);
  const [workflowType, setWorkflowType] = useState<WorkflowType>('enterprise');
  const [currentNaraStage, setCurrentNaraStage] = useState<NaraWorkflowStage>(NaraWorkflowStage.REQUIREMENTS_EXTRACT);
  const [naraRequirementSession, setNaraRequirementSession] = useState<BidRequirementSession | null>(null);
  const [naraStageError, setNaraStageError] = useState<string | null>(null);

  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [aiApiKey, setAiApiKey] = useState<string>(ENV_GEMINI_API_KEY);
  const [naraApiKey, setNaraApiKey] = useState<string>(ENV_NARA_API_KEY);
  const [globalModel, setGlobalModel] = useState<string>(DEFAULT_MODEL);
  const effectiveAiApiKey = aiApiKey || ENV_GEMINI_API_KEY;
  const effectiveNaraApiKey = naraApiKey || ENV_NARA_API_KEY;

  const [pastProposals, setPastProposals] = useState<PastProposal[]>(EMPTY_PROPOSALS);
  const [instructors, setInstructors] = useState<InstructorProfile[]>(EMPTY_INSTRUCTORS);
  const [shouldEncodeKey, setShouldEncodeKey] = useState<boolean>(parseBooleanEnv(ENV_NARA_SHOULD_ENCODE));
  const [pinnedBids, setPinnedBids] = useState<BidItem[]>([]);
  const [authSession, setAuthSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [workspaceReady, setWorkspaceReady] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<boolean>(false);

  const loadPinnedBids = async () => {
    if (!authSession?.user?.id) {
      setPinnedBids([]);
      return;
    }
    try {
      const allBids = await getAllBids();
      setPinnedBids(allBids.filter(item => item.isPinned));
    } catch (error) {
      console.error('Failed to load pinned bids:', error);
    }
  };

  const resetUserWorkspaceState = () => {
    setDrafts(EMPTY_DRAFTS);
    setPastProposals(EMPTY_PROPOSALS);
    setInstructors(EMPTY_INSTRUCTORS);
    setAgentConfigs(DEFAULT_AGENTS);
    setGlobalModel(DEFAULT_MODEL);
    setAiApiKey(ENV_GEMINI_API_KEY);
    setNaraApiKey(ENV_NARA_API_KEY);
    setShouldEncodeKey(parseBooleanEnv(ENV_NARA_SHOULD_ENCODE));
    setCurrentDraftId(null);
    setUploadedFiles([]);
    setAnalysisResult(null);
    setTrends([]);
    setSelectedStrategies([]);
    setMatches([]);
    setCurrentStep(AppStep.UPLOAD);
    setWorkflowType('enterprise');
    setCurrentNaraStage(NaraWorkflowStage.REQUIREMENTS_EXTRACT);
    setNaraRequirementSession(null);
    setNaraStageError(null);
    setView('dashboard');
    setShowNaraBrowser(false);
    setPinnedBids([]);
  };

  useEffect(() => {
    let mounted = true;

    const syncProfile = async (session: Session | null) => {
      if (!mounted) {
        return;
      }

      setAuthSession(session);
      setWorkspaceReady(false);
      if (!session?.user?.id) {
        setUserProfile(null);
        resetUserWorkspaceState();
        setAuthLoading(false);
        return;
      }

      try {
        const profile = await ensureUserProfile(session.user.id, session.user.email);
        if (mounted) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        if (mounted) {
          setUserProfile(null);
        }
      } finally {
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    const bootstrap = async () => {
      try {
        const session = await getCurrentSession();
        await syncProfile(session);
      } catch (error) {
        console.error('Failed to load auth session:', error);
        if (mounted) {
          setAuthLoading(false);
        }
      }
    };

    void bootstrap();

    const unsubscribe = onAuthStateChanged((session) => {
      setAuthLoading(true);
      void syncProfile(session);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = authSession?.user?.id;
    if (!userId) {
      setWorkspaceReady(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await migrateWorkspaceToSupabaseOnce(userId);
      } catch (error) {
        console.error('Workspace one-time migration failed:', error);
      }

      if (cancelled) {
        return;
      }

      try {
        const snapshot = loadWorkspace(userId);
        setDrafts(Array.isArray(snapshot.drafts) ? snapshot.drafts : EMPTY_DRAFTS);
        setPastProposals(Array.isArray(snapshot.pastProposals) ? snapshot.pastProposals : EMPTY_PROPOSALS);
        setInstructors(Array.isArray(snapshot.instructors) ? snapshot.instructors : EMPTY_INSTRUCTORS);
        setAgentConfigs(Array.isArray(snapshot.agentConfigs) && snapshot.agentConfigs.length > 0 ? snapshot.agentConfigs : DEFAULT_AGENTS);
        setGlobalModel(snapshot.globalModel || DEFAULT_MODEL);
        setAiApiKey(snapshot.aiApiKey ?? ENV_GEMINI_API_KEY);
        setNaraApiKey(snapshot.naraApiKey ?? ENV_NARA_API_KEY);
        setShouldEncodeKey(typeof snapshot.shouldEncodeKey === 'boolean' ? snapshot.shouldEncodeKey : parseBooleanEnv(ENV_NARA_SHOULD_ENCODE));
      } catch (error) {
        console.error('Failed to initialize workspace state:', error);
        resetUserWorkspaceState();
      } finally {
        setWorkspaceReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authSession?.user?.id]);

  useEffect(() => {
    if (!authSession?.user?.id || workspaceReady) {
      return;
    }

    // Failsafe: never block the UI indefinitely on workspace bootstrap.
    const timeoutId = window.setTimeout(() => {
      setWorkspaceReady(true);
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [authSession?.user?.id, workspaceReady]);

  useEffect(() => {
    if (!workspaceReady) {
      return;
    }
    const userId = authSession?.user?.id;
    if (!userId) {
      return;
    }

    const snapshot = {
      drafts,
      pastProposals,
      instructors,
      agentConfigs,
      globalModel,
      aiApiKey,
      naraApiKey,
      shouldEncodeKey
    };

    saveWorkspace(userId, snapshot);
    void mirrorWorkspaceToSupabase(userId, snapshot).catch((error) => {
      console.error('Failed to mirror workspace to Supabase:', error);
    });
  }, [
    workspaceReady,
    authSession?.user?.id,
    drafts,
    pastProposals,
    instructors,
    agentConfigs,
    globalModel,
    aiApiKey,
    naraApiKey,
    shouldEncodeKey
  ]);

  useEffect(() => {
    if (!aiApiKey && ENV_GEMINI_API_KEY) {
      setAiApiKey(ENV_GEMINI_API_KEY);
    }
    if (!naraApiKey && ENV_NARA_API_KEY) {
      setNaraApiKey(ENV_NARA_API_KEY);
    }
    if (!shouldEncodeKey && parseBooleanEnv(ENV_NARA_SHOULD_ENCODE)) {
      setShouldEncodeKey(true);
    }
  }, []);

  useEffect(() => {
    if (!authSession?.user?.id) {
      setPinnedBids([]);
      return;
    }
    void loadPinnedBids();
  }, [authSession?.user?.id]);

  useEffect(() => {
    const handleOpenNaraBrowser = () => setShowNaraBrowser(true);
    const handleSelectPinnedBid = (event: Event) => {
      const customEvent = event as CustomEvent<BidItem>;
      handleBidSelection(customEvent.detail);
    };

    window.addEventListener('open-nara-browser', handleOpenNaraBrowser);
    window.addEventListener('select-pinned-bid', handleSelectPinnedBid);

    return () => {
      window.removeEventListener('open-nara-browser', handleOpenNaraBrowser);
      window.removeEventListener('select-pinned-bid', handleSelectPinnedBid);
    };
  }, []);

  const updateDraft = (id: string, updates: Partial<ProposalDraft>) => {
    setDrafts(prev => prev.map(draft => (draft.id === id ? { ...draft, ...updates, lastUpdated: new Date() } : draft)));
  };

  const handleDeleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(draft => draft.id !== id));
    if (currentDraftId === id) {
      setCurrentDraftId(null);
      setView('dashboard');
    }
  };

  const handleUploadComplete = (files: RFPMetadata[]) => {
    const shouldSave = window.confirm('파일 업로드가 완료되었습니다. 현재 상태를 초안으로 저장하시겠습니까?');

    setWorkflowType('enterprise');
    setNaraRequirementSession(null);
    setCurrentNaraStage(NaraWorkflowStage.REQUIREMENTS_EXTRACT);
    setNaraStageError(null);
    setUploadedFiles(files);
    setCurrentStep(AppStep.ANALYSIS);

    if (shouldSave) {
      if (currentDraftId) {
        updateDraft(currentDraftId, { files, step: AppStep.ANALYSIS });
      } else {
        const newDraft = createDraft(AppStep.ANALYSIS, files);
        setDrafts(prev => [newDraft, ...prev]);
        setCurrentDraftId(newDraft.id);
      }
    }
  };

  const handleAnalysisConfirm = (data: AnalysisResult) => {
    setAnalysisResult(data);
    if (workflowType === 'nara-bid') {
      setCurrentNaraStage(NaraWorkflowStage.RESEARCH);
      setCurrentStep(AppStep.RESEARCH);
      setNaraStageError(null);
      if (currentDraftId) {
        updateDraft(currentDraftId, {
          analysis: data,
          step: AppStep.RESEARCH,
          naraStage: NaraWorkflowStage.RESEARCH
        });
      }
      return;
    }

    setCurrentStep(AppStep.RESEARCH);
    if (currentDraftId) {
      updateDraft(currentDraftId, { analysis: data, step: AppStep.RESEARCH });
    }
  };

  const handleResearchComplete = (trendData: TrendInsight[]) => {
    setTrends(trendData);
    if (workflowType === 'nara-bid') {
      setCurrentNaraStage(NaraWorkflowStage.STRATEGY);
      setCurrentStep(AppStep.STRATEGY);
      setNaraStageError(null);
      if (currentDraftId) {
        updateDraft(currentDraftId, {
          trends: trendData,
          step: AppStep.STRATEGY,
          naraStage: NaraWorkflowStage.STRATEGY
        });
      }
      return;
    }

    setCurrentStep(AppStep.STRATEGY);
    if (currentDraftId) {
      updateDraft(currentDraftId, { trends: trendData, step: AppStep.STRATEGY });
    }
  };

  const handleStrategyComplete = (strategies: StrategyOption[]) => {
    setSelectedStrategies(strategies);
    if (workflowType === 'nara-bid') {
      setCurrentNaraStage(NaraWorkflowStage.CURRICULUM);
      setCurrentStep(AppStep.CURRICULUM);
      setNaraStageError(null);
      if (currentDraftId) {
        updateDraft(currentDraftId, {
          selectedStrategies: strategies,
          step: AppStep.CURRICULUM,
          naraStage: NaraWorkflowStage.CURRICULUM
        });
      }
      return;
    }

    setCurrentStep(AppStep.CURRICULUM);
    if (currentDraftId) {
      updateDraft(currentDraftId, { selectedStrategies: strategies, step: AppStep.CURRICULUM });
    }
  };

  const handleCurriculumComplete = (matchData: CourseMatch[]) => {
    setMatches(matchData);
    if (workflowType === 'nara-bid') {
      setCurrentNaraStage(NaraWorkflowStage.GENERATE_PREVIEW);
      setCurrentStep(AppStep.PREVIEW);
      setNaraStageError(null);
      if (currentDraftId) {
        updateDraft(currentDraftId, {
          matches: matchData,
          step: AppStep.PREVIEW,
          naraStage: NaraWorkflowStage.GENERATE_PREVIEW
        });
      }
      return;
    }

    setCurrentStep(AppStep.PREVIEW);
    if (currentDraftId) {
      updateDraft(currentDraftId, { matches: matchData, step: AppStep.PREVIEW });
    }
  };

  const handleBack = () => {
    if (currentStep > AppStep.UPLOAD) {
      const previous = currentStep - 1;
      setCurrentStep(previous);
      if (currentDraftId) {
        updateDraft(currentDraftId, { step: previous });
      }
    }
  };

  const getAgentConfig = (agentId: string) => agentConfigs.find(agent => agent.id === agentId);

  const analysisDataForFlow = analysisResult ?? EMPTY_ANALYSIS_RESULT;
  const currentNaraFile = uploadedFiles.find(file => file.source === 'nara-bid') ?? null;
  const knowledgeAuthToken = authSession?.access_token;
  const knowledgeGroupKey = userProfile?.groupKey ?? '';
  const isAdmin = userProfile?.role === 'admin';

  const updateNaraStage = (stage: NaraWorkflowStage) => {
    setCurrentNaraStage(stage);
    setCurrentStep(naraStageToAppStep(stage));
    setNaraStageError(null);
    if (currentDraftId) {
      updateDraft(currentDraftId, {
        step: naraStageToAppStep(stage),
        naraStage: stage
      });
    }
  };

  const canMoveToNaraStage = (target: NaraWorkflowStage): string | null => {
    const targetIndex = NARA_STAGE_ORDER.indexOf(target);
    const currentIndex = NARA_STAGE_ORDER.indexOf(currentNaraStage);
    if (targetIndex <= currentIndex) return null;

    if (targetIndex >= NARA_STAGE_ORDER.indexOf(NaraWorkflowStage.REQUIREMENTS_APPROVAL) && !naraRequirementSession) {
      return '요건 추출을 먼저 실행해 주세요.';
    }
    if (targetIndex >= NARA_STAGE_ORDER.indexOf(NaraWorkflowStage.ANALYSIS_REVIEW) && !naraRequirementSession?.approval?.generationReady) {
      return '필수 항목 승인 완료 후에만 다음 단계로 이동할 수 있습니다.';
    }
    if (targetIndex >= NARA_STAGE_ORDER.indexOf(NaraWorkflowStage.RESEARCH) && !analysisResult) {
      return '분석 확인 단계를 완료해 주세요.';
    }
    if (targetIndex >= NARA_STAGE_ORDER.indexOf(NaraWorkflowStage.STRATEGY) && trends.length === 0) {
      return '트렌드 단계를 먼저 완료해 주세요.';
    }
    if (targetIndex >= NARA_STAGE_ORDER.indexOf(NaraWorkflowStage.CURRICULUM) && selectedStrategies.length === 0) {
      return '전략 단계를 먼저 완료해 주세요.';
    }
    if (targetIndex >= NARA_STAGE_ORDER.indexOf(NaraWorkflowStage.GENERATE_PREVIEW) && matches.length === 0) {
      return '매칭 단계를 먼저 완료해 주세요.';
    }

    return null;
  };

  const handleNaraStageClick = (target: NaraWorkflowStage) => {
    const reason = canMoveToNaraStage(target);
    if (reason) {
      setNaraStageError(reason);
      return;
    }
    if (
      target === NaraWorkflowStage.ANALYSIS_REVIEW &&
      currentNaraStage === NaraWorkflowStage.REQUIREMENTS_APPROVAL &&
      naraRequirementSession
    ) {
      const fallback = analysisResult || EMPTY_ANALYSIS_RESULT;
      const mapped = mapNaraRequirementsToAnalysis(naraRequirementSession, fallback);
      setAnalysisResult(mapped.analysis);
      if (currentDraftId) {
        updateDraft(currentDraftId, { analysis: mapped.analysis });
      }
    }
    updateNaraStage(target);
  };

  const handleNaraRequirementSessionChange = (session: BidRequirementSession) => {
    setNaraRequirementSession(session);
    if (currentDraftId) {
      updateDraft(currentDraftId, {
        naraAnalysisId: session.analysisId,
        naraRequirementReady: Boolean(session.approval?.generationReady)
      });
    }
  };

  const handleNaraApprovalToAnalysis = () => {
    if (!naraRequirementSession?.approval?.generationReady) {
      setNaraStageError('필수 항목 승인이 완료되어야 분석 확인 단계로 이동할 수 있습니다.');
      return;
    }

    const fallback = analysisResult || EMPTY_ANALYSIS_RESULT;
    const mapped = mapNaraRequirementsToAnalysis(naraRequirementSession, fallback);
    setAnalysisResult(mapped.analysis);
    updateNaraStage(NaraWorkflowStage.ANALYSIS_REVIEW);
    if (currentDraftId) {
      updateDraft(currentDraftId, {
        analysis: mapped.analysis,
        naraStage: NaraWorkflowStage.ANALYSIS_REVIEW,
        step: naraStageToAppStep(NaraWorkflowStage.ANALYSIS_REVIEW)
      });
    }
  };

  const handleNaraRequirementNext = () => {
    if (currentNaraStage === NaraWorkflowStage.REQUIREMENTS_EXTRACT) {
      updateNaraStage(NaraWorkflowStage.REQUIREMENTS_APPROVAL);
      return;
    }
    handleNaraApprovalToAnalysis();
  };

  const handleNaraBack = () => {
    const currentIndex = NARA_STAGE_ORDER.indexOf(currentNaraStage);
    if (currentIndex <= 0) {
      setView('dashboard');
      return;
    }
    const previous = NARA_STAGE_ORDER[currentIndex - 1];
    updateNaraStage(previous);
  };

  const startNewProposal = () => {
    setWorkflowType('enterprise');
    setUploadedFiles([]);
    setAnalysisResult(null);
    setTrends([]);
    setSelectedStrategies([]);
    setMatches([]);
    setNaraRequirementSession(null);
    setCurrentNaraStage(NaraWorkflowStage.REQUIREMENTS_EXTRACT);
    setNaraStageError(null);
    setCurrentStep(AppStep.UPLOAD);
    setCurrentDraftId(null);
    setView('wizard');
  };

  const resumeDraft = (draft: ProposalDraft) => {
    const isNaraDraft = draft.files.some(file => file.source === 'nara-bid');
    setWorkflowType(isNaraDraft ? 'nara-bid' : 'enterprise');

    setCurrentDraftId(draft.id);
    setUploadedFiles(draft.files);
    setAnalysisResult(draft.analysis);
    setTrends(draft.trends);
    setSelectedStrategies(draft.selectedStrategies || []);
    setMatches(draft.matches);
    setNaraRequirementSession(null);
    setNaraStageError(null);
    if (isNaraDraft) {
      const stage = draft.naraStage || legacyAppStepToNaraStage(draft.step);
      setCurrentNaraStage(stage);
      setCurrentStep(naraStageToAppStep(stage));
    } else {
      setCurrentNaraStage(NaraWorkflowStage.REQUIREMENTS_EXTRACT);
      setCurrentStep(draft.step);
    }
    setView('wizard');
  };

  const handleUpdateDraftStatus = (id: string, newStatus: 'Won' | 'Lost') => {
    const draft = drafts.find(item => item.id === id);
    if (!draft) {
      return;
    }

    const newProposal: PastProposal = {
      id: draft.id,
      title: draft.analysis?.programName || 'Untitled Project',
      clientName: draft.analysis?.clientName || 'Unknown Client',
      industry: draft.analysis?.industry || 'Unknown Industry',
      date: new Date().toISOString().split('T')[0],
      tags: draft.analysis?.modules || [],
      fileName: draft.files[0]?.fileName || 'proposal_final.pptx',
      status: newStatus,
      amount: newStatus === 'Won' ? '$50,000' : '$0',
      progress: 100,
      qualityAssessment: undefined
    };

    setPastProposals(prev => [newProposal, ...prev]);
    setDrafts(prev => prev.filter(item => item.id !== id));
  };

  const handleBidSelection = (bid: BidItem) => {
    const rfpData = convertBidToRFP(bid);

    const bidMetadata: RFPMetadata = {
      fileName: `${bid.bidNtceNm.substring(0, 50)}_${bid.bidNtceNo}.txt`,
      uploadDate: new Date().toLocaleDateString(),
      fileSize: '0 KB',
      source: 'nara-bid',
      bidData: bid
    };

    setWorkflowType('nara-bid');
    setUploadedFiles([bidMetadata]);
    setAnalysisResult(rfpData);
    setTrends([]);
    setSelectedStrategies([]);
    setMatches([]);
    setNaraRequirementSession(null);
    setCurrentNaraStage(NaraWorkflowStage.REQUIREMENTS_EXTRACT);
    setCurrentStep(AppStep.ANALYSIS);
    setNaraStageError(null);
    setShowNaraBrowser(false);
    setView('wizard');

    const newDraft = createDraft(AppStep.ANALYSIS, [bidMetadata], rfpData);
    newDraft.naraStage = NaraWorkflowStage.REQUIREMENTS_EXTRACT;
    newDraft.naraRequirementReady = false;
    setDrafts(prev => [newDraft, ...prev]);
    setCurrentDraftId(newDraft.id);
  };

  useEffect(() => {
    if (workflowType !== 'nara-bid') return;
    if (naraRequirementSession) return;
    const userId = authSession?.user?.id;
    const bid = currentNaraFile?.bidData;
    if (!userId || !bid?.bidNtceNo) return;

    const local = loadBidRequirementSessionLocal(userId, bid.bidNtceNo, bid.bidNtceOrd);
    if (local) {
      setNaraRequirementSession(local);
      if (currentDraftId) {
        updateDraft(currentDraftId, {
          naraAnalysisId: local.analysisId,
          naraRequirementReady: Boolean(local.approval?.generationReady)
        });
      }
    }

    void (async () => {
      const remote = await loadLatestBidRequirementSession(userId, bid.bidNtceNo, bid.bidNtceOrd);
      if (!remote) return;

      if (!local) {
        setNaraRequirementSession(remote);
        if (currentDraftId) {
          updateDraft(currentDraftId, {
            naraAnalysisId: remote.analysisId,
            naraRequirementReady: Boolean(remote.approval?.generationReady)
          });
        }
        return;
      }

      const localUpdatedAt = Date.parse(local.updatedAt || '');
      const remoteUpdatedAt = Date.parse(remote.updatedAt || '');
      const useRemote = Number.isNaN(localUpdatedAt) || (!Number.isNaN(remoteUpdatedAt) && remoteUpdatedAt >= localUpdatedAt);
      if (!useRemote) return;

      setNaraRequirementSession(remote);
      if (currentDraftId) {
        updateDraft(currentDraftId, {
          naraAnalysisId: remote.analysisId,
          naraRequirementReady: Boolean(remote.approval?.generationReady)
        });
      }
    })();
  }, [authSession?.user?.id, currentDraftId, currentNaraFile?.bidData, naraRequirementSession, workflowType]);

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setLoginError(null);
    setLoggingIn(true);
    try {
      await signInWithPassword(loginEmail.trim(), loginPassword);
      setLoginPassword('');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  useEffect(() => {
    if (view === 'agents' && !isAdmin) {
      setView('dashboard');
    }
  }, [isAdmin, view]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white border border-slate-200 rounded-xl px-6 py-5 text-sm text-slate-600">
          인증 및 사용자 작업공간을 불러오는 중입니다...
        </div>
      </div>
    );
  }

  if (!authSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Nara AI 로그인</h1>
            <p className="text-sm text-slate-500 mt-1">전체 기능은 로그인 후 사용할 수 있습니다.</p>
          </div>
          <input
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            placeholder="이메일"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            placeholder="비밀번호"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
          {loginError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {loginError}
            </div>
          )}
          <button
            onClick={() => void handleLogin()}
            disabled={loggingIn}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-semibold"
          >
            <User size={16} />
            {loggingIn ? '로그인 중...' : '로그인'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Briefcase size={20} className="text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Expert<span className="text-blue-400">Consulting</span></span>
            <span className="hidden sm:inline-block ml-2 text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">Proposal Automation</span>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <div className="flex bg-slate-800 rounded-lg p-1 mr-4">
              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                <LayoutDashboard size={16} />
                <span className="hidden md:inline">대시보드</span>
              </button>
              <button
                onClick={() => setView('knowledge')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${view === 'knowledge' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                <Database size={16} />
                <span className="hidden md:inline">지식 허브</span>
              </button>
              <button
                onClick={() => setView('nara')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${view === 'nara' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                <Search size={16} />
                <span className="hidden md:inline">나라장터</span>
              </button>
              <button
                onClick={() => setView('reports')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${view === 'reports' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                <FileText size={16} />
                <span className="hidden md:inline">리포트</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setView('agents')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${view === 'agents' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                  <Settings size={16} />
                  <span className="hidden md:inline">에이전트</span>
                </button>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs bg-slate-800 border border-slate-700 px-2.5 py-1 rounded">
              <User size={12} />
              <span>{userProfile?.displayName || authSession.user.email}</span>
              <span className="text-slate-400">({isAdmin ? 'admin' : 'member'})</span>
            </div>
            <button
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-700 rounded bg-slate-800 hover:bg-slate-700"
            >
              <LogOut size={12} />
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {view === 'dashboard' ? (
          <Dashboard
            proposals={pastProposals}
            drafts={drafts}
            pinnedBids={pinnedBids}
            onNewProposal={startNewProposal}
            onResumeDraft={resumeDraft}
            onSelectPinnedBid={handleBidSelection}
            onViewAll={() => setView('knowledge')}
            onUpdateDraftStatus={handleUpdateDraftStatus}
            onDeleteDraft={handleDeleteDraft}
          />
        ) : view === 'knowledge' ? (
          <KnowledgeHub
            proposals={pastProposals}
            instructors={instructors}
            onUpdateProposals={setPastProposals}
            onUpdateInstructors={setInstructors}
            onClose={() => setView('dashboard')}
            apiKey={effectiveAiApiKey}
            agentConfigs={agentConfigs}
            globalModel={globalModel}
            session={authSession}
            profile={userProfile}
            authLoading={authLoading}
          />
        ) : view === 'nara' ? (
          <NaraBidManager
            onSelectBid={handleBidSelection}
            onClose={() => setView('dashboard')}
            apiKey={effectiveNaraApiKey}
            shouldEncodeKey={shouldEncodeKey}
            onRefreshPinned={loadPinnedBids}
          />
        ) : view === 'reports' ? (
          <ReportPortfolio />
        ) : view === 'agents' ? (
          isAdmin ? (
            <AgentManagement
              agents={agentConfigs}
              onSave={setAgentConfigs}
              onClose={() => setView('dashboard')}
              globalModel={globalModel}
              onSaveGlobalModel={setGlobalModel}
              aiApiKey={effectiveAiApiKey}
              onSaveAiApiKey={setAiApiKey}
              naraApiKey={effectiveNaraApiKey}
              onSaveNaraApiKey={setNaraApiKey}
              shouldEncodeKey={shouldEncodeKey}
              onSaveShouldEncodeKey={setShouldEncodeKey}
            />
          ) : (
            <div className="max-w-xl mx-auto px-4 py-12">
              <div className="bg-white rounded-xl border border-red-100 p-6 text-sm text-red-700 flex items-start gap-3">
                <ShieldAlert size={18} className="mt-0.5" />
                에이전트 관리 센터는 admin 계정만 접근할 수 있습니다.
              </div>
            </div>
          )
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
            {workflowType === 'nara-bid' ? (
              <>
                <NaraStepIndicator
                  currentStage={currentNaraStage}
                  onStageClick={handleNaraStageClick}
                />

                {naraStageError && (
                  <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    {naraStageError}
                  </div>
                )}

                <div className="min-h-[500px]">
                  {(currentNaraStage === NaraWorkflowStage.REQUIREMENTS_EXTRACT || currentNaraStage === NaraWorkflowStage.REQUIREMENTS_APPROVAL) && (
                    <NaraRequirementWorkflow
                      mode={currentNaraStage === NaraWorkflowStage.REQUIREMENTS_EXTRACT ? 'extract' : 'approval'}
                      analysisData={analysisDataForFlow}
                      sourceFile={currentNaraFile}
                      agentConfig={getAgentConfig('proposal-assembler')}
                      naraApiKey={effectiveNaraApiKey}
                      knowledgeGroupKey={knowledgeGroupKey}
                      globalModel={globalModel}
                      userId={authSession?.user?.id}
                      session={naraRequirementSession}
                      onSessionChange={handleNaraRequirementSessionChange}
                      onBack={handleNaraBack}
                      onNext={handleNaraRequirementNext}
                    />
                  )}

                  {currentNaraStage === NaraWorkflowStage.ANALYSIS_REVIEW && (
                    <RequirementsReview
                      files={uploadedFiles}
                      onConfirm={handleAnalysisConfirm}
                      onBack={() => updateNaraStage(NaraWorkflowStage.REQUIREMENTS_APPROVAL)}
                      agentConfig={getAgentConfig('rfp-analyst')}
                      initialData={analysisResult}
                      apiKey={effectiveAiApiKey}
                      globalModel={globalModel}
                      allowReanalyze={false}
                    />
                  )}

                  {currentNaraStage === NaraWorkflowStage.RESEARCH && (
                    <TrendResearch
                      analysisData={analysisDataForFlow}
                      onNext={handleResearchComplete}
                      onBack={() => updateNaraStage(NaraWorkflowStage.ANALYSIS_REVIEW)}
                      agentConfig={getAgentConfig('trend-researcher')}
                      initialData={trends}
                      apiKey={effectiveAiApiKey}
                      globalModel={globalModel}
                    />
                  )}

                  {currentNaraStage === NaraWorkflowStage.STRATEGY && (
                    <StrategyPlanning
                      analysisData={analysisDataForFlow}
                      trendData={trends}
                      onNext={handleStrategyComplete}
                      onBack={() => updateNaraStage(NaraWorkflowStage.RESEARCH)}
                      agentConfig={getAgentConfig('strategy-planner')}
                      qaConfig={getAgentConfig('qa-agent')}
                      initialSelection={selectedStrategies}
                      apiKey={effectiveAiApiKey}
                      globalModel={globalModel}
                    />
                  )}

                  {currentNaraStage === NaraWorkflowStage.CURRICULUM && (
                    <CurriculumMatching
                      analysisData={analysisDataForFlow}
                      trendData={trends}
                      selectedStrategies={selectedStrategies}
                      onNext={handleCurriculumComplete}
                      onBack={() => updateNaraStage(NaraWorkflowStage.STRATEGY)}
                      agentConfig={getAgentConfig('curriculum-matcher')}
                      initialData={matches}
                      apiKey={effectiveAiApiKey}
                      globalModel={globalModel}
                    />
                  )}

                  {currentNaraStage === NaraWorkflowStage.GENERATE_PREVIEW && (
                    <NaraGenerateWorkflow
                      session={naraRequirementSession}
                      onBack={() => updateNaraStage(NaraWorkflowStage.CURRICULUM)}
                      onDone={() => setView('dashboard')}
                    />
                  )}
                </div>
              </>
            ) : (
              <>
                <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />

                <div className="min-h-[500px]">
                  {currentStep === AppStep.UPLOAD && <FileUploader onUploadComplete={handleUploadComplete} />}

                  {currentStep === AppStep.ANALYSIS && (
                    <RequirementsReview
                      files={uploadedFiles}
                      onConfirm={handleAnalysisConfirm}
                      onBack={handleBack}
                      agentConfig={getAgentConfig('rfp-analyst')}
                      initialData={analysisResult}
                      apiKey={effectiveAiApiKey}
                      globalModel={globalModel}
                    />
                  )}

                  {currentStep === AppStep.RESEARCH && (
                    <TrendResearch
                      analysisData={analysisDataForFlow}
                      onNext={handleResearchComplete}
                      onBack={handleBack}
                      agentConfig={getAgentConfig('trend-researcher')}
                      initialData={trends}
                      apiKey={effectiveAiApiKey}
                      globalModel={globalModel}
                    />
                  )}

                  {currentStep === AppStep.STRATEGY && (
                    <StrategyPlanning
                      analysisData={analysisDataForFlow}
                      trendData={trends}
                      onNext={handleStrategyComplete}
                      onBack={handleBack}
                      agentConfig={getAgentConfig('strategy-planner')}
                      qaConfig={getAgentConfig('qa-agent')}
                      initialSelection={selectedStrategies}
                      apiKey={effectiveAiApiKey}
                      globalModel={globalModel}
                    />
                  )}

                  {currentStep === AppStep.CURRICULUM && (
                    <CurriculumMatching
                      analysisData={analysisDataForFlow}
                      trendData={trends}
                      selectedStrategies={selectedStrategies}
                      onNext={handleCurriculumComplete}
                      onBack={handleBack}
                      agentConfig={getAgentConfig('curriculum-matcher')}
                      initialData={matches}
                      apiKey={effectiveAiApiKey}
                      globalModel={globalModel}
                    />
                  )}

                  {currentStep === AppStep.PREVIEW && (
                    <ProposalPreview
                      analysis={analysisDataForFlow}
                      trends={trends}
                      matches={matches}
                      agentConfigs={agentConfigs}
                      apiKey={effectiveAiApiKey}
                      globalModel={globalModel}
                      knowledgeGroupKey={knowledgeGroupKey}
                      knowledgeAuthToken={knowledgeAuthToken}
                      onBack={handleBack}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {showNaraBrowser && (
        <NaraBidBrowser
          onSelectBid={handleBidSelection}
          onClose={() => setShowNaraBrowser(false)}
          apiKey={effectiveNaraApiKey}
          shouldEncodeKey={shouldEncodeKey}
        />
      )}
    </div>
  );
};

export default App;
