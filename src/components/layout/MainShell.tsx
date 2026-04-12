import { useState } from 'react';
import { useUIStore, PanelType } from '@/stores/uiStore';
import { CreatePanel } from './CreatePanel';
import { ProjectPanel } from './ProjectPanel';
import { AssetsPanel } from './AssetsPanel';
import { SettingsModal } from '@/components/settings/SettingsModal';

const panelComponents: Record<PanelType, React.FC> = {
  create: CreatePanel,
  project: ProjectPanel,
  assets: AssetsPanel,
};

export function MainShell() {
  const { activePanel, isImmersive } = useUIStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ActivePanel = panelComponents[activePanel];

  return (
    <div className="h-full w-full flex flex-col bg-neutral-950">
      {/* Top nav */}
      <header className="h-12 flex items-center px-4 border-b border-neutral-800 bg-neutral-900">
        <div className="flex items-center gap-6">
          <h1 className="text-lg font-semibold text-white tracking-tight">VibeStudio</h1>
          <nav className="flex gap-1">
            <NavButton panel="create" />
            <NavButton panel="project" />
            <NavButton panel="assets" />
          </nav>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-1 text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-1"
            title="设置"
          >
            <span>⚙</span>
            <span>设置</span>
          </button>
          <button
            onClick={() => useUIStore.getState().toggleImmersive()}
            className="px-3 py-1 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            {isImmersive ? '退出沉浸' : '沉浸'}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        <ActivePanel />
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function NavButton({ panel }: { panel: PanelType }) {
  const { activePanel, setActivePanel } = useUIStore();
  const isActive = activePanel === panel;

  const labels: Record<PanelType, string> = {
    create: '小说',
    project: '剧集',
    assets: '资产',
  };

  return (
    <button
      onClick={() => setActivePanel(panel)}
      className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
        isActive
          ? 'bg-neutral-700 text-white'
          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
      }`}
    >
      {labels[panel]}
    </button>
  );
}
