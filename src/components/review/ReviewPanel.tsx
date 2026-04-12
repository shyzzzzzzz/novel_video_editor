import { useState } from 'react';
import { useReviewStore } from '@/stores/reviewStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { AnnotationList } from './AnnotationList';

export function ReviewPanel() {
  const { draftVersions, createDraftVersion, updateDraftVersion, deleteDraftVersion } = useReviewStore();
  const { currentEpisodeId } = useWorkspaceStore();
  const [showNewDraft, setShowNewDraft] = useState(false);
  const [newDraftLabel, setNewDraftLabel] = useState('');
  const [newDraftNotes, setNewDraftNotes] = useState('');
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const episodeDrafts = currentEpisodeId
    ? draftVersions.filter((d) => d.episodeId === currentEpisodeId)
    : [];
  const selectedDraft = selectedDraftId
    ? episodeDrafts.find((d) => d.id === selectedDraftId)
    : null;

  const handleCreateDraft = () => {
    if (!currentEpisodeId || !newDraftLabel.trim()) return;
    const draft = createDraftVersion(currentEpisodeId, newDraftLabel.trim(), newDraftNotes.trim());
    setSelectedDraftId(draft.id);
    setNewDraftLabel('');
    setNewDraftNotes('');
    setShowNewDraft(false);
  };

  if (!currentEpisodeId) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        请先选择一个分集
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 左侧：版本列表 */}
      <div className="w-64 border-r border-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-white">版本</h3>
            <button
              onClick={() => setShowNewDraft(!showNewDraft)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              + 新建
            </button>
          </div>

          {showNewDraft && (
            <div className="space-y-2">
              <input
                type="text"
                value={newDraftLabel}
                onChange={(e) => setNewDraftLabel(e.target.value)}
                placeholder="版本名称 (如 Draft v1)"
                className="w-full px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateDraft()}
              />
              <textarea
                value={newDraftNotes}
                onChange={(e) => setNewDraftNotes(e.target.value)}
                placeholder="备注..."
                rows={2}
                className="w-full px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white resize-none"
              />
              <button
                onClick={handleCreateDraft}
                className="w-full px-2 py-1 text-sm bg-white text-black rounded hover:bg-neutral-200"
              >
                创建
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-2">
          {episodeDrafts.length === 0 ? (
            <div className="text-center text-neutral-500 py-4">
              <p className="text-xs">暂无版本</p>
            </div>
          ) : (
            episodeDrafts.map((draft) => (
              <div
                key={draft.id}
                onClick={() => setSelectedDraftId(draft.id)}
                className={`p-2 rounded mb-1 cursor-pointer ${
                  selectedDraftId === draft.id ? 'bg-neutral-700' : 'hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white">{draft.label}</span>
                  {draft.approvedBy && (
                    <span className="text-xs text-green-400">✓</span>
                  )}
                </div>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {new Date(draft.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧：版本详情和批注 */}
      <div className="flex-1 flex flex-col">
        {selectedDraft ? (
          <>
            <div className="p-4 border-b border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-white">{selectedDraft.label}</h3>
                <div className="flex gap-2">
                  {!selectedDraft.approvedBy && (
                    <button
                      onClick={() => updateDraftVersion(selectedDraft.id, { approvedBy: '导演' })}
                      className="px-3 py-1 text-sm bg-green-700 hover:bg-green-600 rounded text-white"
                    >
                      批准
                    </button>
                  )}
                  <button
                    onClick={() => {
                      deleteDraftVersion(selectedDraft.id);
                      setSelectedDraftId(null);
                    }}
                    className="px-3 py-1 text-sm bg-red-900 hover:bg-red-800 rounded text-white"
                  >
                    删除
                  </button>
                </div>
              </div>
              {selectedDraft.approvedBy && (
                <div className="text-sm text-green-400 mb-2">
                  已由 {selectedDraft.approvedBy} 批准
                </div>
              )}
              {selectedDraft.notes && (
                <p className="text-sm text-neutral-400">{selectedDraft.notes}</p>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <h4 className="text-sm font-medium text-white mb-3">批注</h4>
              <AnnotationList episodeId={currentEpisodeId} />
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-500">
            选择一个版本查看详情
          </div>
        )}
      </div>
    </div>
  );
}