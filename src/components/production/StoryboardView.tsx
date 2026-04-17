import { useState, useEffect, useRef } from 'react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useProductionStore } from '@/stores/productionStore';
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

export function StoryboardView({ episodeId }: { episodeId: string }) {
  const { currentStoryboard, addShot, deleteShot, clearShots, updateShot, uploadVideoToShot, removeVideoFromShot } = useStoryboardStore();
  const { characters } = useKnowledgeStore();
  const episode = useProductionStore((s) => s.episodes.find((e) => e.id === episodeId));

  const [newShotDescription, setNewShotDescription] = useState('');
  const [newShotAngle, setNewShotAngle] = useState<CameraAngle>('medium');
  const [editingShotId, setEditingShotId] = useState<string | null>(null);
  const [isLoadingFromEpisode, setIsLoadingFromEpisode] = useState(false);
  const [uploadingShotId, setUploadingShotId] = useState<string | null>(null);

  // 当 currentStoryboard 为 null 但 episode.storyboard 有数据时，自动加载
  useEffect(() => {
    if (!currentStoryboard && episode?.storyboard) {
      setIsLoadingFromEpisode(true);
      try {
        const jsonStart = episode.storyboard.indexOf('[');
        const jsonEnd = episode.storyboard.lastIndexOf(']');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const data = JSON.parse(episode.storyboard.slice(jsonStart, jsonEnd + 1));
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
  }, [currentStoryboard, episode?.storyboard, episodeId]);

  const handleAddShot = () => {
    if (!newShotDescription.trim() || !currentStoryboard) return;
    addShot(currentStoryboard.id, newShotDescription.trim(), newShotAngle);
    setNewShotDescription('');
  };

  const handleUpdateCharacterRefs = (shotId: string, refs: ShotCharacterRef[]) => {
    updateShot(shotId, { characterRefs: refs });
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

  const cameraAngleLabels: Record<CameraAngle, string> = {
    wide: '广角',
    medium: '中景',
    close_up: '特写',
    over_shoulder: '过肩',
    pov: 'POV',
    bird_eye: '鸟瞰',
    low_angle: '低角',
  };

  if (!currentStoryboard) {
    if (isLoadingFromEpisode) {
      return (
        <div className="h-full flex items-center justify-center text-neutral-500">
          <div className="text-center">
            <p>正在加载分镜...</p>
          </div>
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p>尚未创建分镜</p>
          <p className="text-xs mt-1">请先在左侧生成剧本，再生成分镜</p>
        </div>
      </div>
    );
  }

  const editingShot = editingShotId ? currentStoryboard.shots.find((s) => s.id === editingShotId) : null;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-medium">分镜 ({currentStoryboard.shots.length})</h3>
          {currentStoryboard.shots.length > 0 && (
            <button
              onClick={() => {
                if (confirm('确定清空所有镜头？')) {
                  clearShots();
                }
              }}
              className="px-2 py-1 text-xs text-red-400 hover:text-red-300 border border-red-900 rounded"
            >
              清空全部
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={newShotAngle}
            onChange={(e) => setNewShotAngle(e.target.value as CameraAngle)}
            className="px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white"
          >
            {Object.entries(cameraAngleLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newShotDescription}
            onChange={(e) => setNewShotDescription(e.target.value)}
            placeholder="镜头描述..."
            className="px-3 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 w-48"
            onKeyDown={(e) => e.key === 'Enter' && handleAddShot()}
          />
          <button
            onClick={handleAddShot}
            className="px-3 py-1 text-sm bg-white text-black rounded hover:bg-neutral-200"
          >
            + 添加镜头
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {currentStoryboard.shots.map((shot, idx) => (
          <ShotCard
            key={shot.id}
            shot={shot}
            idx={idx}
            characters={characters}
            uploadingShotId={uploadingShotId}
            cameraAngleLabels={cameraAngleLabels}
            onUploadVideo={handleUploadVideo}
            onRemoveVideo={handleRemoveVideo}
            onDeleteShot={deleteShot}
            onUpdateShot={updateShot}
            onUpdateCharacterRefs={handleUpdateCharacterRefs}
            onSetEditingShotId={setEditingShotId}
          />
        ))}
      </div>

      {/* 角色编辑弹窗 */}
      {editingShot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">编辑镜头角色</h3>
              <button onClick={() => setEditingShotId(null)} className="text-neutral-400 hover:text-white text-xl">&times;</button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-neutral-400 mb-2">{editingShot.description}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-white">选择角色：</p>
              {characters.length === 0 ? (
                <p className="text-neutral-500 text-sm">暂无角色，请在知识库中添加</p>
              ) : (
                characters.map((char) => {
                  const existingRef = editingShot.characterRefs?.find((r) => r.characterId === char.id);
                  const images = char.card.images || [];
                  const defaultImg = getCharacterDefaultImage(char.card);

                  return (
                    <div key={char.id} className="bg-neutral-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">{char.name}</span>
                        <button
                          onClick={() => {
                            if (existingRef) {
                              handleUpdateCharacterRefs(
                                editingShot.id,
                                (editingShot.characterRefs || []).filter((r) => r.characterId !== char.id)
                              );
                            } else if (images.length > 0) {
                              handleUpdateCharacterRefs(editingShot.id, [
                                ...(editingShot.characterRefs || []),
                                { characterId: char.id, imageUrl: images[0], position: 'center' },
                              ]);
                            } else if (defaultImg) {
                              handleUpdateCharacterRefs(editingShot.id, [
                                ...(editingShot.characterRefs || []),
                                { characterId: char.id, imageUrl: defaultImg, position: 'center' },
                              ]);
                            }
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            existingRef
                              ? 'bg-red-600 text-white hover:bg-red-500'
                              : 'bg-blue-600 text-white hover:bg-blue-500'
                          }`}
                        >
                          {existingRef ? '移除' : '添加'}
                        </button>
                      </div>

                      {existingRef && images.length > 1 && (
                        <div className="mt-2">
                          <p className="text-xs text-neutral-500 mb-1">选择图片：</p>
                          <div className="flex gap-2 flex-wrap">
                            {images.map((img, imgIdx) => (
                              <button
                                key={imgIdx}
                                onClick={() => {
                                  handleUpdateCharacterRefs(
                                    editingShot.id,
                                    (editingShot.characterRefs || []).map((r) =>
                                      r.characterId === char.id ? { ...r, imageUrl: img } : r
                                    )
                                  );
                                }}
                                className={`w-12 h-12 rounded overflow-hidden border-2 ${
                                  existingRef.imageUrl === img ? 'border-blue-500' : 'border-transparent'
                                }`}
                              >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {existingRef && (
                        <div className="mt-2">
                          <p className="text-xs text-neutral-500 mb-1">位置：</p>
                          <div className="flex gap-2">
                            {(['left', 'center', 'right', 'background'] as const).map((pos) => (
                              <button
                                key={pos}
                                onClick={() => {
                                  handleUpdateCharacterRefs(
                                    editingShot.id,
                                    (editingShot.characterRefs || []).map((r) =>
                                      r.characterId === char.id ? { ...r, position: pos } : r
                                    )
                                  );
                                }}
                                className={`px-2 py-1 text-xs rounded ${
                                  existingRef.position === pos
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-neutral-700 text-neutral-300 hover:bg-neutral-600'
                                }`}
                              >
                                {pos === 'left' ? '左' : pos === 'center' ? '中' : pos === 'right' ? '右' : '背景'}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setEditingShotId(null)}
                className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== 镜头卡片组件（含拖放 + inline editing） ==========

function ShotCard({
  shot,
  idx,
  characters,
  uploadingShotId,
  cameraAngleLabels,
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
  cameraAngleLabels: Record<CameraAngle, string>;
  onUploadVideo: (shotId: string, file: File) => void;
  onRemoveVideo: (shotId: string) => void;
  onDeleteShot: (shotId: string) => void;
  onUpdateShot: (shotId: string, updates: Partial<Shot>) => void;
  onUpdateCharacterRefs: (shotId: string, refs: ShotCharacterRef[]) => void;
  onSetEditingShotId: (id: string | null) => void;
}) {
  const [dragOverType, setDragOverType] = useState<'character' | 'frame' | null>(null);
  const [editingField, setEditingField] = useState<'description' | 'duration' | null>(null);
  const [editValue, setEditValue] = useState('');
  const descInputRef = useRef<HTMLInputElement>(null);
  const durationInputRef = useRef<HTMLInputElement>(null);

  // 自动聚焦编辑输入框
  useEffect(() => {
    if (editingField === 'description' && descInputRef.current) {
      descInputRef.current.focus();
      descInputRef.current.select();
    }
    if (editingField === 'duration' && durationInputRef.current) {
      durationInputRef.current.focus();
      durationInputRef.current.select();
    }
  }, [editingField]);

  // ---- 拖放处理 ----

  const hasCharacterImage = (types: DataTransferItemList | readonly string[]): boolean => {
    return Array.from(types as ArrayLike<string>).includes('character-image');
  };

  const hasFrameRef = (types: DataTransferItemList | readonly string[]): boolean => {
    return Array.from(types as ArrayLike<string>).includes('frame-ref');
  };

  const hasImageFile = (dt: DataTransfer): boolean => {
    if (dt.files && dt.files.length > 0) {
      return dt.files[0].type.startsWith('image/');
    }
    return false;
  };

  // 整个卡片的 drag over（角色图拖入）
  const handleDragOver = (e: React.DragEvent) => {
    const types = e.dataTransfer.types;
    if (hasCharacterImage(types) || hasFrameRef(types) || hasImageFile(e.dataTransfer)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (hasCharacterImage(types)) {
        setDragOverType('character');
      } else {
        setDragOverType('frame');
      }
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // 只在真正离开卡片时才取消高亮
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverType(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverType(null);

    // 1. 从知识库拖入角色图
    const charImageData = e.dataTransfer.getData('character-image');
    if (charImageData) {
      try {
        const { characterId, imageUrl } = JSON.parse(charImageData) as { characterId: string; imageUrl: string };
        const existingRefs = shot.characterRefs || [];
        // 避免重复添加
        if (existingRefs.some((r) => r.characterId === characterId)) return;
        onUpdateCharacterRefs(shot.id, [
          ...existingRefs,
          { characterId, imageUrl, position: 'center' },
        ]);
      } catch (err) {
        console.error('解析角色拖拽数据失败:', err);
      }
      return;
    }

    // 2. 从其他镜头拖入尾帧作为首帧
    const frameRefData = e.dataTransfer.getData('frame-ref');
    if (frameRefData) {
      try {
        const { frameUrl } = JSON.parse(frameRefData);
        if (frameUrl) {
          onUpdateShot(shot.id, { firstFrameUrl: frameUrl });
        }
      } catch (err) {
        console.error('解析帧参考拖拽数据失败:', err);
      }
      return;
    }

    // 3. 从本地文件拖入图片作为首帧
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          onUpdateShot(shot.id, { firstFrameUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // 4. 也支持拖入图片作为尾帧（按住 Alt）
    if (file && file.type.startsWith('image/') && e.altKey) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (dataUrl) {
          onUpdateShot(shot.id, { lastFrameUrl: dataUrl });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ---- 尾帧拖出 ----

  const handleLastFrameDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    const frameUrl = shot.lastFrameUrl || shot.thumbnailUrl;
    if (frameUrl) {
      e.dataTransfer.setData('frame-ref', JSON.stringify({
        sourceShotId: shot.id,
        frameUrl,
        type: 'lastFrame',
      }));
      e.dataTransfer.effectAllowed = 'copy';
    }
  };

  // ---- Inline editing ----

  const startEditDescription = () => {
    setEditValue(shot.description);
    setEditingField('description');
  };

  const saveDescription = () => {
    if (editValue.trim() && editValue !== shot.description) {
      onUpdateShot(shot.id, { description: editValue.trim() });
    }
    setEditingField(null);
  };

  const startEditDuration = () => {
    setEditValue(String(shot.duration));
    setEditingField('duration');
  };

  const saveDuration = () => {
    const num = parseFloat(editValue);
    if (!isNaN(num) && num > 0 && num !== shot.duration) {
      onUpdateShot(shot.id, { duration: num });
    }
    setEditingField(null);
  };

  // ---- 渲染 ----

  const characterBadges = (shot.characterRefs || []).map((ref) => {
    const char = characters.find((c) => c.id === ref.characterId);
    return char ? { name: char.name, imageUrl: ref.imageUrl } : null;
  }).filter(Boolean);

  const borderClass = dragOverType === 'character'
    ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-neutral-950'
    : dragOverType === 'frame'
    ? 'ring-2 ring-green-500 ring-offset-1 ring-offset-neutral-950'
    : '';

  return (
    <div
      className={`bg-neutral-900 rounded-lg overflow-hidden transition-all ${borderClass}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="aspect-video bg-neutral-800 flex items-center justify-center relative group">
        {shot.videoUrl ? (
          <video
            src={resolveVideoUrl(shot.videoUrl)}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        ) : shot.imageUrl ? (
          <img src={shot.imageUrl} alt={`shot ${idx + 1}`} className="w-full h-full object-cover" />
        ) : (
          <span className="text-neutral-600 text-2xl">&#127916;</span>
        )}

        {/* 角色数量标识 */}
        {shot.characterRefs && shot.characterRefs.length > 0 && (
          <div className="absolute top-1 right-1 bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded">
            {shot.characterRefs.length}人
          </div>
        )}

        {/* 连续性指示器（可拖拽的尾帧） */}
        <div className="absolute top-1 left-1 flex gap-1">
          {shot.firstFrameUrl && (
            <span className="bg-black/70 text-blue-300 text-[10px] px-1 rounded">首帧</span>
          )}
          {shot.lastFrameUrl && (
            <span
              className="bg-black/70 text-green-300 text-[10px] px-1 rounded cursor-grab active:cursor-grabbing"
              draggable
              onDragStart={handleLastFrameDragStart}
              title="拖拽到其他镜头作为首帧参考"
            >
              尾帧
            </span>
          )}
        </div>

        {/* 视频文件名 */}
        {shot.videoFileName && (
          <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1 rounded truncate max-w-[90%]">
            {shot.videoFileName}
          </div>
        )}

        {/* 上传/移除视频悬浮按钮 */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 group-hover:bg-black/40 transition-colors opacity-0 group-hover:opacity-100">
          {shot.videoUrl ? (
            <button
              onClick={() => onRemoveVideo(shot.id)}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500"
            >
              移除视频
            </button>
          ) : (
            <label className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-500 cursor-pointer">
              {uploadingShotId === shot.id ? '上传中...' : '上传视频'}
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
        </div>

        {/* 上传中 loading 遮罩 */}
        {uploadingShotId === shot.id && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-white text-sm">上传中...</div>
          </div>
        )}

        {/* 拖放提示遮罩 */}
        {dragOverType && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 border-2 border-dashed rounded pointer-events-none"
            style={{ borderColor: dragOverType === 'character' ? '#3b82f6' : '#22c55e' }}
          >
            <div className="text-white text-sm">
              {dragOverType === 'character' ? '添加角色参考' : '设置首帧参考'}
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-neutral-500">镜头 {idx + 1}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-neutral-800 text-neutral-400 rounded">
            {cameraAngleLabels[shot.cameraAngle]}
          </span>
        </div>

        {/* 可编辑描述 */}
        {editingField === 'description' ? (
          <input
            ref={descInputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveDescription}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveDescription();
              if (e.key === 'Escape') setEditingField(null);
            }}
            className="w-full px-2 py-1 text-sm bg-neutral-800 border border-neutral-600 rounded text-white focus:outline-none focus:border-blue-500"
          />
        ) : (
          <p
            onClick={startEditDescription}
            className="text-sm text-neutral-300 line-clamp-2 cursor-text hover:text-white transition-colors"
            title="点击编辑描述"
          >
            {shot.description}
          </p>
        )}

        {/* 可编辑时长 */}
        {editingField === 'duration' ? (
          <input
            ref={durationInputRef}
            type="number"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveDuration}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveDuration();
              if (e.key === 'Escape') setEditingField(null);
            }}
            step="0.5"
            min="0.5"
            className="w-16 px-2 py-0.5 text-xs bg-neutral-800 border border-neutral-600 rounded text-white focus:outline-none focus:border-blue-500"
          />
        ) : (
          <p
            onClick={startEditDuration}
            className="text-xs text-neutral-600 mt-1 cursor-pointer hover:text-neutral-400 transition-colors"
            title="点击编辑时长"
          >
            {shot.duration}s
          </p>
        )}

        {/* 角色参考条 */}
        {characterBadges.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {characterBadges.map((badge, bIdx) => badge && (
              <div key={bIdx} className="flex items-center gap-1 bg-neutral-800 rounded px-1.5 py-0.5">
                {badge.imageUrl && (
                  <img src={badge.imageUrl} alt={badge.name} className="w-4 h-4 rounded object-cover" />
                )}
                <span className="text-[10px] text-white">{badge.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* 拖放角色参考提示 */}
        {characterBadges.length === 0 && (
          <p className="text-[10px] text-neutral-700 mt-1">拖拽角色图到此处添加</p>
        )}

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onSetEditingShotId(shot.id)}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            编辑角色
          </button>
          <button
            onClick={() => onDeleteShot(shot.id)}
            className="text-xs text-red-400 hover:text-red-300"
          >
            删除
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