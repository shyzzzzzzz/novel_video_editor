import { useProjectStore } from '@/stores/projectStore';

export function KnowledgeSnapshotManager() {
  const { projects, currentProjectId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId);

  // 快照功能待实现
  const snapshots: unknown[] = [];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">知识库快照 ({snapshots.length})</h3>
        <button
          onClick={() => alert('快照功能开发中')}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          创建快照
        </button>
      </div>

      {snapshots.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无快照</p>
          <p className="text-xs mt-1">快照功能开发中</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...snapshots].reverse().map((snapshot: any) => (
            <div key={snapshot.id} className="p-4 bg-neutral-900 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-white font-medium">
                    {new Date(snapshot.timestamp).toLocaleString('zh-CN')}
                  </p>
                  {snapshot.note && <p className="text-xs text-neutral-400 mt-0.5">{snapshot.note}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
