import { useState } from 'react';
import { RoleLibrary } from './RoleLibrary';
import { ItemLibrary } from './ItemLibrary';
import { LocationLibrary } from './LocationLibrary';
import { PlotLineLibrary } from './PlotLineLibrary';
import { GlobalSearch } from './GlobalSearch';
import { KnowledgeSnapshotManager } from './KnowledgeSnapshotManager';
import { RelationGraph } from './RelationGraph';

type KnowledgeTab = 'roles' | 'graph' | 'items' | 'locations' | 'plotlines' | 'search' | 'snapshots';

export function KnowledgePanel() {
  const [activeTab, setActiveTab] = useState<KnowledgeTab>('roles');

  const tabs: { key: KnowledgeTab; label: string }[] = [
    { key: 'roles', label: '角色' },
    { key: 'graph', label: '关系图谱' },
    { key: 'items', label: '物品' },
    { key: 'locations', label: '地点' },
    { key: 'plotlines', label: '情节' },
    { key: 'search', label: '搜索' },
    { key: 'snapshots', label: '快照' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1 px-4 py-2 border-b border-neutral-800 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-500 hover:text-white hover:bg-neutral-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'roles' && <RoleLibrary />}
        {activeTab === 'graph' && <RelationGraph />}
        {activeTab === 'items' && <ItemLibrary />}
        {activeTab === 'locations' && <LocationLibrary />}
        {activeTab === 'plotlines' && <PlotLineLibrary />}
        {activeTab === 'search' && <GlobalSearch />}
        {activeTab === 'snapshots' && <KnowledgeSnapshotManager />}
      </div>
    </div>
  );
}
