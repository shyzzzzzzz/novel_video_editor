import { useState, useEffect } from 'react';
import { useSettingsStore, AIProvider, ApiCategory } from '@/stores/settingsStore';
import { useSyncStore } from '@/stores/syncStore';
import { SyncPanel } from './SyncPanel';

interface Props {
  open: boolean;
  onClose: () => void;
}

type SettingTab = ApiCategory | 'sync';

const API_CATEGORIES: { id: ApiCategory; label: string; icon: string; desc: string }[] = [
  { id: 'text', label: '文本生成', icon: '📝', desc: 'GPT-4 等 · 创作、审阅，知识同步' },
  { id: 'image', label: '图像生成', icon: '🖼️', desc: 'DALL-E / Stable Diffusion 等 · 角色卡、场景图' },
  { id: 'video', label: '视频生成', icon: '🎬', desc: 'Runway / Sora 等 · Takes 生成' },
];

const NAV_TABS: { id: SettingTab; label: string; icon: string }[] = [
  ...API_CATEGORIES,
  { id: 'sync', label: '云同步', icon: '☁️' },
];

const PROVIDERS: { id: AIProvider; name: string; desc: string; defaultUrl: string }[] = [
  { id: 'mock', name: 'Mock (演示)', desc: '不调真实 API，返回假数据', defaultUrl: 'http://localhost:18080' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4V / DALL-E / Sora 等', defaultUrl: 'https://api.openai.com' },
  { id: 'runway', name: 'Runway', desc: 'Gen-3 等视频生成', defaultUrl: 'https://api.runwayml.com' },
  { id: 'minimax', name: 'MiniMax', desc: '海螺 AI 等', defaultUrl: 'https://api.minimax.chat' },
];

export function SettingsModal({ open, onClose }: Props) {
  const { apis, setApi, load } = useSettingsStore();
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingTab>('text');

  // Local state for API config editing
  const [localKey, setLocalKey] = useState('');
  const [localUrl, setLocalUrl] = useState('');
  const [localProvider, setLocalProvider] = useState<AIProvider>('mock');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (open) {
      load();
      setActiveTab('text');
      setSaved(false);
      setShowKey(false);
    }
  }, [open]);

  // Sync local state when switching API tabs
  useEffect(() => {
    if (activeTab === 'sync') return;
    const config = apis[activeTab as ApiCategory];
    if (!config) return;
    setLocalKey(config.apiKey);
    setLocalUrl(config.baseUrl);
    setLocalProvider(config.provider);
    setShowKey(false);
  }, [activeTab, apis]);

  const handleProviderChange = (p: AIProvider) => {
    setLocalProvider(p);
    const providerDefaults = PROVIDERS.find((x) => x.id === p);
    const defaultUrl = providerDefaults?.defaultUrl ?? 'http://localhost:18080';
    if (!localUrl || localUrl === 'http://localhost:18080' || localUrl === defaultUrl) {
      setLocalUrl(defaultUrl);
    }
  };

  if (!open) return null;

  const handleSave = () => {
    if (activeTab === 'sync') return;
    setApi(activeTab as ApiCategory, {
      provider: localProvider,
      apiKey: localKey,
      baseUrl: localUrl,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isSyncTab = activeTab === 'sync';
  const activeApiCat = isSyncTab ? null : API_CATEGORIES.find((c) => c.id === activeTab);
  const activeConfig = isSyncTab ? null : apis[activeTab as ApiCategory];

  const [message, setMessage] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
          <h2 className="text-lg font-semibold text-white">设置</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-white text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Nav */}
          <div className="w-48 border-r border-neutral-800 p-4 shrink-0">
            <div className="space-y-1">
              {NAV_TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const isConfigured = (apis[tab.id as ApiCategory]?.apiKey || apis[tab.id as ApiCategory]?.provider !== 'mock');
                const syncConfigured = useSyncStore.getState().config.pat && useSyncStore.getState().config.gistId;
                const dot = tab.id === 'sync' ? syncConfigured : isConfigured;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                      isActive
                        ? 'bg-neutral-800 text-white'
                        : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span className="flex-1">{tab.label}</span>
                    {dot && <span className="w-2 h-2 rounded-full bg-green-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Content */}
          <div className="flex-1 overflow-auto p-6">
            {isSyncTab ? (
              <SyncPanel onMessage={(msg, type) => setMessage(`[${type}] ${msg}`)} />
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{activeApiCat?.icon}</span>
                    <h3 className="text-base font-medium text-white">{activeApiCat?.label}</h3>
                  </div>
                  <p className="text-xs text-neutral-500">{activeApiCat?.desc}</p>
                </div>

                {/* Provider */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-white block mb-2">Provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROVIDERS.map((p) => (
                      <label
                        key={p.id}
                        className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                          localProvider === p.id
                            ? 'border-neutral-500 bg-neutral-800'
                            : 'border-neutral-800 bg-neutral-900 hover:border-neutral-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="provider"
                          value={p.id}
                          checked={localProvider === p.id}
                          onChange={() => handleProviderChange(p.id)}
                          className="mt-0.5 shrink-0"
                        />
                        <div>
                          <div className="text-xs font-medium text-white">{p.name}</div>
                          <div className="text-[10px] text-neutral-500 leading-tight">{p.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* API Key */}
                <div className="mb-5">
                  <label className="text-sm font-medium text-white block mb-2">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={localKey}
                      onChange={(e) => setLocalKey(e.target.value)}
                      placeholder={localProvider === 'mock' ? 'Mock 模式不需要 Key' : 'sk-...'}
                      className="w-full px-4 py-2.5 pr-10 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-sm"
                    >
                      {showKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* API 地址 */}
                <div>
                  <label className="text-sm font-medium text-white block mb-2">API 地址</label>
                  <input
                    type="text"
                    value={localUrl}
                    onChange={(e) => setLocalUrl(e.target.value)}
                    placeholder={PROVIDERS.find((p) => p.id === localProvider)?.defaultUrl ?? 'https://api.example.com'}
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                  />
                  <p className="text-xs text-neutral-500 mt-1.5">
                    {localProvider === 'mock'
                      ? 'Mock 模式不需要真实 API 地址'
                      : '选定 Provider 的 API 地址，国内可能需要代理'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer — hidden for sync tab */}
        {!isSyncTab && (
          <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between shrink-0">
            {saved && <span className="text-sm text-green-400">✓ 已保存</span>}
            <div className="ml-auto flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-neutral-200 font-medium"
              >
                保存当前
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
