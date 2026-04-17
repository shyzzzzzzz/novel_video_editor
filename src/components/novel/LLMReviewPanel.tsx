import { useState, useRef, useEffect } from 'react';
import { useNovelStore } from '@/stores/novelStore';
import { useSettingsStore, DEFAULT_SKILLS } from '@/stores/settingsStore';
import { generateTextStream } from '@/lib/api-client';

interface ReviewComment {
  id: string;
  type: 'suggestion' | 'warning' | 'praise';
  content: string;
  line?: number;
  chapterId: string;
  createdAt: string;
}

// 默认审阅 sysprompt（作为 fallback）
const DEFAULT_REVIEW_SYSPROMPT = DEFAULT_SKILLS.find((s) => s.id === 'review')?.sysprompt ?? '';

/** 简易 Markdown 渲染器 */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 代码块
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={key++} className="bg-neutral-950 rounded p-3 my-2 text-xs text-neutral-300 overflow-x-auto">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      const sizeClass = { 1: 'text-lg', 2: 'text-base', 3: 'text-sm', 4: 'text-sm', 5: 'text-sm', 6: 'text-sm' }[level] || 'text-sm';
      const weightClass = level <= 2 ? 'font-semibold' : 'font-medium';
      elements.push(
        <Tag key={key++} className={`${sizeClass} ${weightClass} text-white mt-4 mb-2 first:mt-0`}>
          {inlineMarkdown(text)}
        </Tag>
      );
      i++;
      continue;
    }

    // 有序列表
    const orderedMatch = line.match(/^\d+\.\s+(.+)/);
    if (orderedMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\d+)\.\s+(.+)/);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-1 my-2 text-sm text-neutral-300">
          {items.map((item, idx) => <li key={idx}>{inlineMarkdown(item)}</li>)}
        </ol>
      );
      continue;
    }

    // 无序列表
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^[-*]\s+(.+)/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1 my-2 text-sm text-neutral-300">
          {items.map((item, idx) => <li key={idx}>{inlineMarkdown(item)}</li>)}
        </ul>
      );
      continue;
    }

    // 引用块
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote key={key++} className="border-l-2 border-neutral-600 pl-3 my-2 text-sm text-neutral-400 italic">
          {quoteLines.map((l, idx) => <span key={idx}>{inlineMarkdown(l)}<br/></span>)}
        </blockquote>
      );
      continue;
    }

    // 分割线
    if (/^---+$/.test(line)) {
      elements.push(<hr key={key++} className="border-neutral-700 my-3" />);
      i++;
      continue;
    }

    // 空白行
    if (!line.trim()) {
      i++;
      continue;
    }

    // 普通段落
    const paraLines: string[] = [line];
    while (i + 1 < lines.length && lines[i + 1].trim() && !lines[i + 1].match(/^#{1,6}\s/) && !lines[i + 1].match(/^[-*]\s/) && !lines[i + 1].match(/^\d+\.\s/) && !lines[i + 1].startsWith('> ') && !lines[i + 1].startsWith('```')) {
      i++;
      paraLines.push(lines[i]);
    }
    elements.push(
      <p key={key++} className="text-sm text-neutral-300 my-2 leading-relaxed">
        {paraLines.map((l, idx) => <span key={idx}>{inlineMarkdown(l)}{idx < paraLines.length - 1 ? <br/> : null}</span>)}
      </p>
    );
    i++;
  }

  return elements;
}

function inlineMarkdown(text: string): React.ReactNode {
  if (!text) return text;
  // 处理粗体、斜体、行内代码
  const parts: React.ReactNode[] = [];
  // 不使用 g 标志，避免 lastIndex 状态问题
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|__([^_]+)__/;
  let lastIndex = 0;
  let match;
  let processed = text;

  while ((match = regex.exec(processed)) !== null) {
    if (match.index > lastIndex) {
      parts.push(processed.slice(lastIndex, match.index));
    }
    if (match[1]) {
      parts.push(<strong key={parts.length} className="font-semibold">{match[1]}</strong>);
    } else if (match[2]) {
      parts.push(<em key={parts.length} className="italic">{match[2]}</em>);
    } else if (match[3]) {
      parts.push(<code key={parts.length} className="bg-neutral-800 text-amber-300 px-1 rounded text-xs">{match[3]}</code>);
    } else if (match[4]) {
      parts.push(<strong key={parts.length} className="font-semibold">{match[4]}</strong>);
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < processed.length) {
    parts.push(processed.slice(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

export function LLMReviewPanel() {
  const { getCurrentChapter } = useNovelStore();
  const chapter = getCurrentChapter();
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [displayContent, setDisplayContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawMarkdown, setShowRawMarkdown] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const fullContentRef = useRef('');
  const chapterIdRef = useRef('');

  const sysprompt = useSettingsStore((s) => s.apis.text.skills?.find((sk) => sk.id === 'review')?.sysprompt) || DEFAULT_REVIEW_SYSPROMPT;

  // 自动滚动到底部
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [displayContent]);

  const analyzeChapter = async () => {
    if (!chapter || !chapter.content.trim()) {
      setComments([]);
      setDisplayContent('');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setDisplayContent('');
    setComments([]);
    fullContentRef.current = '';
    chapterIdRef.current = chapter.id;

    try {
      const prompt = `请审阅以下小说章节：

【章节标题】${chapter.title || '无标题'}

【章节内容】
${chapter.content}`;

      await generateTextStream(
        prompt,
        { system: sysprompt },
        (text, done) => {
          if (done) {
            // 流式结束，解析 JSON 评论
            const finalContent = fullContentRef.current;
            setIsAnalyzing(false);
            try {
              const jsonMatch = finalContent.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  setComments(parsed.map((c: ReviewComment, i: number) => ({
                    ...c,
                    id: c.id || String(i),
                    chapterId: chapterIdRef.current,
                    createdAt: c.createdAt || new Date().toISOString(),
                  })));
                }
              }
            } catch {
              // 解析失败，保持 markdown 显示
            }
          } else {
            // 流式中：追加内容
            fullContentRef.current += text;
            setDisplayContent((prev) => prev + text);
          }
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : '审阅失败');
      setIsAnalyzing(false);
    }
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
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 shrink-0">
        <h3 className="text-sm font-medium text-white">LLM 审阅</h3>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <span className="text-xs text-neutral-500 animate-pulse">分析中...</span>
          )}
          {displayContent && !isAnalyzing && (
            <button
              onClick={() => setShowRawMarkdown((v) => !v)}
              className="text-xs text-neutral-500 hover:text-white transition-colors"
            >
              {showRawMarkdown ? '优雅' : '源码'}
            </button>
          )}
        </div>
      </div>

      <div ref={contentRef} className="flex-1 overflow-auto p-4">
        {error && (
          <div className="mb-3 p-3 rounded border-l-2 border-l-red-500 bg-red-900/20 text-sm text-red-300">
            {error}
          </div>
        )}

        {displayContent ? (
          showRawMarkdown ? (
            <pre className="text-sm text-neutral-300 whitespace-pre-wrap font-mono">{displayContent}</pre>
          ) : (
            <div className="markdown-content">{renderMarkdown(displayContent)}</div>
          )
        ) : !isAnalyzing && !error ? (
          <div className="text-center text-neutral-500 py-8">
            <p className="text-sm">暂无审阅意见</p>
            <p className="text-xs mt-1">点击下方按钮开始 LLM 审阅</p>
          </div>
        ) : null}

        {/* 解析出的结构化评论 */}
        {comments.length > 0 && !isAnalyzing && (
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <h4 className="text-sm font-medium text-white mb-3">结构化审阅意见</h4>
            <div className="space-y-3">
              {comments.map((comment) => (
                <ReviewCommentItem key={comment.id} comment={comment} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-neutral-800 shrink-0">
        <button
          onClick={analyzeChapter}
          disabled={isAnalyzing}
          className="w-full px-3 py-2 text-sm bg-neutral-800 text-white rounded hover:bg-neutral-700 disabled:opacity-50 transition-colors"
        >
          {isAnalyzing ? '分析中...' : '开始审阅'}
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
