import { Shot, CameraAngle } from '@/types';

interface ShotCardProps {
  shot: Shot;
  isActive: boolean;
  onClick: () => void;
  onGenerateTakes?: () => void;
}

const cameraAngleLabels: Record<string, string> = {
  wide: '全景',
  medium: '中景',
  close_up: '特写',
  over_shoulder: '过肩',
  pov: '主观视角',
  bird_eye: '鸟瞰',
  low_angle: '仰拍',
};

export function ShotCard({ shot, isActive, onClick, onGenerateTakes }: ShotCardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
        isActive
          ? 'ring-2 ring-white ring-offset-2 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-600'
      }`}
    >
      <div className="aspect-video bg-neutral-800 relative">
        {shot.imageUrl ? (
          <img src={shot.imageUrl} alt={shot.description} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600">
            <span className="text-2xl mb-1">🎬</span>
            <span className="text-xs">未生成</span>
          </div>
        )}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white">
          镜头 {shot.sequence + 1}
        </div>
        {shot.takeIds.length > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-blue-600/80 rounded text-xs text-white">
            {shot.takeIds.length} Takes
          </div>
        )}
      </div>

      <div className="p-2 bg-neutral-900">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">{cameraAngleLabels[shot.cameraAngle] || shot.cameraAngle}</span>
          <span className="text-xs text-neutral-500">{shot.duration}s</span>
        </div>
        <p className="text-sm text-neutral-300 line-clamp-2 mb-2">{shot.description}</p>
        {onGenerateTakes && (
          <button
            onClick={(e) => { e.stopPropagation(); onGenerateTakes(); }}
            className="w-full px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
          >
            生成 Takes
          </button>
        )}
      </div>
    </div>
  );
}
