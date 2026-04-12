import { useAudioStore } from '@/stores/audioStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function AudioMixer() {
  const { tracks, setTrackVolume, setTrackMuted } = useAudioStore();
  const { currentEpisodeId } = useWorkspaceStore();

  const episodeTracks = currentEpisodeId
    ? tracks.filter((t) => t.episodeId === currentEpisodeId)
    : [];

  const dialogueTracks = episodeTracks.filter((t) => t.type === 'dialogue');
  const bgmTracks = episodeTracks.filter((t) => t.type === 'bgm');
  const sfxTracks = episodeTracks.filter((t) => t.type === 'sfx');
  const foleyTracks = episodeTracks.filter((t) => t.type === 'foley');

  return (
    <div className="h-full overflow-auto p-4">
      <h3 className="text-sm font-medium text-white mb-4">混音台</h3>

      {/* 总音量 */}
      <div className="mb-6 p-4 bg-neutral-900 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white">总输出音量</span>
          <span className="text-xs text-neutral-500">主控</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          defaultValue="1"
          className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* 对话/配音 */}
      {dialogueTracks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-neutral-500 mb-2">🎙️ 对话/配音</h4>
          <div className="space-y-2">
            {dialogueTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-20 truncate">{track.name}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  onClick={() => setTrackMuted(track.id, !track.muted)}
                  className={`text-xs px-2 py-0.5 rounded ${track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800'}`}
                >
                  {track.muted ? 'M' : 'O'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 背景音乐 */}
      {bgmTracks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-neutral-500 mb-2">🎵 背景音乐</h4>
          <div className="space-y-2">
            {bgmTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-20 truncate">{track.name}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  onClick={() => setTrackMuted(track.id, !track.muted)}
                  className={`text-xs px-2 py-0.5 rounded ${track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800'}`}
                >
                  {track.muted ? 'M' : 'O'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 音效 */}
      {sfxTracks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-neutral-500 mb-2">🔊 音效</h4>
          <div className="space-y-2">
            {sfxTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-20 truncate">{track.name}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  onClick={() => setTrackMuted(track.id, !track.muted)}
                  className={`text-xs px-2 py-0.5 rounded ${track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800'}`}
                >
                  {track.muted ? 'M' : 'O'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Foley */}
      {foleyTracks.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs text-neutral-500 mb-2">🎤 Foley</h4>
          <div className="space-y-2">
            {foleyTracks.map((track) => (
              <div key={track.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-400 w-20 truncate">{track.name}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.volume}
                  onChange={(e) => setTrackVolume(track.id, parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                />
                <button
                  onClick={() => setTrackMuted(track.id, !track.muted)}
                  className={`text-xs px-2 py-0.5 rounded ${track.muted ? 'bg-red-900 text-red-300' : 'bg-neutral-800'}`}
                >
                  {track.muted ? 'M' : 'O'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {episodeTracks.length === 0 && (
        <div className="text-center text-neutral-500 py-8">
          <p className="text-sm">暂无音频轨</p>
          <p className="text-xs mt-1">从音频轨列表添加</p>
        </div>
      )}
    </div>
  );
}
