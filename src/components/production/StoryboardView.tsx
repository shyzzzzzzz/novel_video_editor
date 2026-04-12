import { useState } from 'react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { CameraAngle } from '@/types';

export function StoryboardView({ episodeId }: { episodeId: string }) {
  const { currentStoryboard, addShot, deleteShot } = useStoryboardStore();

  const [newShotDescription, setNewShotDescription] = useState('');
  const [newShotAngle, setNewShotAngle] = useState<CameraAngle>('medium');

  const handleAddShot = () => {
    if (!newShotDescription.trim() || !currentStoryboard) return;
    addShot(currentStoryboard.id, newShotDescription.trim(), newShotAngle);
    setNewShotDescription('');
  };

  const cameraAngleLabels: Record<CameraAngle, string> = {
    wide: '广角',
    medium: '中景',
    close_up: '特写',
    over_shoulder: '过肩',
    pov: 'POV',
    bird_eye: '鸟瞰',
    low_angle: '低角',
  };

  if (!currentStoryboard) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-4">尚未创建分镜</p>
          <button
            onClick={() => {
              useStoryboardStore.getState().createStoryboard(episodeId);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            创建分镜
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium">分镜 ({currentStoryboard.shots.length})</h3>
        <div className="flex gap-2">
          <select
            value={newShotAngle}
            onChange={(e) => setNewShotAngle(e.target.value as CameraAngle)}
            className="px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
          >
            {Object.entries(cameraAngleLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newShotDescription}
            onChange={(e) => setNewShotDescription(e.target.value)}
            placeholder="镜头描述..."
            className="px-3 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 w-48"
            onKeyDown={(e) => e.key === 'Enter' && handleAddShot()}
          />
          <button
            onClick={handleAddShot}
            className="px-3 py-1 text-sm bg-white text-black rounded hover:bg-neutral-200"
          >
            + 添加镜头
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {currentStoryboard.shots.map((shot, idx) => (
          <div key={shot.id} className="bg-neutral-900 rounded-lg overflow-hidden">
            <div className="aspect-video bg-neutral-800 flex items-center justify-center">
              {shot.imageUrl ? (
                <img src={shot.imageUrl} alt={`shot ${idx + 1}`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-neutral-600 text-2xl">🎬</span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-neutral-500">镜头 {idx + 1}</span>
                <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded">
                  {cameraAngleLabels[shot.cameraAngle]}
                </span>
              </div>
              <p className="text-sm text-neutral-300 line-clamp-2">{shot.description}</p>
              <p className="text-xs text-neutral-600 mt-1">{shot.duration}s</p>
              <button
                onClick={() => deleteShot(shot.id)}
                className="mt-2 text-xs text-red-400 hover:text-red-300"
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}