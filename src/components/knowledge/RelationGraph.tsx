import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { Character, getCharacterDefaultImage } from '@/types';

const RELATION_COLORS: Record<string, string> = {
  ally: '#22c55e',
  enemy: '#ef4444',
  family: '#3b82f6',
  romantic: '#ec4899',
  neutral: '#6b7280',
};

const RELATION_LABELS: Record<string, string> = {
  ally: '同盟',
  enemy: '敌对',
  family: '家族',
  romantic: '浪漫',
  neutral: '中立',
};

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  character: Character;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  description: string;
}

export function RelationGraph() {
  const { projects, currentProjectId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const characters = project?.characters || [];
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<GraphEdge | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodesRef = useRef<Map<string, GraphNode>>(new Map());

  // Build edges from character relationships
  const edges: GraphEdge[] = useMemo(() => {
    const result: GraphEdge[] = [];
    for (const char of characters) {
      for (const rel of (char.relationships || [])) {
        result.push({
          source: char.id,
          target: rel.targetId,
          type: rel.type,
          description: rel.description,
        });
      }
    }
    return result;
  }, [characters]);

  // Initialize nodes with random positions
  const nodes: GraphNode[] = useMemo(() => {
    const existing = nodesRef.current;
    return characters.map((char) => {
      const existingNode = existing.get(char.id);
      if (existingNode) return existingNode;
      const angle = Math.random() * 2 * Math.PI;
      const radius = 150 + Math.random() * 100;
      const node: GraphNode = {
        id: char.id,
        name: char.name,
        x: 400 + radius * Math.cos(angle),
        y: 300 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        character: char,
      };
      nodesRef.current.set(char.id, node);
      return node;
    });
  }, [characters]);

  // Force simulation tick
  useEffect(() => {
    if (characters.length === 0) return;

    const alpha = 0.1;
    const repulsion = 3000;
    const attraction = 0.03;
    const centering = 0.02;
    const damping = 0.85;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      let fx = 0, fy = 0;

      // Repulsion between all nodes
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const other = nodes[j];
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        fx += (dx / dist) * repulsion / (dist * dist);
        fy += (dy / dist) * repulsion / (dist * dist);
      }

      // Attraction along edges
      for (const edge of edges) {
        let other: GraphNode | undefined;
        if (edge.source === node.id) other = nodes.find((n) => n.id === edge.target);
        if (edge.target === node.id) other = nodes.find((n) => n.id === edge.source);
        if (!other) continue;
        const dx = other.x - node.x;
        const dy = other.y - node.y;
        fx += dx * attraction;
        fy += dy * attraction;
      }

      // Centering force
      fx += (400 - node.x) * centering;
      fy += (300 - node.y) * centering;

      node.vx = (node.vx + fx * alpha) * damping;
      node.vy = (node.vy + fy * alpha) * damping;
      node.x += node.vx;
      node.y += node.vy;
      node.x = Math.max(50, Math.min(750, node.x));
      node.y = Math.max(50, Math.min(550, node.y));
    }

    // Sync back to ref
    for (const node of nodes) {
      nodesRef.current.set(node.id, node);
    }
  }, [characters.length, nodes, edges]);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setDraggedNode(nodeId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !draggedNode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
    const y = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;
    const node = nodesRef.current.get(draggedNode);
    if (node) {
      node.x = x;
      node.y = y;
      node.vx = 0;
      node.vy = 0;
    }
  }, [isDragging, draggedNode, viewBox]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedNode(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = ((e.clientX - rect.left) / rect.width) * viewBox.w + viewBox.x;
    const mouseY = ((e.clientY - rect.top) / rect.height) * viewBox.h + viewBox.y;
    setViewBox((prev) => ({
      x: mouseX - (mouseX - prev.x) * scale,
      y: mouseY - (mouseY - prev.y) * scale,
      w: prev.w * scale,
      h: prev.h * scale,
    }));
  }, [viewBox]);

  const selectedCharacter = selectedNode
    ? characters.find((c) => c.id === selectedNode)
    : null;

  if (characters.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <p className="mb-2">暂无角色关系</p>
          <p className="text-xs">添加角色并建立关系后，关系图谱将自动生成</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 图谱区域 */}
      <div
        className="flex-1 relative"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          onWheel={handleWheel}
          onClick={() => setSelectedNode(null)}
        >
          {/* 边 */}
          {edges.map((edge, idx) => {
            const source = nodesRef.current.get(edge.source);
            const target = nodesRef.current.get(edge.target);
            if (!source || !target) return null;
            const isHovered = hoveredEdge === edge;
            return (
              <g key={idx}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isHovered ? (RELATION_COLORS[edge.type] ?? RELATION_COLORS.neutral) : `${RELATION_COLORS[edge.type] ?? RELATION_COLORS.neutral}60`}
                  strokeWidth={isHovered ? 2 : 1}
                  onMouseEnter={() => setHoveredEdge(edge)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  className="cursor-pointer"
                />
                {/* 关系标签 */}
                {isHovered && (
                  <text
                    x={(source.x + target.x) / 2}
                    y={(source.y + target.y) / 2 - 8}
                    textAnchor="middle"
                    className="text-[10px] fill-neutral-400 pointer-events-none"
                  >
                    {RELATION_LABELS[edge.type] ?? '中立'}
                  </text>
                )}
              </g>
            );
          })}

          {/* 节点 */}
          {nodes.map((node) => {
            const isSelected = selectedNode === node.id;
            const char = node.character;
            const totalRelations = char.relationships?.length ?? 0;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNode(node.id);
                }}
                className="cursor-pointer"
              >
                {/* 外圈 */}
                <circle
                  r={isSelected ? 28 : 24}
                  fill={isSelected ? '#3b82f6' : '#1f2937'}
                  stroke={isSelected ? '#60a5fa' : '#374151'}
                  strokeWidth={isSelected ? 3 : 2}
                />
                {/* 头像占位 */}
                {getCharacterDefaultImage(char.card) ? (
                  <clipPath id={`clip-${node.id}`}>
                    <circle r={20} />
                  </clipPath>
                ) : null}
                {getCharacterDefaultImage(char.card) ? (
                  <image
                    href={getCharacterDefaultImage(char.card)!}
                    x={-20}
                    y={-20}
                    width={40}
                    height={40}
                    clipPath={`url(#clip-${node.id})`}
                  />
                ) : (
                  <text
                    textAnchor="middle"
                    dy="0.35em"
                    className="text-lg fill-white pointer-events-none"
                  >
                    {node.name.slice(0, 1)}
                  </text>
                )}
                {/* 关系数量 */}
                {totalRelations > 0 && (
                  <circle
                    cx={18}
                    cy={-18}
                    r={9}
                    fill={totalRelations > 3 ? '#f59e0b' : '#6b7280'}
                  />
                )}
                {totalRelations > 0 && (
                  <text
                    x={18}
                    y={-18}
                    textAnchor="middle"
                    dy="0.35em"
                    className="text-[10px] fill-white pointer-events-none font-bold"
                  >
                    {totalRelations}
                  </text>
                )}
                {/* 名称 */}
                <text
                  y={38}
                  textAnchor="middle"
                  className="text-xs fill-neutral-300 pointer-events-none"
                >
                  {node.name.length > 10 ? node.name.slice(0, 10) + '…' : node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 图例 */}
        <div className="absolute top-3 left-3 bg-neutral-900/90 rounded-lg p-3">
          <p className="text-xs text-neutral-400 mb-2">关系类型</p>
          <div className="space-y-1">
            {Object.entries(RELATION_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-4 h-0.5 rounded"
                  style={{ backgroundColor: RELATION_COLORS[type] }}
                />
                <span className="text-xs text-neutral-300">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 操作提示 */}
        <div className="absolute bottom-3 left-3 bg-neutral-900/90 rounded-lg p-2">
          <p className="text-[10px] text-neutral-500">拖拽节点 · 滚轮缩放 · 点击查看详情</p>
        </div>
      </div>

      {/* 右侧详情面板 */}
      {selectedCharacter && (
        <div className="w-72 border-l border-neutral-800 bg-neutral-900/95 overflow-auto">
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center text-xl text-neutral-400">
                {getCharacterDefaultImage(selectedCharacter.card) ? (
                  <img src={getCharacterDefaultImage(selectedCharacter.card)!} alt={selectedCharacter.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  selectedCharacter.name.slice(0, 1)
                )}
              </div>
              <div>
                <h4 className="text-white font-medium">{selectedCharacter.name}</h4>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {selectedCharacter.relationships?.length ?? 0} 条关系
                </p>
              </div>
            </div>

            {selectedCharacter.personality && (
              <div className="mb-3">
                <p className="text-xs text-neutral-500 mb-1">性格</p>
                <p className="text-sm text-neutral-300">{selectedCharacter.personality}</p>
              </div>
            )}

            {selectedCharacter.background && (
              <div className="mb-3">
                <p className="text-xs text-neutral-500 mb-1">背景</p>
                <p className="text-sm text-neutral-300">{selectedCharacter.background}</p>
              </div>
            )}

            {(selectedCharacter.relationships?.length ?? 0) > 0 && (
              <div>
                <p className="text-xs text-neutral-500 mb-2">关系列表</p>
                <div className="space-y-2">
                  {selectedCharacter.relationships.map((rel, idx) => {
                    const targetChar = characters.find((c) => c.id === rel.targetId);
                    return (
                      <div
                        key={idx}
                        className="bg-neutral-800 rounded p-2"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white">{targetChar?.name || '未知'}</span>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: `${RELATION_COLORS[rel.type] ?? RELATION_COLORS.neutral}20`,
                              color: RELATION_COLORS[rel.type] ?? RELATION_COLORS.neutral,
                            }}
                          >
                            {RELATION_LABELS[rel.type] ?? '中立'}
                          </span>
                        </div>
                        {rel.description && (
                          <p className="text-xs text-neutral-500">{rel.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
