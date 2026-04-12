import { useState } from 'react';
import { VibeReference } from '@/types';

interface ReferenceUploaderProps {
  references: VibeReference[];
  onChange: (refs: VibeReference[]) => void;
}

export function ReferenceUploader({ references, onChange }: ReferenceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // TODO: 处理文件上传
    const files = Array.from(e.dataTransfer.files);
    console.log('Dropped files:', files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log('Selected files:', files);
  };

  const removeReference = (index: number) => {
    onChange(references.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-neutral-700 hover:border-neutral-600'
        }`}
      >
        <p className="text-sm text-neutral-400 mb-2">
          拖拽图片、音频或视频到这里
        </p>
        <p className="text-xs text-neutral-600 mb-3">或</p>
        <label className="inline-block">
          <input
            type="file"
            multiple
            accept="image/*,audio/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <span className="px-4 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded cursor-pointer hover:bg-neutral-700">
            选择文件
          </span>
        </label>
      </div>

      {/* 已上传的参考素材 */}
      {references.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {references.map((ref, index) => (
            <div
              key={index}
              className="relative w-16 h-16 bg-neutral-800 rounded overflow-hidden group"
            >
              {ref.type === 'image' && (
                <img
                  src={ref.data}
                  alt="参考"
                  className="w-full h-full object-cover"
                />
              )}
              {ref.type === 'audio' && (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  🎵
                </div>
              )}
              {ref.type === 'video' && (
                <div className="w-full h-full flex items-center justify-center text-neutral-500">
                  🎬
                </div>
              )}
              <button
                onClick={() => removeReference(index)}
                className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
