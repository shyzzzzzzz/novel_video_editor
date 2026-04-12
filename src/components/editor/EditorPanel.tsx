import { useState } from 'react';
import { Timeline } from './Timeline';
import { VideoPreview } from './VideoPreview';
import { TransitionLibrary } from './TransitionLibrary';
import { useTimelineStore } from '@/stores/timelineStore';
import { useEditorStore } from '@/stores/editorStore';

type EditorTab = 'timeline' | 'transitions' | 'effects';

export function EditorPanel() {
  const [activeTab, setActiveTab] = useState<EditorTab>('timeline');
  const { addTrack, tracks } = useTimelineStore();
  const { selectedClipIds } = useEditorStore();

  return (
    <div className="h-full flex flex-col">
      {/* Tab 导航 */}
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800 bg-neutral-900">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`px-4 py-1 text-sm rounded ${
              activeTab === 'timeline' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
            }`}
          >
            时间线
          </button>
          <button
            onClick={() => setActiveTab('transitions')}
            className={`px-4 py-1 text-sm rounded ${
              activeTab === 'transitions' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
            }`}
          >
            转场
          </button>
          <button
            onClick={() => setActiveTab('effects')}
            className={`px-4 py-1 text-sm rounded ${
              activeTab === 'effects' ? 'bg-neutral-700 text-white' : 'text-neutral-500'
            }`}
          >
            特效
          </button>
        </div>

        {/* 添加轨道 */}
        <div className="flex gap-2">
          <button
            onClick={() => addTrack('video', `V${tracks.filter(t => t.type === 'video').length + 1}`)}
            className="px-3 py-1 text-xs bg-blue-900 hover:bg-blue-800 text-blue-300 rounded"
          >
            + 视频轨
          </button>
          <button
            onClick={() => addTrack('audio', `A${tracks.filter(t => t.type === 'audio').length + 1}`)}
            className="px-3 py-1 text-xs bg-green-900 hover:bg-green-800 text-green-300 rounded"
          >
            + 音频轨
          </button>
        </div>
      </div>

      {/* 主内容区：左侧视频预览 + 右侧时间线 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：视频预览 */}
        <div className="w-2/5 border-r border-neutral-800">
          <VideoPreview />
        </div>

        {/* 右侧：时间线/转场/特效 */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'timeline' ? (
            <Timeline />
          ) : activeTab === 'transitions' ? (
            <div className="flex-1 overflow-auto">
              <TransitionLibrary />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4">
              {selectedClipIds.length === 0 ? (
                <div className="text-center text-neutral-500 py-8">
                  选择一个片段以添加特效
                </div>
              ) : (
                <div>
                  <h4 className="text-xs text-neutral-500 mb-3">可用特效</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {['brightness', 'contrast', 'saturation', 'speed', 'reverse'].map((effect) => (
                      <button
                        key={effect}
                        className="p-3 bg-neutral-800 hover:bg-neutral-700 rounded text-sm text-white"
                      >
                        {effect === 'brightness' && '亮度'}
                        {effect === 'contrast' && '对比度'}
                        {effect === 'saturation' && '饱和度'}
                        {effect === 'speed' && '速度'}
                        {effect === 'reverse' && '倒放'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
