import React, { useState } from 'react';
import { AgentConfig } from '../types';
import { Save, Bot, Shield, Terminal, Cpu, Settings, Key, Eye, EyeOff, Globe, AlertTriangle, CheckCircle2, Database, Activity, RefreshCw } from 'lucide-react';
import { testApiConnection } from '../services/naraApi';
import { testDbConnection } from '../services/naraDb';

interface Props {
    agents: AgentConfig[];
    onSave: (updatedAgents: AgentConfig[]) => void;
    onClose: () => void;
    aiApiKey: string;
    onSaveAiApiKey: (key: string) => void;
    naraApiKey: string;
    onSaveNaraApiKey: (key: string) => void;
    shouldEncodeKey: boolean;
    onSaveShouldEncodeKey: (encode: boolean) => void;
}

export const AgentManagement: React.FC<Props> = ({
    agents,
    onSave,
    onClose,
    aiApiKey,
    onSaveAiApiKey,
    naraApiKey,
    onSaveNaraApiKey,
    shouldEncodeKey,
    onSaveShouldEncodeKey
}) => {
    // 'global' id represents the Global Settings page
    const [selectedId, setSelectedId] = useState<string>('global');
    const [localAgents, setLocalAgents] = useState<AgentConfig[]>(agents);
    const [localAiKey, setLocalAiKey] = useState(aiApiKey);
    const [localNaraKey, setLocalNaraKey] = useState(naraApiKey);

    // State for toggling password visibility
    const [showAiKey, setShowAiKey] = useState(false);
    const [showNaraKey, setShowNaraKey] = useState(false);
    const [localShouldEncode, setLocalShouldEncode] = useState(shouldEncodeKey);
    const [testLoading, setTestLoading] = useState(false);

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
        onSaveAiApiKey(localAiKey);
        onSaveNaraApiKey(localNaraKey);
        onSaveShouldEncodeKey(localShouldEncode);
        alert('모든 설정이 저장되었습니다.');
    };

    const handleTestConnection = async () => {
        if (!localNaraKey) {
            alert('나라장터 서비스 키를 입력해주세요.');
            return;
        }
        setTestLoading(true);
        try {
            const result = await testApiConnection(localNaraKey, localShouldEncode);
            if (result.success) {
                alert(`테스트 결과: 성공!\n\n${result.message}`);
            } else {
                alert(`테스트 결과: 실패\n\n상세내용: ${result.message}\n\n[도움말] 키에 %가 포함되어 있다면 '자동 인코딩'을 꺼보세요.`);
            }
        } catch (error: any) {
            alert(`테스트 에러: ${error.message}`);
        } finally {
            setTestLoading(false);
        }
    };

    const handleTestDbConnection = async () => {
        setTestLoading(true);
        try {
            const result = await testDbConnection();
            if (result.success) {
                alert(`테스트 결과: 성공!\n\n${result.message}`);
            } else {
                alert(`테스트 결과: 실패\n\n상세내용: ${result.message}\n\n[도움말].env 파일의 수파베이스 설정(URL, API Key)을 확인해 주세요.`);
            }
        } catch (error: any) {
            alert(`DB 테스트 에러: ${error.message}`);
        } finally {
            setTestLoading(false);
        }
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
                        ${selectedId === 'global' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'} `}
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
                            ${selectedId === agent.id ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-600 hover:bg-slate-50 border border-transparent'} `}
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
                                    <h3 className="text-xl font-bold text-slate-900">시스템 연동 설정 (System Integration)</h3>
                                    <p className="text-sm text-slate-500">기본 AI 모델 및 외부 데이터 환경을 설정합니다.</p>
                                </div>
                            </div>

                            <div className="space-y-8 max-w-3xl">
                                {/* Section 1: AI Foundation Model */}
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Cpu className="text-blue-500 mt-1" size={20} />
                                        <div className="flex-1">
                                            <label className="block text-sm font-bold text-slate-700 mb-1">
                                                파운데이션 모델 API 키 (AI Model API Key)
                                            </label>
                                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                                AI 에이전트들의 기본 동력이 되는 API 키입니다. (Gemini, GPT 등)
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type={showAiKey ? "text" : "password"}
                                                    value={localAiKey}
                                                    onChange={(e) => setLocalAiKey(e.target.value)}
                                                    placeholder="sk-..."
                                                    className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-mono text-sm"
                                                />
                                                <button
                                                    onClick={() => setShowAiKey(!showAiKey)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showAiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Nara Market (Public Data) */}
                                <div className="bg-blue-50/30 p-6 rounded-xl border border-blue-100 space-y-4">
                                    <div className="flex items-start gap-3">
                                        <Database className="text-blue-600 mt-1" size={20} />
                                        <div className="flex-1">
                                            <label className="block text-sm font-bold text-slate-700 mb-1">
                                                나라장터 서비스 키 (Nara Market Service Key)
                                            </label>
                                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                                공공데이터포털에서 발급받은 '입찰공고정보' 조회용 서비스 키입니다.
                                            </p>
                                            <div className="relative">
                                                <input
                                                    type={showNaraKey ? "text" : "password"}
                                                    value={localNaraKey}
                                                    onChange={(e) => setLocalNaraKey(e.target.value)}
                                                    placeholder="서비스 키(Service Key)를 입력하세요"
                                                    className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 font-mono text-sm bg-white"
                                                />
                                                <button
                                                    onClick={() => setShowNaraKey(!showNaraKey)}
                                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                                >
                                                    {showNaraKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>

                                            <div className="mt-6 pt-6 border-t border-blue-100">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <label className="block text-sm font-bold text-slate-800">
                                                            서비스 키 자동 인코딩 적용
                                                        </label>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            공고 조회가 되지 않을 경우 이 설정을 변경해 보세요.
                                                        </p>
                                                    </div>
                                                    <label className="relative inline-flex items-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            className="sr-only peer"
                                                            checked={localShouldEncode}
                                                            onChange={(e) => setLocalShouldEncode(e.target.checked)}
                                                        />
                                                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    </label>
                                                </div>

                                                <button
                                                    onClick={handleTestConnection}
                                                    disabled={testLoading}
                                                    className="w-full mt-4 py-3 bg-white border-2 border-blue-100 text-blue-600 rounded-xl hover:bg-blue-50 transition-all font-bold flex items-center justify-center gap-2 group disabled:opacity-50"
                                                >
                                                    {testLoading ? <RefreshCw size={20} className="animate-spin" /> : <Activity size={20} className="group-hover:animate-pulse" />}
                                                    나라장터 연결 테스트하기
                                                </button>

                                                <button
                                                    onClick={handleTestDbConnection}
                                                    disabled={testLoading}
                                                    className="w-full mt-2 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-bold flex items-center justify-center gap-2 group disabled:opacity-50"
                                                >
                                                    {testLoading ? <RefreshCw size={20} className="animate-spin" /> : <Database size={20} className="group-hover:scale-110 transition-transform" />}
                                                    DB 연동 테스트하기
                                                </button>

                                                {localNaraKey.includes('%') && localShouldEncode && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-600 animate-pulse">
                                                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                                                        <div className="text-[11px] leading-relaxed">
                                                            <strong>주의:</strong> 입력하신 키에 이미 인코딩된 문자(%)가 포함되어 있습니다.
                                                            이 경우 <strong>'자동 인코딩'을 꺼야</strong> 정상적으로 작동할 확률이 높습니다. (401 에러 방지)
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Status Check */}
                            <div className="mt-8 bg-blue-50 p-5 rounded-xl border border-blue-100 flex items-center gap-4">
                                <CheckCircle2 className="text-blue-600" size={24} />
                                <div>
                                    <h4 className="font-bold text-blue-800 text-sm">연결 상태</h4>
                                    <p className="text-xs text-blue-600 mt-1">
                                        {(localAiKey || localNaraKey) ? '키가 입력되었습니다.' : 'API 키가 필요합니다.'}
                                    </p>
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
                        <div className="flex-1 flex items-center justify-center text-slate-400">
                            설정을 선택하세요.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};