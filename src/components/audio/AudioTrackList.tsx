import { useState } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { AudioTrackItem } from './AudioTrackItem';
import { AudioType } from '@/types';

export function AudioTrackList() {
  const { tracks, addTrack, setTrackVolume, setTrackMuted, removeTrack } = useAudioStore();
  const { currentEpisodeId } = useWorkspaceStore();
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackType, setNewTrackType] = useState<AudioType>('bgm');

  const episodeTracks = currentEpisodeId
    ? tracks.filter((t) => t.episodeId === currentEpisodeId)
    : [];

  const handleAddTrack = () => {
    if (!currentEpisodeId || !newTrackName.trim()) return;
    addTrack(currentEpisodeId, newTrackType, newTrackName.trim(), '');
    setNewTrackName('');
    setShowAddTrack(false);
  };

  if (!currentEpisodeId) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        请先选择一个分集
      </div>
    );
  }

  const typeOptions: Array<{ value: AudioType; label: string }> = [
    { value: 'dialogue', label: '对话/配音' },
    { value: 'bgm', label: '背景音乐' },
    { value: 'sfx', label: '音效' },
    { value: 'foley', label: 'Foley' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="h-10 flex items-center justify-between px-4 border-b border-neutral-800">
        <span className="text-sm text-white">音频轨 ({episodeTracks.length})</span>
        <button
          onClick={() => setShowAddTrack(!showAddTrack)}
          className="px-3 py-1 text-sm bg-neutral-800 hover:bg-neutral-700 rounded text-white"
        >
          + 添加音轨
        </button>
      </div>

      {showAddTrack && (
        <div className="p-4 border-b border-neutral-800 bg-neutral-900">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTrackName}
              onChange={(e) => setNewTrackName(e.target.value)}
              placeholder="音轨名称..."
              className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddTrack()}
            />
            <select
              value={newTrackType}
              onChange={(e) => setNewTrackType(e.target.value as AudioType)}
              className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleAddTrack}
              className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200 text-sm"
            >
              添加
            </button>
          </div>
          <p className="text-xs text-neutral-500">
            提示：添加后需上传音频文件或从素材库选择
          </p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        {episodeTracks.length === 0 ? (
          <div className="h-full flex items-center justify-center text-neutral-500">
            <div className="text-center">
              <p className="text-2xl mb-2">🎵</p>
              <p className="text-sm">暂无音频轨</p>
              <p className="text-xs mt-1">点击"添加音轨"开始</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {episodeTracks.map((track) => (
              <AudioTrackItem
                key={track.id}
                track={track}
                isSelected={selectedTrackId === track.id}
                onSelect={() => setSelectedTrackId(track.id)}
                onVolumeChange={(v) => setTrackVolume(track.id, v)}
                onMuteToggle={() => setTrackMuted(track.id, !track.muted)}
                onDelete={() => removeTrack(track.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
