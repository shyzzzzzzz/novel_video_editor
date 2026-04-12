import { useRef, useState } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { useEditorStore } from '@/stores/editorStore';
import { TimelineTrack } from './TimelineTrack';

export function Timeline() {
  const { tracks, duration } = useTimelineStore();
  const {
    currentTime,
    setCurrentTime,
    zoomLevel,
    setZoomLevel,
    isPlaying,
    toolMode,
    clearSelection,
  } = useEditorStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const pixelsPerSecond = zoomLevel;
  const totalWidth = Math.max(duration * pixelsPerSecond + 200, 800);

  // 时间刻度
  const timeMarkers = [];
  const interval = zoomLevel > 100 ? 1 : zoomLevel > 50 ? 5 : 10;
  for (let t = 0; t <= duration + 60; t += interval) {
    timeMarkers.push(t);
  }

  // 点击时间线设置当前时间
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.track-content-area')) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left - 96 + scrollLeft;
      const time = Math.max(0, x / pixelsPerSecond);
      setCurrentTime(time);
    }
  };

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      {/* 工具栏 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <div className="flex items-center gap-4">
          <span className="text-sm text-white font-medium">时间线</span>
          <div className="flex gap-1">
            {(['select', 'trim', 'cut', 'razor'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => useEditorStore.getState().setToolMode(mode)}
                className={`px-2 py-1 text-xs rounded ${
                  toolMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {mode === 'select' ? '选择' : mode === 'trim' ? '修剪' : mode === 'cut' ? '剪切' : '刀片'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* 缩放控制 */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">缩放</span>
            <input
              type="range"
              min="20"
              max="200"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="w-24 h-1 bg-neutral-700 rounded"
            />
          </div>

          {/* 时间显示 */}
          <div className="text-sm text-white font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* 时间刻度 */}
      <div className="h-6 relative border-b border-neutral-800 bg-neutral-900 overflow-hidden">
        <div
          className="absolute flex"
          style={{ width: `${totalWidth}px`, transform: `translateX(${96 - scrollLeft}px)` }}
        >
          {timeMarkers.map((t) => (
            <div
              key={t}
              className="absolute top-0 bottom-0 border-l border-neutral-700"
              style={{ left: `${t * pixelsPerSecond}px` }}
            >
              <span className="absolute -top-1 left-1 text-[10px] text-neutral-500">
                {formatTime(t)}
              </span>
            </div>
          ))}
        </div>

        {/* 播放头 */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
          style={{ left: `${96 + currentTime * pixelsPerSecond - scrollLeft}px` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rotate-45" />
        </div>
      </div>

      {/* 轨道区域 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            clearSelection();
          }
          handleTimelineClick(e);
        }}
      >
        <div
          className="relative"
          style={{ width: `${totalWidth}px`, minHeight: '100%' }}
        >
          {/* 轨道 */}
          {tracks.map((track) => (
            <TimelineTrack
              key={track.id}
              track={track}
              pixelsPerSecond={pixelsPerSecond}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const frames = Math.floor((seconds % 1) * 30);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}
