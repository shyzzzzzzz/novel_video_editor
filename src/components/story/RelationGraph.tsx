import { useMemo, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Character, Relationship } from '@/types';

type RelationType = 'ally' | 'enemy' | 'family' | 'romantic' | 'neutral';

export function RelationGraph() {
  const { projects, currentProjectId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) || null;
  const characters = project?.characters || [];
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [hoveredRelation, setHoveredRelation] = useState<{ source: string; target: string } | null>(null);

  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId);

  // 构建关系数据
  const relationData = useMemo(() => {
    const nodes = characters.map((c) => ({
      id: c.id,
      name: c.name,
      importance: c.importance || 'minor',
      tagline: c.tagline,
    }));

    const links: { source: string; target: string; type: RelationType; description: string }[] = [];

    characters.forEach((char) => {
      char.relationships.forEach((rel) => {
        // 避免重复添加关系
        if (!links.find((l) =>
          (l.source === rel.targetId && l.target === char.id) ||
          (l.source === char.id && l.target === rel.targetId)
        )) {
          links.push({
            source: char.id,
            target: rel.targetId,
            type: rel.type,
            description: rel.description,
          });
        }
      });
    });

    return { nodes, links };
  }, [characters]);

  const getImportanceSize = (importance?: string) => {
    switch (importance) {
      case 'main': return 48;
      case 'supporting': return 36;
      default: return 24;
    }
  };

  const getRelationColor = (type: RelationType) => {
    switch (type) {
      case 'family': return '#fbbf24'; // amber
      case 'romantic': return '#f472b6'; // pink
      case 'ally': return '#34d399'; // jade
      case 'enemy': return '#ef4444'; // red
      case 'neutral': return '#6b7280'; // gray
    }
  };

  const getRelationLabel = (type: RelationType) => {
    switch (type) {
      case 'family': return '亲情';
      case 'romantic': return '爱情';
      case 'ally': return '同盟';
      case 'enemy': return '敌对';
      case 'neutral': return '中立';
    }
  };

  // 简单布局算法
  const layoutNodes = useMemo(() => {
    const centerX = 300;
    const centerY = 250;
    const radius = 180;

    return relationData.nodes.map((node, index) => {
      // 选中的角色放中心
      if (node.id === selectedCharacterId) {
        return { ...node, x: centerX, y: centerY };
      }

      // 其他角色环形分布
      const angle = (2 * Math.PI * index) / relationData.nodes.length - Math.PI / 2;
      const r = selectedCharacterId ? radius * 0.7 : radius;
      return {
        ...node,
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      };
    });
  }, [relationData.nodes, selectedCharacterId]);

  if (characters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500">
        <div className="text-4xl mb-4 opacity-30">⬡</div>
        <p className="text-sm">暂无角色关系数据</p>
        <p className="text-xs mt-1">请先在知识库中添加角色</p>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 图谱区域 */}
      <div className="flex-1 relative overflow-hidden bg-[#0a0b0f]">
        <svg width="100%" height="100%" viewBox="0 0 600 500">
          {/* 关系连线 */}
          {relationData.links.map((link, i) => {
            const sourceNode = layoutNodes.find((n) => n.id === link.source);
            const targetNode = layoutNodes.find((n) => n.id === link.target);
            if (!sourceNode || !targetNode) return null;

            const isHovered = hoveredRelation?.source === link.source && hoveredRelation?.target === link.target;
            const midX = (sourceNode.x + targetNode.x) / 2;
            const midY = (sourceNode.y + targetNode.y) / 2;

            return (
              <g key={`${link.source}-${link.target}-${i}`}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke={getRelationColor(link.type)}
                  strokeWidth={isHovered ? 2 : 1}
                  strokeOpacity={isHovered ? 0.8 : 0.3}
                  strokeDasharray={link.type === 'neutral' ? '4 4' : 'none'}
                />
                {/* 关系类型标签 */}
                {isHovered && (
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x={-24}
                      y={-10}
                      width={48}
                      height={20}
                      rx={4}
                      fill={getRelationColor(link.type)}
                      fillOpacity={0.2}
                    />
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={getRelationColor(link.type)}
                      fontSize={10}
                    >
                      {getRelationLabel(link.type)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* 节点 */}
          {layoutNodes.map((node) => {
            const size = getImportanceSize(node.importance);
            const isSelected = node.id === selectedCharacterId;
            const character = characters.find((c) => c.id === node.id);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedCharacterId(node.id === selectedCharacterId ? null : node.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* 外圈 */}
                {isSelected && (
                  <circle
                    r={size / 2 + 8}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    strokeOpacity={0.5}
                  />
                )}
                {/* 节点圆 */}
                <circle
                  r={size / 2}
                  fill={node.importance === 'main' ? '#fbbf24' : node.importance === 'supporting' ? '#8b5cf6' : '#374151'}
                  fillOpacity={isSelected ? 1 : 0.7}
                />
                {/* 名称 */}
                <text
                  textAnchor="middle"
                  dy={size / 2 + 16}
                  fill="#f5f5f4"
                  fontSize={12}
                  fontWeight={node.importance === 'main' ? '500' : '400'}
                >
                  {node.name}
                </text>
                {/* 标签 */}
                {node.tagline && (
                  <text
                    textAnchor="middle"
                    dy={size / 2 + 30}
                    fill="#6b7280"
                    fontSize={9}
                  >
                    {node.tagline.slice(0, 10)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* 图例 */}
        <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-xs text-neutral-500 mb-2">关系类型</div>
          <div className="space-y-1">
            {(['family', 'romantic', 'ally', 'enemy', 'neutral'] as RelationType[]).map((type) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-4 h-0.5"
                  style={{
                    backgroundColor: getRelationColor(type),
                    opacity: 0.6,
                  }}
                />
                <span className="text-xs text-neutral-400">{getRelationLabel(type)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 选中角色详情 */}
      {selectedCharacter && (
        <div className="w-72 border-l border-white/10 bg-[#0d0e12] p-4 shrink-0 overflow-auto">
          <h3 className="text-lg font-medium text-white mb-1">{selectedCharacter.name}</h3>
          {selectedCharacter.tagline && (
            <p className="text-sm text-amber-400/80 mb-4">{selectedCharacter.tagline}</p>
          )}

          <div className="mb-4">
            <span className={`text-xs px-2 py-0.5 rounded ${
              selectedCharacter.importance === 'main' ? 'bg-amber-500/20 text-amber-400' :
              selectedCharacter.importance === 'supporting' ? 'bg-violet-500/20 text-violet-400' :
              'bg-neutral-500/20 text-neutral-400'
            }`}>
              {selectedCharacter.importance === 'main' ? '主线' :
               selectedCharacter.importance === 'supporting' ? '支线' : '配角'}
            </span>
          </div>

          {selectedCharacter.personality && (
            <div className="mb-4">
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">性格</div>
              <p className="text-sm text-neutral-400">{selectedCharacter.personality}</p>
            </div>
          )}

          <div>
            <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">关系</div>
            <div className="space-y-2">
              {selectedCharacter.relationships.map((rel, i) => {
                const targetChar = characters.find((c) => c.id === rel.targetId);
                if (!targetChar) return null;
                return (
                  <div
                    key={rel.targetId}
                    className="p-2 rounded bg-white/5 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white">{targetChar.name}</span>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${getRelationColor(rel.type)}20`,
                          color: getRelationColor(rel.type),
                        }}
                      >
                        {getRelationLabel(rel.type)}
                      </span>
                    </div>
                    {rel.description && (
                      <p className="text-xs text-neutral-500">{rel.description}</p>
                    )}
                  </div>
                );
              })}
              {selectedCharacter.relationships.length === 0 && (
                <p className="text-sm text-neutral-600">暂无关系</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
