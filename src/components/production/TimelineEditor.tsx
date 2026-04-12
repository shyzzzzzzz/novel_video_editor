import { VideoPreview } from '@/components/editor/VideoPreview';
import { Timeline } from '@/components/editor/Timeline';
import { ExportDialog } from '@/components/editor/ExportDialog';
import { useState } from 'react';

export function TimelineEditor() {
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* 上部：视频预览 */}
      <div className="flex-[3] border-b border-neutral-800">
        <VideoPreview />
      </div>

      {/* 下部：时间线 */}
      <div className="flex-[2] flex flex-col">
        {/* 时间线工具栏（含导出按钮） */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800 bg-neutral-900">
          <span className="text-sm text-white font-medium">时间线</span>
          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            导出
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Timeline />
        </div>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </div>
  );
}
