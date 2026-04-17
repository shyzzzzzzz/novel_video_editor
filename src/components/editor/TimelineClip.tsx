import { TimelineClip as TimelineClipType } from '@/types';
import { useEditorStore } from '@/stores/editorStore';

interface TimelineClipProps {
  clip: TimelineClipType;
  trackType: 'video' | 'audio';
  pixelsPerSecond: number;
}

const transitionLabels: Record<string, string> = {
  cut: '切',
  fade: '淡',
  dissolve: '叠',
  wipe: '划',
  slide: '滑',
};

export function TimelineClip({ clip, trackType, pixelsPerSecond }: TimelineClipProps) {
  const { selectedClipIds, selectClip } = useEditorStore();
  const isSelected = selectedClipIds.includes(clip.id);

  const left = clip.startTime * pixelsPerSecond;
  const width = clip.duration * pixelsPerSecond;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        selectClip(clip.id, e.shiftKey);
      }}
      className={`absolute top-1 bottom-1 rounded cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-neutral-950'
          : 'hover:ring-1 hover:ring-neutral-400'
      } ${trackType === 'video' ? 'bg-blue-600/60' : 'bg-green-600/60'}`}
      style={{ left: `${left}px`, width: `${Math.max(width, 20)}px` }}
    >
      {/* 片段内容 */}
      <div className="h-full flex flex-col justify-between p-1 overflow-hidden">
        <div className="text-[10px] text-white truncate">
          {clip.sourceType === 'shot' ? '🎬 Shot' : '🎵 Audio'}
        </div>

        {/* 转场标记 */}
        <div className="flex justify-between text-[8px] text-white/60">
          {clip.transitionIn && (
            <span className="bg-white/20 px-0.5 rounded">
              {transitionLabels[clip.transitionIn.type] || clip.transitionIn.type}
            </span>
          )}
          {clip.transitionOut && (
            <span className="bg-white/20 px-0.5 rounded">
              {transitionLabels[clip.transitionOut.type] || clip.transitionOut.type}
            </span>
          )}
        </div>
      </div>

      {/* 特效数量 */}
      {clip.effects.length > 0 && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center text-[8px] text-white">
          {clip.effects.length}
        </div>
      )}

      {/* 调整手柄 */}
      {isSelected && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white" />
          <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 cursor-ew-resize hover:bg-white" />
        </>
      )}
    </div>
  );
}
