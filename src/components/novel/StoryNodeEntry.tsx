import { useNovelStore } from '@/stores/novelStore';

export function StoryNodeEntry() {
  const { getUnresolvedNodes, resolveStoryNode } = useNovelStore();
  const unresolvedNodes = getUnresolvedNodes();

  if (unresolvedNodes.length === 0) {
    return (
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-2">剧情节点</h4>
        <p className="text-xs text-neutral-500">
          暂无待续的剧情节点
        </p>
      </div>
    );
  }

  const nodeTypeLabels = {
    hook: { label: '钩子', color: 'bg-purple-900 text-purple-300' },
    suspense: { label: '悬念', color: 'bg-red-900 text-red-300' },
    foreshadow: { label: '伏笔', color: 'bg-yellow-900 text-yellow-300' },
    plot_point: { label: '情节点', color: 'bg-blue-900 text-blue-300' },
  };

  return (
    <div className="p-4 bg-neutral-900 rounded-lg">
      <h4 className="text-sm font-medium text-white mb-3">
        剧情节点 ({unresolvedNodes.length})
      </h4>
      <div className="space-y-2">
        {unresolvedNodes.slice(0, 5).map((node) => {
          const { label, color } = nodeTypeLabels[node.type];
          return (
            <div
              key={node.id}
              className="p-3 bg-neutral-800 rounded hover:bg-neutral-750 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded ${color} mb-1`}>
                    {label}
                  </span>
                  <p className="text-sm text-neutral-300 line-clamp-2">{node.content}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    resolveStoryNode(node.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs bg-green-900 text-green-300 rounded hover:bg-green-800 transition-opacity"
                >
                  已解决
                </button>
              </div>
            </div>
          );
        })}
        {unresolvedNodes.length > 5 && (
          <p className="text-xs text-neutral-600 text-center">
            还有 {unresolvedNodes.length - 5} 个节点...
          </p>
        )}
      </div>
    </div>
  );
}
