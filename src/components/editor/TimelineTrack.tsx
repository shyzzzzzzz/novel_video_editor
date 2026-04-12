import { TimelineTrack as TimelineTrackType } from '@/types';
import { TimelineClip } from './TimelineClip';
import { useEditorStore } from '@/stores/editorStore';

interface TimelineTrackProps {
  track: TimelineTrackType;
  pixelsPerSecond: number;
  onAddClip?: (trackId: string, time: number) => void;
}

export function TimelineTrack({ track, pixelsPerSecond, onAddClip }: TimelineTrackProps) {
  const { selectedTrackId, selectTrack } = useEditorStore();
  const isSelected = selectedTrackId === track.id;

  return (
    <div
      onClick={() => selectTrack(track.id)}
      className={`relative border-b border-neutral-800 ${
        isSelected ? 'bg-neutral-800/30' : ''
      } ${track.muted ? 'opacity-50' : ''} ${track.locked ? 'pointer-events-none' : ''}`}
      style={{ height: `${track.height}px` }}
    >
      {/* 轨道头 */}
      <div className="absolute left-0 top-0 bottom-0 w-24 bg-neutral-900 border-r border-neutral-800 flex flex-col justify-center px-2 z-10">
        <div className="flex items-center gap-1">
          <span className="text-xs text-white truncate">{track.name}</span>
          {track.type === 'video' ? (
            <span className="text-[10px] text-blue-400">V</span>
          ) : (
            <span className="text-[10px] text-green-400">A</span>
          )}
        </div>
        <div className="flex gap-1 mt-1">
          {track.muted && <span className="text-[8px] text-red-400">M</span>}
          {track.locked && <span className="text-[8px] text-yellow-400">L</span>}
        </div>
      </div>

      {/* 轨道内容区域 */}
      <div
        className="absolute left-24 right-0 top-0 bottom-0"
        onDoubleClick={(e) => {
          if (onAddClip && !track.locked) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = x / pixelsPerSecond;
            onAddClip(track.id, time);
          }
        }}
      >
        {track.clips.map((clip) => (
          <TimelineClip
            key={clip.id}
            clip={clip}
            trackType={track.type}
            pixelsPerSecond={pixelsPerSecond}
          />
        ))}
      </div>
    </div>
  );
}
