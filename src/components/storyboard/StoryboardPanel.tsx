import { useState } from 'react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ShotCard } from './ShotCard';
import { StoryboardTimeline } from './StoryboardTimeline';
import { CameraAngle } from '@/types';

export function StoryboardPanel() {
  const { currentStoryboard, viewMode, setViewMode, addShot, loadStoryboard, createStoryboard } = useStoryboardStore();
  const { currentEpisodeId } = useWorkspaceStore();
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [showAddShot, setShowAddShot] = useState(false);
  const [newShotDesc, setNewShotDesc] = useState('');
  const [newShotAngle, setNewShotAngle] = useState<CameraAngle>('medium');

  const cameraOptions: Array<{ value: CameraAngle; label: string }> = [
    { value: 'wide', label: '全景' },
    { value: 'medium', label: '中景' },
    { value: 'close_up', label: '特写' },
    { value: 'over_shoulder', label: '过肩' },
    { value: 'pov', label: '主观视角' },
    { value: 'bird_eye', label: '鸟瞰' },
    { value: 'low_angle', label: '仰拍' },
  ];

  const handleCreateStoryboard = () => {
    if (!currentEpisodeId) return;
    const sb = createStoryboard(currentEpisodeId);
    loadStoryboard(sb);
  };

  const handleAddShot = () => {
    if (!currentStoryboard || !newShotDesc.trim()) return;
    addShot(currentStoryboard.id, newShotDesc.trim(), newShotAngle);
    setNewShotDesc('');
    setShowAddShot(false);
  };

  if (!currentEpisodeId) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        请先选择一个分集
      </div>
    );
  }

  if (!currentStoryboard) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-4">暂无分镜</p>
          <button
            onClick={handleCreateStoryboard}
            className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
          >
            创建分镜
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}
          >
            网格
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-sm rounded ${viewMode === 'timeline' ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-white'}`}
          >
            时间线
          </button>
        </div>
        <button
          onClick={() => setShowAddShot(!showAddShot)}
          className="px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded text-white"
        >
          + 添加镜头
        </button>
      </div>

      {showAddShot && (
        <div className="p-4 border-b border-neutral-800 bg-neutral-900">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newShotDesc}
              onChange={(e) => setNewShotDesc(e.target.value)}
              placeholder="描述这个镜头..."
              className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddShot()}
            />
            <select
              value={newShotAngle}
              onChange={(e) => setNewShotAngle(e.target.value as CameraAngle)}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
            >
              {cameraOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleAddShot}
              className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200 text-sm"
            >
              添加
            </button>
          </div>
        </div>
      )}

      {viewMode === 'grid' ? (
        <div className="flex-1 overflow-auto p-4">
          {currentStoryboard.shots.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-500">
              暂无镜头，点击"添加镜头"开始
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {currentStoryboard.shots.map((shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  isActive={selectedShotId === shot.id}
                  onClick={() => setSelectedShotId(shot.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <StoryboardTimeline />
      )}
    </div>
  );
}
