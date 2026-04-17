import { useProductionStore } from '@/stores/productionStore';
import { ProductionEpisode, ProductionStatus } from '@/types';

const STAGES: { key: ProductionStatus; label: string }[] = [
  { key: 'outline', label: '大纲' },
  { key: 'scripting', label: '剧本' },
  { key: 'storyboard', label: '分镜' },
  { key: 'footage', label: '素材' },
  { key: 'rough_cut', label: '粗剪' },
  { key: 'final', label: '成片' },
];

export function EpisodeKanban() {
  const { episodes, setCurrentEpisode, getCurrentEpisode, deleteEpisode } = useProductionStore();
  const currentEpisode = getCurrentEpisode();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4">
        {episodes.length === 0 ? (
          <div className="text-center text-neutral-500 py-12">
            <p>暂无剧集</p>
            <p className="text-xs mt-1">在右上角点击"从当前章节新建"</p>
          </div>
        ) : (
          <div className="min-w-[900px]">
            <div className="grid grid-cols-8 gap-2 mb-4">
              <div className="col-span-1 text-sm font-medium text-white px-2">集</div>
              {STAGES.map((stage) => (
                <div key={stage.key} className="text-center">
                  <span className="text-xs text-neutral-500">{stage.label}</span>
                </div>
              ))}
              <div className="text-center text-xs text-neutral-500">操作</div>
            </div>

            {episodes.map((episode) => (
              <EpisodeRow
                key={episode.id}
                episode={episode}
                isCurrentEpisode={currentEpisode?.id === episode.id}
                onClick={() => {
                  setCurrentEpisode(episode.id);
                  // 通过自定义事件通知 ProductionPanel 切换到详情
                  window.dispatchEvent(new CustomEvent('select-episode', { detail: episode.id }));
                }}
                onDelete={() => {
                  if (confirm(`确定删除剧集"${episode.name}"？`)) {
                    deleteEpisode(episode.id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EpisodeRow({
  episode,
  isCurrentEpisode,
  onClick,
  onDelete,
}: {
  episode: ProductionEpisode;
  isCurrentEpisode: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const stageIndex = STAGES.findIndex((s) => s.key === episode.status);

  return (
    <div className={`grid grid-cols-8 gap-2 mb-2 p-2 rounded ${isCurrentEpisode ? 'bg-neutral-800' : 'hover:bg-neutral-800/50'}`}>
      <div className="flex items-center">
        <button
          onClick={onClick}
          className="text-sm text-white hover:text-blue-400 truncate"
        >
          {episode.name}
        </button>
      </div>
      {STAGES.map((stage, idx) => {
        const isComplete = idx < stageIndex;
        const isCurrent = idx === stageIndex;
        return (
          <div key={stage.key} className="flex items-center justify-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
                isComplete
                  ? 'bg-green-600 text-white'
                  : isCurrent
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-neutral-950'
                  : 'bg-neutral-800 text-neutral-600'
              }`}
            >
              {isComplete ? '✓' : isCurrent ? '●' : '○'}
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-center">
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs text-neutral-500 hover:text-red-400"
          title="删除"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
