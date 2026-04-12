import { useState } from 'react';
import { useNovelStore } from '@/stores/novelStore';

export function KnowledgeSyncTrigger() {
  const {
    getCurrentChapter,
    triggerSync,
    markChapterSynced,
    lastSyncResult,
  } = useNovelStore();

  const chapter = getCurrentChapter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleSync = async () => {
    if (!chapter || isSyncing) return;

    setIsSyncing(true);
    try {
      await triggerSync(chapter.id);
      markChapterSynced(chapter.id);
      setShowResult(true);
      setTimeout(() => setShowResult(false), 5000);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!chapter) return null;

  const canSync = chapter.status !== 'synced' && chapter.content.trim().length > 0;

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
        {isSyncing
          ? '同步中...'
          : chapter.status === 'synced'
          ? '已同步'
          : '触发同步'}
      </button>

      {showResult && lastSyncResult && (
        <div className="mt-3 p-3 bg-neutral-800 rounded text-xs">
          <p className="text-green-400 mb-1">✓ 同步完成</p>
          {lastSyncResult.newCharacters.length > 0 && (
            <p className="text-neutral-400">新增角色: {lastSyncResult.newCharacters.length}</p>
          )}
          {lastSyncResult.newItems.length > 0 && (
            <p className="text-neutral-400">新增物品: {lastSyncResult.newItems.length}</p>
          )}
          {lastSyncResult.scenesExtracted.length > 0 && (
            <p className="text-neutral-400">提取场景: {lastSyncResult.scenesExtracted.length}</p>
          )}
        </div>
      )}

      {!canSync && !isSyncing && (
        <p className="mt-2 text-xs text-neutral-600">
          {chapter.content.trim().length === 0
            ? '请先编写内容'
            : '章节已同步'}
        </p>
      )}
    </div>
  );
}
