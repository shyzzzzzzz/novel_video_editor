import { AudioTrack } from '@/types';

interface AudioTrackItemProps {
  track: AudioTrack;
  isSelected: boolean;
  onSelect: () => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onDelete: () => void;
}

const typeIcons: Record<string, string> = {
  dialogue: '🎙️',
  bgm: '🎵',
  sfx: '🔊',
  foley: '🎤',
};

const typeLabels: Record<string, string> = {
  dialogue: '对话/配音',
  bgm: '背景音乐',
  sfx: '音效',
  foley: 'Foley',
};

export function AudioTrackItem({
  track,
  isSelected,
  onSelect,
  onVolumeChange,
  onMuteToggle,
  onDelete,
}: AudioTrackItemProps) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-neutral-800' : 'bg-neutral-900 hover:bg-neutral-800/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{typeIcons[track.type] || '🎵'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white truncate">{track.name}</span>
            <span className="text-xs text-neutral-500">{typeLabels[track.type]}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={track.volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className="w-20 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs text-neutral-500 w-8">{Math.round(track.volume * 100)}%</span>
            <button
              onClick={(e) => { e.stopPropagation(); onMuteToggle(); }}
              className={`text-xs px-2 py-0.5 rounded ${
                track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {track.muted ? '静音' : '播放'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-xs text-red-400 hover:text-red-300 ml-auto"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
