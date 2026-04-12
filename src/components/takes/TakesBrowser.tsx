import { useTakesStore } from '@/stores/takesStore';
import { useState } from 'react';
import { TakeComparison } from './TakeComparison';

interface TakesBrowserProps {
  shotId: string;
}

export function TakesBrowser({ shotId }: TakesBrowserProps) {
  const { getTakesForShot } = useTakesStore();
  const [showComparison, setShowComparison] = useState(false);
  const takes = getTakesForShot(shotId);

  if (takes.length === 0) {
    return (
      <div className="text-center text-neutral-500 py-4">
        <p className="text-sm mb-2">暂无 Takes</p>
        <p className="text-xs">从分镜面板生成 Takes</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-400">{takes.length} 个版本</span>
        {takes.length > 1 && (
          <button
            onClick={() => setShowComparison(true)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            对比选择
          </button>
        )}
      </div>
      {showComparison && (
        <div className="fixed inset-0 bg-black/80 z-50">
          <div className="h-full w-full max-w-4xl mx-auto bg-neutral-950">
            <TakeComparison shotId={shotId} onClose={() => setShowComparison(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
