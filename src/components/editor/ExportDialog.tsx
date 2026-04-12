import { useState } from 'react';
import { useTimelineStore } from '@/stores/timelineStore';
import { exportTimeline, exportToEDL } from '@/lib/exporter';

interface ExportDialogProps {
  onClose: () => void;
}

type ExportFormat = 'mp4' | 'webm';
type ExportQuality = 'low' | 'medium' | 'high';

const qualitySettings = {
  low: { width: 720, height: 480, bitrate: '1 Mbps' },
  medium: { width: 1920, height: 1080, bitrate: '5 Mbps' },
  high: { width: 3840, height: 2160, bitrate: '20 Mbps' },
};

export function ExportDialog({ onClose }: ExportDialogProps) {
  const { tracks, duration } = useTimelineStore();
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [quality, setQuality] = useState<ExportQuality>('medium');
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setExportStatus('exporting');

    try {
      const settings = qualitySettings[quality];
      const blob = await exportTimeline(
        tracks,
        duration,
        {
          width: settings.width,
          height: settings.height,
          fps: 30,
          format,
          quality,
        },
        (p) => setProgress(p.progress)
      );

      setExportStatus('complete');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vibestudio-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('idle');
    }
  };

  const handleExportEDL = () => {
    const edl = exportToEDL(tracks, duration);
    const blob = new Blob([edl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vibestudio-export.edl';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg w-full max-w-md p-6">
        <h2 className="text-lg font-medium text-white mb-4">导出设置</h2>

        {exportStatus === 'idle' && (
          <>
            {/* 格式 */}
            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">格式</label>
              <div className="flex gap-2">
                {(['mp4', 'webm'] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`flex-1 py-2 rounded text-sm ${
                      format === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* 质量 */}
            <div className="mb-4">
              <label className="block text-sm text-neutral-400 mb-2">质量</label>
              <div className="space-y-2">
                {(['low', 'medium', 'high'] as ExportQuality[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuality(q)}
                    className={`w-full flex items-center justify-between p-3 rounded ${
                      quality === q
                        ? 'bg-blue-600/20 border border-blue-500'
                        : 'bg-neutral-800 border border-transparent'
                    }`}
                  >
                    <div className="text-left">
                      <div className="text-sm text-white">
                        {q === 'low' ? '低 (720p)' : q === 'medium' ? '中 (1080p)' : '高 (4K)'}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {qualitySettings[q].width}x{qualitySettings[q].height} • {qualitySettings[q].bitrate}
                      </div>
                    </div>
                    {quality === q && <span className="text-blue-400">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* 时长信息 */}
            <div className="mb-6 p-3 bg-neutral-800 rounded">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">总时长</span>
                <span className="text-white">{Math.round(duration)} 秒</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-neutral-400">轨道数</span>
                <span className="text-white">{tracks.length}</span>
              </div>
            </div>

            {/* 导出 EDL */}
            <button
              onClick={handleExportEDL}
              className="w-full mb-3 py-2 border border-neutral-700 rounded text-sm text-neutral-400 hover:text-white hover:border-neutral-600"
            >
              导出 EDL（用于其他剪辑软件）
            </button>
          </>
        )}

        {exportStatus === 'exporting' && (
          <div className="py-8 text-center">
            <div className="text-4xl mb-4">🎬</div>
            <div className="text-white mb-2">正在导出...</div>
            <div className="w-full h-2 bg-neutral-700 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-sm text-neutral-500 mt-2">{progress}%</div>
          </div>
        )}

        {exportStatus === 'complete' && (
          <div className="py-8 text-center">
            <div className="text-4xl mb-4 text-green-500">✓</div>
            <div className="text-white mb-4">导出完成！</div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-white text-black rounded hover:bg-neutral-200"
            >
              完成
            </button>
          </div>
        )}

        {exportStatus === 'idle' && (
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-neutral-700 rounded text-neutral-400 hover:text-white"
            >
              取消
            </button>
            <button
              onClick={handleExport}
              className="flex-1 py-2 bg-white text-black rounded hover:bg-neutral-200"
            >
              开始导出
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
