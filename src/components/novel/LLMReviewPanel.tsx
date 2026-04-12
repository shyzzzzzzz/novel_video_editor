import { useState, useEffect } from 'react';
import { useNovelStore } from '@/stores/novelStore';

interface ReviewComment {
  id: string;
  type: 'suggestion' | 'warning' | 'praise';
  content: string;
  line?: number;
  chapterId: string;
  createdAt: string;
}

export function LLMReviewPanel() {
  const { getCurrentChapter } = useNovelStore();
  const chapter = getCurrentChapter();
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!chapter) return;
    const timer = setTimeout(() => {
      analyzeChapter(chapter.id, chapter.content);
    }, 2000);
    return () => clearTimeout(timer);
  }, [chapter?.content, chapter?.id]);

  const analyzeChapter = async (chapterId: string, content: string) => {
    if (!content.trim()) {
      setComments([]);
      return;
    }

    setIsAnalyzing(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockComments: ReviewComment[] = [];

    if (content.includes('。。。。') || content.includes('。。。')) {
      mockComments.push({
        id: '1',
        type: 'warning',
        content: '检测到过多省略号，建议精简',
        chapterId,
        createdAt: new Date().toISOString(),
      });
    }

    if (content.length > 1000 && !content.includes('"') && !content.includes('"')) {
      mockComments.push({
        id: '2',
        type: 'suggestion',
        content: '长段落较多，考虑在对话处使用引号增加可读性',
        chapterId,
        createdAt: new Date().toISOString(),
      });
    }

    if (content.length > 500) {
      mockComments.push({
        id: '3',
        type: 'praise',
        content: '本章节字数充足，叙事节奏良好',
        chapterId,
        createdAt: new Date().toISOString(),
      });
    }

    setComments(mockComments);
    setIsAnalyzing(false);
  };

  if (!chapter) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
        选择一个章节开始审阅
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-neutral-900">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <h3 className="text-sm font-medium text-white">LLM 审阅</h3>
        {isAnalyzing && (
          <span className="text-xs text-neutral-500 animate-pulse">分析中...</span>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {comments.length === 0 && !isAnalyzing ? (
          <div className="text-center text-neutral-500 py-8">
            <p className="text-sm">暂无审阅意见</p>
            <p className="text-xs mt-1">开始写作后，AI将自动提供审阅建议</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => (
              <ReviewCommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-neutral-800">
        <button
          onClick={() => analyzeChapter(chapter.id, chapter.content)}
          disabled={isAnalyzing}
          className="w-full px-3 py-2 text-sm bg-neutral-800 text-white rounded hover:bg-neutral-700 disabled:opacity-50"
        >
          {isAnalyzing ? '分析中...' : '重新分析'}
        </button>
      </div>
    </div>
  );
}

function ReviewCommentItem({ comment }: { comment: ReviewComment }) {
  const config = {
    suggestion: {
      icon: '💡',
      className: 'border-l-yellow-500 bg-yellow-900/20',
    },
    warning: {
      icon: '⚠️',
      className: 'border-l-orange-500 bg-orange-900/20',
    },
    praise: {
      icon: '✨',
      className: 'border-l-green-500 bg-green-900/20',
    },
  };

  const { icon, className } = config[comment.type];

  return (
    <div className={`p-3 rounded border-l-2 ${className}`}>
      <div className="flex items-start gap-2">
        <span>{icon}</span>
        <p className="text-sm text-neutral-300">{comment.content}</p>
      </div>
      {comment.line && (
        <p className="text-xs text-neutral-600 mt-1">第 {comment.line} 行</p>
      )}
    </div>
  );
}
