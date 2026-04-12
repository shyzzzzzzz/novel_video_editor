import { Take } from '@/types';

interface TakeCardProps {
  take: Take;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '等待中', color: 'bg-yellow-600' },
  generating: { text: '生成中', color: 'bg-blue-600' },
  completed: { text: '完成', color: 'bg-green-600' },
  failed: { text: '失败', color: 'bg-red-600' },
};

export function TakeCard({ take, isSelected, onSelect, onDelete }: TakeCardProps) {
  const status = statusLabels[take.status] || statusLabels.pending;

  return (
    <div
      onClick={onSelect}
      className={`rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-600'
      }`}
    >
      <div className="aspect-video bg-neutral-800 relative">
        {take.imageUrl && (
          <img src={take.imageUrl} alt="" className="w-full h-full object-cover" />
        )}
        {take.videoUrl && (
          <video src={take.videoUrl} className="w-full h-full object-cover" />
        )}
        {!take.imageUrl && !take.videoUrl && (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            {take.status === 'generating' ? '生成中...' : '预览'}
          </div>
        )}
        <div className={`absolute top-2 left-2 px-2 py-0.5 ${status.color} rounded text-xs text-white`}>
          {status.text}
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white">
          v{take.version}
        </div>
      </div>
      <div className="p-2 bg-neutral-900 flex items-center justify-between">
        <span className="text-xs text-neutral-500">
          {new Date(take.createdAt).toLocaleTimeString('zh-CN')}
        </span>
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-xs text-red-400 hover:text-red-300"
          >
            删除
          </button>
        )}
      </div>
    </div>
  );
}
