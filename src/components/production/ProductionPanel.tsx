import { useState, useEffect } from 'react';
import { useProductionStore } from '@/stores/productionStore';
import { useNovelStore } from '@/stores/novelStore';
import { useSettingsStore, getSkillSysprompt } from '@/stores/settingsStore';
import { generateText } from '@/lib/api-client';
import { EpisodeKanban } from './EpisodeKanban';
import { EpisodeDetail } from './EpisodeDetail';

type ProductionTab = 'kanban' | 'detail';

export function ProductionPanel() {
  const { currentEpisodeId, episodes, setCurrentEpisode, addEpisode, updateEpisode } = useProductionStore();
  const { getCurrentChapter } = useNovelStore();
  const chapter = getCurrentChapter();
  const [activeTab, setActiveTab] = useState<ProductionTab>(currentEpisodeId ? 'detail' : 'kanban');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');

  // 同步 currentEpisodeId 变化到 activeTab
  useEffect(() => {
    if (currentEpisodeId) {
      setActiveTab('detail');
    } else {
      setActiveTab('kanban');
    }
  }, [currentEpisodeId]);

  // 监听从 EpisodeKanban 发来的选择事件
  useEffect(() => {
    const handler = (e: Event) => {
      const episodeId = (e as CustomEvent).detail;
      if (episodeId) {
        setCurrentEpisode(episodeId);
        setActiveTab('detail');
      }
    };
    window.addEventListener('select-episode', handler);
    return () => window.removeEventListener('select-episode', handler);
  }, []);

  const currentEpisode = episodes.find((e) => e.id === currentEpisodeId);

  // 从当前章节新建并生成大纲
  const handleAutoCreate = async () => {
    if (!chapter || isGenerating) return;

    const config = useSettingsStore.getState().apis.text;
    if (config.provider === 'mock') {
      alert('请先在设置中配置文本 API');
      return;
    }

    setIsGenerating(true);
    try {
      const ep = addEpisode(chapter.title || `第${episodes.length + 1}集`, [chapter.id]);
      setCurrentEpisode(ep.id);

      setCurrentOperation('生成大纲...');
      const skillSysprompt = getSkillSysprompt('text', 'outline');
      const prompt = `请根据以下小说内容，生成简洁的大纲，包括：
1. 本章核心情节（2-3句话）
2. 主要场景清单
3. 关键人物

【小说内容】
${chapter.content.slice(0, 8000)}

请以清晰的格式返回，作为剧本改编的参考。`;

      const outline = await generateText(prompt, {
        system: skillSysprompt || '你是一位专业的小说改编助理，擅长提取故事大纲。',
        model: config.model,
      });
      updateEpisode(ep.id, { outline, status: 'outline' });
    } catch (err) {
      alert(`创建失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
      setCurrentOperation('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        {/* Left: 看板标签 + 详情标签 */}
        <div className="flex gap-1">
          <button
            onClick={() => { setActiveTab('kanban'); }}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'kanban' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'
            }`}
          >
            看板
          </button>
          {currentEpisode && (
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                activeTab === 'detail' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'
              }`}
            >
              <span>{currentEpisode.name}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentEpisode(null);
                }}
                className="ml-1 text-neutral-400 hover:text-red-400 text-xs"
              >
                ×
              </span>
            </button>
          )}
        </div>

        {/* Right: 新建按钮 + 章节信息 */}
        <div className="flex items-center gap-3">
          {chapter && (
            <button
              onClick={handleAutoCreate}
              disabled={!chapter || isGenerating}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500"
            >
              {isGenerating ? currentOperation || '处理中...' : '从当前章节新建'}
            </button>
          )}
          <span className="text-neutral-500 text-xs">
            {chapter ? `当前: ${chapter.title || '无标题'}` : '未选择章节'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'kanban' ? (
          <EpisodeKanban />
        ) : (
          currentEpisode && <EpisodeDetail episode={currentEpisode} />
        )}
      </div>
    </div>
  );
}
