import { useState } from 'react';
import { NovelEditor } from '@/components/novel/NovelEditor';
import { ChapterList } from '@/components/novel/ChapterList';
import { LLMReviewPanel } from '@/components/novel/LLMReviewPanel';
import { KnowledgeSyncTrigger } from '@/components/novel/KnowledgeSyncTrigger';
import { StoryNodeEntry } from '@/components/novel/StoryNodeEntry';

type CreateView = 'novel' | 'vibe';

export function CreatePanel() {
  const [view, setView] = useState<CreateView>('novel');

  return (
    <div className="h-full flex">
      {/* 左侧：章节列表 */}
      <div className="w-64 border-r border-neutral-800 flex flex-col">
        <ChapterList />
      </div>

      {/* 中间：编辑器 */}
      <div className="flex-1 flex flex-col">
        {/* 顶部工具栏 */}
        <div className="h-10 flex items-center gap-4 px-4 border-b border-neutral-800">
          <button
            onClick={() => setView('novel')}
            className={`text-sm ${view === 'novel' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            小说创作
          </button>
          <button
            onClick={() => setView('vibe')}
            className={`text-sm ${view === 'vibe' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            Vibe 输入
          </button>
        </div>

        {/* 编辑器内容 */}
        <div className="flex-1 overflow-hidden">
          {view === 'novel' ? <NovelEditor /> : <VibePlaceholder />}
        </div>
      </div>

      {/* 右侧：审阅面板 */}
      <div className="w-80 flex flex-col border-l border-neutral-800">
        {view === 'novel' ? (
          <>
            <div className="flex-1 overflow-hidden">
              <LLMReviewPanel />
            </div>
            <div className="p-4 border-t border-neutral-800 space-y-3">
              <KnowledgeSyncTrigger />
              <StoryNodeEntry />
            </div>
          </>
        ) : (
          <VibePlaceholder />
        )}
      </div>
    </div>
  );
}

function VibePlaceholder() {
  return (
    <div className="h-full flex items-center justify-center text-neutral-500">
      <div className="text-center">
        <p className="mb-2">Vibe 输入</p>
        <p className="text-xs">Phase 2 实现</p>
      </div>
    </div>
  );
}
