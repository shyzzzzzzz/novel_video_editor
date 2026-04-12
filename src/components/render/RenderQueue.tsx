import { useRenderStore } from '@/stores/renderStore';
import { RenderProgress } from './RenderProgress';

export function RenderQueue() {
  const { tasks, removeTask } = useRenderStore();

  const processing = tasks.filter((t) => t.status === 'processing');
  const queued = tasks.filter((t) => t.status === 'queued');
  const completed = tasks.filter((t) => t.status === 'completed');
  const failed = tasks.filter((t) => t.status === 'failed');

  if (tasks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="text-2xl mb-2">🎬</p>
          <p className="text-sm">渲染队列为空</p>
          <p className="text-xs mt-1">从分镜或 Takes 生成任务</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4">
      {processing.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white mb-2">进行中</h3>
          <div className="space-y-2">
            {processing.map((task) => (
              <RenderProgress
                key={task.id}
                task={task}
                onCancel={() => removeTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {queued.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white mb-2">排队中 ({queued.length})</h3>
          <div className="space-y-2">
            {queued.map((task) => (
              <RenderProgress
                key={task.id}
                task={task}
                onRemove={() => removeTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white mb-2">已完成</h3>
          <div className="space-y-2">
            {completed.map((task) => (
              <RenderProgress
                key={task.id}
                task={task}
                onRemove={() => removeTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-red-400 mb-2">失败 ({failed.length})</h3>
          <div className="space-y-2">
            {failed.map((task) => (
              <RenderProgress
                key={task.id}
                task={task}
                onRemove={() => removeTask(task.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}