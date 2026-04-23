import { useState, useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Character, CharacterFate, ArcNode } from '@/types';

type ImportanceFilter = 'all' | 'main' | 'supporting' | 'minor';

export function FateBoard() {
  const { projects, currentProjectId, currentNovelId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) || null;
  const novel = project?.novels.find((n) => n.id === currentNovelId) || null;
  const characters = project?.characters || [];
  const chapters = novel?.chapters || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importanceFilter, setImportanceFilter] = useState<ImportanceFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      if (importanceFilter !== 'all' && c.importance !== importanceFilter) return false;
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [characters, importanceFilter, searchQuery]);

  const selected = characters.find((c) => c.id === selectedId);

  const getChapterTitle = (chapterId?: string) => {
    if (!chapterId) return '未知';
    const ch = chapters.find((c) => c.id === chapterId);
    return ch?.title || chapterId.slice(0, 8);
  };

  const getStatusColor = (status?: CharacterFate['status']) => {
    switch (status) {
      case 'active': return 'text-amber-400';
      case 'completed': return 'text-jade-400';
      case 'abandoned': return 'text-neutral-500';
      default: return 'text-neutral-500';
    }
  };

  const getImportanceColor = (importance?: string) => {
    switch (importance) {
      case 'main': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'supporting': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      case 'minor': return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
      default: return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
    }
  };

  if (characters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500">
        <div className="text-4xl mb-4 opacity-30">◇</div>
        <p className="text-sm">暂无角色数据</p>
        <p className="text-xs mt-1">请先在知识库中添加角色</p>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 左侧角色列表 */}
      <div className="w-80 border-r border-white/10 flex flex-col shrink-0">
        {/* 筛选栏 */}
        <div className="p-3 border-b border-white/10 space-y-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索角色..."
            className="w-full px-3 py-2 text-sm bg-neutral-900 border border-white/10 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/50"
          />
          <div className="flex gap-1">
            {(['all', 'main', 'supporting', 'minor'] as ImportanceFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setImportanceFilter(f)}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  importanceFilter === f
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-neutral-600 hover:text-neutral-400'
                }`}
              >
                {f === 'all' ? '全部' : f === 'main' ? '主线' : f === 'supporting' ? '支线' : '配角'}
              </button>
            ))}
          </div>
        </div>

        {/* 角色列表 */}
        <div className="flex-1 overflow-auto">
          {filteredCharacters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              isSelected={selectedId === char.id}
              onClick={() => setSelectedId(char.id)}
              getStatusColor={getStatusColor}
              getImportanceColor={getImportanceColor}
            />
          ))}
        </div>
      </div>

      {/* 右侧详情面板 */}
      <div className="flex-1 overflow-auto">
        {selected ? (
          <FateDetail
            character={selected}
            chapters={chapters}
            getChapterTitle={getChapterTitle}
            getStatusColor={getStatusColor}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-neutral-600">
            <div className="text-center">
              <div className="text-3xl mb-2 opacity-30">☆</div>
              <p className="text-sm">选择一个角色查看命运轨迹</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterCard({
  character,
  isSelected,
  onClick,
  getStatusColor,
  getImportanceColor,
}: {
  character: Character;
  isSelected: boolean;
  onClick: () => void;
  getStatusColor: (status?: CharacterFate['status']) => string;
  getImportanceColor: (importance?: string) => string;
}) {
  const arc = character.fate?.arc || [];

  return (
    <button
      onClick={onClick}
      className={`w-full p-3 text-left border-b border-white/5 transition-all duration-200 ${
        isSelected
          ? 'bg-amber-500/10 border-l-2 border-l-amber-500'
          : 'hover:bg-white/5 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
          {character.name}
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded border ${getImportanceColor(character.importance)}`}>
          {character.importance === 'main' ? '主线' : character.importance === 'supporting' ? '支线' : '配角'}
        </span>
      </div>

      {character.tagline && (
        <p className="text-xs text-neutral-600 mb-2 truncate">{character.tagline}</p>
      )}

      <div className="flex items-center gap-3 text-xs">
        <span className={getStatusColor(character.fate?.status)}>
          {character.fate?.status === 'active' ? '进行中' :
           character.fate?.status === 'completed' ? '已完成' :
           character.fate?.status === 'abandoned' ? '已放弃' : '未开始'}
        </span>
        <span className="text-neutral-600">
          {arc.length} 个命运节点
        </span>
      </div>

      {/* 简单命运弧线可视化 */}
      {arc.length > 0 && (
        <div className="mt-2 flex gap-0.5">
          {arc.slice(0, 8).map((node, i) => (
            <div
              key={node.id}
              className={`h-1 flex-1 rounded-full ${
                node.type === 'turning_point' ? 'bg-amber-500' :
                node.type === 'foreshadow' ? 'bg-violet-500' :
                node.type === 'resolution' ? 'bg-jade-500' :
                node.type === 'death' ? 'bg-red-500' :
                'bg-neutral-600'
              }`}
              title={`${node.chapterTitle}: ${node.content.slice(0, 20)}`}
            />
          ))}
          {arc.length > 8 && <span className="text-xs text-neutral-600">+{arc.length - 8}</span>}
        </div>
      )}
    </button>
  );
}

function FateDetail({
  character,
  chapters,
  getChapterTitle,
  getStatusColor,
}: {
  character: Character;
  chapters: { id: string; title: string }[];
  getChapterTitle: (id?: string) => string;
  getStatusColor: (status?: CharacterFate['status']) => string;
}) {
  const arc = character.fate?.arc || [];

  const getArcNodeIcon = (type: ArcNode['type']) => {
    switch (type) {
      case 'appearance': return '●';
      case 'turning_point': return '◆';
      case 'foreshadow': return '◈';
      case 'resolution': return '◉';
      case 'death': return '✕';
    }
  };

  const getArcNodeColor = (type: ArcNode['type']) => {
    switch (type) {
      case 'appearance': return 'text-neutral-400';
      case 'turning_point': return 'text-amber-400';
      case 'foreshadow': return 'text-violet-400';
      case 'resolution': return 'text-jade-400';
      case 'death': return 'text-red-400';
    }
  };

  return (
    <div className="p-6">
      {/* 角色头部信息 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-white mb-1">{character.name}</h2>
          {character.tagline && (
            <p className="text-sm text-amber-400/80">{character.tagline}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${getStatusColor(character.fate?.status)}`}>
            {character.fate?.status === 'active' ? '命运进行中' :
             character.fate?.status === 'completed' ? '命运已完成' :
             character.fate?.status === 'abandoned' ? '命运已放弃' : '命运未开始'}
          </span>
        </div>
      </div>

      {/* 基础信息 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-neutral-500 mb-1">重要性</div>
          <div className="text-sm text-white">
            {character.importance === 'main' ? '主线角色' :
             character.importance === 'supporting' ? '支线角色' : '配角'}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-neutral-500 mb-1">首次登场</div>
          <div className="text-sm text-white">{getChapterTitle(character.firstAppearanceChapterId)}</div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-neutral-500 mb-1">最近出现</div>
          <div className="text-sm text-white">{getChapterTitle(character.lastAppearanceChapterId)}</div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-neutral-500 mb-1">命运节点</div>
          <div className="text-sm text-white">{arc.length} 个</div>
        </div>
      </div>

      {/* 性格与背景 */}
      {character.personality && (
        <div className="mb-6">
          <h3 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">性格特征</h3>
          <p className="text-sm text-neutral-300 leading-relaxed">{character.personality}</p>
        </div>
      )}

      {/* 命运轨迹 */}
      <div>
        <h3 className="text-xs text-neutral-500 uppercase tracking-wider mb-3">命运轨迹</h3>
        {arc.length === 0 ? (
          <div className="text-center py-8 text-neutral-600">
            <p className="text-sm">暂无命运轨迹</p>
            <p className="text-xs mt-1">AI 将自动分析角色发展</p>
          </div>
        ) : (
          <div className="relative">
            {/* 时间线 */}
            <div className="absolute left-[15px] top-0 bottom-0 w-px bg-gradient-to-b from-amber-500/50 via-violet-500/30 to-neutral-800" />

            {/* 节点 */}
            <div className="space-y-4">
              {arc.map((node, index) => (
                <div key={node.id} className="flex items-start gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                    node.type === 'turning_point' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' :
                    node.type === 'foreshadow' ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50' :
                    node.type === 'resolution' ? 'bg-jade-500/20 text-jade-400 border border-jade-500/50' :
                    node.type === 'death' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                    'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}>
                  {getArcNodeIcon(node.type)}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-neutral-500">{getChapterTitle(node.chapterId)}</span>
                      <span className={`text-xs ${getArcNodeColor(node.type)}`}>
                        {node.type === 'appearance' ? '登场' :
                         node.type === 'turning_point' ? '转折' :
                         node.type === 'foreshadow' ? '伏笔' :
                         node.type === 'resolution' ? '回收' : '终局'}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed">{node.content}</p>
                    {node.emotion && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-500">
                        {node.emotion}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
