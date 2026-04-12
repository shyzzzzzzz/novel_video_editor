import { useState } from 'react';

interface GenerationResultProps {
  prompt: string;
  resultUrl: string;
  onRegenerate: () => void;
  onContinue: () => void;
}

export function GenerationResult({ prompt, resultUrl, onRegenerate, onContinue }: GenerationResultProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'script'>('preview');

  // 从 prompt 生成一个假剧本
  const mockScript = `【第一场】深夜·便利店

　外景。霓虹灯在潮湿的街道上反射出迷幻的光。便利店孤零零地立在街角，玻璃门上贴着褪色的海报。

　陈明（40岁，便利店店员）站在收银台后面，目光穿过空旷的货架，落在窗外闪烁的霓虹灯上。他的眼神平静，但深处有一丝难以察觉的疲惫。

　　　　　陈明
　　　（独白）
　　　一天又过去了。每个人都在赶路，没人停下来看看这家便利店。

　门铃响起。一个穿着黑色风衣的年轻女人走进来，带进一阵冷风。她快速扫视货架，最后目光停在了陈明身上。

　　　　　女人
　　　有充电线吗？iPhone的。

　陈明转身从柜台下拿出一根线，递给她。他的动作很慢，像是在拖延什么。

　　　　　陈明
　　　你是第一个进来的客人。今晚。

　女人看了他一眼，嘴角微微上扬，但没有说话。`;

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="text-green-400 text-sm">✓ 生成完成</span>
          <span className="text-neutral-500 text-xs">v1.0</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRegenerate}
            className="px-3 py-1.5 text-sm text-neutral-400 hover:text-white border border-neutral-700 rounded-md transition-colors"
          >
            重新生成
          </button>
          <button
            onClick={onContinue}
            className="px-3 py-1.5 text-sm bg-white text-black rounded-md hover:bg-neutral-200 font-medium"
          >
            继续编辑剧本 →
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Left: Preview */}
        <div className="flex-1 flex flex-col">
          <div className="flex border-b border-neutral-800">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                activeTab === 'preview'
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              预览
            </button>
            <button
              onClick={() => setActiveTab('script')}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
                activeTab === 'script'
                  ? 'border-white text-white'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              剧本
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'preview' ? (
              <div className="space-y-4">
                {/* Thumbnail */}
                <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800">
                  <img
                    src={resultUrl}
                    alt="Generated preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://picsum.photos/1280/720?random=${Date.now()}`;
                    }}
                  />
                </div>
                {/* Info */}
                <div className="space-y-2">
                  <h3 className="text-white font-medium text-lg">深夜便利店</h3>
                  <p className="text-neutral-400 text-sm">
                    赛博朋克 · 剧情短片 · 2分钟
                  </p>
                  <p className="text-neutral-500 text-sm mt-3 leading-relaxed">
                    {prompt.length > 100 ? prompt.slice(0, 100) + '...' : prompt}
                  </p>
                </div>
                {/* Tags */}
                <div className="flex gap-2 pt-2">
                  {['赛博朋克', '便利店', '夜色', '孤独', '城市'].map((tag) => (
                    <span key={tag} className="px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">剧本</h3>
                  <button className="text-xs text-neutral-500 hover:text-white transition-colors">
                    编辑
                  </button>
                </div>
                <pre className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap font-mono">
                  {mockScript}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick info */}
        <div className="w-64 border-l border-neutral-800 p-4 space-y-6 overflow-auto">
          <div>
            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">场景</h4>
            <div className="space-y-2">
              {['便利店内部', '便利店外街道', '便利店仓库'].map((s, i) => (
                <div key={s} className={`text-sm rounded p-2 ${i === 0 ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">角色</h4>
            <div className="space-y-2">
              {[
                { name: '陈明', role: '便利店店员', age: '40' },
                { name: '神秘女人', role: '访客', age: '?' },
              ].map((r) => (
                <div key={r.name} className="text-sm">
                  <div className="text-white">{r.name}</div>
                  <div className="text-neutral-500 text-xs">{r.role} · {r.age}岁</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-3">分镜</h4>
            <div className="text-sm text-neutral-400">3 个镜头已生成</div>
            <div className="mt-2 space-y-1">
              {['宽镜头-外景', '中景-对话', '特写-眼神'].map((shot, i) => (
                <div key={i} className="text-xs text-neutral-600 flex gap-2">
                  <span>{i + 1}.</span>
                  <span>{shot}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
