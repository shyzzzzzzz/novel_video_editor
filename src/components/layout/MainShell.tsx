import { useState, useRef, useEffect } from 'react';
import { useUIStore, PanelType } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { CreatePanel } from './CreatePanel';
import { ProjectPanel } from './ProjectPanel';
import { AssetsPanel } from './AssetsPanel';
import { SettingsModal } from '@/components/settings/SettingsModal';

const panelComponents: Record<PanelType, React.FC> = {
  create: CreatePanel,
  project: ProjectPanel,
  assets: AssetsPanel,
};

function CreateProjectModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-6 w-80 shadow-xl">
        <h3 className="text-lg font-medium text-white mb-4">新建项目</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入项目名称"
            className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 mb-4"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-500 disabled:opacity-50 transition-colors"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MainShell() {
  const { activePanel, isImmersive } = useUIStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const ActivePanel = panelComponents[activePanel];

  const { projects, currentProjectId, setCurrentProject, createProject } = useProjectStore();
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleCreateProject = (name: string) => {
    createProject(name);
    setShowCreateModal(false);
    setProjectDropdownOpen(false);
  };

  return (
    <div className="h-full w-full flex flex-col bg-neutral-950">
      {/* Top nav */}
      <header className="h-12 flex items-center px-4 border-b border-neutral-800 bg-neutral-900">
        <div className="flex items-center gap-4">
          {/* Project Switcher */}
          <div className="relative">
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors"
            >
              <span className="text-amber-400">◇</span>
              <span className="text-sm text-white font-medium">
                {currentProject?.name || '选择项目'}
              </span>
              <span className="text-neutral-500 text-xs">▼</span>
            </button>

            {projectDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl z-50">
                <div className="p-2 border-b border-neutral-700">
                  <div
                    onClick={() => {
                      setShowCreateModal(true);
                      setProjectDropdownOpen(false);
                    }}
                    style={{ cursor: 'pointer' }}
                    className="px-3 py-2 text-sm text-left text-amber-400 hover:bg-neutral-700 rounded flex items-center gap-2"
                  >
                    <span>+</span>
                    <span>新建项目</span>
                  </div>
                </div>
                <div className="max-h-64 overflow-auto p-1">
                  {projects.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-neutral-500 text-center">
                      暂无项目
                    </div>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentProject(project.id);
                          setProjectDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-sm text-left rounded flex items-center justify-between ${
                          project.id === currentProjectId
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        <span>{project.name}</span>
                        {project.id === currentProjectId && (
                          <span className="text-amber-500">✓</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Click outside to close dropdown */}
          {projectDropdownOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setProjectDropdownOpen(false)}
            />
          )}

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
        {currentProject ? (
          <ActivePanel />
        ) : (
          <WelcomeScreen onCreateProject={() => setShowCreateModal(true)} />
        )}
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}
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

function WelcomeScreen({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-neutral-500">
      <div className="text-6xl mb-6 text-amber-500/30">◇</div>
      <h2 className="text-xl font-medium text-white mb-2">欢迎使用 VibeStudio</h2>
      <p className="text-sm mb-6">创建你的第一个项目，开始创作</p>
      <button
        onClick={onCreateProject}
        className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-500 transition-colors font-medium"
      >
        创建项目
      </button>
    </div>
  );
}
