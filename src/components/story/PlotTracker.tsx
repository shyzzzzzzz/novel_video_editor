import { useState, useMemo } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { PlotLine } from '@/types';

type StatusFilter = 'all' | 'active' | 'resolved' | 'forgotten';

export function PlotTracker() {
  const { projects, currentProjectId, currentNovelId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) || null;
  const novel = project?.novels.find((n) => n.id === currentNovelId) || null;
  const plotLines = project?.plotLines || [];
  const chapters = novel?.chapters || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');

  const filteredPlotLines = useMemo(() => {
    return plotLines.filter((p) => {
      if (statusFilter === 'all') return true;
      if (statusFilter === 'forgotten') return p.status === 'forgotten';
      return p.status === statusFilter;
    });
  }, [plotLines, statusFilter]);

  const selected = plotLines.find((p) => p.id === selectedId);

  // 统计遗忘的伏笔（超过50章未回收）
  const forgottenCount = useMemo(() => {
    if (!chapters.length) return 0;
    const maxChapter = Math.max(...chapters.map((c) => c.order));
    return plotLines.filter((p) => {
      if (p.status !== 'active') return false;
      const foreshadows = p.foreshadowNodes || [];
      if (foreshadows.length === 0) return false;
      const lastForeshadowChapter = Math.max(...foreshadows.map((f) => {
        const ch = chapters.find((c) => c.id === f.chapterId);
        return ch?.order || 0;
      }));
      return maxChapter - lastForeshadowChapter > 50;
    }).length;
  }, [plotLines, chapters]);

  const getChapterTitle = (chapterId?: string) => {
    if (!chapterId) return '未知';
    const ch = chapters.find((c) => c.id === chapterId);
    return ch?.title || chapterId.slice(0, 8);
  };

  const getChapterOrder = (chapterId?: string) => {
    if (!chapterId) return 0;
    const ch = chapters.find((c) => c.id === chapterId);
    return ch?.order || 0;
  };

  const getHealthColor = (health?: number) => {
    if (health === undefined) return 'bg-neutral-600';
    if (health >= 80) return 'bg-jade-500';
    if (health >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (plotLines.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500">
        <div className="text-4xl mb-4 opacity-30">◈</div>
        <p className="text-sm">暂无伏笔数据</p>
        <p className="text-xs mt-1">伏笔将在知识库同步时自动创建</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 顶部栏 */}
      <div className="p-4 border-b border-white/10 shrink-0">
        {forgottenCount > 0 && (
          <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <span className="text-red-400">⚠</span>
            <span className="text-sm text-red-300">{forgottenCount} 条伏笔超过50章未回收</span>
          </div>
        )}

        <div className="flex gap-2">
          {(['all', 'active', 'resolved', 'forgotten'] as StatusFilter[]).map((f) => {
            const count = f === 'all' ? plotLines.length :
                         f === 'active' ? plotLines.filter(p => p.status === 'active').length :
                         f === 'resolved' ? plotLines.filter(p => p.status === 'resolved').length :
                         plotLines.filter(p => p.status === 'forgotten').length;
            return (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  statusFilter === f
                    ? 'bg-violet-500/20 text-violet-400'
                    : 'text-neutral-600 hover:text-neutral-400'
                }`}
              >
                {f === 'all' ? '全部' :
                 f === 'active' ? '进行中' :
                 f === 'resolved' ? '已回收' : '已遗忘'} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {filteredPlotLines.map((plotLine) => (
            <PlotLineCard
              key={plotLine.id}
              plotLine={plotLine}
              isSelected={selectedId === plotLine.id}
              onClick={() => setSelectedId(plotLine.id)}
              getChapterTitle={getChapterTitle}
              getChapterOrder={getChapterOrder}
              getHealthColor={getHealthColor}
              chapters={chapters}
            />
          ))}
        </div>
      </div>

      {/* 详情面板 */}
      {selected && (
        <div className="w-96 border-l border-white/10 bg-[#0d0e12] shrink-0 overflow-auto">
          <PlotLineDetail
            plotLine={selected}
            getChapterTitle={getChapterTitle}
            getChapterOrder={getChapterOrder}
            getHealthColor={getHealthColor}
          />
        </div>
      )}
    </div>
  );
}

function PlotLineCard({
  plotLine,
  isSelected,
  onClick,
  getChapterTitle,
  getChapterOrder,
  getHealthColor,
  chapters,
}: {
  plotLine: PlotLine;
  isSelected: boolean;
  onClick: () => void;
  getChapterTitle: (id?: string) => string;
  getChapterOrder: (id?: string) => number;
  getHealthColor: (health?: number) => string;
  chapters: { id: string; title: string; order: number }[];
}) {
  const foreshadows = plotLine.foreshadowNodes || [];
  const health = plotLine.health ?? 50;

  const getStatusConfig = (status: PlotLine['status']) => {
    switch (status) {
      case 'active': return { label: '进行中', className: 'text-amber-400', dot: 'bg-amber-400' };
      case 'resolved': return { label: '已回收', className: 'text-jade-400', dot: 'bg-jade-400' };
      case 'abandoned': return { label: '已放弃', className: 'text-neutral-500', dot: 'bg-neutral-500' };
      case 'forgotten': return { label: '已遗忘', className: 'text-red-400', dot: 'bg-red-400' };
    }
  };

  const statusConfig = getStatusConfig(plotLine.status);

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-lg border text-left transition-all duration-200 ${
        isSelected
          ? 'bg-violet-500/10 border-violet-500/30'
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
          <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
            {plotLine.title}
          </span>
        </div>
        <span className={`text-xs ${statusConfig.className}`}>{statusConfig.label}</span>
      </div>

      {/* 健康度进度条 */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-neutral-600">伏笔健康度</span>
          <span className={health >= 80 ? 'text-jade-400' : health >= 50 ? 'text-amber-400' : 'text-red-400'}>
            {health}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${getHealthColor(health)}`}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>

      {/* 伏笔节点预览 */}
      <div className="space-y-1">
        {foreshadows.slice(0, 3).map((f, i) => (
          <div key={f.id} className="flex items-center gap-2 text-xs">
            <span className="text-violet-400/60">◈</span>
            <span className="text-neutral-500">{getChapterTitle(f.chapterId)}</span>
            <span className="text-neutral-600 truncate flex-1">{f.content.slice(0, 20)}</span>
          </div>
        ))}
        {foreshadows.length > 3 && (
          <div className="text-xs text-neutral-600 pl-4">+{foreshadows.length - 3} 更多</div>
        )}
        {foreshadows.length === 0 && plotLine.resolution && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-jade-400">◉</span>
            <span className="text-neutral-500">已回收于 {getChapterTitle(plotLine.resolution.chapterId)}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function PlotLineDetail({
  plotLine,
  getChapterTitle,
  getChapterOrder,
  getHealthColor,
}: {
  plotLine: PlotLine;
  getChapterTitle: (id?: string) => string;
  getChapterOrder: (id?: string) => number;
  getHealthColor: (health?: number) => string;
}) {
  const foreshadows = plotLine.foreshadowNodes || [];
  const health = plotLine.health ?? 50;

  const sortedForeshadows = [...foreshadows].sort((a, b) =>
    getChapterOrder(a.chapterId) - getChapterOrder(b.chapterId)
  );

  return (
    <div className="p-4">
      <h3 className="text-lg font-medium text-white mb-4">{plotLine.title}</h3>

      {/* 健康度 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-neutral-500">伏笔健康度</span>
          <span className={health >= 80 ? 'text-jade-400' : health >= 50 ? 'text-amber-400' : 'text-red-400'}>
            {health}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${getHealthColor(health)}`}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>

      {/* 描述 */}
      {plotLine.description && (
        <div className="mb-6">
          <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-2">剧情线描述</h4>
          <p className="text-sm text-neutral-400 leading-relaxed">{plotLine.description}</p>
        </div>
      )}

      {/* 伏笔节点 */}
      <div>
        <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-3">
          伏笔节点 ({foreshadows.length})
        </h4>

        {sortedForeshadows.length === 0 ? (
          <div className="text-center py-6 text-neutral-600">
            <p className="text-sm">暂无伏笔节点</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedForeshadows.map((foreshadow, index) => (
              <div key={foreshadow.id} className="relative pl-6 pb-3 border-l border-violet-500/30 last:pb-0">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-violet-500" />
                <div className="text-xs text-neutral-500 mb-1">{getChapterTitle(foreshadow.chapterId)}</div>
                <div className="text-sm text-neutral-300 mb-1">{foreshadow.content}</div>
                {foreshadow.hint && (
                  <div className="text-xs text-violet-400/70 mt-1">
                    <span className="text-neutral-600">暗示:</span> {foreshadow.hint}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 回收节点 */}
      {plotLine.resolution && (
        <div className="mt-6">
          <h4 className="text-xs text-neutral-500 uppercase tracking-wider mb-3">回收节点</h4>
          <div className="p-3 rounded-lg bg-jade-500/10 border border-jade-500/20">
            <div className="text-xs text-jade-400 mb-1">{getChapterTitle(plotLine.resolution.chapterId)}</div>
            <div className="text-sm text-neutral-300">{plotLine.resolution.content}</div>
            {plotLine.resolution.effectiveness && (
              <div className="text-xs text-neutral-600 mt-1">
                效果评分: {'★'.repeat(plotLine.resolution.effectiveness)}{'☆'.repeat(5 - plotLine.resolution.effectiveness)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
