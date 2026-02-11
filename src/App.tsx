
import React, { useState, useEffect } from 'react';
import { StepIndicator } from './components/StepIndicator';
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
import { AppStep, RFPMetadata, AnalysisResult, TrendInsight, CourseMatch, AgentConfig, PastProposal, InstructorProfile, ProposalDraft, StrategyOption, BidItem } from './types';
import { Briefcase, Settings, Database, LayoutDashboard, Search } from 'lucide-react';
import { convertBidToRFP } from './services/bidTransformer';

const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'rfp-analyst',
    name: 'RFP 전문 분석가',
    role: '고객의 RFP 문서를 분석하여 핵심 요구사항, 일정, 교육 대상 등을 구조화된 데이터로 추출합니다.',
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    systemPrompt: 'You are an expert RFP analyst. Extract key information from the provided proposal request document. Identify Program Name, Objectives, Target Audience, Schedule, and requested Modules.',
    guardrails: ['Do not make up information not present in the text.', 'Flag any ambiguous dates.']
  },
  {
    id: 'trend-researcher',
    name: '트렌드 인사이트 연구원',
    role: '교육 주제와 관련된 최신 HRD 및 비즈니스 트렌드를 조사하여 제안서에 포함될 인사이트를 제공합니다.',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    systemPrompt: 'Analyze the provided education topics and generate 3 key global trends relevant to HRD and Business Leadership. Provide sources.',
    guardrails: ['Use only sources from the last 3 years.', 'Focus on enterprise-level trends.']
  },
  {
    id: 'strategy-planner',
    name: '제안 전략 기획자',
    role: 'RFP와 트렌드를 기반으로 차별화된 제안 컨셉과 전략 방향을 3가지 옵션으로 도출합니다.',
    model: 'gemini-2.5-flash',
    temperature: 0.8,
    systemPrompt: 'Based on the analysis and trends, generate 3 distinct strategic options (Tech-driven, Culture-focused, Practical) for the proposal.',
    guardrails: ['Ensure strategies are distinct from each other.', 'Align with client industry.']
  },
  {
    id: 'curriculum-matcher',
    name: '교육 과정 매칭 컨설턴트',
    role: '선택된 전략에 맞춰 가장 적합한 내부 교육 과정과 강사를 매칭하고 추천 근거를 작성합니다.',
    model: 'gemini-2.5-flash',
    temperature: 0.4,
    systemPrompt: 'You are an expert curriculum planner. Match the following required modules with the best available internal courses based on the selected strategy. Provide a match score and justification.',
    guardrails: ['Prioritize internal full-time instructors.', 'Match score must be based on keyword relevance.']
  },
  {
    id: 'proposal-assembler',
    name: '제안서 작성 전문 에디터',
    role: '분석된 정보와 생성된 콘텐츠를 바탕으로 전문적인 PPT 제안서 구조와 문구를 생성합니다.',
    model: 'gemini-2.5-flash',
    temperature: 0.5,
    systemPrompt: 'Generate professional slide content for a corporate training proposal. Use persuasive language and structured formatting.',
    guardrails: ['Ensure tone is professional and polite.', 'Include a clear call to action.']
  },
  {
    id: 'qa-agent',
    name: '제안 품질 심사위원',
    role: '전략 방향의 적절성을 사전 평가하고, 최종 제안서의 품질을 심사합니다.',
    model: 'gemini-2.5-flash',
    temperature: 0.1,
    systemPrompt: 'You are a strict Quality Assurance auditor for training proposals. Evaluate the proposal/strategy based on: 1. Data Compliance (adherence to RFP), 2. Instructor Expertise Match, 3. Industry Fit. Provide scores (0-100) and critical reasoning.',
    guardrails: ['Be objective and critical.', 'Do not hallucinate scores.', 'Provide constructive feedback.']
  }
];

// Mock Data for Knowledge Hub & Dashboard with Dummy QA Data
const MOCK_PROPOSALS: PastProposal[] = [
  {
    id: 'p1',
    title: '2025 삼성전자 신입사원 입문교육 제안',
    clientName: '삼성전자',
    industry: '제조/전자',
    date: '2024-03-20',
    tags: ['신입사원', '비전내재화', '팀빌딩'],
    fileName: '2025_SE_Rookie_Draft.pptx',
    status: 'Review',
    amount: '₩120,000,000',
    progress: 80,
    qualityAssessment: {
      complianceScore: 95,
      complianceReason: "RFP의 모든 핵심 요구사항을 완벽하게 충족하며, 신입사원 교육의 목적과 부합함.",
      instructorExpertiseScore: 88,
      instructorExpertiseReason: "MZ세대 소통 전문가 위주로 강사진이 구성되어 적절함.",
      industryMatchScore: 92,
      industryMatchReason: "전자/제조 업계의 최신 트렌드와 용어를 적절히 반영함.",
      totalScore: 91,
      overallComment: "매우 우수한 제안서입니다. 수주 가능성이 높습니다."
    }
  },
  {
    id: 'p2',
    title: 'KB국민은행 디지털 리더십 아카데미',
    clientName: 'KB국민은행',
    industry: '금융',
    date: '2024-03-15',
    tags: ['리더십', 'DT', '금융트렌드'],
    fileName: 'KB_Digital_Leadership_v2.pptx',
    status: 'Draft',
    amount: '₩85,000,000',
    progress: 45,
    qualityAssessment: {
      complianceScore: 78,
      complianceReason: "디지털 리더십 관련 핵심 모듈은 포함되었으나, 일부 실습 과정이 RFP 요구사항보다 축소됨.",
      instructorExpertiseScore: 92,
      instructorExpertiseReason: "금융권 DT 프로젝트 경험이 풍부한 강사진으로 구성됨.",
      industryMatchScore: 85,
      industryMatchReason: "금융 트렌드를 반영한 사례 연구가 적절히 포함됨.",
      totalScore: 85,
      overallComment: "강사진의 전문성은 뛰어나나, 실습 시간 확보를 위한 커리큘럼 조정이 필요함."
    }
  },
  {
    id: 'p3',
    title: 'SK텔레콤 AI-Driven Work Way 워크숍',
    clientName: 'SK텔레콤',
    industry: '통신/IT',
    date: '2024-03-10',
    tags: ['AI활용', '업무효율화', '애자일'],
    fileName: 'SKT_AI_Work.pdf',
    status: 'Submitted',
    amount: '₩55,000,000',
    progress: 100,
    qualityAssessment: {
      complianceScore: 82,
      complianceReason: "AI 활용 도구에 대한 구체적인 명시가 다소 부족함.",
      instructorExpertiseScore: 95,
      instructorExpertiseReason: "현업 AI 개발자 출신 강사 배치로 전문성이 매우 높음.",
      industryMatchScore: 88,
      industryMatchReason: "통신 업계의 데이터를 예시로 활용하여 현장감이 뛰어남.",
      totalScore: 88,
      overallComment: "강사의 전문성이 돋보이나, 실습 도구에 대한 구체적 설명 보완이 필요함."
    }
  },
  {
    id: 'p4',
    title: 'LG화학 중간관리자 성과관리 과정',
    clientName: 'LG화학',
    industry: '화학/제조',
    date: '2024-02-28',
    tags: ['성과관리', '코칭', '피드백'],
    fileName: 'LG_Chem_PM.pptx',
    status: 'Won',
    amount: '₩150,000,000',
    progress: 100,
    qualityAssessment: {
      complianceScore: 90,
      complianceReason: "성과관리 프로세스에 대한 고객사 내부 규정을 잘 반영함.",
      instructorExpertiseScore: 85,
      instructorExpertiseReason: "리더십 코칭 자격증 보유 강사진으로 구성됨.",
      industryMatchScore: 78,
      industryMatchReason: "제조업 특유의 수직적 문화를 고려한 코칭 스킬 제안이 조금 더 필요함.",
      totalScore: 84,
      overallComment: "안정적인 제안서이나, 산업 특화 시나리오가 조금 더 보강되면 좋겠습니다."
    }
  },
  {
    id: 'p5',
    title: '현대자동차 글로벌 역량 강화',
    clientName: '현대자동차',
    industry: '제조/자동차',
    date: '2024-01-15',
    tags: ['글로벌', '이문화', '영어'],
    fileName: 'HMC_Global_Biz.pptx',
    status: 'Completed',
    amount: '₩90,000,000',
    progress: 100,
    qualityAssessment: {
      complianceScore: 88,
      complianceReason: "글로벌 비즈니스 매너 교육 요청사항을 충실히 반영함.",
      instructorExpertiseScore: 90,
      instructorExpertiseReason: "원어민 수준의 강사와 해외 주재원 경험 보유자 매칭.",
      industryMatchScore: 85,
      industryMatchReason: "자동차 산업의 글로벌 공급망 이슈를 케이스로 활용함.",
      totalScore: 87,
      overallComment: "무난하고 깔끔한 제안서입니다."
    }
  },
  // Moved from MOCK_DRAFTS
  {
    id: 'p6',
    title: '2025 마케팅 역량 강화 과정',
    clientName: "CJ제일제당",
    industry: "식품/유통",
    date: '2024-05-20',
    tags: ["Digital Marketing", "Data Driven", "Branding"],
    fileName: 'CJ_Marketing_Competency.pdf',
    status: 'Completed',
    amount: '₩70,000,000',
    progress: 100,
    qualityAssessment: {
      complianceScore: 85,
      complianceReason: "실무 사례 위주 진행 요건을 잘 반영하였습니다.",
      instructorExpertiseScore: 82,
      instructorExpertiseReason: "마케팅 전문가는 훌륭하나, 식품 산업 관련 경험이 조금 더 보강되면 좋습니다.",
      industryMatchScore: 90,
      industryMatchReason: "CJ 그룹의 톤앤매너를 잘 유지하고 있습니다.",
      totalScore: 86,
      overallComment: "무난하게 승인될 것으로 보입니다."
    }
  },
  {
    id: 'p7',
    title: '현장 안전 리더십 강화',
    clientName: "롯데케미칼",
    industry: "화학/제조",
    date: '2024-05-19',
    tags: ["Safety", "Leadership", "Risk Management"],
    fileName: 'Lotte_Chemical_Safety_Leadership.pdf',
    status: 'Submitted',
    amount: '₩45,000,000',
    progress: 100,
    qualityAssessment: {
      complianceScore: 95,
      complianceReason: "안전 수칙 및 법규 반영이 철저합니다.",
      instructorExpertiseScore: 92,
      instructorExpertiseReason: "안전 관리 자격 보유 강사진이 배정되었습니다.",
      industryMatchScore: 95,
      industryMatchReason: "화학 플랜트 현장 이해도가 높습니다.",
      totalScore: 94,
      overallComment: "매우 우수한 안전 교육 제안서입니다."
    }
  }
];

const MOCK_INSTRUCTORS: InstructorProfile[] = [
  { id: 'i1', name: '김철수 수석', position: '리더십 센터장', expertise: ['리더십', '코칭', '조직문화'], bio: '전 삼성인력개발원 교수, 리더십 코칭 15년 경력', email: 'cs.kim@expert.co.kr' },
  { id: 'i2', name: '이영희 이사', position: 'DT 교육팀장', expertise: ['디지털 트렌드', '데이터 리터러시', '생성형 AI'], bio: '카이스트 공학박사, 빅데이터 분석 전문가', email: 'yh.lee@expert.co.kr' },
  { id: 'i3', name: '박민수 전문위원', position: '커뮤니케이션 파트장', expertise: ['소통', '협상', '갈등관리'], bio: '국제공인 협상 전문가, 커뮤니케이션 저서 3권 집필', email: 'ms.park@expert.co.kr' },
  { id: 'i4', name: '최지혜 컨설턴트', position: 'CS 교육팀', expertise: ['고객경험(CX)', '서비스 마인드', '감정노동 관리'], bio: '전 항공사 승무원 교육 담당', email: 'jh.choi@expert.co.kr' },
];

const MOCK_DRAFTS: ProposalDraft[] = [
  {
    id: 'draft-dummy-1',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    step: AppStep.ANALYSIS,
    files: [
      { fileName: '2025_Global_Leadership_RFP.pdf', fileSize: '4.2 MB', uploadDate: '2024-05-21' },
      { fileName: 'Reference_Material.pdf', fileSize: '1.8 MB', uploadDate: '2024-05-21' }
    ],
    analysis: null,
    trends: [],
    selectedStrategy: null,
    matches: []
  },
  // Removed CJ & Lotte (Moved to MOCK_PROPOSALS)
  {
    id: 'draft-dummy-4',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    step: AppStep.COMPLETE,
    files: [{ fileName: 'Hanwha_Life_Finance_DT.pdf', fileSize: '2.8 MB', uploadDate: '2024-05-18' }],
    analysis: {
      clientName: "한화생명",
      industry: "금융/보험",
      department: "인재개발팀",
      programName: "금융 데이터 리터러시 과정",
      objectives: ["데이터 활용 능력 향상", "DT 마인드셋 함양", "실무 적용 프로젝트"],
      targetAudience: "전사 임직원 100명",
      schedule: "2025년 9월",
      location: "한화생명 연수원",
      modules: ["Data Literacy Foundation", "AI Utilization in Finance", "DT Project Workshop"],
      specialRequests: "금융 데이터 분석 실습 포함"
    },
    trends: [],
    selectedStrategy: null,
    matches: []
  },
  {
    id: 'draft-dummy-5',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
    step: AppStep.COMPLETE,
    files: [{ fileName: 'GS_Retail_CS_Master.pdf', fileSize: '1.5 MB', uploadDate: '2024-05-15' }],
    analysis: {
      clientName: "GS리테일",
      industry: "유통/서비스",
      department: "CS기획팀",
      programName: "CS 마스터 클래스 2025",
      objectives: ["고객 응대 스킬 고도화", "VOC 관리 및 분석", "감정노동 관리"],
      targetAudience: "CS 매니저 및 점장",
      schedule: "2025년 6월",
      location: "GS타워 대강당",
      modules: ["Advanced CS Mind", "Communication Skill", "Stress Management"],
      specialRequests: "롤플레잉 위주 구성"
    },
    trends: [],
    selectedStrategy: null,
    matches: []
  },
  {
    id: 'draft-dummy-6',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
    step: AppStep.PREVIEW,
    files: [{ fileName: 'Mobis_Autonomous_Safety.pdf', fileSize: '6.2 MB', uploadDate: '2024-05-22' }],
    analysis: {
      clientName: "현대모비스",
      industry: "자동차/부품",
      department: "안전보건팀",
      programName: "자율주행 연구원 안전 의식 고취",
      objectives: ["연구소 안전 수칙 준수", "실험실 위험 관리", "안전 심리 진단"],
      targetAudience: "R&D 연구원 200명",
      schedule: "2025년 8월",
      location: "마북 연구소",
      modules: ["Lab Safety Protocol", "Behavior Based Safety", "Psychological Safety"],
      specialRequests: "연구원 특성 고려한 논리적 접근 필요"
    },
    trends: [],
    selectedStrategy: null,
    matches: []
  },
  {
    id: 'draft-dummy-7',
    lastUpdated: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    step: AppStep.ANALYSIS,
    files: [{ fileName: 'POSCO_ESG_Workshop.docx', fileSize: '1.2 MB', uploadDate: '2024-05-22' }],
    analysis: {
      clientName: "POSCO",
      industry: "철강/제조",
      department: "ESG경영실",
      programName: "공급망 ESG 실사 대응 워크숍",
      objectives: ["협력사 ESG 평가 대응", "탄소중립 로드맵 이해"],
      targetAudience: "구매/조달 담당자",
      schedule: "2025년 10월",
      location: "포항 인재창조원",
      modules: ["Global ESG Standards", "Supply Chain Due Diligence"],
      specialRequests: "EU 공급망 실사법 위주"
    },
    trends: [],
    selectedStrategy: null,
    matches: []
  }
];

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.UPLOAD);

  // Active Proposal Data
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<RFPMetadata[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [trends, setTrends] = useState<TrendInsight[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyOption | null>(null);
  const [matches, setMatches] = useState<CourseMatch[]>([]);

  // Global App State
  const [view, setView] = useState<'dashboard' | 'wizard' | 'agents' | 'knowledge' | 'nara'>('dashboard');
  const [drafts, setDrafts] = useState<ProposalDraft[]>(MOCK_DRAFTS);
  const [showNaraBrowser, setShowNaraBrowser] = useState(false);

  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>(DEFAULT_AGENTS);
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [naraApiKey, setNaraApiKey] = useState<string>('');
  const [globalModel, setGlobalModel] = useState<string>('gemini-2.5-flash');

  const [pastProposals, setPastProposals] = useState<PastProposal[]>(MOCK_PROPOSALS);
  const [instructors, setInstructors] = useState<InstructorProfile[]>(MOCK_INSTRUCTORS);
  const [shouldEncodeKey, setShouldEncodeKey] = useState<boolean>(false);
  const [pinnedBids, setPinnedBids] = useState<BidItem[]>([]);

  // Fetch pinned bids from Supabase
  const loadPinnedBids = async () => {
    try {
      const allBids = await getAllBids();
      const pinned = allBids.filter(b => b.isPinned);
      setPinnedBids(pinned);
    } catch (error) {
      console.error("Failed to load pinned bids:", error);
    }
  };

  useEffect(() => {
    loadPinnedBids();
  }, []);

  // Listen for nara browser open event
  useEffect(() => {
    const handleOpenNaraBrowser = () => setShowNaraBrowser(true);
    const handleSelectPinnedBid = (e: any) => handleBidSelection(e.detail);

    window.addEventListener('open-nara-browser', handleOpenNaraBrowser);
    window.addEventListener('select-pinned-bid', handleSelectPinnedBid);

    return () => {
      window.removeEventListener('open-nara-browser', handleOpenNaraBrowser);
      window.removeEventListener('select-pinned-bid', handleSelectPinnedBid);
    };
  }, []);

  // Helper to update the current draft in the drafts list whenever state changes
  const updateDraft = (
    id: string,
    updates: Partial<ProposalDraft>
  ) => {
    setDrafts(prev => prev.map(d => d.id === id ? { ...d, ...updates, lastUpdated: new Date() } : d));
  };

  const handleDeleteDraft = (id: string) => {
    setDrafts(prev => prev.filter(d => d.id !== id));
    if (currentDraftId === id) {
      setCurrentDraftId(null);
      setView('dashboard');
    }
  };

  // Handlers to advance steps
  const handleUploadComplete = (files: RFPMetadata[]) => {
    const shouldSave = window.confirm("파일 업로드 완료. 제안서 초안을 저장하고 분석을 진행하시겠습니까?");

    setUploadedFiles(files);
    setCurrentStep(AppStep.ANALYSIS);

    if (shouldSave) {
      if (currentDraftId) {
        updateDraft(currentDraftId, { files, step: AppStep.ANALYSIS });
      } else {
        // Create new draft only if user confirms
        const newDraftId = Date.now().toString();
        const newDraft: ProposalDraft = {
          id: newDraftId,
          lastUpdated: new Date(),
          step: AppStep.ANALYSIS,
          files: files,
          analysis: null,
          trends: [],
          selectedStrategy: null,
          matches: []
        };
        setDrafts(prev => [newDraft, ...prev]);
        setCurrentDraftId(newDraftId);
      }
    }
  };

  const handleAnalysisConfirm = (data: AnalysisResult) => {
    setAnalysisResult(data);
    setCurrentStep(AppStep.RESEARCH);
    if (currentDraftId) {
      if (window.confirm("요구사항 분석 결과를 저장하시겠습니까?")) {
        updateDraft(currentDraftId, { analysis: data, step: AppStep.RESEARCH });
      }
    }
  };

  const handleResearchComplete = (trendData: TrendInsight[]) => {
    setTrends(trendData);
    setCurrentStep(AppStep.STRATEGY);
    if (currentDraftId) {
      if (window.confirm("트렌드 분석 결과를 저장하시겠습니까?")) {
        updateDraft(currentDraftId, { trends: trendData, step: AppStep.STRATEGY });
      }
    }
  };

  const handleStrategyComplete = (strategy: StrategyOption) => {
    setSelectedStrategy(strategy);
    setCurrentStep(AppStep.CURRICULUM);
    if (currentDraftId) {
      if (window.confirm("선택한 전략을 저장하고 과정 매칭을 진행하시겠습니까?")) {
        updateDraft(currentDraftId, { selectedStrategy: strategy, step: AppStep.CURRICULUM });
      }
    }
  };

  const handleCurriculumComplete = (matchData: CourseMatch[]) => {
    setMatches(matchData);
    setCurrentStep(AppStep.PREVIEW);
    if (currentDraftId) {
      if (window.confirm("과정 매칭 결과를 저장하시겠습니까?")) {
        updateDraft(currentDraftId, { matches: matchData, step: AppStep.PREVIEW });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > AppStep.UPLOAD) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      if (currentDraftId) {
        // Automatically save step navigation
        updateDraft(currentDraftId, { step: prevStep });
      }
    }
  };

  const handleSaveAgents = (updatedAgents: AgentConfig[]) => {
    setAgentConfigs(updatedAgents);
  };

  const startNewProposal = () => {
    // Reset State
    setUploadedFiles([]);
    setAnalysisResult(null);
    setTrends([]);
    setSelectedStrategy(null);
    setMatches([]);
    setCurrentStep(AppStep.UPLOAD);

    // Modified: Do not create draft immediately. 
    // Draft will be created in handleUploadComplete if user confirms save.
    setCurrentDraftId(null);

    setView('wizard');
  };

  const resumeDraft = (draft: ProposalDraft) => {
    // Restore State
    setCurrentDraftId(draft.id);
    setUploadedFiles(draft.files);
    setAnalysisResult(draft.analysis);
    setTrends(draft.trends);
    setSelectedStrategy(draft.selectedStrategy);
    setMatches(draft.matches);
    setCurrentStep(draft.step);

    setView('wizard');
  };

  const handleUpdateDraftStatus = (id: string, newStatus: 'Won' | 'Lost') => {
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;

    if (window.confirm(`이 제안서를 '${newStatus === 'Won' ? '수주 성공' : '수주 실패'}' 상태로 변경하고 아카이브 하시겠습니까?`)) {
      // Create a past proposal entry
      const newProposal: PastProposal = {
        id: draft.id,
        title: draft.analysis?.programName || 'Untitled Project',
        clientName: draft.analysis?.clientName || 'Unknown Client',
        industry: draft.analysis?.industry || 'Unknown Industry',
        date: new Date().toISOString().split('T')[0],
        tags: draft.analysis?.modules || [],
        fileName: draft.files[0]?.fileName || 'proposal_final.pptx',
        status: newStatus,
        amount: newStatus === 'Won' ? '₩50,000,000' : '₩0', // Dummy amount
        progress: 100,
        qualityAssessment: undefined
      };

      setPastProposals(prev => [newProposal, ...prev]);
      setDrafts(prev => prev.filter(d => d.id !== id));
    }
  };

  // Nara Bid Selection Handler
  const handleBidSelection = (bid: BidItem) => {
    // Convert bid to RFP format
    const rfpData = convertBidToRFP(bid);

    // Create RFPMetadata with bid source
    const bidMetadata: RFPMetadata = {
      fileName: `${bid.bidNtceNm.substring(0, 50)}_${bid.bidNtceNo}.txt`,
      uploadDate: new Date().toLocaleDateString(),
      fileSize: '0 KB',
      source: 'nara-bid',
      bidData: bid
    };

    // Set uploaded files and analysis result directly
    setUploadedFiles([bidMetadata]);
    setAnalysisResult(rfpData);
    setCurrentStep(AppStep.RESEARCH); // Skip analysis step
    setShowNaraBrowser(false);

    // Create draft
    const newDraftId = Date.now().toString();
    const newDraft: ProposalDraft = {
      id: newDraftId,
      lastUpdated: new Date(),
      step: AppStep.RESEARCH,
      files: [bidMetadata],
      analysis: rfpData,
      trends: [],
      selectedStrategy: null,
      matches: []
    };
    setDrafts(prev => [newDraft, ...prev]);
    setCurrentDraftId(newDraftId);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
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
            {/* Navigation Buttons */}
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
                onClick={() => setView('agents')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${view === 'agents' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
              >
                <Settings size={16} />
                <span className="hidden md:inline">에이전트 설정</span>
              </button>
            </div>

            <span className="w-px h-4 bg-slate-700 mx-1"></span>
            <span className="hidden sm:block text-slate-400">안녕하세요, 김제안 수석컨설턴트님</span>
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 text-xs font-bold">KJ</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
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
            apiKey={aiApiKey}
            agentConfigs={agentConfigs}
            globalModel={globalModel}
          />
        ) : view === 'nara' ? (
          <NaraBidManager
            onSelectBid={handleBidSelection}
            onClose={() => setView('dashboard')}
            apiKey={naraApiKey}
            shouldEncodeKey={shouldEncodeKey}
            onRefreshPinned={loadPinnedBids}
          />
        ) : view === 'agents' ? (
          <AgentManagement
            agents={agentConfigs}
            onSave={handleSaveAgents}
            onClose={() => setView('dashboard')}
            aiApiKey={aiApiKey}
            onSaveAiApiKey={setAiApiKey}
            naraApiKey={naraApiKey}
            onSaveNaraApiKey={setNaraApiKey}
            shouldEncodeKey={shouldEncodeKey}
            onSaveShouldEncodeKey={setShouldEncodeKey}
          />
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up">
            <StepIndicator currentStep={currentStep} />

            <div className="min-h-[500px]">
              {currentStep === AppStep.UPLOAD && (
                <FileUploader onUploadComplete={handleUploadComplete} />
              )}

              {currentStep === AppStep.ANALYSIS && (
                <RequirementsReview
                  files={uploadedFiles}
                  onConfirm={handleAnalysisConfirm}
                  onBack={handleBack}
                  agentConfig={agentConfigs.find(a => a.id === 'rfp-analyst')}
                  initialData={analysisResult}
                  apiKey={aiApiKey}
                  globalModel={globalModel}
                />
              )}

              {currentStep === AppStep.RESEARCH && analysisResult && (
                <TrendResearch
                  analysisData={analysisResult}
                  onNext={handleResearchComplete}
                  onBack={handleBack}
                  agentConfig={agentConfigs.find(a => a.id === 'trend-researcher')}
                  initialData={trends}
                  apiKey={aiApiKey}
                  globalModel={globalModel}
                />
              )}

              {currentStep === AppStep.STRATEGY && analysisResult && (
                <StrategyPlanning
                  analysisData={analysisResult}
                  trendData={trends}
                  onNext={handleStrategyComplete}
                  onBack={handleBack}
                  agentConfig={agentConfigs.find(a => a.id === 'strategy-planner')}
                  qaConfig={agentConfigs.find(a => a.id === 'qa-agent')}
                  initialSelection={selectedStrategy}
                  apiKey={aiApiKey}
                  globalModel={globalModel}
                />
              )}

              {currentStep === AppStep.CURRICULUM && analysisResult && (
                <CurriculumMatching
                  analysisData={analysisResult}
                  trendData={trends}
                  selectedStrategy={selectedStrategy}
                  onNext={handleCurriculumComplete}
                  onBack={handleBack}
                  agentConfig={agentConfigs.find(a => a.id === 'curriculum-matcher')}
                  initialData={matches}
                  apiKey={aiApiKey}
                  globalModel={globalModel}
                />
              )}

              {currentStep === AppStep.PREVIEW && analysisResult && (
                <ProposalPreview
                  analysis={analysisResult}
                  trends={trends}
                  matches={matches}
                  agentConfigs={agentConfigs}
                  apiKey={aiApiKey}
                  globalModel={globalModel}
                  onBack={handleBack}
                />
              )}
            </div>
          </div>
        )}
      </main>

      {/* Nara Bid Browser Modal */}
      {showNaraBrowser && (
        <NaraBidBrowser
          onSelectBid={handleBidSelection}
          onClose={() => setShowNaraBrowser(false)}
          apiKey={naraApiKey}
          shouldEncodeKey={shouldEncodeKey}
        />
      )}
    </div>
  );
};

export default App;
