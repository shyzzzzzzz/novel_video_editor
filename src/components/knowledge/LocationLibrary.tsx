import { useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { Location } from '@/types';

export function LocationLibrary() {
  const { locations, addLocation, deleteLocation } = useKnowledgeStore();
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-white">地点库 ({locations.length})</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3 py-1.5 text-sm bg-white text-black rounded hover:bg-neutral-200"
        >
          {showAddForm ? '取消' : '+ 新增地点'}
        </button>
      </div>

      {showAddForm && (
        <AddLocationForm
          onAdd={(location) => {
            addLocation(location);
            setShowAddForm(false);
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {locations.length === 0 ? (
        <div className="text-center text-neutral-500 py-12">
          <p>暂无地点</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onDelete={() => deleteLocation(location.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AddLocationForm({
  onAdd,
  onCancel,
}: {
  onAdd: (l: Omit<Location, 'id' | 'appearances' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<Location['type']>('interior');
  const [atmosphere, setAtmosphere] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="p-4 bg-neutral-900 rounded-lg mb-4 space-y-3">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="地点名称"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as Location['type'])}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white"
      >
        <option value="interior">室内</option>
        <option value="exterior">室外</option>
        <option value="other">其他</option>
      </select>
      <input
        type="text"
        value={atmosphere}
        onChange={(e) => setAtmosphere(e.target.value)}
        placeholder="场景氛围"
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="详细描述"
        rows={2}
        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 resize-none"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {
            if (!name.trim()) return;
            onAdd({ name, type, atmosphere, description });
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

function LocationCard({
  location,
  onDelete,
}: {
  location: Location;
  onDelete: () => void;
}) {
  const typeLabels = {
    interior: { label: '室内', color: 'bg-blue-900 text-blue-300' },
    exterior: { label: '室外', color: 'bg-green-900 text-green-300' },
    other: { label: '其他', color: 'bg-neutral-700 text-neutral-300' },
  };

  const { label, color } = typeLabels[location.type];

  return (
    <div className="bg-neutral-900 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-medium">{location.name}</h4>
          <span className={`inline-block px-1.5 py-0.5 text-[10px] rounded mt-1 ${color}`}>
            {label}
          </span>
        </div>
        <button
          onClick={onDelete}
          className="px-2 py-1 text-xs bg-red-900 text-red-300 rounded hover:bg-red-800"
        >
          删除
        </button>
      </div>
      {location.atmosphere && (
        <p className="text-xs text-neutral-400 mt-2">氛围: {location.atmosphere}</p>
      )}
      {location.description && (
        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{location.description}</p>
      )}
    </div>
  );
}
