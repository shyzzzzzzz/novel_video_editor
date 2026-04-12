import { useState } from 'react';
import { useProductionStore } from '@/stores/productionStore';
import { EpisodeKanban } from './EpisodeKanban';
import { SceneView } from './SceneView';
import { EpisodeDetail } from './EpisodeDetail';

type ProductionTab = 'kanban' | 'detail';

export function ProductionPanel() {
  const { kanbanView, setKanbanView, currentEpisodeId, episodes } = useProductionStore();
  const [activeTab, setActiveTab] = useState<ProductionTab>(currentEpisodeId ? 'detail' : 'kanban');

  const currentEpisode = episodes.find((e) => e.id === currentEpisodeId);

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="flex gap-1">
          <button
            onClick={() => { setActiveTab('kanban'); }}
            className={`px-3 py-1 text-sm rounded ${
              activeTab === 'kanban' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'
            }`}
          >
            看板
          </button>
          {currentEpisode && (
            <button
              onClick={() => setActiveTab('detail')}
              className={`px-3 py-1 text-sm rounded ${
                activeTab === 'detail' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'
              }`}
            >
              {currentEpisode.name}
            </button>
          )}
        </div>

        {activeTab === 'kanban' && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">视图:</span>
            <button
              onClick={() => setKanbanView('episode')}
              className={`px-2 py-0.5 rounded ${
                kanbanView === 'episode' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
              }`}
            >
              集视图
            </button>
            <button
              onClick={() => setKanbanView('scene')}
              className={`px-2 py-0.5 rounded ${
                kanbanView === 'scene' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
              }`}
            >
              场景视图
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'kanban' ? (
          kanbanView === 'episode' ? <EpisodeKanban /> : <SceneView />
        ) : (
          currentEpisode && <EpisodeDetail episode={currentEpisode} />
        )}
      </div>
    </div>
  );
}