
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AnalysisResult, TrendInsight, CourseMatch, ProposalSlide, QualityAssessment, PastProposal, StrategyOption, StrategyEvaluation } from "../types";

// Note: AI integration has been replaced with dummy data for demonstration purposes.

/**
 * Simulates analyzing an RFP document with dummy data.
 */
export const analyzeRFP = async (
  fileName: string, 
  systemPrompt?: string, 
  apiKey?: string,
  model?: string,
  fallbackModel?: string
): Promise<AnalysisResult> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Logic based on filename for demo purposes
  const isTech = fileName.includes("AI") || fileName.includes("데이터") || fileName.includes("DT");
  const isBank = fileName.includes("금융") || fileName.includes("은행");
  
  return {
    clientName: isBank ? "한국미래은행" : (isTech ? "테크솔루션즈" : "대한제조(주)"),
    industry: isBank ? "금융/은행" : (isTech ? "IT/소프트웨어" : "제조/화학"),
    department: "인재개발팀",
    programName: fileName.replace(".pdf", "").replace(".pptx", "") || "2025년 차세대 리더십 과정",
    objectives: [
      "디지털 전환(DT) 시대에 맞는 리더십 함양",
      "데이터 기반 의사결정 능력 강화",
      "MZ세대 팀원과의 효과적인 소통 및 코칭 스킬 습득"
    ],
    targetAudience: "팀장급 및 예비 리더 30명",
    schedule: "2025년 5월 중 (2박 3일 집합 교육)",
    location: "용인 엑스퍼트 연수원",
    modules: [
      "DT 트렌드와 리더의 역할",
      "데이터 리터러시 워크숍",
      "세대 공감 커뮤니케이션 & 코칭"
    ],
    specialRequests: "실습 위주의 구성 요청, 최신 트렌드 사례 포함 필수"
  };
};

/**
 * Generates Trend Insights based on the analyzed modules using dummy data.
 */
export const fetchTrendInsights = async (
  modules: string[], 
  systemPrompt?: string, 
  apiKey?: string,
  model?: string,
  fallbackModel?: string
): Promise<TrendInsight[]> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  return [
    { topic: "Digital Transformation", insight: "AI 도입 가속화에 따른 리더의 기술 이해도가 필수 역량으로 부상함.", source: "HBR 2024", relevanceScore: 95 },
    { topic: "Employee Experience (EX)", insight: "MZ세대 유지(Retention)를 위한 '성장 경험' 제공이 중요.", source: "Gartner HR Trends", relevanceScore: 88 },
    { topic: "Data Driven Decision", insight: "직관이 아닌 데이터에 기반한 의사결정 문화 확산.", source: "McKinsey", relevanceScore: 92 }
  ];
};

/**
 * Generates 3 Strategic Options based on Analysis and Trends
 */
export const generateStrategyOptions = async (
  analysis: AnalysisResult,
  trends: TrendInsight[],
  systemPrompt?: string,
  apiKey?: string
): Promise<StrategyOption[]> => {
  await new Promise(resolve => setTimeout(resolve, 2000));

  return [
    {
      id: "strat-1",
      title: "기술 혁신 주도형 (Tech-Driven)",
      focusArea: "Digital Transformation",
      description: "최신 AI 및 데이터 분석 도구를 적극 활용하여 실무 효율성을 극대화하는 실습 중심 전략입니다.",
      keyFeatures: ["생성형 AI 활용 실습 50% 비중", "최신 Tech 트렌드 심층 분석", "Digital Tool 활용 워크숍"]
    },
    {
      id: "strat-2",
      title: "조직 문화 혁신형 (Culture-First)",
      focusArea: "Organizational Culture",
      description: "세대 간 소통과 심리적 안전감을 기반으로 한 부드러운 리더십 변화를 유도하는 전략입니다.",
      keyFeatures: ["MZ세대 역멘토링 세션", "심리 진단 기반 코칭", "토론 및 게이미피케이션"]
    },
    {
      id: "strat-3",
      title: "현장 성과 중심형 (Performance-Based)",
      focusArea: "Field Application",
      description: "현업의 실제 페인포인트(Pain Point)를 해결하는 문제 해결 중심(PBL) 전략입니다.",
      keyFeatures: ["사전 과제 및 현장 이슈 도출", "액션 러닝 프로젝트 수행", "현업 적용 팔로우업"]
    }
  ];
};

/**
 * Evaluates the generated strategies (QA Agent)
 */
export const evaluateStrategies = async (
  strategies: StrategyOption[],
  systemPrompt?: string,
  apiKey?: string
): Promise<StrategyEvaluation[]> => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  return [
    {
      strategyId: "strat-1",
      score: 88,
      reasoning: "고객사의 DT 니즈에 가장 부합하나, 비개발 직군에게는 난이도가 높을 수 있음.",
      pros: ["트렌드 부합성 높음", "산출물 명확"],
      cons: ["실습 환경 구축 필요", "높은 강사료 예상"]
    },
    {
      strategyId: "strat-2",
      score: 92,
      reasoning: "RFP에 명시된 '세대 공감' 키워드와 가장 잘 맞으며 안정적인 운영이 가능함.",
      pros: ["높은 교육 만족도 예상", "리스크 적음"],
      cons: ["성과 측정의 어려움", "다소 평이한 구성"]
    },
    {
      strategyId: "strat-3",
      score: 85,
      reasoning: "실질적 성과는 기대되나, 2박 3일 일정 내에 프로젝트 완수는 현실적으로 어려움이 있음.",
      pros: ["현업 연계성 최상", "경영진 선호"],
      cons: ["일정 압박", "사전 준비 부담 큼"]
    }
  ];
};

/**
 * Matches internal curriculum to the requirements using dummy data.
 * Now takes a StrategyOption to tailor the matching.
 */
export const matchCurriculum = async (
  modules: string[], 
  trends: TrendInsight[],
  selectedStrategy: StrategyOption | null,
  systemPrompt?: string, 
  apiKey?: string,
  model?: string,
  fallbackModel?: string
): Promise<CourseMatch[]> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1800));

  const strategyPrefix = selectedStrategy ? `[${selectedStrategy.focusArea}] ` : '';

  return modules.map((mod, idx) => ({
    id: `course-${idx}`,
    moduleName: mod,
    courseTitle: `${strategyPrefix}Expert ${mod} 마스터 클래스`,
    instructor: idx % 2 === 0 ? "김철수 수석" : "이영희 이사",
    matchReason: selectedStrategy 
      ? `선택하신 '${selectedStrategy.title}' 전략에 맞춰 ${selectedStrategy.focusArea} 요소를 30% 강화하여 설계했습니다.`
      : `트렌드 분석 결과(${trends[0]?.topic || '최신 동향'})를 반영하여 해당 모듈을 선정했습니다.`,
    matchScore: 90 + Math.floor(Math.random() * 10),
    isExternal: false
  }));
};

/**
 * Generates slide content text based on structured data.
 */
export const generateProposalContent = async (analysis: AnalysisResult, trends: TrendInsight[], matches: CourseMatch[], apiKey?: string): Promise<ProposalSlide[]> => {
    // Simulating slide generation logic - this is mostly deterministic templating
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const slides: ProposalSlide[] = [
      { id: 1, title: analysis.programName, content: `제안서\n\n${analysis.clientName} 귀중\n성공적인 리더 육성을 위한 제안`, type: "cover" },
      { id: 2, title: "제안 배경 및 목적", content: `본 과정은 ${analysis.clientName} ${analysis.department}의 ${analysis.targetAudience}을 대상으로 합니다.\n주요 목표:\n${analysis.objectives.map(o => "- " + o).join("\n")}`, type: "overview" },
      { id: 3, title: "최신 트렌드 인사이트", content: trends.map(t => `[${t.topic}] ${t.insight} (출처: ${t.source})`).join("\n\n"), type: "trend" },
    ];

    matches.forEach((match, idx) => {
        slides.push({
            id: 4 + idx,
            title: `Module ${idx + 1}: ${match.courseTitle}`,
            content: `강사: ${match.instructor}\n\n매칭 포인트:\n${match.matchReason}\n\n이 모듈은 고객사의 요청인 '${match.moduleName}'을 완벽하게 커버합니다.`,
            type: "curriculum"
        });
    });

    slides.push({ id: 99, title: "추진 일정 및 장소", content: `${analysis.schedule} 진행 예정\n장소: ${analysis.location}\n\n사전 진단 -> 본 교육 -> 사후 팔로우업`, type: "schedule" });
    slides.push({ id: 100, title: "감사합니다", content: "엑스퍼트컨설팅\n문의: 02-1234-5678", type: "closing" });

    return slides;
};

/**
 * Evaluates the proposal quality based on requirements and content using dummy data.
 */
export const evaluateProposalQuality = async (
  analysis: AnalysisResult, 
  matches: CourseMatch[], 
  systemPrompt?: string,
  apiKey?: string,
  model?: string,
  fallbackModel?: string
): Promise<QualityAssessment> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    complianceScore: 92,
    complianceReason: "RFP에 명시된 교육 모듈 3가지를 모두 포함하고 있으며 일정과 대상도 정확히 반영됨.",
    instructorExpertiseScore: 88,
    instructorExpertiseReason: "추천된 강사진의 이력이 요구 주제와 잘 매칭되나, 일부 심화 주제는 외부 전문가 고려 필요.",
    industryMatchScore: 85,
    industryMatchReason: "제안된 사례가 해당 산업군에 적합하나, 조금 더 특화된 케이스 스터디 보강 권장.",
    totalScore: 89,
    overallComment: "전반적으로 우수한 제안서입니다. 트렌드 섹션을 조금 더 보강하면 수주 확률이 높아질 것입니다.",
    assessmentDate: new Date().toISOString()
  };
};

/**
 * Evaluates a past proposal based on limited metadata using dummy data.
 */
export const evaluatePastProposal = async (
  proposal: PastProposal,
  systemPrompt?: string,
  apiKey?: string,
  model?: string,
  fallbackModel?: string
): Promise<QualityAssessment> => {
  // Simulate AI processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    complianceScore: 85 + Math.floor(Math.random() * 10),
    complianceReason: "과거 제안 이력을 분석한 결과, 고객사 요구사항을 충실히 반영한 것으로 추정됩니다.",
    instructorExpertiseScore: 80 + Math.floor(Math.random() * 15),
    instructorExpertiseReason: "해당 산업군 전문 강사진이 투입되었으나, 최신 기술 트렌드 반영도는 보통입니다.",
    industryMatchScore: 90 + Math.floor(Math.random() * 8),
    industryMatchReason: `${proposal.industry} 분야의 특성을 잘 파악한 커리큘럼 구성이 돋보입니다.`,
    totalScore: 88,
    overallComment: "안정적인 수주가 예상되는 우수한 품질의 제안서입니다. 추후 유사 제안 시 참고 가치가 높습니다.",
    assessmentDate: new Date().toISOString()
  };
};
