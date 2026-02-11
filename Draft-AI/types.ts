// Bid Item (from Nara Public API)
export interface BidItem {
  bidNtceNo: string;
  bidNtceOrd: string;
  bidNtceNm: string;
  bidNtceDt: string;
  ntceInsttNm: string;
  dminsttNm: string;
  bidNtceBgnDt: string;
  bidNtceEndDt: string;
  prtcptPsblRgnNm: string;
  bidprcPsblIndstrytyNm: string;
  bidNtceUrl: string;
  bidNtceSttusNm: string;
  bsnsDivNm: string;
  presmptPrce?: string;
}

// API Response structure for Nara API
export interface ApiResponseHeader {
  resultCode: string;
  resultMsg: string;
}

export interface ApiResponseBody {
  items: any;
  numOfRows: number;
  pageNo: number;
  totalCount: number;
}

export interface ApiResponse {
  response: {
    header: ApiResponseHeader;
    body: ApiResponseBody;
  };
}

export interface RFPMetadata {
  fileName: string;
  uploadDate: string;
  fileSize: string;
  source?: 'file' | 'nara-bid';
  bidData?: BidItem;
}

export interface AnalysisResult {
  clientName: string;
  industry: string;
  department: string;
  programName: string;
  objectives: string[];
  targetAudience: string;
  schedule: string;
  location: string;
  modules: string[];
  specialRequests: string;
}

export interface TrendInsight {
  topic: string;
  insight: string;
  source: string;
  relevanceScore: number;
}

export interface StrategyOption {
  id: string;
  title: string;
  description: string;
  keyFeatures: string[];
  focusArea: string;
}

export interface StrategyEvaluation {
  strategyId: string;
  score: number;
  reasoning: string;
  pros: string[];
  cons: string[];
}

export interface CourseMatch {
  id: string;
  moduleName: string;
  courseTitle: string;
  instructor: string;
  matchReason: string;
  matchScore: number;
  isExternal: boolean;
}

export interface ProposalSlide {
  id: number;
  title: string;
  content: string;
  type: 'cover' | 'agenda' | 'overview' | 'trend' | 'curriculum' | 'instructor' | 'schedule' | 'closing';
}

export interface QualityAssessment {
  complianceScore: number;
  complianceReason: string;
  instructorExpertiseScore: number;
  instructorExpertiseReason: string;
  industryMatchScore: number;
  industryMatchReason: string;
  totalScore: number;
  overallComment: string;
  assessmentDate?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  model: string;
  temperature: number;
  systemPrompt: string;
  guardrails: string[];
  apiKey?: string;
}

export interface PastProposal {
  id: string;
  title: string;
  clientName: string;
  industry: string;
  date: string;
  tags: string[];
  fileName: string;
  // Dashboard specific fields
  status?: 'Draft' | 'Review' | 'Completed' | 'Submitted' | 'Won' | 'Lost';
  amount?: string;
  progress?: number;
  // New field for stored QA results
  qualityAssessment?: QualityAssessment;
}

export interface InstructorProfile {
  id: string;
  name: string;
  position: string;
  expertise: string[];
  bio: string;
  email: string;
  imageUrl?: string;
}

export enum AppStep {
  UPLOAD = 1,
  ANALYSIS = 2,
  RESEARCH = 3,
  STRATEGY = 4,
  CURRICULUM = 5,
  PREVIEW = 6,
  COMPLETE = 7
}

export interface ProposalDraft {
  id: string;
  lastUpdated: Date;
  step: AppStep;

  // State snapshot
  files: RFPMetadata[];
  analysis: AnalysisResult | null;
  trends: TrendInsight[];
  selectedStrategy: StrategyOption | null;
  matches: CourseMatch[];
}
