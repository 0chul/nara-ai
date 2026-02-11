import React, { useEffect, useState } from 'react';
import { AnalysisResult, RFPMetadata, AgentConfig } from '../types';
import { analyzeRFP } from '../services/geminiService';
import { Edit2, CheckCircle, AlertCircle, Files, Save, ChevronLeft, Building2, MapPin, Users, Calendar, RefreshCw } from 'lucide-react';

interface Props {
  files: RFPMetadata[];
  onConfirm: (data: AnalysisResult) => void;
  onBack: () => void;
  agentConfig: AgentConfig | undefined;
  initialData: AnalysisResult | null;
  apiKey?: string;
  globalModel?: string;
}

export const RequirementsReview: React.FC<Props> = ({ files, onConfirm, onBack, agentConfig, initialData, apiKey, globalModel }) => {
  const [data, setData] = useState<AnalysisResult | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    // For simulation, we assume the first file is the main RFP, or the agent combines them.
    // We pass the name of the first file to the service.
    const mainFile = files[0].fileName;
    const result = await analyzeRFP(mainFile, agentConfig?.systemPrompt, apiKey, agentConfig?.model, globalModel);
    setData(result);
    setLoading(false);
  };

  useEffect(() => {
    if (!data) {
        fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  const handleReanalyze = () => {
      fetchData();
  };

  const handleInputChange = (field: keyof AnalysisResult, value: string) => {
    if (data) {
      setData({ ...data, [field]: value });
    }
  };

  const handleArrayChange = (field: keyof AnalysisResult, value: string) => {
    if (data) {
      const array = value.split('\n').filter(line => line.trim() !== '');
      setData({ ...data, [field]: array });
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-600 font-medium">RFP 분석 에이전트가 {files.length}개의 문서를 분석하고 있습니다...</p>
        <div className="mt-2 text-xs text-slate-400 flex gap-2">
            {files.map((f, i) => (
                <span key={i} className="bg-slate-100 px-2 py-1 rounded">{f.fileName}</span>
            ))}
        </div>
      </div>
    );
  }

  if (!data) return <div>오류가 발생했습니다.</div>;

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
        <h2 className="text-white text-lg font-semibold flex items-center gap-2">
          <CheckCircle size={20} className="text-green-400" />
          요구사항 분석 결과
        </h2>
        <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-800 px-3 py-1 rounded-full">
            <Files size={14} />
            <span>분석된 문서: {files.length}건</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Client Profile Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 size={16} /> 고객사 정보 (Client Profile)
           </h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">고객사명</label>
                  {isEditing ? (
                      <input 
                        type="text" 
                        value={data.clientName} 
                        onChange={(e) => handleInputChange('clientName', e.target.value)}
                        className="w-full p-2 bg-white border border-blue-200 rounded text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                  ) : (
                      <div className="font-bold text-slate-800 text-lg">{data.clientName}</div>
                  )}
              </div>
              <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">산업군</label>
                  {isEditing ? (
                      <input 
                        type="text" 
                        value={data.industry} 
                        onChange={(e) => handleInputChange('industry', e.target.value)}
                        className="w-full p-2 bg-white border border-blue-200 rounded text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                  ) : (
                      <div className="font-medium text-slate-700">{data.industry}</div>
                  )}
              </div>
              <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">부서</label>
                  {isEditing ? (
                      <input 
                        type="text" 
                        value={data.department} 
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        className="w-full p-2 bg-white border border-blue-200 rounded text-slate-900 focus:outline-none focus:border-blue-500"
                      />
                  ) : (
                      <div className="font-medium text-slate-700">{data.department}</div>
                  )}
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Program Basics */}
            <div className="space-y-6">
                <div className={`group relative border rounded-lg p-4 transition-colors ${isEditing ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400'}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">제안 프로그램명</label>
                    {isEditing ? (
                    <input 
                        type="text" 
                        value={data.programName} 
                        onChange={(e) => handleInputChange('programName', e.target.value)}
                        className="w-full p-2 border border-blue-200 rounded font-semibold text-lg text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                    ) : (
                    <div className="font-semibold text-lg text-slate-900">{data.programName}</div>
                    )}
                </div>

                <div className={`group relative border rounded-lg p-4 transition-colors ${isEditing ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400'}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Users size={14} /> 교육 대상
                    </label>
                    {isEditing ? (
                    <input 
                        type="text" 
                        value={data.targetAudience} 
                        onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                        className="w-full p-2 border border-blue-200 rounded text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                    ) : (
                    <div className="text-slate-800">{data.targetAudience}</div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className={`group relative border rounded-lg p-4 transition-colors ${isEditing ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400'}`}>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Calendar size={14} /> 교육 일정
                        </label>
                        {isEditing ? (
                        <input 
                            type="text" 
                            value={data.schedule} 
                            onChange={(e) => handleInputChange('schedule', e.target.value)}
                            className="w-full p-2 border border-blue-200 rounded text-slate-800 focus:outline-none focus:border-blue-500 text-sm"
                        />
                        ) : (
                        <div className="text-slate-800 text-sm">{data.schedule}</div>
                        )}
                    </div>
                    
                    <div className={`group relative border rounded-lg p-4 transition-colors ${isEditing ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400'}`}>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <MapPin size={14} /> 교육 장소
                        </label>
                        {isEditing ? (
                        <input 
                            type="text" 
                            value={data.location} 
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            className="w-full p-2 border border-blue-200 rounded text-slate-800 focus:outline-none focus:border-blue-500 text-sm"
                        />
                        ) : (
                        <div className="text-slate-800 text-sm">{data.location}</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: Objectives & Details */}
            <div className="space-y-6">
                <div className={`group relative border rounded-lg p-4 transition-colors h-full ${isEditing ? 'border-blue-400 bg-blue-50/20' : 'border-slate-200 hover:border-blue-400'}`}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">핵심 교육 목표</label>
                    {isEditing ? (
                    <textarea 
                        value={data.objectives.join('\n')}
                        onChange={(e) => handleArrayChange('objectives', e.target.value)}
                        className="w-full h-48 p-2 border border-blue-200 rounded text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                        placeholder="각 목표를 줄바꿈으로 구분하세요."
                    />
                    ) : (
                    <ul className="space-y-2">
                        {data.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-700 text-sm">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></span>
                            {obj}
                        </li>
                        ))}
                    </ul>
                    )}
                </div>
            </div>
        </div>

        {/* Bottom Modules */}
        <div className={`group relative border rounded-lg p-4 ${isEditing ? 'border-blue-400 bg-blue-50/20' : 'border-blue-100 bg-blue-50'}`}>
             <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">식별된 모듈 (요구 주제)</label>
             {isEditing ? (
                 <>
                  <textarea 
                    value={data.modules.join('\n')}
                    onChange={(e) => handleArrayChange('modules', e.target.value)}
                    className="w-full p-2 border border-blue-200 rounded text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                    rows={4}
                    placeholder="각 모듈 주제를 줄바꿈으로 구분하세요."
                  />
                  <p className="text-[10px] text-blue-500 mt-1">* 줄바꿈으로 주제를 구분합니다.</p>
                 </>
             ) : (
                 <div className="flex flex-wrap gap-2">
                    {data.modules.map((mod, i) => (
                        <span key={i} className="px-3 py-1 bg-white border border-blue-200 text-blue-800 rounded-full text-sm font-medium shadow-sm">
                            {mod}
                        </span>
                    ))}
                 </div>
             )}
        </div>
        
        {/* Special Requests */}
        <div className={`p-3 rounded-md border ${isEditing ? 'border-blue-400 bg-blue-50/20' : 'border-amber-200 bg-amber-50'}`}>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                 <AlertCircle size={12} /> 특이사항 및 요구조건
            </label>
             {isEditing ? (
                <textarea 
                  value={data.specialRequests}
                  onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                  className="w-full p-2 border border-blue-200 rounded text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  rows={2}
                />
             ) : (
                 <div className="text-sm text-amber-900">
                    {data.specialRequests || "특이사항 없음"}
                 </div>
             )}
        </div>
      </div>

      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-between items-center">
        <button 
            onClick={onBack}
            className="flex items-center gap-1 px-4 py-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors"
        >
            <ChevronLeft size={16} /> 이전 단계
        </button>
        
        <div className="flex gap-3">
             <button 
                onClick={handleReanalyze}
                disabled={isEditing}
                className="px-4 py-2 font-medium text-sm flex items-center gap-2 rounded transition-colors text-slate-600 hover:text-slate-900 border border-transparent hover:border-slate-200"
            >
                <RefreshCw size={14}/> 다시 분석하기
            </button>
            <button 
                onClick={toggleEdit}
                className={`px-4 py-2 font-medium text-sm flex items-center gap-2 rounded transition-colors
                    ${isEditing 
                        ? 'bg-white border border-blue-200 text-blue-600 hover:bg-blue-50' 
                        : 'text-slate-600 hover:text-slate-900'}`}
            >
                {isEditing ? <><CheckCircle size={14}/> 편집 완료</> : <><Edit2 size={14}/> 수정하기</>}
            </button>
            <button 
            onClick={() => onConfirm(data)}
            disabled={isEditing}
            className={`px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm transition-all flex items-center gap-2
                ${isEditing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
            >
            확인 및 트렌드 분석
            </button>
        </div>
      </div>
    </div>
  );
};