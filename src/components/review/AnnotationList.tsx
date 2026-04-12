import { useReviewStore } from '@/stores/reviewStore';

interface AnnotationListProps {
  targetId?: string;
  episodeId: string;
}

export function AnnotationList({ targetId, episodeId }: AnnotationListProps) {
  const { annotations, resolveAnnotation, deleteAnnotation } = useReviewStore();

  const filteredAnnotations = targetId
    ? annotations.filter((a) => a.targetId === targetId)
    : annotations.filter((a) => a.episodeId === episodeId);

  const unresolved = filteredAnnotations.filter((a) => !a.resolved);
  const resolved = filteredAnnotations.filter((a) => a.resolved);

  return (
    <div className="space-y-4">
      {unresolved.length > 0 && (
        <div>
          <h4 className="text-xs text-neutral-500 mb-2">待处理 ({unresolved.length})</h4>
          <div className="space-y-2">
            {unresolved.map((ann) => (
              <div key={ann.id} className="p-3 bg-neutral-900 rounded-lg">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs text-blue-400">{ann.author}</span>
                  <span className="text-xs text-neutral-600">
                    {new Date(ann.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-white mb-2">{ann.content}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveAnnotation(ann.id)}
                    className="text-xs text-green-400 hover:text-green-300"
                  >
                    标记已解决
                  </button>
                  <button
                    onClick={() => deleteAnnotation(ann.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {resolved.length > 0 && (
        <div>
          <h4 className="text-xs text-neutral-500 mb-2">已解决 ({resolved.length})</h4>
          <div className="space-y-2 opacity-60">
            {resolved.map((ann) => (
              <div key={ann.id} className="p-3 bg-neutral-800 rounded-lg">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs text-neutral-500">{ann.author}</span>
                  <span className="text-xs text-neutral-600">
                    {new Date(ann.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-neutral-400 line-through">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {filteredAnnotations.length === 0 && (
        <div className="text-center text-neutral-500 py-4">
          <p className="text-sm">暂无批注</p>
        </div>
      )}
    </div>
  );
}