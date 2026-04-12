import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';

interface Props {
  onResult?: (result: { prompt: string; resultUrl: string }) => void;
}

const EXAMPLE_PROMPTS = [
  '一个中年男人深夜独自在便利店，赛博朋克风格，外表平静内心挣扎',
  '两个陌生人在雨夜的公交站相遇，一个是外卖骑手，一个是刚下班的白领',
  '清晨的上海老弄堂，卖早餐的阿姨和匆匆赶路的年轻人',
];

const TEMPLATES = [
  { id: 'drama', name: '剧情短片', emoji: '🎬' },
  { id: 'ad', name: '广告宣传', emoji: '📺' },
  { id: 'cinema', name: '电影感', emoji: '🎥' },
  { id: 'anime', name: '动漫风格', emoji: '✨' },
];

export function VibeInput({ onResult }: Props) {
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  const [error, setError] = useState('');
  const { apis, load: loadSettings } = useSettingsStore();
  const videoConfig = apis.video;

  useEffect(() => {
    loadSettings();
  }, []);

  const phases = ['理解 Vibe...', '生成剧本...', '设计分镜...', '渲染画面...', '合成视频...'];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError('');
    setProgress(0);

    // 模拟生成流程
    for (let i = 0; i < phases.length; i++) {
      setPhase(phases[i]);
      for (let p = 0; p <= 100; p += 20) {
        setProgress(p);
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const resultUrl = `https://picsum.photos/1280/720?random=${Date.now()}`;
    setIsGenerating(false);
    setProgress(100);

    if (onResult) {
      onResult({ prompt, resultUrl });
    }
  };

  if (isGenerating) {
    return (
      <div className="h-full flex flex-col items-center justify-center max-w-md mx-auto px-6">
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="text-xl font-semibold text-white">{phase}</div>
            <div className="text-sm text-neutral-500">这可能需要几分钟，请稍候...</div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-center text-xs text-neutral-500">{progress}%</div>
          </div>

          {/* Current phase illustration */}
          <div className="aspect-video bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-center">
            <div className="text-6xl opacity-30 animate-pulse">
              {phase.includes('剧本') ? '📝' : phase.includes('分镜') ? '🎬' : phase.includes('渲染') ? '🖼️' : phase.includes('合成') ? '✨' : '💭'}
            </div>
          </div>

          <p className="text-center text-xs text-neutral-600">
            {prompt.length > 60 ? prompt.slice(0, 60) + '...' : prompt}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">输入你的 Vibe</h2>
        <span className="text-xs text-neutral-500">
          {videoConfig.provider === 'mock' ? 'Mock 模式' : videoConfig.provider}
        </span>
      </div>

      {/* Prompt */}
      <div className="mb-5">
        <label className="text-sm text-neutral-400 mb-2 block">
          描述你想要的世界
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="例如：深夜便利店，赛博朋克风格..."
          rows={6}
          className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-600 resize-none focus:outline-none focus:border-neutral-500 transition-colors"
        />
      </div>

      {/* Templates */}
      <div className="mb-5">
        <label className="text-sm text-neutral-400 mb-2 block">快速模板</label>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                selectedTemplate === t.id
                  ? 'bg-neutral-800 border-neutral-500 text-white'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <span>{t.emoji}</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Examples */}
      <div className="mb-6">
        <label className="text-sm text-neutral-500 mb-2 block">试试这些例子</label>
        <div className="space-y-1.5">
          {EXAMPLE_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => setPrompt(p)}
              className="w-full text-left px-3 py-2 text-sm text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900 rounded transition-colors"
            >
              "{p.length > 60 ? p.slice(0, 60) + '...' : p}"
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Generate */}
      <div className="mt-auto">
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim()}
          className={`w-full py-3 rounded-lg font-medium transition-colors ${
            !prompt.trim()
              ? 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
              : 'bg-white text-black hover:bg-neutral-200'
          }`}
        >
          开始生成
        </button>
      </div>
    </div>
  );
}
