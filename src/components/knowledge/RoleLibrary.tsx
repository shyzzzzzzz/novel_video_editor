import { useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { Character } from '@/types';

export function RoleLibrary() {
  const { characters, addCharacter, deleteCharacter } = useKnowledgeStore();
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
        <div className="grid grid-cols-2 gap-4">
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
              card: { description, keyExpressions: [] },
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

  const relationshipLabels = {
    ally: { label: '同盟', color: 'bg-green-900 text-green-300' },
    enemy: { label: '敌对', color: 'bg-red-900 text-red-300' },
    family: { label: '家人', color: 'bg-blue-900 text-blue-300' },
    romantic: { label: '恋人', color: 'bg-pink-900 text-pink-300' },
    neutral: { label: '中立', color: 'bg-neutral-700 text-neutral-300' },
  };

  return (
    <div className="bg-neutral-900 rounded-lg overflow-hidden">
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

        {character.relationships.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {character.relationships.map((rel) => {
              const { label, color } = relationshipLabels[rel.type];
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
          {character.card.description && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">形象描述</p>
              <p className="text-sm text-neutral-300">{character.card.description}</p>
            </div>
          )}
          {character.background && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">背景</p>
              <p className="text-sm text-neutral-300">{character.background}</p>
            </div>
          )}
          {character.appearances.length > 0 && (
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
          {character.versions.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">版本快照</p>
              <p className="text-sm text-neutral-400">{character.versions.length} 个快照</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
