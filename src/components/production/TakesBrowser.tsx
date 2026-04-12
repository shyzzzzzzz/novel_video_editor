import { useStoryboardStore } from '@/stores/storyboardStore';
import { useTakesStore } from '@/stores/takesStore';

export function TakesBrowser({ episodeId: _episodeId }: { episodeId: string }) {
  const { currentStoryboard } = useStoryboardStore();
  const { getTakesForShot, selectTake, getSelectedTake, addTake } = useTakesStore();

  if (!currentStoryboard || currentStoryboard.shots.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p>暂无镜头</p>
          <p className="text-xs mt-1">请先在分镜中添加镜头</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {currentStoryboard.shots.map((shot, idx) => {
        const shotTakes = getTakesForShot(shot.id);
        const selectedTake = getSelectedTake(shot.id);

        return (
          <div key={shot.id} className="bg-neutral-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-white font-medium">镜头 {idx + 1}</h4>
                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">{shot.description}</p>
              </div>
              <button
                onClick={() => addTake(shot.id, `生成镜头 ${idx + 1}: ${shot.description}`)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                AI 生成 Takes
              </button>
            </div>

            {shotTakes.length === 0 ? (
              <div className="text-center text-neutral-600 py-4 text-sm">
                暂无 Takes，点击"AI生成"开始
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {shotTakes.map((take) => {
                  const isSelected = selectedTake?.id === take.id;
                  return (
                    <div
                      key={take.id}
                      onClick={() => selectTake(shot.id, take.id)}
                      className={`rounded overflow-hidden cursor-pointer transition-all ${
                        isSelected
                          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-900'
                          : 'hover:ring-1 hover:ring-neutral-600'
                      }`}
                    >
                      <div className="aspect-video bg-neutral-800 flex items-center justify-center">
                        {take.imageUrl ? (
                          <img src={take.imageUrl} alt={`take v${take.version}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-neutral-600 text-xl">
                            {take.status === 'completed' ? '✓' : take.status === 'generating' ? '⏳' : '○'}
                          </span>
                        )}
                      </div>
                      <div className="p-2 bg-neutral-800">
                        <p className="text-xs text-neutral-400">v{take.version}</p>
                        <p className="text-[10px] text-neutral-600 capitalize">{take.status}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}