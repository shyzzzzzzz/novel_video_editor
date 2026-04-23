import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Character, getCharacterDefaultImage } from '@/types';
import { generateText } from '@/lib/api-client';
import { getSkillSysprompt } from '@/stores/settingsStore';

export function RoleLibrary() {
  const { projects, currentProjectId, addCharacter, deleteCharacter } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const characters = project?.characters || [];
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">角色库 ({characters.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          {showAddForm ? '取消' : '+ 新增角色'}
        </button>
      </div>

      {showAddForm && (
        <AddCharacterForm
          onAdd={(character) => {
            addCharacter(character);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {characters.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无角色</p>
          <p className="text-xs mt-1">从小说同步或手动添加开始</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onDelete={() => deleteCharacter(character.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddCharacterForm({
  onAdd,
  onCancel,
}: {
  onAdd: (c: Omit<Character, 'id' | 'appearances' | 'versions' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [personality, setPersonality] = useState('');

  return (
    <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="角色名"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="形象描述（用于AI生成）"
        rows={2}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 resize-none"
      />
      <input
        type="text"
        value={personality}
        onChange={(e) => setPersonality(e.target.value)}
        placeholder="性格特征"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd({
              name,
              card: { images: [], defaultImageIndex: 0, description, keyExpressions: [] },
              personality,
              background: '',
              arc: { chapters: {} },
              relationships: [],
            });
          }}
          className="px-4 py-2 bg-white text-black rounded hover:bg-neutral-200"
        >
          添加
        </button>
        <button onClick={onCancel} className="px-4 py-2 bg-neutral-700 text-white rounded hover:bg-neutral-600">
          取消
        </button>
      </div>
    </div>
  );
}

function CharacterCard({
  character,
  onDelete,
}: {
  character: Character;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [localDescription, setLocalDescription] = useState(character.card?.description || '');
  const [generatingText, setGeneratingText] = useState(false);
  const [userInstruction, setUserInstruction] = useState('');
  const { updateCharacter } = useProjectStore();

  // 处理三视图上传
  const handleUploadThreeView = (view: 'frontView' | 'sideView' | 'backView') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      const currentCard = character.card!;
      updateCharacter(character.id, {
        card: {
          ...currentCard,
          [view]: dataUrl,
        },
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 处理多图上传（向后兼容）
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;

      const currentCard = character.card!;
      const newImages = [...(currentCard.images || []), dataUrl];
      updateCharacter(character.id, {
        card: {
          images: newImages,
          defaultImageIndex: currentCard.defaultImageIndex ?? 0,
          description: currentCard.description,
          keyExpressions: currentCard.keyExpressions || [],
        },
      });
    };
    reader.readAsDataURL(file);

    // 清空 input，允许重复选择同一文件
    e.target.value = '';
  };

  const handleSaveDescription = () => {
    const currentCard = character.card!;
    updateCharacter(character.id, {
      card: {
        images: currentCard.images || [],
        defaultImageIndex: currentCard.defaultImageIndex ?? 0,
        description: localDescription,
        keyExpressions: currentCard.keyExpressions || [],
        frontView: currentCard.frontView,
        sideView: currentCard.sideView,
        backView: currentCard.backView,
      },
    });
  };

  const handleGenerateDesc = async () => {
    if (!userInstruction.trim()) return;
    setGeneratingText(true);
    try {
      const sysprompt = getSkillSysprompt('text', 'image_desc') || '请根据以下角色信息生成英文生图描述。';

      // 用户的输入直接作为 user prompt
      const fullPrompt = userInstruction.trim();

      // sysprompt 直接作为 prompt（用户设的就是完整的角色三视图指令）
      const desc = await generateText(fullPrompt, { system: sysprompt });
      setLocalDescription(desc);
      // 自动保存
      const currentCard = character.card!;
      updateCharacter(character.id, {
        card: {
          images: currentCard.images || [],
          defaultImageIndex: currentCard.defaultImageIndex ?? 0,
          description: desc,
          keyExpressions: currentCard.keyExpressions || [],
        },
      });
    } catch (err) {
      console.error('生成描述失败:', err);
    } finally {
      setGeneratingText(false);
    }
  };

  const relationshipLabels = {
    ally: { label: '同盟', color: 'bg-green-900 text-green-300' },
    enemy: { label: '敌对', color: 'bg-red-900 text-red-300' },
    family: { label: '家人', color: 'bg-blue-900 text-blue-300' },
    romantic: { label: '恋人', color: 'bg-pink-900 text-pink-300' },
    neutral: { label: '中立', color: 'bg-neutral-700 text-neutral-300' },
  };

  // 拖拽角色图开始
  const handleImageDragStart = (e: React.DragEvent, imageUrl: string) => {
    e.dataTransfer.setData('character-image', JSON.stringify({
      characterId: character.id,
      characterName: character.name,
      imageUrl,
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // 拖拽整个角色卡（使用默认图）
  const handleCardDragStart = (e: React.DragEvent) => {
    const defaultImg = getCharacterDefaultImage(character.card);
    if (defaultImg) {
      // 如果拖的是角色卡上的图片，不让事件冒泡到卡片的拖拽
      e.dataTransfer.setData('character-image', JSON.stringify({
        characterId: character.id,
        characterName: character.name,
        imageUrl: defaultImg,
      }));
      e.dataTransfer.effectAllowed = 'copy';
    }
  };

  return (
    <div
      className={`bg-neutral-900 rounded-lg overflow-hidden ${expanded ? 'col-span-2' : ''}`}
      draggable={!!getCharacterDefaultImage(character.card)}
      onDragStart={handleCardDragStart}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-white font-medium">{character.name}</h4>
            <p className="text-xs text-neutral-500 mt-0.5">{character.personality || '暂无性格描述'}</p>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-1 text-xs bg-neutral-800 text-neutral-400 rounded hover:bg-neutral-700"
            >
              {expanded ? '收起' : '展开'}
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800"
            >
              删除
            </button>
          </div>
        </div>

        {(character.relationships?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {character.relationships.map((rel) => {
              const { label, color } = relationshipLabels[rel.type] ?? relationshipLabels.neutral;
              return (
                <span key={rel.targetId} className={`px-1.5 py-0.5 text-[10px] rounded ${color}`}>
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-neutral-800 pt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-neutral-500">形象描述</p>
              <button
                onClick={handleGenerateDesc}
                disabled={generatingText}
                className="px-2 py-0.5 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {generatingText ? '生成中...' : '生成描述'}
              </button>
            </div>
            <input
              type="text"
              value={userInstruction}
              onChange={(e) => setUserInstruction(e.target.value)}
              placeholder="输入生图描述内容，如：一位身穿古装的年轻女子，剑眉星目，英姿飒爽..."
              className="w-full px-3 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-white placeholder-neutral-600 text-xs mb-2 focus:outline-none focus:border-neutral-500"
            />
            <textarea
              value={localDescription}
              onChange={(e) => setLocalDescription(e.target.value)}
              onBlur={handleSaveDescription}
              placeholder="手动输入，或点击上方「生成描述」让 AI 根据角色信息生成..."
              rows={3}
              className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500 resize-none text-sm"
            />
          </div>

          {/* 三视图上传 */}
          <div>
            <p className="text-xs text-neutral-500 mb-2">角色三视图</p>
            <div className="grid grid-cols-3 gap-2">
              {(['frontView', 'sideView', 'backView'] as const).map((view) => {
                const labels = { frontView: '正面', sideView: '侧面', backView: '背面' };
                const viewImage = character.card[view];
                return (
                  <div key={view} className="relative">
                    <div className="text-[10px] text-neutral-500 text-center mb-1">{labels[view]}</div>
                    <label
                      className={`block w-full aspect-square rounded cursor-pointer overflow-hidden bg-neutral-800 border-2 transition-colors ${
                        viewImage ? 'border-neutral-700 hover:border-neutral-500' : 'border-dashed border-neutral-600 hover:border-neutral-500'
                      }`}
                    >
                      {viewImage ? (
                        <img
                          src={viewImage}
                          alt={labels[view]}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600">
                          <span className="text-lg">+</span>
                          <span className="text-[10px]">上传</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadThreeView(view)}
                        className="hidden"
                      />
                    </label>
                    {viewImage && (
                      <button
                        onClick={() => {
                          const currentCard = character.card!;
                          updateCharacter(character.id, {
                            card: { ...currentCard, [view]: undefined },
                          });
                        }}
                        className="absolute top-4 right-1 w-4 h-4 bg-red-600 text-white text-[10px] rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100"
                        title="删除"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 多图展示（向后兼容） */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-neutral-500">更多图片（{character.card.images?.length || 0}张）</p>
              <label className="px-2 py-0.5 text-xs bg-green-700 text-white rounded hover:bg-green-600 cursor-pointer">
                + 上传
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  className="hidden"
                />
              </label>
            </div>
            {character.card.images && character.card.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {character.card.images.map((img, idx) => (
                  <div
                    key={idx}
                    className={`relative group cursor-grab active:cursor-grabbing ${idx === character.card.defaultImageIndex ? 'ring-2 ring-blue-500' : ''}`}
                    draggable
                    onDragStart={(e) => handleImageDragStart(e, img)}
                  >
                    <img
                      src={img}
                      alt={`${character.name} ${idx + 1}`}
                      className="w-full h-20 object-cover rounded bg-neutral-800"
                    />
                    {idx === character.card.defaultImageIndex && (
                      <span className="absolute top-1 left-1 bg-blue-600 text-white text-[10px] px-1 rounded">默认</span>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newCard = { ...character.card, defaultImageIndex: idx };
                          updateCharacter(character.id, { card: newCard });
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-500"
                        title="设为默认"
                      >
                        默认
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newImages = character.card.images.filter((_, i) => i !== idx);
                          const newDefaultIndex = idx <= character.card.defaultImageIndex
                            ? Math.max(0, character.card.defaultImageIndex - 1)
                            : character.card.defaultImageIndex;
                          updateCharacter(character.id, {
                            card: { ...character.card, images: newImages, defaultImageIndex: newDefaultIndex },
                          });
                        }}
                        className="px-1.5 py-0.5 text-[10px] bg-red-600 text-white rounded hover:bg-red-500"
                        title="删除"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-600 text-center py-2">暂无额外图片</p>
            )}
          </div>

          {character.background && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">背景</p>
              <p className="text-sm text-neutral-300">{character.background}</p>
            </div>
          )}
          {(character.appearances?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">出场章节</p>
              <div className="flex flex-wrap gap-1">
                {character.appearances.map((app) => (
                  <span key={app.chapterId} className="px-2 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
                    {app.chapterTitle}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(character.versions?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">版本快照</p>
              <p className="text-sm text-neutral-400">{character.versions.length} 个快照</p>
            </div>
          )}

          {/* 拖拽提示 */}
          <div className="text-center">
            <p className="text-[10px] text-neutral-600">拖拽角色图到分镜镜头可直接添加角色参考</p>
          </div>
        </div>
      )}
    </div>
  );
}