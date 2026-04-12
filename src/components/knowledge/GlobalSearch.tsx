import { useEffect, useState } from 'react';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useNovelStore } from '@/stores/novelStore';

export function GlobalSearch() {
  const { searchQuery, searchResults, performSearch, clearSearch } = useKnowledgeStore();
  const { currentNovel } = useNovelStore();
  const [query, setQuery] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        const chapters = currentNovel?.chapters.map((ch) => ({
          id: ch.id,
          title: ch.title,
          content: ch.content,
        }));
        performSearch(query, chapters);
      } else {
        clearSearch();
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, currentNovel]);

  const typeIcons = {
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
            onClick={() => {
              setQuery('');
              clearSearch();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
          >
            ×
          </button>
        )}
      </div>

      {searchResults.length === 0 && query.trim() ? (
        <div className="text-center text-neutral-500 py-12">
          <p>未找到匹配结果</p>
        </div>
      ) : searchResults.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500 mb-2">找到 {searchResults.length} 个结果</p>
          {searchResults.map((result) => (
            <div
              key={`${result.type}-${result.id}`}
              className="p-3 bg-neutral-900 rounded hover:bg-neutral-800 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>{typeIcons[result.type]}</span>
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
