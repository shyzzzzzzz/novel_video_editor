import { useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { PlotLine, PlotLineType } from '@/types';

export function PlotLineLibrary() {
  const { plotLines, addPlotLine, deletePlotLine, resolvePlotLine, getUnresolvedPlotLines } =
    useKnowledgeStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterType, setFilterType] = useState<PlotLineType | 'all'>('all');

  const filteredPlotLines =
    filterType === 'all' ? plotLines : plotLines.filter((p) => p.type === filterType);

  const unresolvedCount = getUnresolvedPlotLines().length;

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-medium text-white">情节线 ({plotLines.length})</h3>
          {unresolvedCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-yellow-900 text-yellow-300 rounded">
              {unresolvedCount} 活跃中
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          {showAddForm ? '取消' : '+ 新增'}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'main', 'sub', 'foreshadow', 'suspense'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-2 py-1 text-xs rounded ${
              filterType === type
                ? 'bg-neutral-700 text-white'
                : 'bg-neutral-800 text-neutral-500 hover:text-white'
            }`}
          >
            {type === 'all' ? '全部' : type === 'main' ? '主线' : type === 'sub' ? '支线' : type === 'foreshadow' ? '伏笔' : '悬念'}
          </button>
        ))}
      </div>

      {showAddForm && (
        <AddPlotLineForm
          onAdd={(plotLine) => {
            addPlotLine(plotLine);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {filteredPlotLines.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无情节线</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPlotLines.map((plotLine) => (
            <PlotLineCard
              key={plotLine.id}
              plotLine={plotLine}
              onDelete={() => deletePlotLine(plotLine.id)}
              onResolve={() => resolvePlotLine(plotLine.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddPlotLineForm({
  onAdd,
  onCancel,
}: {
  onAdd: (p: Omit<PlotLine, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<PlotLineType>('main');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as PlotLineType)}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
      >
        <option value="main">主线</option>
        <option value="sub">支线</option>
        <option value="foreshadow">伏笔</option>
        <option value="suspense">悬念</option>
      </select>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="标题"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="描述"
        rows={2}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!title.trim()) return;
            onAdd({
              type,
              title,
              description,
              status: 'active',
              chapters: [],
              relatedCharacterIds: [],
              relatedItemIds: [],
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

function PlotLineCard({
  plotLine,
  onDelete,
  onResolve,
}: {
  plotLine: PlotLine;
  onDelete: () => void;
  onResolve: () => void;
}) {
  const typeConfig = {
    main: { label: '主线', color: 'bg-blue-900 text-blue-300', icon: '📍' },
    sub: { label: '支线', color: 'bg-purple-900 text-purple-300', icon: '🔹' },
    foreshadow: { label: '伏笔', color: 'bg-yellow-900 text-yellow-300', icon: '🎭' },
    suspense: { label: '悬念', color: 'bg-red-900 text-red-300', icon: '❓' },
  };

  const { label, color, icon } = typeConfig[plotLine.type] ?? typeConfig.suspense;

  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span>{icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-white font-medium">{plotLine.title}</h4>
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${color}`}>{label}</span>
              {plotLine.status === 'resolved' && (
                <span className="px-1.5 py-0.5 text-[10px] rounded bg-green-900 text-green-300">
                  已解决
                </span>
              )}
            </div>
            {plotLine.description && (
              <p className="text-xs text-neutral-400 mt-1">{plotLine.description}</p>
            )}
            {(plotLine.chapters?.length ?? 0) > 0 && (
              <p className="text-xs text-neutral-600 mt-1">涉及 {plotLine.chapters.length} 章</p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {plotLine.status !== 'resolved' && (
            <button
              onClick={onResolve}
              className="px-2 py-1 text-xs bg-green-900 text-green-300 rounded hover:bg-green-800"
            >
              解决
            </button>
          )}
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
