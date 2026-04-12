import { useStoryboardStore } from '@/stores/storyboardStore';

export function StoryboardTimeline() {
  const { currentStoryboard, viewMode, setViewMode } = useStoryboardStore();

  if (!currentStoryboard) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        暂无分镜
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-500'}`}
          >
            网格
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'timeline' ? 'bg-neutral-700 text-white' : 'text-neutral-500'}`}
          >
            时间线
          </button>
        </div>
        <span className="text-sm text-neutral-500">
          {currentStoryboard.shots.length} 个镜头
        </span>
      </div>

      {viewMode === 'timeline' && (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-2 min-h-full">
            {currentStoryboard.shots.map((shot) => (
              <div
                key={shot.id}
                className="flex-shrink-0 w-32 flex flex-col"
              >
                <div className="aspect-video bg-neutral-800 rounded mb-2 flex items-center justify-center text-neutral-600">
                  {shot.imageUrl ? (
                    <img src={shot.imageUrl} alt="" className="w-full h-full object-cover rounded" />
                  ) : (
                    <span className="text-xs">未生成</span>
                  )}
                </div>
                <div className="text-xs text-white text-center">{shot.sequence + 1}</div>
                <div className="text-[10px] text-neutral-500 text-center">{shot.duration}s</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
