import { useTakesStore } from '@/stores/takesStore';
import { TakeCard } from './TakeCard';

interface TakeComparisonProps {
  shotId: string;
  onClose: () => void;
}

export function TakeComparison({ shotId, onClose }: TakeComparisonProps) {
  const { getTakesForShot, selectedTakeIds, selectTake } = useTakesStore();
  const takes = getTakesForShot(shotId);
  const selectedId = selectedTakeIds.get(shotId);

  if (takes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        暂无 Takes
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <span className="text-sm text-white">对比 Takes（选择最佳版本）</span>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white"
        >
          关闭
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-3 gap-4">
          {takes.map((take) => (
            <TakeCard
              key={take.id}
              take={take}
              isSelected={selectedId === take.id}
              onSelect={() => selectTake(shotId, take.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
