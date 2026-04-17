import { useRef, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { resolveVideoUrl } from '@/lib/api-client';

export function VideoPreview() {
  const { currentTime, isPlaying, setCurrentTime, togglePlaying, playbackRate } = useEditorStore();
  const { tracks } = useTimelineStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const animationRef = useRef<number>();

  // 获取当前时间对应的视频帧
  const getCurrentFrame = () => {
    for (const track of tracks) {
      if (track.type !== 'video') continue;
      for (const clip of track.clips) {
        if (currentTime >= clip.startTime && currentTime < clip.startTime + clip.duration) {
          if (clip.sourceType === 'shot') {
            const storyboard = useStoryboardStore.getState().currentStoryboard;
            const shot = storyboard?.shots.find((s) => s.id === clip.sourceId);
            if (shot?.videoUrl) {
              return { url: resolveVideoUrl(shot.videoUrl), isImage: false };
            }
            if (shot?.thumbnailUrl) {
              return { url: resolveVideoUrl(shot.thumbnailUrl), isImage: true };
            }
            if (shot?.imageUrl) {
              return { url: shot.imageUrl, isImage: true };
            }
          }
        }
      }
    }
    return null;
  };

  const currentFrame = getCurrentFrame();

  // 播放动画循环
  useEffect(() => {
    if (!isPlaying) return;

    let lastTime = performance.now();

    const animate = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const newTime = currentTime + delta * playbackRate;
      const duration = useTimelineStore.getState().duration;

      if (newTime >= duration) {
        setCurrentTime(0);
        useEditorStore.getState().setPlaying(false);
      } else {
        setCurrentTime(newTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackRate]);

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* 预览区域 */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {currentFrame ? (
          currentFrame.isImage ? (
            <img
              src={currentFrame.url}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              src={currentFrame.url}
              className="max-w-full max-h-full object-contain"
              muted
            />
          )
        ) : (
          <div className="text-neutral-600 text-center">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-sm">添加视频片段到时间线</p>
          </div>
        )}

        {/* 播放指示器 */}
        {isPlaying && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 rounded text-xs text-white">
            ● 播放中
          </div>
        )}
      </div>

      {/* 播放控制栏 */}
      <div className="h-12 flex items-center justify-center gap-4 bg-neutral-900 border-t border-neutral-800">
        {/* 返回开头 */}
        <button
          onClick={() => setCurrentTime(0)}
          className="text-neutral-400 hover:text-white"
        >
          ⏮
        </button>

        {/* 播放/暂停 */}
        <button
          onClick={togglePlaying}
          className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:bg-neutral-200"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        {/* 播放速率 */}
        <select
          value={playbackRate}
          onChange={(e) => useEditorStore.getState().setPlaybackRate(parseFloat(e.target.value))}
          className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-white text-xs"
        >
          <option value="0.25">0.25x</option>
          <option value="0.5">0.5x</option>
          <option value="1">1x</option>
          <option value="1.5">1.5x</option>
          <option value="2">2x</option>
        </select>
      </div>
    </div>
  );
}
