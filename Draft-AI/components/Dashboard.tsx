
import React from 'react';
import { PastProposal, ProposalDraft, AppStep } from '../types';
import { Plus, FileText, Clock, TrendingUp, ArrowUpRight, FolderOpen, PlayCircle, Award, XCircle, Trash2, CheckCircle, Edit } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  proposals: PastProposal[];
  drafts: ProposalDraft[];
  onNewProposal: () => void;
  onResumeDraft: (draft: ProposalDraft) => void;
  onViewAll: () => void;
  onUpdateDraftStatus?: (id: string, status: 'Won' | 'Lost') => void;
  onDeleteDraft?: (id: string) => void;
}

const STATS_DATA = [
  { name: 'Jan', proposals: 4, value: 2400 },
  { name: 'Feb', proposals: 3, value: 1398 },
  { name: 'Mar', proposals: 8, value: 9800 },
  { name: 'Apr', proposals: 6, value: 3908 },
  { name: 'May', proposals: 9, value: 4800 },
  { name: 'Jun', proposals: 12, value: 6800 },
];

export const Dashboard: React.FC<Props> = ({ proposals, drafts, onNewProposal, onResumeDraft, onViewAll, onUpdateDraftStatus, onDeleteDraft }) => {
  // Filter drafts into In Progress vs Completed
  const inProgressDrafts = drafts.filter(d => d.step < AppStep.COMPLETE);
  const completedDrafts = drafts.filter(d => d.step === AppStep.COMPLETE);

  // Calculate stats
  const totalProposals = proposals.length;
  // Active drafts now include both in-progress and those waiting for result
  const activeDraftsCount = drafts.length;
  
  // Sort by date desc
  const recentProposals = [...proposals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'Draft': return 'bg-slate-100 text-slate-600';
      case 'Review': return 'bg-amber-100 text-amber-700';
      case 'Completed': return 'bg-blue-100 text-blue-700';
      case 'Submitted': return 'bg-purple-100 text-purple-700';
      case 'Won': return 'bg-green-100 text-green-700';
      case 'Lost': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const getStepLabel = (step: AppStep) => {
    switch(step) {
        case AppStep.UPLOAD: return "RFP 파일 업로드";
        case AppStep.ANALYSIS: return "요구사항 분석";
        case AppStep.RESEARCH: return "트렌드 리서치";
        case AppStep.STRATEGY: return "전략 및 과정 매칭";
        case AppStep.PREVIEW: return "제안서 초안 검토";
        case AppStep.COMPLETE: return "완료";
        default: return "준비 중";
    }
  };

  const getStepProgress = (step: AppStep) => {
      return (step / 6) * 100;
  };

  const handleDeleteClick = (id: string) => {
      if (window.confirm("정말로 이 제안서 초안을 삭제하시겠습니까? 복구할 수 없습니다.")) {
          if (onDeleteDraft) onDeleteDraft(id);
      }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 mt-1">제안서 작업 현황 및 성과 요약</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors shadow-sm">
                <FileText size={18} />
                리포트 다운로드
            </button>
            <button 
                onClick={onNewProposal}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
                <Plus size={20} />
                새 제안서 시작
            </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500">총 제안 건수 (YTD)</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">{totalProposals + 12}</h3>
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <FileText size={24} />
                </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
                <span className="text-green-600 flex items-center font-medium"><ArrowUpRight size={16} className="mr-1"/> +12.5%</span>
                <span className="text-slate-400 ml-2">전월 대비</span>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500">진행 중인 프로젝트</p>
                    <h3 className="text-3xl font-bold text-slate-900 mt-2">{activeDraftsCount}</h3>
                </div>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Clock size={24} />
                </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
                <span className="text-slate-600 font-medium">작성 중: {inProgressDrafts.length}건 / 대기 중: {completedDrafts.length}건</span>
            </div>
        </div>
      </div>

      {/* SECTION 1: DRAFTS IN PROGRESS */}
      {inProgressDrafts.length > 0 && (
          <div className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FolderOpen size={20} className="text-blue-600" />
                작성 중인 제안서 (In Progress)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressDrafts.map(draft => (
                    <div key={draft.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all border-l-4 border-l-blue-500 group relative">
                        <div className="flex justify-between items-start mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">
                                {getStepLabel(draft.step)}
                            </span>
                            <span className="text-xs text-slate-400">
                                {draft.lastUpdated.toLocaleDateString()}
                            </span>
                        </div>
                        
                        <h4 className="font-bold text-lg text-slate-800 mb-1 line-clamp-1">
                            {draft.analysis?.programName || (draft.files[0]?.fileName ? `${draft.files[0].fileName} 분석 중` : "새로운 제안서 작업")}
                        </h4>
                        
                        <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                            <FileText size={14} />
                            {draft.files.length}개의 파일 • {draft.analysis?.clientName || "분석 전"}
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                            <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                                style={{ width: `${getStepProgress(draft.step)}%` }}
                            ></div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => onResumeDraft(draft)}
                                className="flex-1 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <PlayCircle size={18} />
                                작업 계속하기
                            </button>
                            <button 
                                onClick={() => handleDeleteClick(draft.id)}
                                className="w-10 flex items-center justify-center bg-white border border-slate-200 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-colors"
                                title="삭제"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
             </div>
          </div>
      )}

      {/* SECTION 1.5: COMPLETED DRAFTS PENDING DECISION */}
      {completedDrafts.length > 0 && (
          <div className="space-y-4">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-600" />
                완료된 제안서 및 결과 대기 (Completed)
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedDrafts.map(draft => (
                    <div key={draft.id} className="bg-white rounded-xl border border-green-200 p-5 shadow-sm hover:shadow-lg transition-all border-l-4 border-l-green-500 relative bg-green-50/10">
                        <div className="flex justify-between items-start mb-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                                완료됨 (제출 대기)
                            </span>
                            <span className="text-xs text-slate-400">
                                {draft.lastUpdated.toLocaleDateString()}
                            </span>
                        </div>
                        
                        <h4 className="font-bold text-lg text-slate-800 mb-1 line-clamp-1">
                            {draft.analysis?.programName}
                        </h4>
                        
                        <div className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                            <FileText size={14} />
                            {draft.analysis?.clientName || "Unknown Client"}
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                            <button 
                                onClick={() => onResumeDraft(draft)}
                                className="flex-1 py-2 bg-white border border-slate-300 text-slate-600 font-bold rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 text-xs"
                            >
                                <Edit size={14} />
                                수정
                            </button>
                            {onUpdateDraftStatus && (
                                <>
                                    <button 
                                        onClick={() => onUpdateDraftStatus(draft.id, 'Won')}
                                        className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 text-xs"
                                    >
                                        <Award size={14} />
                                        수주 성공
                                    </button>
                                    <button 
                                        onClick={() => onUpdateDraftStatus(draft.id, 'Lost')}
                                        className="flex-1 py-2 bg-white border border-red-200 text-red-500 font-bold rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-1.5 text-xs"
                                    >
                                        <XCircle size={14} />
                                        수주 실패
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
             </div>
          </div>
      )}

      {/* SECTION 2: RECENT COMPLETED / PAST PROPOSALS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* List */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Clock size={20} className="text-slate-500"/>
                      최근 제안 이력
                  </h3>
                  <button onClick={onViewAll} className="text-sm text-blue-600 font-medium hover:underline">
                      전체 보기
                  </button>
              </div>
              <div className="divide-y divide-slate-100">
                  {recentProposals.map(proposal => (
                      <div key={proposal.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${getStatusStyle(proposal.status)}`}>
                                  {proposal.status && proposal.status[0]}
                              </div>
                              <div>
                                  <h4 className="font-bold text-slate-800 text-sm">{proposal.title}</h4>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                      <span>{proposal.clientName}</span>
                                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                      <span>{proposal.date}</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp size={20} className="text-slate-500"/>
                  월별 제안 성과
              </h3>
              <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={STATS_DATA}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <YAxis hide />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Area type="monotone" dataKey="value" stroke="#3b82f6" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} />
                    </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  );
};
