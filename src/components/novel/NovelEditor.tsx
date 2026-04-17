import { useEffect, useRef, useState, useCallback } from 'react';
import { useNovelStore } from '@/stores/novelStore';
import { savePersistedData } from '@/lib/persist-client';
import { Chapter } from '@/types';

export function NovelEditor() {
  const { getCurrentChapter, updateChapter, currentNovel } = useNovelStore();
  const chapter = getCurrentChapter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 手动保存函数
  const handleSave = useCallback(() => {
    if (!currentNovel) return;
    setSaveStatus('saving');
    savePersistedData('novels', {
      currentNovel,
      currentChapterId: useNovelStore.getState().currentChapterId,
      storyNodes: useNovelStore.getState().storyNodes,
    }).then(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    });
  }, [currentNovel]);

  // Ctrl+S 保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  useEffect(() => {
    if (!chapter) return;
    const timer = setTimeout(() => {
      useNovelStore.getState().computeMetadata(chapter.id);
    }, 1000);
    return () => clearTimeout(timer);
  }, [chapter?.content, chapter?.id]);

  // 自动保存状态跟踪
  useEffect(() => {
    if (chapter?.content) {
      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (currentNovel) {
          savePersistedData('novels', {
            currentNovel,
            currentChapterId: useNovelStore.getState().currentChapterId,
            storyNodes: useNovelStore.getState().storyNodes,
          }).then(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
          });
        }
      }, 1000);
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [chapter?.content, currentNovel]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!chapter) return;
    updateChapter(chapter.id, { content: e.target.value });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!chapter) return;
    updateChapter(chapter.id, { title: e.target.value });
  };

  const saveStatusText = {
    idle: '',
    saving: '保存中...',
    saved: '✓ 已保存',
  };

  if (!chapter) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-2">暂无章节</p>
          <p className="text-xs">从左侧创建第一个章节</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 px-4 py-3 border-b border-neutral-800">
        <input
          type="text"
          value={chapter.title}
          onChange={handleTitleChange}
          placeholder="章节标题"
          className="flex-1 text-xl font-semibold bg-transparent text-white border-b border-transparent hover:border-neutral-700 focus:border-neutral-500 outline-none"
        />
        <span className="text-sm text-neutral-500">
          {chapter.metadata.wordCount} 字
        </span>
        {saveStatusText[saveStatus] && (
          <span className={`text-sm ${saveStatus === 'saved' ? 'text-green-400' : 'text-neutral-500'}`}>
            {saveStatusText[saveStatus]}
          </span>
        )}
        <StatusBadge status={chapter.status} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            value={chapter.content}
            onChange={handleContentChange}
            placeholder="开始写作...

支持 Markdown 格式：
# 标题
## 章节
- 列表
**粗体** *斜体*
[链接](url)
![图片](url)
> 引用
```
代码块
```"
            className="flex-1 w-full p-4 bg-neutral-900 text-neutral-300 placeholder-neutral-600 resize-none focus:outline-none font-mono text-sm leading-relaxed"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Chapter['status'] }) {
  const config = {
    draft: { label: '草稿', className: 'bg-neutral-700 text-neutral-300' },
    writing: { label: '写作中', className: 'bg-yellow-900 text-yellow-300' },
    completed: { label: '已完成', className: 'bg-green-900 text-green-300' },
    synced: { label: '已同步', className: 'bg-blue-900 text-blue-300' },
  };

  const { label, className } = config[status];

  return (
    <span className={`px-2 py-0.5 text-xs rounded ${className}`}>
      {label}
    </span>
  );
}
