import { useState, useEffect } from 'react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { useProjectStore } from '@/stores/projectStore';
import { CameraAngle, ShotCharacterRef, getCharacterDefaultImage, Shot, Character } from '@/types';
import { resolveVideoUrl } from '@/lib/api-client';

const framingMap: Record<string, CameraAngle> = {
  '大特写': 'close_up', '特写': 'close_up', 'close_up': 'close_up',
  '中近景': 'medium', '中景': 'medium', 'medium': 'medium',
  '中远景': 'wide', '远景': 'wide', '大远景': 'wide', 'wide': 'wide',
  '过肩': 'over_shoulder', 'over_shoulder': 'over_shoulder',
  'POV': 'pov', 'pov': 'pov',
  '鸟瞰': 'bird_eye', 'bird_eye': 'bird_eye',
  '低角': 'low_angle', 'low_angle': 'low_angle',
};

const cameraAngleLabels: Record<CameraAngle, string> = {
  wide: '广角',
  medium: '中景',
  close_up: '特写',
  over_shoulder: '过肩',
  pov: 'POV',
  bird_eye: '鸟瞰',
  low_angle: '低角',
};

export function StoryboardView({ episodeId }: { episodeId: string }) {
  const { currentStoryboard, addShot, deleteShot, clearShots, updateShot, uploadVideoToShot, removeVideoFromShot } = useStoryboardStore();
  const { projects, currentProjectId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const episode = project?.episodes.find((e) => e.id === episodeId);
  const characters = project?.characters || [];

  const [newShotDescription, setNewShotDescription] = useState('');
  const [newShotAngle, setNewShotAngle] = useState<CameraAngle>('medium');
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [isLoadingFromEpisode, setIsLoadingFromEpisode] = useState(false);
  const [uploadingShotId, setUploadingShotId] = useState<string | null>(null);

  // 当 currentStoryboard 为 null 但 episode.generatedStoryboard 有数据时，自动加载
  useEffect(() => {
    if (!currentStoryboard && episode?.generatedStoryboard) {
      setIsLoadingFromEpisode(true);
      try {
        const jsonStart = episode.generatedStoryboard.indexOf('[');
        const jsonEnd = episode.generatedStoryboard.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const data = JSON.parse(episode.generatedStoryboard.slice(jsonStart, jsonEnd + 1));
          if (Array.isArray(data) && data.length > 0) {
            const storyboard = useStoryboardStore.getState().createStoryboard(episodeId);
            for (const item of data) {
              const cameraAngle: CameraAngle = framingMap[item.framing] || 'medium';
              const description = buildShotDescription(item);
              useStoryboardStore.getState().addShot(storyboard.id, description, cameraAngle);
            }
          }
        }
      } catch (e) {
        console.error('[StoryboardView] 加载分镜失败:', e);
      } finally {
        setIsLoadingFromEpisode(false);
      }
    }
  }, [currentStoryboard, episode?.generatedStoryboard, episodeId]);

  const handleAddShot = () => {
    if (!newShotDescription.trim() || !currentStoryboard) return;
    addShot(currentStoryboard.id, newShotDescription.trim(), newShotAngle);
    setNewShotDescription('');
  };

  const handleUpdateCharacterRefs = (shotId: string, refs: ShotCharacterRef[]) => {
    updateShot(shotId, { characterRefs: refs });
  };

  const handleCharacterImageDragStart = (e: React.DragEvent, imageUrl: string) => {
    e.stopPropagation();
    const fullUrl = resolveVideoUrl(imageUrl);
    e.dataTransfer.setData('text/uri-list', fullUrl);
    e.dataTransfer.setData('text/plain', fullUrl);
    e.dataTransfer.setData('character-image-drag', JSON.stringify({ imageUrl }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleUploadVideo = async (shotId: string, file: File) => {
    setUploadingShotId(shotId);
    try {
      await uploadVideoToShot(shotId, file);
    } catch (err) {
      console.error('上传视频失败:', err);
      alert(`上传视频失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setUploadingShotId(null);
    }
  };

  const handleRemoveVideo = async (shotId: string) => {
    try {
      await removeVideoFromShot(shotId);
    } catch (err) {
      console.error('移除视频失败:', err);
    }
  };

  if (!currentStoryboard) {
    if (isLoadingFromEpisode) {
      return (
        <div className="h-full flex items-center justify-center text-neutral-400">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="font-mono text-sm tracking-wider">LOADING</p>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <div className="text-5xl mb-4 opacity-20">&#127916;</div>
          <p className="text-lg mb-1">尚未创建分镜</p>
          <p className="text-sm text-neutral-600">请先在左侧生成剧本，再生成分镜</p>
        </div>
      </div>
    );
  }

  const editingShot = editingShotId ? currentStoryboard.shots.find((s) => s.id === editingShotId) : null;

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-neutral-800/50 bg-neutral-950/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-amber-500 font-mono text-xs tracking-widest">SCENE</span>
              <h3 className="text-white font-light tracking-wide">
                分镜序列
              </h3>
              <span className="font-mono text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded">
                {String(currentStoryboard.shots.length).padStart(2, '0')} SHOTS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={newShotAngle}
              onChange={(e) => setNewShotAngle(e.target.value as CameraAngle)}
              className="px-3 py-1.5 text-sm bg-neutral-900 border border-neutral-700/50 rounded text-neutral-300 font-mono text-xs focus:outline-none focus:border-amber-500/50"
            >
              {Object.entries(cameraAngleLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input
              type="text"
              value={newShotDescription}
              onChange={(e) => setNewShotDescription(e.target.value)}
              placeholder="输入镜头描述..."
              className="px-4 py-1.5 text-sm bg-neutral-900 border border-neutral-700/50 rounded text-white placeholder-neutral-600 w-56 font-mono text-xs focus:outline-none focus:border-amber-500/50"
              onKeyDown={(e) => e.key === 'Enter' && handleAddShot()}
            />
            <button
              onClick={handleAddShot}
              className="px-4 py-1.5 text-sm bg-amber-600 text-black font-medium rounded hover:bg-amber-500 transition-colors"
            >
              + ADD
            </button>
            {currentStoryboard.shots.length > 0 && (
              <button
                onClick={() => confirm('确定清空所有镜头？') && clearShots()}
                className="px-3 py-1.5 text-xs text-red-400/70 hover:text-red-400 border border-red-900/30 rounded transition-colors"
              >
                CLEAR ALL
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Shot Grid */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="grid grid-cols-3 xl:grid-cols-4 gap-6">
          {currentStoryboard.shots.map((shot, idx) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              idx={idx}
              characters={characters}
              uploadingShotId={uploadingShotId}
              onUploadVideo={handleUploadVideo}
              onRemoveVideo={handleRemoveVideo}
              onDeleteShot={deleteShot}
              onUpdateShot={updateShot}
              onUpdateCharacterRefs={handleUpdateCharacterRefs}
              onSetEditingShotId={setEditingShotId}
            />
          ))}
        </div>
      </div>

      {/* 角色编辑弹窗 */}
      {editingShot && (
        <CharacterEditModal
          shot={editingShot}
          characters={characters}
          onClose={() => setEditingShotId(null)}
          onUpdateCharacterRefs={handleUpdateCharacterRefs}
          onCharacterImageDragStart={handleCharacterImageDragStart}
        />
      )}
    </div>
  );
}

// ========== 角色编辑弹窗 ==========

function CharacterEditModal({
  shot,
  characters,
  onClose,
  onUpdateCharacterRefs,
  onCharacterImageDragStart,
}: {
  shot: Shot;
  characters: Character[];
  onClose: () => void;
  onUpdateCharacterRefs: (shotId: string, refs: ShotCharacterRef[]) => void;
  onCharacterImageDragStart: (e: React.DragEvent, imageUrl: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-700/50 rounded-xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-mono text-sm tracking-wider">CHARACTER ASSIGN</h3>
            <p className="text-neutral-500 text-xs mt-1 line-clamp-1">{shot.description}</p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-2">
          {characters.length === 0 ? (
            <p className="text-neutral-600 text-sm text-center py-8 font-mono text-xs">NO CHARACTERS IN KNOWLEDGE BASE</p>
          ) : (
            characters.map((char) => {
              const existingRef = shot.characterRefs?.find((r) => r.characterId === char.id);
              const images = char.card.images || [];
              const defaultImg = getCharacterDefaultImage(char.card);

              return (
                <div key={char.id} className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {existingRef?.imageUrl && (
                        <img src={existingRef.imageUrl} alt="" className="w-8 h-8 rounded object-cover border border-neutral-700" />
                      )}
                      <span className="text-white text-sm font-mono">{char.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (existingRef) {
                          onUpdateCharacterRefs(shot.id, (shot.characterRefs || []).filter((r) => r.characterId !== char.id));
                        } else if (images.length > 0) {
                          onUpdateCharacterRefs(shot.id, [...(shot.characterRefs || []), { characterId: char.id, imageUrl: images[0], position: 'center' }]);
                        } else if (defaultImg) {
                          onUpdateCharacterRefs(shot.id, [...(shot.characterRefs || []), { characterId: char.id, imageUrl: defaultImg, position: 'center' }]);
                        }
                      }}
                      className={`px-3 py-1 text-xs rounded font-mono transition-colors ${
                        existingRef ? 'bg-red-600/80 text-white hover:bg-red-600' : 'bg-amber-600/80 text-black hover:bg-amber-600'
                      }`}
                    >
                      {existingRef ? 'REMOVE' : 'ADD'}
                    </button>
                  </div>

                  {existingRef && images.length > 1 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {images.map((img, imgIdx) => (
                        <button
                          key={imgIdx}
                          draggable
                          onDragStart={(e) => onCharacterImageDragStart(e, img)}
                          onClick={() => onUpdateCharacterRefs(shot.id, (shot.characterRefs || []).map((r) => r.characterId === char.id ? { ...r, imageUrl: img } : r))}
                          className={`relative w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                            existingRef.imageUrl === img ? 'border-amber-500 scale-105' : 'border-transparent hover:border-neutral-600'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover cursor-grab active:cursor-grabbing" />
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center">
                            <svg className="w-4 h-4 text-white opacity-0 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 12h12M8 17h12" />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {existingRef && (
                    <div className="mt-3 flex gap-1">
                      {(['left', 'center', 'right', 'background'] as const).map((pos) => (
                        <button
                          key={pos}
                          onClick={() => onUpdateCharacterRefs(shot.id, (shot.characterRefs || []).map((r) => r.characterId === char.id ? { ...r, position: pos } : r))}
                          className={`flex-1 py-1 text-xs rounded font-mono transition-colors ${
                            existingRef.position === pos ? 'bg-amber-600 text-black' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'
                          }`}
                        >
                          {pos === 'left' ? '←' : pos === 'center' ? '•' : pos === 'right' ? '→' : '▦'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-neutral-800 text-white text-sm font-mono rounded hover:bg-neutral-700 transition-colors border border-neutral-700">
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== 镜头卡片组件 ==========

function ShotCard({
  shot,
  idx,
  characters,
  uploadingShotId,
  onUploadVideo,
  onRemoveVideo,
  onDeleteShot,
  onUpdateShot,
  onUpdateCharacterRefs,
  onSetEditingShotId,
}: {
  shot: Shot;
  idx: number;
  characters: Character[];
  uploadingShotId: string | null;
  onUploadVideo: (shotId: string, file: File) => void;
  onRemoveVideo: (shotId: string) => void;
  onDeleteShot: (shotId: string) => void;
  onUpdateShot: (shotId: string, updates: Partial<Shot>) => void;
  onUpdateCharacterRefs: (shotId: string, refs: ShotCharacterRef[]) => void;
  onSetEditingShotId: (id: string | null) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 拖放处理
  const handleDragOver = (e: React.DragEvent) => {
    const types = e.dataTransfer.types;
    if (types.includes('character-image') || types.includes('frame-ref') || types.includes('character-image-drag')) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    // 角色图拖入
    const charImageData = e.dataTransfer.getData('character-image') || e.dataTransfer.getData('character-image-drag');
    if (charImageData) {
      try {
        const { characterId, imageUrl } = JSON.parse(charImageData);
        if (characterId && imageUrl) {
          const existingRefs = shot.characterRefs || [];
          if (!existingRefs.some((r) => r.characterId === characterId)) {
            onUpdateCharacterRefs(shot.id, [...existingRefs, { characterId, imageUrl, position: 'center' }]);
          }
        }
      } catch {}
      return;
    }

    // 帧参考拖入
    const frameRefData = e.dataTransfer.getData('frame-ref');
    if (frameRefData) {
      try {
        const { frameUrl, type } = JSON.parse(frameRefData);
        if (frameUrl) {
          if (type === 'lastFrame' || type === 'firstFrame') {
            onUpdateShot(shot.id, { firstFrameUrl: frameUrl });
          }
        }
      } catch {}
      return;
    }

    // 图片文件拖入
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          onUpdateShot(shot.id, { firstFrameUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 首帧拖出
  const handleFirstFrameDragStart = (e: React.DragEvent) => {
    if (!shot.firstFrameUrl) return;
    const fullUrl = resolveVideoUrl(shot.firstFrameUrl);
    e.dataTransfer.setData('text/uri-list', fullUrl);
    e.dataTransfer.setData('text/plain', fullUrl);
    e.dataTransfer.setData('frame-ref', JSON.stringify({ sourceShotId: shot.id, frameUrl: shot.firstFrameUrl, type: 'firstFrame' }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 尾帧拖出
  const handleLastFrameDragStart = (e: React.DragEvent) => {
    const frameUrl = shot.lastFrameUrl || shot.thumbnailUrl;
    if (!frameUrl) return;
    const fullUrl = resolveVideoUrl(frameUrl);
    e.dataTransfer.setData('text/uri-list', fullUrl);
    e.dataTransfer.setData('text/plain', fullUrl);
    e.dataTransfer.setData('frame-ref', JSON.stringify({ sourceShotId: shot.id, frameUrl, type: 'lastFrame' }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 角色图片拖出
  const handleCharacterImageDragStart = (e: React.DragEvent, imageUrl: string) => {
    e.stopPropagation();
    const fullUrl = resolveVideoUrl(imageUrl);
    e.dataTransfer.setData('text/uri-list', fullUrl);
    e.dataTransfer.setData('text/plain', fullUrl);
    e.dataTransfer.setData('character-image-drag', JSON.stringify({ imageUrl }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const characterBadges = (shot.characterRefs || []).map((ref) => {
    const char = characters.find((c) => c.id === ref.characterId);
    return char ? { name: char.name, imageUrl: ref.imageUrl } : null;
  }).filter(Boolean);

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-300 ${
        isDragOver ? 'ring-2 ring-amber-500 scale-[1.02]' : ''
      } bg-neutral-900 border border-neutral-800/50 hover:border-neutral-700/80`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 胶片孔装饰 - 左侧 */}
      <div className="absolute left-0 top-0 bottom-0 w-2 flex flex-col justify-around py-4 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-1 h-1.5 bg-neutral-700/50 rounded-sm" />
        ))}
      </div>
      {/* 胶片孔装饰 - 右侧 */}
      <div className="absolute right-0 top-0 bottom-0 w-2 flex flex-col justify-around py-4 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="w-1 h-1.5 bg-neutral-700/50 rounded-sm" />
        ))}
      </div>

      {/* 主内容区 */}
      <div className="pl-4 pr-4">
        {/* 镜头头部信息 */}
        <div className="flex items-center justify-between py-2 border-b border-neutral-800/50">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-amber-500/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <span className="font-mono text-[10px] text-neutral-500 uppercase tracking-wider">
              {cameraAngleLabels[shot.cameraAngle]}
            </span>
          </div>
          <span className="font-mono text-[10px] text-neutral-600">
            {shot.duration}s
          </span>
        </div>

        {/* 视频/图片区域 */}
        <div className="relative py-2">
          <div className="aspect-video bg-neutral-950 rounded-lg overflow-hidden relative">
            {shot.videoUrl ? (
              <>
                <video
                  src={resolveVideoUrl(shot.videoUrl)}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                  preload="metadata"
                />
                {/* 视频叠层信息 */}
                {shot.videoFileName && (
                  <div className="absolute bottom-1 left-1 right-1 flex justify-between items-center">
                    <span className="font-mono text-[9px] text-white/60 bg-black/50 px-1 py-0.5 rounded truncate max-w-[70%]">
                      {shot.videoFileName}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-800/30 transition-colors group">
                <svg className="w-8 h-8 text-neutral-600 group-hover:text-amber-500/50 transition-colors mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-mono text-[10px] text-neutral-600 group-hover:text-neutral-400">DROP VIDEO</span>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUploadVideo(shot.id, file);
                    e.target.value = '';
                  }}
                />
              </label>
            )}

            {/* 上传中遮罩 */}
            {uploadingShotId === shot.id && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-center">
                  <div className="w-6 h-6 border border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-2" />
                  <span className="font-mono text-[10px] text-amber-500">UPLOADING</span>
                </div>
              </div>
            )}

            {/* 拖放高亮 */}
            {isDragOver && (
              <div className="absolute inset-0 bg-amber-500/20 border-2 border-dashed border-amber-500 flex items-center justify-center">
                <span className="font-mono text-xs text-amber-500">DROP HERE</span>
              </div>
            )}
          </div>

          {/* 首尾帧时间条 */}
          <div className="mt-2 flex items-center gap-1">
            {/* 首帧 */}
            <div
              className={`w-14 h-10 rounded overflow-hidden flex-shrink-0 cursor-grab active:cursor-grabbing ${
                shot.firstFrameUrl ? 'border border-blue-500/50' : 'border border-dashed border-neutral-700'
              }`}
              draggable={!!shot.firstFrameUrl}
              onDragStart={handleFirstFrameDragStart}
              title={shot.firstFrameUrl ? '拖拽到其他镜头或浏览器外' : '首帧 - 拖入图片设置'}
            >
              {shot.firstFrameUrl ? (
                <img src={resolveVideoUrl(shot.firstFrameUrl)} alt="首帧" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[8px] text-neutral-600 font-mono">IN</span>
                </div>
              )}
            </div>

            {/* 连接线 */}
            <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-500/50 via-neutral-700 to-green-500/50 rounded-full relative">
              {shot.videoUrl && (
                <div className="absolute inset-y-0 left-1/2 w-1 h-1 bg-amber-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 top-1/2" />
              )}
            </div>

            {/* 视频缩略图（如果存在视频） */}
            {shot.videoUrl && (
              <div className="w-8 h-10 rounded overflow-hidden border border-amber-500/30 flex-shrink-0">
                <video
                  src={resolveVideoUrl(shot.videoUrl)}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
              </div>
            )}

            {/* 连接线2 */}
            {shot.videoUrl && (
              <div className="flex-1 h-0.5 bg-gradient-to-r from-amber-500/50 via-neutral-700 to-green-500/50 rounded-full" />
            )}

            {/* 尾帧 */}
            <div
              className={`w-14 h-10 rounded overflow-hidden flex-shrink-0 cursor-grab active:cursor-grabbing ${
                (shot.lastFrameUrl || shot.thumbnailUrl) ? 'border border-green-500/50' : 'border border-dashed border-neutral-700'
              }`}
              draggable={!!(shot.lastFrameUrl || shot.thumbnailUrl)}
              onDragStart={handleLastFrameDragStart}
              title={(shot.lastFrameUrl || shot.thumbnailUrl) ? '拖拽到其他镜头或浏览器外' : '尾帧 - 上传视频后自动提取'}
            >
              {shot.lastFrameUrl || shot.thumbnailUrl ? (
                <img src={resolveVideoUrl(shot.lastFrameUrl ?? shot.thumbnailUrl ?? '')} alt="尾帧" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[8px] text-neutral-600 font-mono">OUT</span>
                </div>
              )}
            </div>
          </div>

          {/* 删除尾帧按钮 */}
          {(shot.lastFrameUrl || shot.thumbnailUrl) && isHovered && (
            <button
              onClick={() => onUpdateShot(shot.id, { lastFrameUrl: undefined })}
              className="absolute bottom-14 right-0 w-5 h-5 bg-red-600/80 text-white text-xs rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              title="删除尾帧"
            >
              ×
            </button>
          )}
        </div>

        {/* 镜头描述 - 可选中拷贝 */}
        <p className="text-xs text-neutral-400 leading-relaxed select-text py-2 border-t border-neutral-800/30">
          {shot.description}
        </p>

        {/* 角色标签 - 可预览和拖拽 */}
        {characterBadges.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {characterBadges.map((badge, bIdx) => badge && (
              <div key={bIdx} className="relative group flex items-center gap-1.5 bg-neutral-800/80 rounded px-1.5 py-1 border border-neutral-700/30">
                <div
                  className="w-8 h-8 rounded overflow-hidden cursor-grab active:cursor-grabbing border border-neutral-600"
                  draggable
                  onDragStart={(e) => handleCharacterImageDragStart(e, badge.imageUrl)}
                >
                  <img src={badge.imageUrl} alt={badge.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-neutral-300 font-mono">{badge.name}</span>
                {/* 悬停提示 */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-[9px] font-mono rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10">
                  拖拽到外部保存
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 操作按钮 - 始终可见 */}
        <div className="flex items-center gap-2 pt-2 mt-auto border-t border-neutral-800/30">
          <button
            onClick={() => onSetEditingShotId(shot.id)}
            className="flex-1 py-1 text-[10px] font-mono text-amber-500/80 hover:text-amber-500 bg-amber-500/5 hover:bg-amber-500/10 rounded transition-colors border border-amber-500/20"
          >
            ASSIGN
          </button>
          {shot.videoUrl && (
            <button
              onClick={() => onRemoveVideo(shot.id)}
              className="px-3 py-1 text-[10px] font-mono text-red-400/60 hover:text-red-400 rounded transition-colors border border-neutral-800"
            >
              RM
            </button>
          )}
          <button
            onClick={() => onDeleteShot(shot.id)}
            className="px-2 py-1 text-[10px] font-mono text-neutral-600 hover:text-red-400 rounded transition-colors"
          >
            DEL
          </button>
        </div>
      </div>
    </div>
  );
}

function buildShotDescription(item: Record<string, unknown>): string {
  const parts: string[] = [];
  if (item.scene_name) parts.push(`【${item.scene_name}】`);
  if (item.scene_time) parts.push(`${item.scene_time} `);
  if (item.shot_no) parts.push(`镜头${item.shot_no} `);
  if (item.character_action) parts.push(`角色:${item.character_action} `);
  if (item.movement) parts.push(`运镜:${item.movement} `);
  if (item.lighting) parts.push(`光影:${item.lighting} `);
  if (item.atmosphere) parts.push(`氛围:${item.atmosphere} `);
  if (item.color_tone) parts.push(`色调:${item.color_tone} `);
  if (item.duration) parts.push(`时长:${item.duration}s `);
  if (item.description) parts.push(`画面:${item.description}`);
  return parts.join('|');
}
