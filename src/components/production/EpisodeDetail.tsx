import { useState } from 'react';
import { useProductionStore } from '@/stores/productionStore';
import { ProductionEpisode, ProductionStatus } from '@/types';
import { StoryboardView } from './StoryboardView';
import { TakesBrowser } from './TakesBrowser';
import { TimelineEditor } from './TimelineEditor';
import { AudioPipeline } from './AudioPipeline';

type DetailTab = 'storyboard' | 'takes' | 'timeline' | 'audio';

export function EpisodeDetail({ episode }: { episode: ProductionEpisode }) {
  const { advanceEpisodeStatus } = useProductionStore();
  const [activeTab, setActiveTab] = useState<DetailTab>('storyboard');

  const statusLabels: Record<ProductionStatus, string> = {
    outline: '大纲',
    scripting: '剧本',
    storyboard: '分镜',
    takes: 'Takes',
    rough_cut: '粗剪',
    final: '成片',
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{episode.name}</h2>
            <p className="text-sm text-neutral-500 mt-1">
              {episode.scenes.length} 个场景 ·{' '}
              <span className="text-blue-400">{statusLabels[episode.status]}</span>
            </p>
          </div>
          <button
            onClick={() => advanceEpisodeStatus(episode.id)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            推进状态
          </button>
        </div>

        <div className="flex gap-1 mt-4">
          {(
            [
              { key: 'storyboard', label: '分镜' },
              { key: 'takes', label: 'Takes' },
              { key: 'timeline', label: '时间线' },
              { key: 'audio', label: '音频' },
            ] as { key: DetailTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-sm rounded ${
                activeTab === tab.key
                  ? 'bg-neutral-700 text-white'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'storyboard' && <StoryboardView episodeId={episode.id} />}
        {activeTab === 'takes' && <TakesBrowser episodeId={episode.id} />}
        {activeTab === 'timeline' && <TimelineEditor />}
        {activeTab === 'audio' && <AudioPipeline episodeId={episode.id} />}
      </div>
    </div>
  );
}