import { useEditorStore } from '@/stores/editorStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { TransitionType } from '@/types';

const transitions: Array<{ type: TransitionType; name: string; icon: string }> = [
  { type: 'cut', name: '硬切', icon: '✂️' },
  { type: 'fade', name: '淡入淡出', icon: '🌫️' },
  { type: 'dissolve', name: '叠化', icon: '💫' },
  { type: 'wipe', name: '划像', icon: '➡️' },
  { type: 'slide', name: '滑动', icon: '↔️' },
];

export function TransitionLibrary() {
  const { selectedClipIds } = useEditorStore();
  const { addTransition } = useTimelineStore();

  if (selectedClipIds.length === 0) {
    return (
      <div className="p-4 text-center text-neutral-500 text-sm">
        选择一个片段以添加转场
      </div>
    );
  }

  return (
    <div className="p-4">
      <h4 className="text-xs text-neutral-500 mb-3">转场效果</h4>
      <div className="grid grid-cols-5 gap-2">
        {transitions.map((t) => (
          <button
            key={t.type}
            onClick={() =>
              addTransition(selectedClipIds[0], { type: t.type, duration: 0.5 }, 'out')
            }
            className="flex flex-col items-center p-2 bg-neutral-800 hover:bg-neutral-700 rounded"
          >
            <span className="text-lg mb-1">{t.icon}</span>
            <span className="text-[10px] text-neutral-400">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
