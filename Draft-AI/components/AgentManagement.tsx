import React, { useState } from 'react';
import { AgentConfig } from '../types';
import { Save, Bot, Shield, Terminal, Cpu, Settings, Key, Eye, EyeOff, Globe, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  agents: AgentConfig[];
  onSave: (updatedAgents: AgentConfig[]) => void;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  globalModel?: string;
  onSaveGlobalModel?: (model: string) => void;
}

export const AgentManagement: React.FC<Props> = ({ agents, onSave, onClose, apiKey, onSaveApiKey, globalModel, onSaveGlobalModel }) => {
  // 'global' id represents the Global Settings page
  const [selectedId, setSelectedId] = useState<string>('global');
  const [localAgents, setLocalAgents] = useState<AgentConfig[]>(agents);
  const [globalKey, setGlobalKey] = useState(apiKey);
  
  // State for toggling password visibility
  const [showGlobalKey, setShowGlobalKey] = useState(false);

  const selectedAgent = localAgents.find(a => a.id === selectedId);

  const handleUpdateAgent = (field: keyof AgentConfig, value: any) => {
    setLocalAgents(prev => prev.map(agent => 
      agent.id === selectedId ? { ...agent, [field]: value } : agent
    ));
  };

  const handleGuardrailChange = (text: string) => {
    const rails = text.split('\n').filter(line => line.trim() !== '');
    handleUpdateAgent('guardrails', rails);
  };

  const handleSaveAll = () => {
    onSave(localAgents);
    onSaveApiKey(globalKey);
    alert('모든 설정이 저장되었습니다.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in-up h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="text-blue-600" />
            AI 에이전트 관리 센터
          </h2>
          <p className="text-slate-500 mt-1">각 프로세스를 담당하는 전문 에이전트의 역할과 모델 연결을 관리합니다.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
                닫기
            </button>
            <button 
                onClick={handleSaveAll}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
            >
                <Save size={18} />
                전체 저장
            </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Left Sidebar */}
        <div className="w-full lg:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-700">설정 목록</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button 
                    onClick={() => setSelectedId('global')}
                    className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors
                        ${selectedId === 'global' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                >
                    <Globe size={18} />
                    <div>
                        <div className="font-semibold text-sm">Global Settings</div>
                        <div className="text-xs opacity-70">파운데이션 모델 API 설정</div>
                    </div>
                </button>
                
                <div className="my-2 border-t border-slate-100"></div>
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Agents</div>

                {localAgents.map(agent => (
                    <button 
                        key={agent.id}
                        onClick={() => setSelectedId(agent.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors
                            ${selectedId === agent.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'}`}
                    >
                        <Bot size={18} />
                        <div>
                            <div className="font-semibold text-sm">{agent.name}</div>
                            <div className="text-xs opacity-70 line-clamp-1">{agent.role}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* Right Content */}
        <div className="w-full lg:w-3/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
            {selectedId === 'global' ? (
                // --- Global Settings View ---
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">파운데이션 모델 API (Foundation Model API)</h3>
                            <p className="text-sm text-slate-500">전체 시스템의 기본 AI 모델 연결을 설정합니다.</p>
                        </div>
                    </div>

                    <div className="space-y-8 max-w-3xl">
                        {/* API Key Section */}
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                            <div className="flex items-start gap-3">
                                <Key className="text-amber-500 mt-1" size={20} />
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        API Key 입력
                                    </label>
                                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                                        에이전트 설정에 있는 전역 설정의 파운데이션 모델 API 의 정의는, 에이전트가 따로 파운데이션 모델을 설정하지 않았거나, 
                                        해당 AI 모델 호출이 실패했을 경우 <strong>안전장치(Safety Net)</strong>로써 제공되는 기본 모델입니다.
                                    </p>
                                    <div className="relative">
                                        <input 
                                            type={showGlobalKey ? "text" : "password"} 
                                            value={globalKey}
                                            onChange={(e) => setGlobalKey(e.target.value)}
                                            placeholder="sk-..."
                                            className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-mono text-sm"
                                        />
                                        <button 
                                            onClick={() => setShowGlobalKey(!showGlobalKey)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showGlobalKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                        <Shield size={12} /> API 키는 브라우저 로컬 메모리에만 일시적으로 저장됩니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Status Check */}
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex items-center gap-4">
                            <CheckCircle2 className="text-blue-600" size={24} />
                            <div>
                                <h4 className="font-bold text-blue-800 text-sm">연결 상태</h4>
                                <p className="text-xs text-blue-600 mt-1">
                                    {globalKey ? 'API 키가 입력되었습니다. 기본 모델(Gemini 2.5 Flash)이 활성화됩니다.' : 'API 키가 필요합니다.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : selectedAgent ? (
                // --- Agent Detail View ---
                <div className="flex-1 overflow-y-auto p-8">
                     <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Bot size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{selectedAgent.name}</h3>
                            <p className="text-sm text-slate-500">ID: {selectedAgent.id}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Terminal size={16} /> System Prompt (Role Definition)
                                </label>
                                <textarea 
                                    value={selectedAgent.systemPrompt}
                                    onChange={(e) => handleUpdateAgent('systemPrompt', e.target.value)}
                                    className="w-full h-40 p-4 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm leading-relaxed bg-slate-50"
                                    placeholder="에이전트의 역할과 행동 지침을 정의하세요..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Cpu size={16} /> Model Selection
                                </label>
                                <select 
                                    value={selectedAgent.model}
                                    onChange={(e) => handleUpdateAgent('model', e.target.value)}
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                                >
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Recommended)</option>
                                    <option value="gemini-3-pro-preview">Gemini 3.0 Pro (High Intelligence)</option>
                                    <option value="gemini-flash-thinking">Gemini 2.5 Flash Thinking</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Temperature (Creativity): {selectedAgent.temperature}</label>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="1" 
                                    step="0.1" 
                                    value={selectedAgent.temperature}
                                    onChange={(e) => handleUpdateAgent('temperature', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                                <div className="flex justify-between text-xs text-slate-400 mt-1">
                                    <span>Precise (0.0)</span>
                                    <span>Creative (1.0)</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Shield size={16} /> Guardrails & Constraints
                                </label>
                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                                    <textarea 
                                        value={selectedAgent.guardrails.join('\n')}
                                        onChange={(e) => handleGuardrailChange(e.target.value)}
                                        className="w-full h-32 p-3 border border-orange-200 rounded bg-white text-sm focus:outline-none focus:border-orange-400"
                                        placeholder="한 줄에 하나씩 제한사항을 입력하세요..."
                                    />
                                    <div className="mt-2 flex items-center gap-2 text-xs text-orange-600">
                                        <AlertTriangle size={12} />
                                        <span>위반 시 에이전트가 답변을 거부하거나 수정합니다.</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <Key size={16} /> Agent-Specific API Key (Optional)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="password" 
                                        value={selectedAgent.apiKey || ''}
                                        onChange={(e) => handleUpdateAgent('apiKey', e.target.value)}
                                        placeholder="Global Key를 덮어쓰려면 입력하세요"
                                        className="w-full pl-4 pr-10 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                    />
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        {selectedAgent.apiKey ? <div className="w-2 h-2 bg-green-500 rounded-full"></div> : <div className="w-2 h-2 bg-slate-300 rounded-full"></div>}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">
                                    비워두면 전역 설정(Foundation Model API)을 사용합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                    설정을 선택하세요.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};