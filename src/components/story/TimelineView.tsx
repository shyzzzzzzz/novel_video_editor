import { useMemo, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { ChapterPlotSummary } from '@/types';

export function TimelineView() {
  const { projects, currentProjectId, currentNovelId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) || null;
  const novel = project?.novels.find((n) => n.id === currentNovelId) || null;
  const chapters = novel?.chapters || [];
  // TODO: chapterPlotSummaries should also be per-project
  const chapterPlotSummaries = project?.plotLines || [];
  const characters = project?.characters || [];
  const plotLines = project?.plotLines || [];
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  const sortedChapters = useMemo(() => {
    return [...chapters].sort((a, b) => a.order - b.order);
  }, [chapters]);

  const selectedSummary = chapterPlotSummaries.find((s: any) => s.chapterId === selectedChapterId);

  if (chapters.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-neutral-500">
        <div className="text-4xl mb-4 opacity-30">⏳</div>
        <p className="text-sm">暂无章节数据</p>
        <p className="text-xs mt-1">请先在小说页面创建章节</p>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 时间轴 */}
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {sortedChapters.map((chapter, index) => {
            const summary = chapterPlotSummaries.find((s) => s.chapterId === chapter.id);
            const isSelected = selectedChapterId === chapter.id;

            // 找到该章节相关的角色
            const relevantCharacters = summary?.characterAppearances
              ?.map((ap) => characters.find((c) => c.id === ap.characterId))
              .filter(Boolean) || [];

            // 找到该章节相关的伏笔
            const relevantPlotLines = plotLines.filter((p) =>
              p.foreshadowNodes?.some((f) => f.chapterId === chapter.id) ||
              p.resolution?.chapterId === chapter.id
            );

            return (
              <div key={chapter.id} className="flex mb-4">
                {/* 时间线 */}
                <div className="w-16 shrink-0 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center text-xs text-neutral-400">
                    {chapter.order + 1}
                  </div>
                  {index < sortedChapters.length - 1 && (
                    <div className="w-0.5 flex-1 bg-neutral-800 my-1" />
                  )}
                </div>

                {/* 章节内容 */}
                <button
                  onClick={() => setSelectedChapterId(chapter.id)}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all duration-200 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-neutral-300'}`}>
                      {chapter.title || `第${chapter.order + 1}章`}
                    </h3>
                    {summary && (
                      <span className="text-xs text-neutral-600">
                        {summary.mainEvents?.length || 0} 事件
                      </span>
                    )}
                  </div>

                  {/* 章节摘要预览 */}
                  <p className="text-xs text-neutral-500 line-clamp-2 mb-2">
                    {chapter.content?.slice(0, 100) || '暂无内容'}
                  </p>

                  {/* 标签 */}
                  <div className="flex flex-wrap gap-1">
                    {relevantCharacters.slice(0, 3).map((char) => (
                      <span
                        key={char!.id}
                        className="text-xs px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20"
                      >
                        {char!.name}
                      </span>
                    ))}
                    {relevantCharacters.length > 3 && (
                      <span className="text-xs text-neutral-600">+{relevantCharacters.length - 3}</span>
                    )}

                    {relevantPlotLines.slice(0, 2).map((pl) => (
                      <span
                        key={pl.id}
                        className={`text-xs px-1.5 py-0.5 rounded border ${
                          pl.resolution?.chapterId === chapter.id
                            ? 'bg-jade-500/10 text-jade-400 border-jade-500/20'
                            : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                        }`}
                      >
                        {pl.resolution?.chapterId === chapter.id ? '◉ ' : '◈ '}
                        {pl.title}
                      </span>
                    ))}
                    {relevantPlotLines.length > 2 && (
                      <span className="text-xs text-neutral-600">+{relevantPlotLines.length - 2}</span>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 详情面板 */}
      {selectedSummary && (
        <div className="w-80 border-l border-white/10 bg-[#0d0e12] shrink-0 overflow-auto">
          <ChapterDetail
            summary={selectedSummary}
            chapterTitle={chapters.find((c) => c.id === selectedSummary.chapterId)?.title || ''}
            characters={characters}
            plotLines={plotLines}
          />
        </div>
      )}
    </div>
  );
}

function ChapterDetail({
  summary,
  chapterTitle,
  characters,
  plotLines,
}: {
  summary: ChapterPlotSummary;
  chapterTitle: string;
  characters: { id: string; name: string }[];
  plotLines: { id: string; title: string; foreshadowNodes?: { chapterId: string }[]; resolution?: { chapterId: string } }[];
}) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'appear': return '●';
      case 'disappear': return '○';
      case 'talk': return '💬';
      case 'die': return '✕';
      case 'transform': return '◐';
      default: return '●';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'appear': return 'text-jade-400';
      case 'disappear': return 'text-neutral-500';
      case 'talk': return 'text-amber-400';
      case 'die': return 'text-red-400';
      case 'transform': return 'text-violet-400';
      default: return 'text-neutral-400';
    }
  };

  return (
    <div className="p-4">
      <h3 className="text-lg font-medium text-white mb-1">{chapterTitle}</h3>
      <p className="text-xs text-neutral-600 mb-4">章节剧情摘要</p>

      {/* 情绪标签 */}
      {summary.emotionSummary && summary.emotionSummary.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">情绪氛围</div>
          <div className="flex flex-wrap gap-1">
            {summary.emotionSummary.map((emotion, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400"
              >
                {emotion}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 主要事件 */}
      {summary.mainEvents && summary.mainEvents.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">主要事件</div>
          <div className="space-y-2">
            {summary.mainEvents.map((event, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-amber-400">◆</span>
                <p className="text-sm text-neutral-300 leading-relaxed">{event}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 角色出场 */}
      {summary.characterAppearances && summary.characterAppearances.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">角色动态</div>
          <div className="space-y-2">
            {summary.characterAppearances.map((ap, i) => {
              const char = characters.find((c) => c.id === ap.characterId);
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className={`${getActionColor(ap.action)}`}>{getActionIcon(ap.action)}</span>
                  <div>
                    <span className="text-sm text-white">{char?.name || '未知'}</span>
                    <span className="text-xs text-neutral-500 ml-2">
                      {ap.action === 'appear' ? '出场' :
                       ap.action === 'disappear' ? '退场' :
                       ap.action === 'talk' ? '对话' :
                       ap.action === 'die' ? '死亡' : '转变'}
                    </span>
                    {ap.content && (
                      <p className="text-xs text-neutral-500 mt-0.5">{ap.content}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 伏笔状态 */}
      <div>
        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">伏笔状态</div>
        <div className="space-y-2">
          {summary.foreshadowCreated.map((plotLineId) => {
            const pl = plotLines.find((p) => p.id === plotLineId);
            if (!pl) return null;
            return (
              <div key={plotLineId} className="flex items-center gap-2">
                <span className="text-violet-400">◈</span>
                <span className="text-sm text-neutral-300">{pl.title}</span>
                <span className="text-xs text-violet-500">埋设</span>
              </div>
            );
          })}
          {summary.foreshadowResolved.map((plotLineId) => {
            const pl = plotLines.find((p) => p.id === plotLineId);
            if (!pl) return null;
            return (
              <div key={plotLineId} className="flex items-center gap-2">
                <span className="text-jade-400">◉</span>
                <span className="text-sm text-neutral-300">{pl.title}</span>
                <span className="text-xs text-jade-500">回收</span>
              </div>
            );
          })}
          {summary.foreshadowCreated.length === 0 && summary.foreshadowResolved.length === 0 && (
            <p className="text-sm text-neutral-600">无伏笔相关</p>
          )}
        </div>
      </div>

      {/* AI 摘要 */}
      {summary.aiSummary && (
        <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
          <div className="text-xs text-amber-500/70 uppercase tracking-wider mb-2">AI 摘要</div>
          <p className="text-sm text-neutral-400 leading-relaxed">{summary.aiSummary}</p>
        </div>
      )}
    </div>
  );
}
