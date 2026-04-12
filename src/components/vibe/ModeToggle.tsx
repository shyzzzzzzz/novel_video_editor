import { GenerationMode } from '@/types';

interface ModeToggleProps {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={mode === 'auto' ? 'text-white' : 'text-neutral-500'}>
        全自动
      </span>
      <button
        onClick={() => onChange(mode === 'auto' ? 'collaborative' : 'auto')}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          mode === 'collaborative' ? 'bg-blue-600' : 'bg-neutral-700'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
            mode === 'collaborative' ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={mode === 'collaborative' ? 'text-white' : 'text-neutral-500'}>
        协作模式
      </span>
    </div>
  );
}
