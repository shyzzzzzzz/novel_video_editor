import { SceneAsset } from '@/types';

interface SceneCardProps {
  scene: SceneAsset;
  isActive: boolean;
  onClick: () => void;
}

export function SceneCard({ scene, isActive, onClick }: SceneCardProps) {
  const typeLabels = {
    interior: '室内',
    exterior: '室外',
    other: '其他',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
        isActive
          ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-600'
      }`}
    >
      <div className="aspect-video bg-neutral-800">
        {scene.thumbnail ? (
          <img
            src={scene.thumbnail}
            alt={scene.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            无缩略图
          </div>
        )}
      </div>
      <div className="p-2 bg-neutral-900">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-white truncate">{scene.name}</h4>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              scene.source === 'ai_generated'
                ? 'bg-purple-900 text-purple-300'
                : 'bg-neutral-800 text-neutral-500'
            }`}
          >
            {scene.source === 'ai_generated' ? 'AI' : '资产库'}
          </span>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
          {typeLabels[scene.type]}
        </p>
      </div>
    </div>
  );
}
