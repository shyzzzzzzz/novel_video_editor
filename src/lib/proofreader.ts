import { ProofreadResult } from '@/types';
import { v4 as uuid } from 'uuid';

/**
 * 基础校对器 - 基于规则的正则表达式检测
 * 检测：的地得混用、标点符号错误、常见错别字
 */

interface ProofreadRule {
  id: string;
  pattern: RegExp;
  check: (match: RegExpMatchArray) => { error: string; correct: string; reason: string } | null;
  enabled?: boolean;
}

// 的地得检测规则
const dedeRules: ProofreadRule[] = [
  // 动词 + 的 + 动词 → 动词 + 地 + 动词
  {
    id: 'v_de_v',
    pattern: /([\u4e00-\u9fa5]+的)([\u4e00-\u9fa5]+的)()/g,
    check: (match) => {
      // 如果两个词都是动词，可能是错误
      const word1 = match[1].replace('的', '');
      const word2 = match[2].replace('的', '');
      // 简单判断：两个单字动词连用
      if (word1.length <= 2 && word2.length <= 2) {
        return {
          error: match[0],
          correct: match[1].replace('的', '地') + match[2],
          reason: '动词连接动词时应用"地"',
        };
      }
      return null;
    },
  },
  // 形容词 + 的 + 动词 → 形容词 + 地 + 动词
  {
    id: 'adj_de_v',
    pattern: /([\u4e00-\u9fa5]{1,3})的([\u4e00-\u9fa5]+地)/g,
    check: (match) => {
      // "X的地Y地" 格式
      return {
        error: match[0],
        correct: match[1] + '地' + match[2],
        reason: '"的"后接动词性词语时应改为"地"',
      };
    },
  },
];

// 常见错别字词典（正向匹配）
const commonTypos: Record<string, string> = {
  '再': '在', // 再见 → 在见 (错误)
  '在': '再', // 在来 → 再来 (错误)
  '那': '哪', // 那里 → 哪里 (错误)
  '哪': '那', // 哪样 → 那样 (部分情况)
  '得': '的', // 得是 → 的是 (错误)
  '的': '得', // 的确 → 确得 (错误)
  '和': '合', // 和平 → 合并 (部分错误)
  '合': '和', // 合作 → 合作 (正确)
  '带': '戴', // 带帽子 → 戴帽子 (错误)
  '戴': '带', // 戴手表 → 带手表 (错误)
  '象': '像', // 图像 → 象形 (部分)
  '坐': '座', // 坐下 → 座下 (错误)
  '座': '坐', // 座位 → 坐位 (错误)
};

// 常见标点错误
const punctuationRules: ProofreadRule[] = [
  // 连续标点
  {
    id: 'double_punct',
    pattern: /([。！？，、；：]){2,}/g,
    check: (match) => ({
      error: match[0],
      correct: match[1],
      reason: '连续相同标点符号',
    }),
  },
  // 句末缺标点
  {
    id: 'missing_end_punct',
    pattern: /([\u4e00-\u9fa5])([A-Za-z0-9])/g,
    check: (match) => {
      // 中英文之间缺空格
      return {
        error: match[0],
        correct: match[1] + ' ' + match[2],
        reason: '中英文之间应加空格',
      };
    },
  },
  // 引号配对错误（简单检测）
  {
    id: 'quote_mismatch',
    pattern: /[""]/g,
    check: () => null, // 需要上下文判断，暂时不处理
  },
];

/**
 * 校对文本，返回所有发现的错误
 */
export function proofreadText(text: string): ProofreadResult[] {
  const results: ProofreadResult[] = [];

  // 1. 检测的地得错误
  for (const rule of dedeRules) {
    let match;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const result = rule.check(match);
      if (result) {
        const lineNumber = findLineNumber(text, match.index);
        results.push({
          id: uuid(),
          error: result.error,
          correct: result.correct,
          reason: result.reason,
          line: lineNumber,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 2. 检测常见错别字
  for (const [wrong, correct] of Object.entries(commonTypos)) {
    const pattern = new RegExp(wrong, 'g');
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // 简单判断：如果是常用词组的一部分，可能不是错误
      const before = text[match.index - 1] || '';
      const after = text[match.index + wrong.length] || '';

      // 跳过已经是正确用法的场景
      if (isCorrectUsage(wrong, correct, before, after, text, match.index)) {
        continue;
      }

      const lineNumber = findLineNumber(text, match.index);
      results.push({
        id: uuid(),
        error: match[0],
        correct: correct,
        reason: `"${wrong}"应改为"${correct}"`,
        line: lineNumber,
        createdAt: new Date().toISOString(),
      });
    }
  }

  // 3. 检测标点符号错误
  for (const rule of punctuationRules) {
    if (rule.id === 'quote_mismatch') continue; // 暂时跳过
    let match;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const result = rule.check(match);
      if (result) {
        const lineNumber = findLineNumber(text, match.index);
        results.push({
          id: uuid(),
          error: result.error,
          correct: result.correct,
          reason: result.reason,
          line: lineNumber,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  // 去重（同一位置多次匹配）
  const uniqueResults = deduplicateResults(results);

  return uniqueResults;
}

/**
 * 判断是否是正确用法（避免误报）
 */
function isCorrectUsage(
  wrong: string,
  _correct: string,
  _before: string,
  _after: string,
  text: string,
  position: number
): boolean {
  // 这是一个简化的判断，实际需要更复杂的语境分析
  const commonPhrases: Record<string, string[]> = {
    '再': ['再见', '再来', '再次', '再说', '重新'],
    '在': ['在家', '在此', '在于', '存在', '正在'],
    '那': ['那里', '那个', '那些', '那么'],
    '哪': ['哪里', '哪个', '哪些', '怎样'],
  };

  const phrases = commonPhrases[wrong] || [];
  for (const phrase of phrases) {
    if (text.slice(Math.max(0, position - phrase.length + 1), position + 1).includes(phrase)) {
      return true;
    }
  }

  return false;
}

/**
 * 查找字符在第几行
 */
function findLineNumber(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') {
      line++;
    }
  }
  return line;
}

/**
 * 对结果去重（同一位置保留一个）
 */
function deduplicateResults(results: ProofreadResult[]): ProofreadResult[] {
  const seen = new Map<string, ProofreadResult>();
  for (const result of results) {
    const key = `${result.line}:${result.error}:${result.correct}`;
    if (!seen.has(key)) {
      seen.set(key, result);
    }
  }
  return Array.from(seen.values());
}

/**
 * 修复文本中的所有错误
 */
export function fixProofreadErrors(
  text: string,
  results: ProofreadResult[]
): string {
  // 按行号从后往前排序，避免位置偏移
  const sorted = [...results].sort((a, b) => (b.line || 0) - (a.line || 0));

  let fixedText = text;
  for (const result of sorted) {
    // 只替换第一个匹配的错误
    const index = fixedText.indexOf(result.error);
    if (index !== -1) {
      fixedText = fixedText.slice(0, index) + result.correct + fixedText.slice(index + result.error.length);
    }
  }

  return fixedText;
}
