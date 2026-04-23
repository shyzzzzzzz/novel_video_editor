import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Item } from '@/types';

export function ItemLibrary() {
  const { projects, currentProjectId, addItem, deleteItem } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const items = project?.items || [];
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">物品库 ({items.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          {showAddForm ? '取消' : '+ 新增物品'}
        </button>
      </div>

      {showAddForm && (
        <AddItemForm
          onAdd={(item) => {
            addItem(item);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {items.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无物品</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddItemForm({
  onAdd,
  onCancel,
}: {
  onAdd: (i: Omit<Item, 'id' | 'flow' | 'appearances' | 'versions' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [symbolism, setSymbolism] = useState('');

  return (
    <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="物品名"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="物品描述"
        rows={2}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 resize-none"
      />
      <input
        type="text"
        value={symbolism}
        onChange={(e) => setSymbolism(e.target.value)}
        placeholder="象征意义"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd({ name, description, symbolism });
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

function ItemCard({
  item,
  onDelete,
}: {
  item: Item;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-neutral-900 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-white font-medium">{item.name}</h4>
            <p className="text-xs text-neutral-500 mt-0.5">{item.symbolism || '暂无象征意义'}</p>
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
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-neutral-800 pt-3 space-y-3">
          {item.description && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">描述</p>
              <p className="text-sm text-neutral-300">{item.description}</p>
            </div>
          )}
          {(item.flow?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">流转历史</p>
              <div className="space-y-1">
                {item.flow.map((f, i) => (
                  <div key={i} className="text-sm text-neutral-400">
                    <span className="text-neutral-600">{f.chapterTitle}</span>: {f.event}
                    {f.holderName && <span className="text-neutral-500"> ({f.holderName})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
