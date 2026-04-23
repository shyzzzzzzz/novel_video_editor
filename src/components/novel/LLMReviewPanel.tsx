import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore, DEFAULT_SKILLS } from '@/stores/settingsStore';
import { generateText } from '@/lib/api-client';
import { ReviewEntry, ReviewReply, ProofreadResult } from '@/types';
import { v4 as uuid } from 'uuid';

const DEFAULT_REVIEW_SYSPROMPT = DEFAULT_SKILLS.find((s) => s.id === 'review')?.sysprompt ?? '';

const PROOFREAD_SYSTEM_PROMPT = `你是一位专业的中文校对员，专门检查小说中的基础错误。
检测范围：
1. 的/地/得 混用错误（的用于名词前，地用于动词前，得用于动词后）
2. 标点符号错误（错用、漏用、多用）
3. 常见错别字（如：再/在、和/合、那/哪、得/的、带/戴等）
4. 其他明显的基础语法错误`;

type Tab = 'review' | 'proofread';

export function LLMReviewPanel() {
  const { projects, currentProjectId, currentNovelId, currentChapterId, updateChapter } = useProjectStore();
  const project = projects.find((p) => p.id === currentProjectId) || null;
  const currentNovel = project?.novels.find((n) => n.id === currentNovelId) || null;
  const chapter = currentNovel?.chapters.find((c) => c.id === currentChapterId) || null;
  const [tab, setTab] = useState<Tab>('review');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sysprompt = useSettingsStore((s) => s.apis.text.skills?.find((sk) => sk.id === 'review')?.sysprompt) || DEFAULT_REVIEW_SYSPROMPT;

  const reviews = chapter?.metadata?.reviews || [];
  const proofreadResults = chapter?.metadata?.proofreadResults || [];

  // LLM 审阅
  const analyzeChapter = async () => {
    if (!chapter || !chapter.content.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const prompt = `请审阅以下小说章节，以JSON数组格式返回审阅意见：

【章节标题】${chapter.title || '无标题'}

【章节内容】
${chapter.content}

请按以下JSON格式返回：
[
  {"type": "suggestion"|"warning"|"praise", "content": "审阅内容", "line": 相关行号(可选)}
]

只返回JSON数组，不要有其他内容。`;

      const result = await generateText(prompt, { system: sysprompt });

      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const newReviews: ReviewEntry[] = parsed.map((c: Omit<ReviewEntry, 'id' | 'createdAt' | 'replies'>) => ({
              ...c,
              id: uuid(),
              createdAt: new Date().toISOString(),
              replies: [],
            }));

            updateChapter(chapter.id, {
              metadata: {
                ...chapter.metadata,
                reviews: newReviews,
              },
            });
          }
        }
      } catch (parseErr) {
        console.error('解析审阅意见失败:', parseErr);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '审阅失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 基础校对 - LLM 方案，使用句子 + 偏移量精确定位
  const proofreadChapter = async () => {
    if (!chapter || !chapter.content.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const userPrompt = `请仔细检查以下文本中的基础错误，只报告你确定是错误的问题。

检测范围：
1. 的/地/得 混用错误（的用于名词前，地用于动词前，得用于动词后）
2. 标点符号错误（只有明显错误才报告，如：引号不匹配、顿号逗号混用）
3. 常见错别字（在常用词组中明显用错的字）

重要约束：
1. 只报告你确定是错误的，不要猜测或推断
2. 原文有句号感叹号等正常标点的，不要误报"缺少标点"
3. 每个错误必须精确匹配原文

输出格式（JSON数组）：
[
  {
    "sentence": "完整句子（必须与原文完全一致）",
    "error": "错误片段（必须是句子的精确子串）",
    "errorStart": 错误在句子中的起始位置（数字，从0开始）,
    "errorEnd": 错误在句子中的结束位置（数字）,
    "correct": "正确内容",
    "reason": "错误原因"
  }
]

如果文本没有明显错误或你不确定，返回空数组[]。

【文本内容】
${chapter.content}`;

      const result = await generateText(userPrompt, { system: PROOFREAD_SYSTEM_PROMPT });

      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            const newResults: ProofreadResult[] = [];

            for (const item of parsed) {
              // 验证 sentence 是否在原文中精确存在
              const sentenceIndex = chapter.content.indexOf(item.sentence);

              if (sentenceIndex !== -1) {
                newResults.push({
                  id: uuid(),
                  error: item.error,
                  correct: item.correct,
                  reason: item.reason,
                  sentence: item.sentence,
                  errorStart: item.errorStart,
                  errorEnd: item.errorEnd,
                  line: item.line || 1,
                  createdAt: new Date().toISOString(),
                });
              }
            }

            updateChapter(chapter.id, {
              metadata: {
                ...chapter.metadata,
                proofreadResults: newResults,
              },
            });
          }
        }
      } catch (parseErr) {
        console.error('解析校对结果失败:', parseErr);
        setError('解析校对结果失败，请重试');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '校对失败');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    if (!chapter) return;
    const updatedReviews = reviews.filter(r => r.id !== reviewId);
    updateChapter(chapter.id, {
      metadata: {
        ...chapter.metadata,
        reviews: updatedReviews,
      },
    });
  };

  const handleDeleteProofreadResult = (resultId: string) => {
    if (!chapter) return;
    const updatedResults = proofreadResults.filter(r => r.id !== resultId);
    updateChapter(chapter.id, {
      metadata: {
        ...chapter.metadata,
        proofreadResults: updatedResults,
      },
    });
  };

  // 修复单个错误 - 使用 sentence + errorStart/errorEnd 精确定位
  const handleFixError = (result: ProofreadResult) => {
    if (!chapter) return;

    // 1. 在原文中找到句子的位置
    const sentenceIndex = chapter.content.indexOf(result.sentence);
    if (sentenceIndex === -1) {
      console.error('句子在原文中找不到:', result.sentence);
      return;
    }

    // 2. 计算错误在原文中的绝对位置
    const absoluteStart = sentenceIndex + result.errorStart;
    const absoluteEnd = sentenceIndex + result.errorEnd;

    // 3. 替换
    const updatedContent =
      chapter.content.slice(0, absoluteStart) +
      result.correct +
      chapter.content.slice(absoluteEnd);

    updateChapter(chapter.id, { content: updatedContent });
    handleDeleteProofreadResult(result.id);
  };

  // 一键修复所有错误
  const handleFixAllErrors = () => {
    if (!chapter) return;

    let updatedContent = chapter.content;

    // 按绝对位置从后往前排序，避免位置偏移
    const sorted = [...proofreadResults].sort((a, b) => {
      const aIndex = chapter.content.indexOf(a.sentence) + a.errorStart;
      const bIndex = chapter.content.indexOf(b.sentence) + b.errorStart;
      return bIndex - aIndex;
    });

    for (const result of sorted) {
      const sentenceIndex = updatedContent.indexOf(result.sentence);
      if (sentenceIndex === -1) continue;

      const absoluteStart = sentenceIndex + result.errorStart;
      const absoluteEnd = sentenceIndex + result.errorEnd;

      updatedContent =
        updatedContent.slice(0, absoluteStart) +
        result.correct +
        updatedContent.slice(absoluteEnd);
    }

    updateChapter(chapter.id, { content: updatedContent });
    updateChapter(chapter.id, {
      metadata: {
        ...chapter.metadata,
        proofreadResults: [],
      },
    });
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
      {/* Tab 切换 */}
      <div className="flex items-center px-4 py-2 border-b border-neutral-800 shrink-0">
        <button
          onClick={() => setTab('review')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'review'
              ? 'text-amber-500 border-amber-500'
              : 'text-neutral-500 border-transparent hover:text-white'
          }`}
        >
          LLM 审阅
          {reviews.length > 0 && (
            <span className="ml-2 text-xs bg-neutral-800 px-1.5 py-0.5 rounded">{reviews.length}</span>
          )}
        </button>
        <button
          onClick={() => setTab('proofread')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'proofread'
              ? 'text-amber-500 border-amber-500'
              : 'text-neutral-500 border-transparent hover:text-white'
          }`}
        >
          基础校对
          {proofreadResults.length > 0 && (
            <span className="ml-2 text-xs bg-amber-600/20 text-amber-500 px-1.5 py-0.5 rounded">{proofreadResults.length}</span>
          )}
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mx-4 mt-3 p-3 rounded border-l-2 border-l-red-500 bg-red-900/20 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-4">
        {tab === 'review' && (
          <>
            {reviews.length === 0 && !isAnalyzing ? (
              <div className="text-center text-neutral-500 py-8">
                <p className="text-sm">暂无审阅意见</p>
                <p className="text-xs mt-1">点击下方按钮开始 LLM 审阅</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <ReviewCommentItem
                    key={review.id}
                    review={review}
                    onDelete={() => handleDeleteReview(review.id)}
                    onAddReply={(content) => {
                      if (!chapter) return;
                      const reply: ReviewReply = {
                        id: uuid(),
                        content,
                        createdAt: new Date().toISOString(),
                      };
                      const updatedReviews = reviews.map(r =>
                        r.id === review.id
                          ? { ...r, replies: [...(r.replies || []), reply] }
                          : r
                      );
                      updateChapter(chapter.id, {
                        metadata: {
                          ...chapter.metadata,
                          reviews: updatedReviews,
                        },
                      });
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'proofread' && (
          <>
            {proofreadResults.length === 0 && !isAnalyzing ? (
              <div className="text-center text-neutral-500 py-8">
                <p className="text-sm">暂无校对结果</p>
                <p className="text-xs mt-1">点击下方按钮开始基础校对</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-neutral-400">
                    发现 {proofreadResults.length} 处错误
                  </p>
                  {proofreadResults.length > 0 && (
                    <button
                      onClick={handleFixAllErrors}
                      className="px-3 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-500 transition-colors"
                    >
                      一键修复全部
                    </button>
                  )}
                </div>
                {proofreadResults.map((result) => (
                  <ProofreadResultItem
                    key={result.id}
                    result={result}
                    onFix={() => handleFixError(result)}
                    onDelete={() => handleDeleteProofreadResult(result.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="p-3 border-t border-neutral-800 shrink-0">
        <button
          onClick={tab === 'review' ? analyzeChapter : proofreadChapter}
          disabled={isAnalyzing}
          className="w-full px-3 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-500 disabled:opacity-50 transition-colors font-medium"
        >
          {isAnalyzing ? '处理中...' : (tab === 'review' ? '开始审阅' : '开始校对')}
        </button>
      </div>
    </div>
  );
}

function ReviewCommentItem({
  review,
  onDelete,
  onAddReply,
}: {
  review: ReviewEntry;
  onDelete: () => void;
  onAddReply: (content: string) => void;
}) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  const config = {
    suggestion: { icon: '💡', label: '建议', className: 'border-l-yellow-500 bg-yellow-900/10', iconColor: 'text-yellow-500' },
    warning: { icon: '⚠️', label: '警告', className: 'border-l-orange-500 bg-orange-900/10', iconColor: 'text-orange-500' },
    praise: { icon: '✨', label: '表扬', className: 'border-l-green-500 bg-green-900/10', iconColor: 'text-green-500' },
  };

  const { icon, label, className, iconColor } = config[review.type];

  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onAddReply(replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    }
  };

  return (
    <div className={`p-3 rounded-lg border-l-2 ${className}`}>
      <div className="flex items-start gap-2">
        <span className={`text-base ${iconColor}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${iconColor}`}>{label}</span>
            {review.line && <span className="text-xs text-neutral-600">第 {review.line} 行</span>}
            <span className="text-xs text-neutral-600 ml-auto">{new Date(review.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">{review.content}</p>

          {review.replies && review.replies.length > 0 && (
            <div className="mt-2 pl-2 border-l border-neutral-700 space-y-2">
              {review.replies.map((reply) => (
                <div key={reply.id} className="text-sm">
                  <p className="text-neutral-400">{reply.content}</p>
                  <p className="text-xs text-neutral-600 mt-0.5">{new Date(reply.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}

          {showReplyInput ? (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitReply()}
                placeholder="输入回复..."
                className="flex-1 px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
                autoFocus
              />
              <button onClick={handleSubmitReply} className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500">发送</button>
              <button onClick={() => { setShowReplyInput(false); setReplyText(''); }} className="px-2 py-1 text-xs bg-neutral-700 text-neutral-300 rounded hover:bg-neutral-600">取消</button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <button onClick={() => setShowReplyInput(true)} className="text-xs text-neutral-500 hover:text-white transition-colors">回复</button>
              <button onClick={onDelete} className="text-xs text-neutral-600 hover:text-red-400 transition-colors">删除</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProofreadResultItem({
  result,
  onFix,
  onDelete,
}: {
  result: ProofreadResult;
  onFix: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-3 rounded-lg bg-red-900/10 border-l-2 border-l-red-500">
      <div className="flex items-start gap-2">
        <span className="text-red-400 text-base">✗</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-red-400">错误</span>
            {result.line && <span className="text-xs text-neutral-600">第 {result.line} 行</span>}
          </div>
          <div className="text-sm space-y-1">
            <p className="text-red-300">
              <span className="text-neutral-500">原文：</span>{result.error}
            </p>
            <p className="text-green-300">
              <span className="text-neutral-500">修正：</span>{result.correct}
            </p>
            <p className="text-neutral-500 text-xs mt-1">原因：{result.reason}</p>
          </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onFix}
              className="px-2 py-1 text-xs bg-green-600/80 text-white rounded hover:bg-green-600 transition-colors"
            >
              修复
            </button>
            <button
              onClick={onDelete}
              className="px-2 py-1 text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              忽略
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
