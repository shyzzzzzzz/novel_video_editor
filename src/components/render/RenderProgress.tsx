import { RenderTask } from '@/types';

interface RenderProgressProps {
  task: RenderTask;
  onCancel?: () => void;
  onRemove?: () => void;
}

const statusColors: Record<string, string> = {
  queued: 'bg-yellow-600',
  processing: 'bg-blue-600',
  completed: 'bg-green-600',
  failed: 'bg-red-600',
};

export function RenderProgress({ task, onCancel, onRemove }: RenderProgressProps) {
  return (
    <div className="p-3 bg-neutral-900 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">
            {task.type === 'image' ? '🖼️' : '🎬'} {task.type === 'image' ? '图像' : '视频'}
          </span>
          <span className={`px-2 py-0.5 ${statusColors[task.status]} rounded text-xs text-white`}>
            {task.status === 'queued' ? '排队中' :
             task.status === 'processing' ? '生成中' :
             task.status === 'completed' ? '完成' : '失败'}
          </span>
        </div>
        <div className="flex gap-2">
          {task.status === 'processing' && onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-neutral-400 hover:text-white"
            >
              取消
            </button>
          )}
          {(task.status === 'completed' || task.status === 'failed') && onRemove && (
            <button
              onClick={onRemove}
              className="text-xs text-neutral-400 hover:text-white"
            >
              移除
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-500 mb-2 line-clamp-1">{task.prompt}</p>

      {(task.status === 'queued' || task.status === 'processing') && (
        <div className="h-1 bg-neutral-700 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}

      {task.error && (
        <p className="text-xs text-red-400 mt-1">{task.error}</p>
      )}

      {task.status === 'completed' && task.resultUrl && (
        <a
          href={task.resultUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block"
        >
          查看结果 →
        </a>
      )}
    </div>
  );
}