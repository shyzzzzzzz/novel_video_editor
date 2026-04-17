import { useState } from 'react';
import { useProductionStore } from '@/stores/productionStore';
import { ProductionScene, SceneStatus } from '@/types';

export function SceneView() {
  const { episodes, setCurrentEpisode, getScenesForEpisode } = useProductionStore();
  const [filterEpisodeId, setFilterEpisodeId] = useState<string>('all');

  const filteredEpisodes =
    filterEpisodeId === 'all'
      ? episodes
      : episodes.filter((e) => e.id === filterEpisodeId);

  const allScenes = filteredEpisodes.flatMap((e) =>
    getScenesForEpisode(e.id).map((s) => ({ ...s, episodeName: e.name }))
  );

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-neutral-500">筛选集:</span>
        <select
          value={filterEpisodeId}
          onChange={(e) => setFilterEpisodeId(e.target.value)}
          className="px-3 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
        >
          <option value="all">全部</option>
          {episodes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {allScenes.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无场景</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {allScenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              episodeName={scene.episodeName}
              onClick={() => {
                setCurrentEpisode(scene.episodeId);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SceneCard({
  scene,
  episodeName,
  onClick,
}: {
  scene: ProductionScene & { episodeName: string };
  episodeName: string;
  onClick: () => void;
}) {
  const statusConfig: Record<SceneStatus, { label: string; color: string }> = {
    pending: { label: '待处理', color: 'bg-neutral-700 text-neutral-400' },
    storyboarded: { label: '已分镜', color: 'bg-yellow-900 text-yellow-300' },
    footage_uploaded: { label: '素材已上传', color: 'bg-blue-900 text-blue-300' },
    edited: { label: '已剪辑', color: 'bg-green-900 text-green-300' },
  };

  const { label, color } = statusConfig[scene.status];

  return (
    <div
      onClick={onClick}
      className="bg-neutral-900 rounded-lg p-4 hover:bg-neutral-800 cursor-pointer transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-medium">{scene.title}</h4>
          <p className="text-xs text-neutral-600 mt-0.5">{episodeName}</p>
        </div>
        <span className={`px-2 py-0.5 text-[10px] rounded ${color}`}>{label}</span>
      </div>
      {scene.description && (
        <p className="text-xs text-neutral-400 line-clamp-2 mt-2">{scene.description}</p>
      )}
      <div className="flex items-center gap-2 mt-3 text-xs text-neutral-600">
        {scene.location && <span>📍 {scene.location}</span>}
        {scene.emotion && <span>🎭 {scene.emotion}</span>}
        <span>🎬 {scene.shotIds.length} 镜头</span>
      </div>
    </div>
  );
}