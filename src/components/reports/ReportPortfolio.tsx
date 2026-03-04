import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  FileText,
  Rocket,
  TrendingUp
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import bxExtractRaw from '../../reports-bx-extract.decoded.json';
import samhwaExtractRaw from '../../reports-samhwa-extract.decoded.json';

type ReportId = 'bx-startup' | 'samhwa-hq';

interface NotebookExtract {
  capturedAt?: string;
  notebookUrl?: string;
  sessionId?: string;
}

interface SourceItem {
  label: string;
  href: string;
}

const bxNotebook = bxExtractRaw as NotebookExtract;
const samhwaNotebook = samhwaExtractRaw as NotebookExtract;

const formatKrw = (value: number): string => `${value.toLocaleString('ko-KR')}억원`;

const formatDate = (value?: string): string => {
  if (!value) return '미확인';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '미확인';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date);
};

const sourcePill = (source: SourceItem) => (
  <a
    key={source.href}
    href={source.href}
    target="_blank"
    rel="noreferrer"
    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700"
  >
    {source.label}
    <ExternalLink size={12} />
  </a>
);

const bxRevenueProjection = [
  { year: '2026', base: 11, stretch: 18 },
  { year: '2027', base: 30, stretch: 45 },
  { year: '2028', base: 58, stretch: 100 }
];

const bxBudgetComposition = [
  { item: '정부지원금', amount: 1.0 },
  { item: '자기부담(현금)', amount: 0.15 },
  { item: '자기부담(현물)', amount: 0.28 }
];

const bxEvaluationCoverage = [
  { axis: '문제인식', score: 95, full: 100 },
  { axis: '실현가능성', score: 93, full: 100 },
  { axis: '성장전략', score: 90, full: 100 },
  { axis: '팀 구성', score: 92, full: 100 }
];

const samhwaScenarioFinancials = [
  { scenario: 'A', title: '매각+리스백', fcf: 1600, irr: 0 },
  { scenario: 'B', title: '매각+신규매입', fcf: 400, irr: 8.5 },
  { scenario: 'C', title: '단독 신축', fcf: -80, irr: 5.2 },
  { scenario: 'D', title: '대수선', fcf: -15, irr: 9.4 },
  { scenario: 'E', title: '필지통합 신축', fcf: 120, irr: 10.1 }
];

const samhwaPayback = [
  { scenario: 'A', years: 0.2 },
  { scenario: 'B', years: 7.5 },
  { scenario: 'C', years: 8.2 },
  { scenario: 'D', years: 4.5 },
  { scenario: 'E', years: 8.5 }
];

const BXProposalPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const sources: SourceItem[] = [
    {
      label: '공고문 PDF',
      href: 'https://dreamstartup.co.kr/media/bizSupport/file/49e6cf35/%EA%B3%B5%EA%B3%A0%EB%AC%B8_2026%EB%85%84%EB%8F%84_%EC%B0%BD%EC%97%85%EC%A4%91%EC%8B%AC%EB%8C%80%ED%95%99_%EC%A7%80%EC%97%AD%EA%B8%B0%EB%B0%98_%EC%98%88%EB%B9%84%EC%B0%BD%EC%97%85%EA%B8%B0%EC%97%85_%EB%AA%A8%EC%A7%91%EA%B3%B5%EA%B3%A0.pdf'
    },
    { label: 'K-Startup', href: 'https://www.k-startup.go.kr/' },
    { label: 'NotebookLM 노트', href: bxNotebook.notebookUrl ?? 'https://notebooklm.google.com/' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
        >
          <ArrowLeft size={14} />
          리스트로 돌아가기
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarClock size={13} />
          업데이트: {formatDate(bxNotebook.capturedAt)}
        </div>
      </div>

      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
        <p className="text-xs font-semibold tracking-wide text-blue-700">BUSINESS PLAN PAGE</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">BX컨설팅 초기창업패키지 APPLY PROJECT</h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          NotebookLM 노트와 「2026년도 창업중심대학 지역기반 (예비)창업기업 모집공고」를 기준으로, 평가 항목 대응형
          사업계획서를 C레벨 의사결정 관점에서 재구성했습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">{sources.map(sourcePill)}</div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">공고 적합성 체크</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />
              지원자격: 예비창업자 ~ 업력 7년 이내 기업
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />
              접수기간: 2026년 3월 3일 ~ 3월 23일 16:00 (K-Startup 제출완료 기준)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />
              협약기간: 2026년 5월 ~ 12월 (최대 8개월)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="mt-0.5 text-emerald-600" />
              제출형식: 공고문 별첨 양식 사업계획서 10p 이내
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">핵심 포지셔닝</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>문제 인식: B2B 맞춤 제안서 작성의 비효율(고비용/고편차/저재현성)</li>
            <li>해결책: RAG + Multi-Agent + Self-Critique Loop 기반 Draft AI</li>
            <li>시장전개: 엔터프라이즈 SI → 조달 PoC → 구독형 SaaS</li>
            <li>차별화: Human-in-the-Loop UX로 품질 통제와 책임성 확보</li>
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">매출 전망 (단위: 억원)</h3>
            <a
              href={bxNotebook.notebookUrl ?? 'https://notebooklm.google.com/'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
            >
              출처
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bxRevenueProjection}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip formatter={(value: number | string) => `${value}억원`} />
                <Line type="monotone" dataKey="base" stroke="#2563eb" strokeWidth={3} name="Base" />
                <Line type="monotone" dataKey="stretch" stroke="#0891b2" strokeDasharray="6 4" strokeWidth={2.5} name="Stretch" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Base: 2026년 11억 → 2028년 58억 / Stretch: 2028년 100억 매출 목표(NotebookLM 전략안).
          </p>
        </div>
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">총사업비 구성</h3>
            <a
              href={sources[0].href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
            >
              출처
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bxBudgetComposition} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" />
                <YAxis dataKey="item" type="category" width={90} />
                <Tooltip formatter={(value: number | string) => `${value}억원`} />
                <Bar dataKey="amount" fill="#0f766e" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            예시 총사업비 1.43억원: 정부지원 1.0억(70%), 자기부담 0.43억(현금 0.15 + 현물 0.28).
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">평가항목 대응 강도</h3>
            <a
              href={sources[0].href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
            >
              출처
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={bxEvaluationCoverage}>
                <PolarGrid />
                <PolarAngleAxis dataKey="axis" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="사업계획서 대응력" dataKey="score" stroke="#1d4ed8" fill="#2563eb" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            공고 평가지표(문제인식/실현가능성/성장전략/팀 구성)에 맞춘 내부 스코어링.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">신청/운영 시나리오 (Plan A/B)</h3>
          <div className="mt-3 space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Plan A: 초기창업패키지(딥테크 특화)</p>
              <p className="mt-1">대규모 사업화 자금과 딥테크 브랜딩 확보에 유리. 고경쟁 대비 기술검증 지표를 전면 배치.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">Plan B: 창업중심대학(지역기반)</p>
              <p className="mt-1">권역 대학 인프라 활용과 실증-멘토링 연계에 유리. 공고 요건과 일정 대응이 명확.</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-900">
              실행권고: 2026년에는 Plan B를 메인 트랙으로 제출하되, Plan A용 딥테크 증빙을 병행 준비해 하반기 추가
              트랙으로 연결.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const SamhwaStrategyPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const sources: SourceItem[] = [
    { label: 'NotebookLM 노트', href: samhwaNotebook.notebookUrl ?? 'https://notebooklm.google.com/' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-400"
        >
          <ArrowLeft size={14} />
          리스트로 돌아가기
        </button>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarClock size={13} />
          업데이트: {formatDate(samhwaNotebook.capturedAt)}
        </div>
      </div>

      <section className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
        <p className="text-xs font-semibold tracking-wide text-emerald-700">ASSET STRATEGY PAGE</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">삼화페인트 사옥 자산가치 전략 보고서</h2>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          2026~2035년 시나리오 A~E(매각·리스백, 신규매입, 단독신축, 대수선, 필지통합)의 FCF/IRR/회수기간을 비교해
          전략 우선순위를 제시합니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">{sources.map(sourcePill)}</div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">시나리오별 10개년 누적 FCF (억원)</h3>
            <a
              href={sources[0].href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
            >
              출처
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={samhwaScenarioFinancials}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="scenario" />
                <YAxis />
                <Tooltip formatter={(value: number | string) => `${value}억원`} />
                <Bar dataKey="fcf" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">시나리오별 IRR (%)</h3>
            <a
              href={sources[0].href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-800"
            >
              출처
              <ExternalLink size={12} />
            </a>
          </div>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={samhwaScenarioFinancials}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="scenario" />
                <YAxis />
                <Tooltip formatter={(value: number | string) => `${value}%`} />
                <Line type="monotone" dataKey="irr" stroke="#2563eb" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">회수기간 비교 (년)</h3>
          <div className="mt-3 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={samhwaPayback}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="scenario" />
                <YAxis />
                <Tooltip formatter={(value: number | string) => `${value}년`} />
                <Bar dataKey="years" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            D(대수선)는 회수기간이 가장 짧고, A(리스백)는 즉시 현금화 관점에서 단기 유동성 개선 효과가 큽니다.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h3 className="text-base font-semibold text-slate-900">전략 요약</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>A(리스백): 단기 유동성 최적. IFRS16 리스부채 영향 관리 필요.</li>
            <li>B(신규매입): 입지 업그레이드 가능하나 취득세 9.4%와 PF 금리 민감도 큼.</li>
            <li>C(단독신축): CAPEX 크고 문화재/인허가 리스크 존재.</li>
            <li>D(대수선): 투자대비 회수 효율이 우수한 현실형 카드.</li>
            <li>E(필지통합): 장기 가치 극대화 잠재력 최고, 협상/기간 리스크 동반.</li>
          </ul>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            권고안: 2026~2027 단기에는 D 중심으로 효율 개선, 중장기(2028+)는 E를 옵션화한 하이브리드 포트폴리오 접근.
          </div>
        </div>
      </section>
    </div>
  );
};

export const ReportPortfolio: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<ReportId | null>(null);

  const reportCards = useMemo(
    () => [
      {
        id: 'bx-startup' as const,
        title: 'BX컨설팅 초기창업패키지 APPLY PROJECT',
        subtitle: '2026 창업중심대학 공고 대응형 사업계획서',
        icon: Rocket,
        date: formatDate(bxNotebook.capturedAt),
        highlights: ['공고 요건 체크리스트', '재무/집행 계획 차트', 'Plan A/B 대응 전략']
      },
      {
        id: 'samhwa-hq' as const,
        title: '삼화페인트 사옥 자산가치 전략',
        subtitle: '시나리오 A~E 재무 비교 보고서',
        icon: Building2,
        date: formatDate(samhwaNotebook.capturedAt),
        highlights: ['10개년 FCF/IRR 비교', '회수기간 분석', '단기-중장기 통합 권고']
      }
    ],
    []
  );

  if (selectedReport === 'bx-startup') {
    return <BXProposalPage onBack={() => setSelectedReport(null)} />;
  }

  if (selectedReport === 'samhwa-hq') {
    return <SamhwaStrategyPage onBack={() => setSelectedReport(null)} />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-700" />
          <p className="text-sm font-semibold text-blue-700">0chul&apos;s lair</p>
        </div>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">0chul&apos;s lair</h2>
        <p className="mt-2 text-sm text-slate-600">
          NotebookLM 기반 산출물을 페이지 단위로 관리하는 리포트 리스트뷰입니다. 현재 {reportCards.length}개 문서를
          제공하며, 문서별 최신 업데이트 일자를 함께 표시합니다.
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <CalendarClock size={13} />
                {report.date}
              </div>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{report.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{report.subtitle}</p>
                </div>
                <div className="rounded-lg bg-slate-100 p-2">
                  <Icon size={18} className="text-slate-700" />
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700 flex-1">
                {report.highlights.map((line) => (
                  <li key={line} className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-600" />
                    {line}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setSelectedReport(report.id)}
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                페이지 열기
                <ArrowRight size={14} />
              </button>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-slate-200">
        <p className="text-sm">
          BX 제안서는 공고 PDF 요건(접수기간·지원비율·평가항목)을 반영했고, 삼화 전략 보고서는 시나리오 재무 수치를 차트로
          시각화했습니다.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          BX 기준 재무 목표: 2026년 {formatKrw(11)} → 2027년 {formatKrw(30)} → 2028년 {formatKrw(58)} (Base).
        </p>
      </section>
    </div>
  );
};
