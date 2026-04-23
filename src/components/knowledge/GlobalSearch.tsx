import { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { SearchResult } from '@/types';

export function GlobalSearch() {
  const { projects, currentProjectId, currentNovelId } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const currentNovel = project?.novels.find((n) => n.id === currentNovelId);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      const q = query.toLowerCase();
      const newResults: SearchResult[] = [];

      // 搜索角色
      project?.characters.forEach((c) => {
        if (c.name.toLowerCase().includes(q) || c.personality?.toLowerCase().includes(q)) {
          newResults.push({ type: 'character', id: c.id, title: c.name, score: 1 });
        }
      });

      // 搜索物品
      project?.items.forEach((i) => {
        if (i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)) {
          newResults.push({ type: 'item', id: i.id, title: i.name, score: 1 });
        }
      });

      // 搜索地点
      project?.locations.forEach((l) => {
        if (l.name.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)) {
          newResults.push({ type: 'location', id: l.id, title: l.name, score: 1 });
        }
      });

      // 搜索剧情线
      project?.plotLines.forEach((pl) => {
        if (pl.title.toLowerCase().includes(q) || pl.description?.toLowerCase().includes(q)) {
          newResults.push({ type: 'plotline', id: pl.id, title: pl.title, score: 1 });
        }
      });

      // 搜索章节
      currentNovel?.chapters.forEach((ch) => {
        if (ch.title.toLowerCase().includes(q) || ch.content.toLowerCase().includes(q)) {
          const excerpt = ch.content.slice(ch.content.toLowerCase().indexOf(q) - 20, ch.content.toLowerCase().indexOf(q) + 50);
          newResults.push({ type: 'chapter', id: ch.id, title: ch.title, excerpt, chapterId: ch.id, score: 1 });
        }
      });

      setResults(newResults);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, project, currentNovel]);

  const typeIcons: Record<string, string> = {
    character: '👤',
    item: '📦',
    location: '📍',
    plotline: '📋',
    chapter: '📄',
  };

  return (
    <div className="p-4">
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索角色、物品、地点、情节、章节内容..."
          className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {results.length === 0 && query.trim() ? (
        <div className="text-center text-neutral-500 py-12">
          <p>未找到匹配结果</p>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 mb-2">找到 {results.length} 个结果</p>
          {results.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="p-3 bg-neutral-900 rounded hover:bg-neutral-800 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{typeIcons[result.type] ?? '📄'}</span>
                <span className="text-white font-medium">{result.title}</span>
                <span className="text-xs text-neutral-500">{result.type}</span>
              </div>
              {result.excerpt && (
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{result.excerpt}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-neutral-600 py-12">
          <p className="text-sm">输入关键词开始搜索</p>
          <p className="text-xs mt-1">支持搜索角色、物品、地点、情节线、小说章节内容</p>
        </div>
      )}
    </div>
  );
}
