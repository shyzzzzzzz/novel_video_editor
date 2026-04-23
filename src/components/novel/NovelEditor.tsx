import { useEffect, useRef, useState, useCallback } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Chapter } from '@/types';

export function NovelEditor() {
  const { projects, currentProjectId, currentNovelId, currentChapterId, updateChapter } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) || null;
  const currentNovel = project?.novels.find((n) => n.id === currentNovelId) || null;
  const chapter = currentNovel?.chapters.find((c) => c.id === currentChapterId) || null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 自动保存状态跟踪
  useEffect(() => {
    if (chapter?.content) {
      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 1000);
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [chapter?.content]);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!chapter) return;
    updateChapter(chapter.id, { content: e.target.value });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!chapter) return;
    updateChapter(chapter.id, { title: e.target.value });
  };

  const handleStatusChange = (status: Chapter['status']) => {
    if (!chapter) return;
    updateChapter(chapter.id, { status });
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
        <StatusBadge status={chapter.status} onStatusChange={handleStatusChange} />
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

function StatusBadge({ status, onStatusChange }: { status: Chapter['status']; onStatusChange: (s: Chapter['status']) => void }) {
  const config = {
    draft: { label: '草稿', className: 'bg-neutral-700 text-neutral-300' },
    writing: { label: '写作中', className: 'bg-yellow-900 text-yellow-300' },
    completed: { label: '已完成', className: 'bg-green-900 text-green-300' },
    synced: { label: '已同步', className: 'bg-blue-900 text-blue-300' },
  };

  const { label, className } = config[status];

  return (
    <select
      value={status}
      onChange={(e) => onStatusChange(e.target.value as Chapter['status'])}
      className={`px-2 py-0.5 text-xs rounded border-none cursor-pointer ${className}`}
    >
      <option value="draft">草稿</option>
      <option value="writing">写作中</option>
      <option value="completed">已完成</option>
      <option value="synced">已同步</option>
    </select>
  );
}
