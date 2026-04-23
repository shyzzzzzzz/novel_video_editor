import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';

export function StoryNodeEntry() {
  // TODO: Story nodes are not yet migrated to projectStore
  // For now, show a placeholder
  const [placeholder, setPlaceholder] = useState(true);

  if (placeholder) {
    return (
      <div className="p-4 bg-neutral-900 rounded-lg">
        <h4 className="text-sm font-medium text-white mb-2">剧情节点</h4>
        <p className="text-xs text-neutral-500">
          剧情节点功能开发中
        </p>
      </div>
    );
  }

  return null;
}
