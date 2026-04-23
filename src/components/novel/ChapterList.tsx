import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Chapter } from '@/types';

export function ChapterList() {
  const {
    projects,
    currentProjectId,
    currentNovelId,
    currentChapterId,
    addChapter,
    setCurrentChapter,
    deleteChapter,
    addNovel,
  } = useProjectStore();

  const project = projects.find((p) => p.id === currentProjectId) || null;
  const currentNovel = project?.novels.find((n) => n.id === currentNovelId) || null;
  const [newChapterTitle, setNewChapterTitle] = useState('');

  if (!project) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-neutral-500">
        <p className="text-sm">请先选择一个项目</p>
      </div>
    );
  }

  if (!currentNovel) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-neutral-500">
        <p className="mb-4 text-sm">当前项目暂无小说</p>
        <button
          onClick={() => addNovel({ title: '我的小说', description: '一部长篇作品', chapters: [] })}
          className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200 text-sm"
        >
          创建小说
        </button>
      </div>
    );
  }

  const handleCreateChapter = () => {
    const title = newChapterTitle.trim() || `第${currentNovel.chapters.length + 1}章`;
    const newChapter = addChapter({
      title,
      content: '',
      order: currentNovel.chapters.length,
      status: 'draft',
      metadata: {
        wordCount: 0,
        sceneCount: 0,
        characters: [],
        items: [],
        locations: [],
        plotPoints: [],
        hooks: [],
        tone: '',
      },
    });
    if (newChapter) {
      setCurrentChapter(newChapter.id);
    }
    setNewChapterTitle('');
  };

  const completedCount = currentNovel.chapters.filter((c) => c.status === 'completed' || c.status === 'synced').length;
  const sortedChapters = [...currentNovel.chapters].sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-neutral-800">
        <h2 className="text-lg font-semibold text-white mb-1">{currentNovel.title}</h2>
        <p className="text-xs text-neutral-500">
          {completedCount}/{currentNovel.chapters.length} 章已完成
        </p>
      </div>

      <div className="p-3 border-b border-neutral-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newChapterTitle}
            onChange={(e) => setNewChapterTitle(e.target.value)}
            placeholder="新章节标题（可选）"
            className="flex-1 px-2 py-1.5 text-sm bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateChapter()}
          />
          <button
            onClick={handleCreateChapter}
            className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {sortedChapters.length === 0 ? (
          <div className="text-center text-neutral-600 py-8 text-sm">
            暂无章节
          </div>
        ) : (
          sortedChapters.map((chapter) => (
            <ChapterItem
              key={chapter.id}
              chapter={chapter}
              isActive={currentChapterId === chapter.id}
              onClick={() => setCurrentChapter(chapter.id)}
              onDelete={() => deleteChapter(chapter.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ChapterItem({
  chapter,
  isActive,
  onClick,
  onDelete,
}: {
  chapter: Chapter;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`group relative flex items-center gap-2 px-3 py-2 rounded cursor-pointer mb-1 transition-colors ${
        isActive
          ? 'bg-neutral-700 text-white'
          : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
      }`}
      onClick={onClick}
    >
      <span className="text-xs text-neutral-600 w-6">{chapter.order + 1}</span>
      <span className="flex-1 text-sm truncate">{chapter.title}</span>
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800 transition-opacity"
        >
          删除
        </button>
      )}
      <StatusDot status={chapter.status} />
    </div>
  );
}

function StatusDot({ status }: { status: Chapter['status'] }) {
  const colors = {
    draft: 'bg-neutral-600',
    writing: 'bg-yellow-500',
    completed: 'bg-green-500',
    synced: 'bg-blue-500',
  };

  return (
    <span
      className={`w-2 h-2 rounded-full ${colors[status]}`}
      title={status}
    />
  );
}
