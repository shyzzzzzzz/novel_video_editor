import { useState } from 'react';
import { useProductionStore } from '@/stores/productionStore';
import { ProductionEpisode, ProductionStatus } from '@/types';

const STAGES: { key: ProductionStatus; label: string }[] = [
  { key: 'outline', label: '大纲' },
  { key: 'scripting', label: '剧本' },
  { key: 'storyboard', label: '分镜' },
  { key: 'takes', label: 'Takes' },
  { key: 'rough_cut', label: '粗剪' },
  { key: 'final', label: '成片' },
];

export function EpisodeKanban() {
  const { episodes, addEpisode, setCurrentEpisode } = useProductionStore();
  const [newEpisodeName, setNewEpisodeName] = useState('');

  const handleAddEpisode = () => {
    if (!newEpisodeName.trim()) return;
    const ep = addEpisode(newEpisodeName.trim());
    setNewEpisodeName('');
    setCurrentEpisode(ep.id);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex gap-2 max-w-md">
          <input
            type="text"
            value={newEpisodeName}
            onChange={(e) => setNewEpisodeName(e.target.value)}
            placeholder="新集名称"
            className="flex-1 px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddEpisode()}
          />
          <button
            onClick={handleAddEpisode}
            className="px-4 py-2 text-sm bg-white text-black rounded hover:bg-neutral-200"
          >
            新建集
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {episodes.length === 0 ? (
          <div className="text-center text-neutral-500 py-12">
            <p>暂无剧集</p>
            <p className="text-xs mt-1">创建第一个剧集开始</p>
          </div>
        ) : (
          <div className="min-w-[800px]">
            <div className="grid grid-cols-7 gap-2 mb-4">
              <div className="col-span-1 text-sm font-medium text-white px-2">集</div>
              {STAGES.map((stage) => (
                <div key={stage.key} className="text-center">
                  <span className="text-xs text-neutral-500">{stage.label}</span>
                </div>
              ))}
            </div>

            {episodes.map((episode) => (
              <EpisodeRow key={episode.id} episode={episode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EpisodeRow({ episode }: { episode: ProductionEpisode }) {
  const { setCurrentEpisode } = useProductionStore();
  const stageIndex = STAGES.findIndex((s) => s.key === episode.status);

  return (
    <div className="grid grid-cols-7 gap-2 mb-2">
      <div className="flex items-center">
        <button
          onClick={() => setCurrentEpisode(episode.id)}
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
    </div>
  );
}