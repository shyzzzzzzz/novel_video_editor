import { useKnowledgeStore } from '@/stores/knowledgeStore';

export function KnowledgeSnapshotManager() {
  const { snapshots, createSnapshot, restoreSnapshot, deleteSnapshot } = useKnowledgeStore();

  const handleCreateSnapshot = () => {
    const note = prompt('快照备注（可选）:');
    createSnapshot(note || undefined);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">知识库快照 ({snapshots.length})</h3>
        <button
          onClick={handleCreateSnapshot}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          创建快照
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无快照</p>
          <p className="text-xs mt-1">知识库同步时会自动创建快照</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...snapshots].reverse().map((snapshot) => (
            <div key={snapshot.id} className="p-4 bg-neutral-900 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-medium">
                    {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
                  </p>
                  {snapshot.note && <p className="text-xs text-neutral-400 mt-0.5">{snapshot.note}</p>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      if (confirm('确定要恢复到此快照吗？当前未保存的更改将丢失。')) {
                        restoreSnapshot(snapshot.id);
                      }
                    }}
                    className="px-2 py-1 text-xs bg-blue-900 text-blue-300 rounded hover:bg-blue-800"
                  >
                    恢复
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('确定要删除此快照吗？')) {
                        deleteSnapshot(snapshot.id);
                      }
                    }}
                    className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800"
                  >
                    删除
                  </button>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-neutral-500">
                <span>角色: {snapshot.characters?.length ?? 0}</span>
                <span>物品: {snapshot.items?.length ?? 0}</span>
                <span>地点: {snapshot.locations?.length ?? 0}</span>
                <span>情节: {snapshot.plotLines?.length ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
