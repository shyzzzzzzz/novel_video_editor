import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';

export function KnowledgeSyncTrigger() {
  const { projects, currentProjectId, currentNovelId, currentChapterId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) || null;
  const currentNovel = project?.novels.find((n) => n.id === currentNovelId) || null;
  const chapter = currentNovel?.chapters.find((c) => c.id === currentChapterId) || null;
  const [isSyncing, setIsSyncing] = useState(false);

  // TODO: 同步功能需要迁移到 projectStore
  // 目前显示占位符
  const handleSync = async () => {
    if (!chapter) return;
    // 功能开发中 - 暂时不做任何事
    console.log('Knowledge sync placeholder - to be implemented');
  };

  if (!chapter) return null;

  const canSync = chapter.content.trim().length > 0;

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-white">同步到知识库</h4>
        {chapter.metadata.lastSyncedAt && (
          <span className="text-xs text-neutral-500">
            上次同步: {new Date(chapter.metadata.lastSyncedAt).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      <button
        onClick={handleSync}
        disabled={!canSync || isSyncing}
        className={`w-full px-4 py-2 rounded text-sm font-medium transition-colors ${
          !canSync
            ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            : isSyncing
            ? 'bg-blue-900 text-blue-300 cursor-wait'
            : 'bg-blue-600 text-white hover:bg-blue-500'
        }`}
      >
        {isSyncing ? '同步中...' : '触发同步'}
      </button>

      <p className="mt-2 text-xs text-neutral-600">
        知识库同步功能开发中
      </p>
    </div>
  );
}
