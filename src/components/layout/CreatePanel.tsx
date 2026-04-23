import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { NovelEditor } from '@/components/novel/NovelEditor';
import { ChapterList } from '@/components/novel/ChapterList';
import { LLMReviewPanel } from '@/components/novel/LLMReviewPanel';
import { KnowledgeSyncTrigger } from '@/components/novel/KnowledgeSyncTrigger';
import { StoryNodeEntry } from '@/components/novel/StoryNodeEntry';
import { StoryUniverse } from '@/components/story/StoryUniverse';
import { Episode, Novel } from '@/types';

type ContentTab = 'novel' | 'episode' | 'story';

export function CreatePanel() {
  const [contentTab, setContentTab] = useState<ContentTab>('novel');
  const { projects, currentProjectId, addEpisode } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) || null;

  const handleCreateEpisode = () => {
    const name = prompt('输入剧集名称：');
    if (name?.trim()) {
      addEpisode({
        name: name.trim(),
        status: 'draft',
        scripts: [],
        storyboards: [],
        audioTracks: [],
      });
    }
  };

  return (
    <div className="h-full flex">
      {/* 左侧：内容列表 */}
      <div className="w-64 border-r border-neutral-800 flex flex-col">
        {/* Tab 切换 */}
        <div className="flex border-b border-neutral-800">
          <button
            onClick={() => setContentTab('novel')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              contentTab === 'novel'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            小说
          </button>
          <button
            onClick={() => setContentTab('episode')}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              contentTab === 'episode'
                ? 'text-amber-400 border-b-2 border-amber-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            剧集
          </button>
        </div>

        {/* 内容列表 */}
        <div className="flex-1 overflow-auto">
          {contentTab === 'novel' && <ChapterList />}
          {contentTab === 'episode' && (
            <EpisodeList onCreate={handleCreateEpisode} episodes={project?.episodes || []} />
          )}
        </div>
      </div>

      {/* 中间：编辑器 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="h-10 flex items-center gap-4 px-4 border-b border-neutral-800">
          {contentTab === 'novel' && (
            <>
              <span className="text-sm text-white">小说创作</span>
              <button
                onClick={() => setContentTab('story')}
                className={`text-sm flex items-center gap-1.5 ${
                  false ? 'text-amber-400' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span>◇</span>
                <span>故事星图</span>
              </button>
            </>
          )}
          {contentTab === 'episode' && (
            <span className="text-sm text-white">剧集制作</span>
          )}
          {contentTab === 'story' && (
            <>
              <span className="text-sm text-amber-400">故事星图</span>
            </>
          )}
        </div>

        {/* 编辑器内容 */}
        <div className="flex-1 overflow-hidden">
          {contentTab === 'novel' && <NovelEditor />}
          {contentTab === 'episode' && <EpisodeEditorPlaceholder />}
          {contentTab === 'story' && <StoryUniverse />}
        </div>
      </div>

      {/* 右侧：审阅面板 */}
      <div className="w-80 flex flex-col border-l border-neutral-800">
        {contentTab === 'novel' && (
          <>
            <div className="flex-1 overflow-hidden">
              <LLMReviewPanel />
            </div>
            <div className="p-4 border-t border-neutral-800 space-y-3">
              <KnowledgeSyncTrigger />
              <StoryNodeEntry />
            </div>
          </>
        )}
        {(contentTab === 'episode' || contentTab === 'story') && (
          <div className="flex-1 flex items-center justify-center text-neutral-600 text-sm">
            {contentTab === 'episode' ? '选择剧集开始制作' : '故事星图详情'}
          </div>
        )}
      </div>
    </div>
  );
}

function EpisodeList({
  episodes,
  onCreate,
}: {
  episodes: Episode[];
  onCreate: () => void;
}) {
  return (
    <div className="p-2">
      <button
        onClick={onCreate}
        className="w-full px-3 py-2 text-sm text-left text-amber-400 hover:bg-neutral-800 rounded flex items-center gap-2 mb-2"
      >
        <span>+</span>
        <span>新建剧集</span>
      </button>

      {episodes.length === 0 ? (
        <div className="text-center text-neutral-600 py-8 text-xs">
          暂无剧集
        </div>
      ) : (
        <div className="space-y-1">
          {episodes.map((episode) => (
            <button
              key={episode.id}
              className="w-full px-3 py-2 text-sm text-left text-neutral-300 hover:bg-neutral-800 rounded"
            >
              <div className="font-medium">{episode.name}</div>
              <div className="text-xs text-neutral-600 mt-0.5">
                {episode.status === 'draft' ? '草稿' :
                 episode.status === 'in_progress' ? '进行中' :
                 episode.status === 'review' ? '审阅' : '完成'}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EpisodeEditorPlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-neutral-500">
      <div className="text-center">
        <p className="mb-2">选择或创建一个剧集</p>
        <p className="text-xs">剧集管理功能开发中</p>
      </div>
    </div>
  );
}
