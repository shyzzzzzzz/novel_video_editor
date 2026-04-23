import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { FateBoard } from './FateBoard';
import { PlotTracker } from './PlotTracker';
import { RelationGraph } from './RelationGraph';
import { TimelineView } from './TimelineView';

type Tab = 'fate' | 'plot' | 'relation' | 'timeline';

export function StoryUniverse() {
  const [activeTab, setActiveTab] = useState<Tab>('fate');
  const { projects, currentProjectId, currentChapterId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) || null;
  const characters = project?.characters || [];
  const plotLines = project?.plotLines || [];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'fate', label: '命运星图', count: characters.length },
    { id: 'plot', label: '伏笔星轨', count: plotLines.filter(p => p.status === 'active').length },
    { id: 'relation', label: '关系星图' },
    { id: 'timeline', label: '时光长河' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0b0f]">
      {/* 顶部标签栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                  : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-amber-500/30' : 'bg-neutral-800'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 当前章节指示 */}
        {currentChapterId && (
          <div className="text-xs text-neutral-600">
            章节: {currentChapterId.slice(0, 8)}...
          </div>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'fate' && <FateBoard />}
        {activeTab === 'plot' && <PlotTracker />}
        {activeTab === 'relation' && <RelationGraph />}
        {activeTab === 'timeline' && <TimelineView />}
      </div>
    </div>
  );
}
