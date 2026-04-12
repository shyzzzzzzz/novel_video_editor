import { ScriptVersion } from '@/types';

interface ScriptVersionHistoryProps {
  history: ScriptVersion[];
  onRevert: (versionId: string) => void;
}

export function ScriptVersionHistory({ history, onRevert }: ScriptVersionHistoryProps) {
  if (history.length === 0) {
    return (
      <div className="text-center text-neutral-500 py-8">
        暂无版本历史
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-white mb-3">版本历史</h3>
      <div className="space-y-2">
        {[...history].reverse().map((version, index) => (
          <div
            key={version.id}
            className="p-3 bg-neutral-800 rounded hover:bg-neutral-700"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-white">
                v{history.length - index}
              </span>
              <button
                onClick={() => onRevert(version.id)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                恢复此版本
              </button>
            </div>
            <div className="text-xs text-neutral-500">
              {new Date(version.timestamp).toLocaleString('zh-CN')}
            </div>
            {version.note && (
              <div className="mt-1 text-xs text-neutral-400">{version.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
