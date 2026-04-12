import { useState } from 'react';
import { useAudioStore } from '@/stores/audioStore';
import { AudioType } from '@/types';

type AudioTab = 'dialogue' | 'bgm' | 'sfx' | 'foley';

export function AudioPipeline({ episodeId }: { episodeId: string }) {
  const { getTracksByEpisode, setTrackVolume, setTrackMuted, removeTrack } = useAudioStore();
  const [activeTab, setActiveTab] = useState<AudioTab>('dialogue');
  const [showAddTrack, setShowAddTrack] = useState(false);

  const allTracks = getTracksByEpisode(episodeId);
  const filteredTracks = allTracks.filter((t) => t.type === activeTab);

  const tabConfig: { key: AudioTab; label: string; icon: string }[] = [
    { key: 'dialogue', label: '对白', icon: '🎤' },
    { key: 'bgm', label: 'BGM', icon: '🎵' },
    { key: 'sfx', label: '音效', icon: '🔊' },
    { key: 'foley', label: '拟音', icon: '🎧' },
  ];

  return (
    <div className="h-full flex flex-col p-4">
      {/* Tab 导航 */}
      <div className="flex items-center gap-1 mb-4">
        {tabConfig.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-sm rounded ${
              activeTab === tab.key
                ? 'bg-neutral-700 text-white'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setShowAddTrack(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          + 添加音轨
        </button>
      </div>

      {/* 音轨列表 */}
      {filteredTracks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500">
          <div className="text-center">
            <p className="mb-1">暂无 {tabConfig.find((t) => t.key === activeTab)?.label}</p>
            <p className="text-xs text-neutral-600">
              {activeTab === 'dialogue'
                ? 'AI 配音将在 Phase 5 实现'
                : `点击"添加音轨"上传音频文件`}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto space-y-2">
          {filteredTracks.map((track) => (
            <AudioTrackRow
              key={track.id}
              track={track}
              onVolumeChange={(v) => setTrackVolume(track.id, v)}
              onMuteChange={(m) => setTrackMuted(track.id, m)}
              onRemove={() => removeTrack(track.id)}
            />
          ))}
        </div>
      )}

      {/* 添加音轨弹窗 */}
      {showAddTrack && (
        <AddTrackModal
          episodeId={episodeId}
          defaultType={activeTab}
          onClose={() => setShowAddTrack(false)}
        />
      )}
    </div>
  );
}

function AudioTrackRow({
  track,
  onVolumeChange,
  onMuteChange,
  onRemove,
}: {
  track: { id: string; name: string; type: AudioType; volume: number; muted: boolean; fileUrl: string };
  onVolumeChange: (v: number) => void;
  onMuteChange: (m: boolean) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-neutral-900 rounded-lg p-3 flex items-center gap-4">
      <div className="w-8 h-8 bg-neutral-800 rounded flex items-center justify-center text-neutral-500">
        🎵
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{track.name}</p>
        <p className="text-xs text-neutral-600">{track.fileUrl.split('/').pop()}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-500 w-8">{Math.round(track.volume * 100)}%</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={track.volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="w-20 h-1 bg-neutral-700 rounded"
        />
      </div>
      <button
        onClick={() => onMuteChange(!track.muted)}
        className={`px-2 py-1 text-xs rounded ${
          track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800 text-neutral-400'
        }`}
      >
        {track.muted ? '静音' : '播放'}
      </button>
      <button
        onClick={onRemove}
        className="px-2 py-1 text-xs rounded bg-neutral-800 text-neutral-500 hover:text-red-400"
      >
        删除
      </button>
    </div>
  );
}

function AddTrackModal({
  episodeId,
  defaultType,
  onClose,
}: {
  episodeId: string;
  defaultType: AudioTab;
  onClose: () => void;
}) {
  const { addTrack } = useAudioStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<AudioType>(
    defaultType === 'dialogue' ? 'dialogue' : defaultType === 'bgm' ? 'bgm' : defaultType === 'sfx' ? 'sfx' : 'foley'
  );
  const [fileUrl, setFileUrl] = useState('');

  const handleAdd = () => {
    if (!name.trim() || !fileUrl.trim()) return;
    addTrack(episodeId, type, name.trim(), fileUrl.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg w-full max-w-md p-6">
        <h3 className="text-lg font-medium text-white mb-4">添加音轨</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">音轨名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：第1集对白"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">类型</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AudioType)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            >
              <option value="dialogue">对白</option>
              <option value="bgm">背景音乐</option>
              <option value="sfx">音效</option>
              <option value="foley">拟音</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-1">文件路径</label>
            <input
              type="text"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder="/path/to/audio.mp3"
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 border border-neutral-700 rounded text-neutral-400">
            取消
          </button>
          <button onClick={handleAdd} className="flex-1 py-2 bg-white text-black rounded hover:bg-neutral-200">
            添加
          </button>
        </div>
      </div>
    </div>
  );
}
