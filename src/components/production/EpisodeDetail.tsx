import { useState } from 'react';
import { useProjectStore } from '@/stores/projectStore';
import { useSettingsStore, getSkillSysprompt } from '@/stores/settingsStore';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { generateText } from '@/lib/api-client';
import { Episode, ProductionStatus, CameraAngle } from '@/types';
import { StoryboardView } from './StoryboardView';
import { TimelineEditor } from './TimelineEditor';
import { AudioPipeline } from './AudioPipeline';

type DetailTab = 'outline' | 'script' | 'storyboard' | 'timeline' | 'audio';

export function EpisodeDetail({ episode }: { episode: Episode }) {
  const { updateEpisode, advanceEpisodeStatus, revertEpisodeStatus } = useProjectStore();
  const chapter = useProjectStore.getState().getCurrentChapter();
  const [activeTab, setActiveTab] = useState<DetailTab>('outline');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentOperation, setCurrentOperation] = useState('');

  const statusLabels: Record<ProductionStatus, string> = {
    outline: '大纲',
    scripting: '剧本',
    storyboard: '分镜',
    footage: '素材',
    rough_cut: '粗剪',
    final: '成片',
  };

  const statusOrder: ProductionStatus[] = [
    'outline',
    'scripting',
    'storyboard',
    'footage',
    'rough_cut',
    'final',
  ];
  const currentStatus = episode.productionStatus || 'outline';
  const currentIndex = statusOrder.indexOf(currentStatus);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < statusOrder.length - 1;

  // 生成大纲
  const handleGenerateOutline = async () => {
    if (!chapter || isGenerating) return;
    const config = useSettingsStore.getState().apis.text;
    if (config.provider === 'mock') {
      alert('请先在设置中配置文本 API');
      return;
    }
    setIsGenerating(true);
    setCurrentOperation('生成大纲...');
    try {
      const skillSysprompt = getSkillSysprompt('text', 'outline');
      const prompt = `请根据以下小说内容，生成简洁的大纲，包括：
1. 本章核心情节（2-3句话）
2. 主要场景清单
3. 关键人物

【小说内容】
${chapter.content.slice(0, 8000)}

请以清晰的格式返回，作为剧本改编的参考。`;
      const outline = await generateText(prompt, {
        system: skillSysprompt || '你是一位专业的小说改编助理，擅长提取故事大纲。',
        model: config.model,
      });
      updateEpisode(episode.id, { outline });
    } catch (err) {
      alert(`生成失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
      setCurrentOperation('');
    }
  };

  // 生成剧本
  const handleGenerateScript = async () => {
    if (!chapter || isGenerating) return;
    const config = useSettingsStore.getState().apis.text;
    if (config.provider === 'mock') {
      alert('请先在设置中配置文本 API');
      return;
    }
    setIsGenerating(true);
    setCurrentOperation('生成剧本...');
    try {
      const skillSysprompt = getSkillSysprompt('text', 'script');
      const prompt = `请将以下小说章节直接改编为剧本格式。

要求：
1. 保留原文的所有对话和叙述
2. 用剧本格式呈现：场景、人物、动作、对话
3. 不要创作或修改原文内容，只做格式转换
4. 标注每个场景的场景名称和地点

【参考大纲】
${episode.outline || '无'}

【小说原文】
${chapter.content.slice(0, 10000)}

请直接输出剧本，不要有其他解释。`;
      const script = await generateText(prompt, {
        system: skillSysprompt || '你是一位专业编剧，擅长将小说改编为剧本。',
        model: config.model,
      });
      updateEpisode(episode.id, { script });
    } catch (err) {
      alert(`生成失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
      setCurrentOperation('');
    }
  };

  // 生成分镜
  const handleGenerateStoryboard = async () => {
    if (!episode.script || isGenerating) return;
    const config = useSettingsStore.getState().apis.text;
    if (config.provider === 'mock') {
      alert('请先在设置中配置文本 API');
      return;
    }
    const skillSysprompt = getSkillSysprompt('text', 'storyboard');
    if (!skillSysprompt) {
      alert('请先在设置里配置"分镜生成"技能的 Sysprompt');
      return;
    }
    setIsGenerating(true);
    setCurrentOperation('生成分镜...');
    try {
      const prompt = `【剧本内容】
${episode.script.slice(0, 12000)}

【重要】只返回 JSON 数组，不要任何 markdown 包装、不要代码块、不要其他文字。`;

      const response = await generateText(prompt, {
        system: skillSysprompt,
        model: config.model,
      });

      console.log('[分镜生成] LLM 返回 (完整):', response);

      // 解析JSON —— 多层容错
      let storyboardJson = response;
      let parsedShots: unknown[] = [];
      try {
        parsedShots = parseJsonArray(response);
        if (parsedShots.length === 0) throw new Error('解析结果为空数组');
        storyboardJson = JSON.stringify(parsedShots);
        console.log('[分镜生成] 解析成功，镜头数:', parsedShots.length);
      } catch (e) {
        console.error('[分镜生成] 解析失败:', e instanceof Error ? e.message : String(e));
        throw new Error(`分镜解析失败: ${e instanceof Error ? e.message : '未知错误'}。请检查设置里的 Sysprompt 是否正确。`);
      }

      updateEpisode(episode.id, { generatedStoryboard: storyboardJson });
      syncStoryboardToStore(episode.id, storyboardJson);
    } catch (err) {
      console.error('[分镜生成] 失败:', err);
      alert(`生成失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setIsGenerating(false);
      setCurrentOperation('');
    }
  };

  // 同步到 storyboardStore
  function syncStoryboardToStore(episodeId: string, json: string) {
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) return;
      const storyboard = useStoryboardStore.getState().createStoryboard(episodeId);
      const framingMap: Record<string, CameraAngle> = {
        '大特写': 'close_up', '特写': 'close_up', 'close_up': 'close_up',
        '中近景': 'medium', '中景': 'medium', 'medium': 'medium',
        '中远景': 'wide', '远景': 'wide', '大远景': 'wide', 'wide': 'wide',
        '过肩': 'over_shoulder', 'over_shoulder': 'over_shoulder',
        'POV': 'pov', 'pov': 'pov',
        '鸟瞰': 'bird_eye', 'bird_eye': 'bird_eye',
        '低角': 'low_angle', 'low_angle': 'low_angle',
      };
      for (const item of data) {
        const cameraAngle: CameraAngle = framingMap[String(item.framing)] || 'medium';
        const description = buildShotDescription(item);
        const duration = typeof item.duration === 'number' ? item.duration : 5;
        useStoryboardStore.getState().addShot(storyboard.id, description, cameraAngle, duration);
      }
    } catch (e) {
      console.error('Failed to sync storyboard:', e);
    }
  }

  /**
   * 从被截断的 JSON 文本中恢复数据
   * 策略：先关闭末尾未闭合的字符串，再从后往前找最后一个完整对象
   */
  function recoverTruncatedJson(truncated: string): unknown[] {
    const candidates: string[] = [];
    let depth = 0;
    let start = -1;
    let inStr = false;
    let esc = false;

    for (let i = 0; i < truncated.length; i++) {
      const ch = truncated[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"' && !esc) { inStr = !inStr; continue; }
      if (inStr) continue;

      if (ch === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0 && start !== -1) {
          const objStr = truncated.slice(start, i + 1);
          try {
            JSON.parse(objStr);
            candidates.push(objStr);
          } catch { /* 被截断的对象，跳过 */ }
          start = -1;
        }
      }
    }

    console.log('[恢复] 全量扫描找到', candidates.length, '个候选对象');
    if (candidates.length === 0) throw new Error('无法从截断文本中恢复');

    for (let n = candidates.length; n > 0; n--) {
      try {
        const parsed = JSON.parse('[' + candidates.slice(0, n).join(',') + ']');
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log('[恢复] 成功，前', n, '个对象，共', parsed.length, '个镜头');
          return parsed;
        }
      } catch { /* 继续 */ }
    }

    try {
      const last = JSON.parse(candidates[candidates.length - 1]);
      console.log('[恢复] 兜底返回最后一个对象');
      return [last];
    } catch {
      throw new Error('无法从截断文本中恢复');
    }
  }

  /**
   * 从 LLM 返回的文本中鲁棒地解析 JSON 数组
   */
  function parseJsonArray(text: string): unknown[] {
    let cleaned = text.trim();
    console.log('[解析] 原始长度:', cleaned.length, '前50字符:', cleaned.slice(0, 50));

    if (cleaned.charCodeAt(0) === 0xfeff) {
      cleaned = cleaned.slice(1);
    }

    const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (codeBlockMatch) {
      console.log('[解析] 检测到 markdown 代码块，已剥离');
      cleaned = codeBlockMatch[1].trim();
    } else {
      console.log('[解析] 无 markdown 代码块');
    }
    console.log('[解析] 剥离后前100字符:', cleaned.slice(0, 100));

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('[解析] 直接 JSON.parse 成功，', parsed.length, '个元素');
        return parsed;
      }
    } catch (e) {
      console.log('[解析] 直接 parse 失败:', e instanceof Error ? e.message : String(e));
    }

    const firstBracket = cleaned.indexOf('[');
    console.log('[解析] firstBracket 位置:', firstBracket);
    if (firstBracket === -1) throw new Error('未找到 JSON 数组的起始 [');

    let depth = 0;
    let lastBracket = -1;
    let inString = false;
    let escape = false;

    for (let i = firstBracket; i < cleaned.length; i++) {
      const ch = cleaned[i];

      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }
      if (ch === '"' && !escape) {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          lastBracket = i;
          break;
        }
      }
    }

    console.log('[解析] lastBracket 位置:', lastBracket);

    if (lastBracket === -1) {
      console.log('[解析] 未找到闭合 ]，尝试恢复...');
      try {
        const recovered = recoverTruncatedJson(cleaned);
        if (recovered.length > 0) {
          console.log('[解析] 恢复成功，共', recovered.length, '个镜头');
          return recovered;
        }
      } catch (e2) {
        console.log('[解析] 恢复失败:', e2 instanceof Error ? e2.message : String(e2));
      }
      throw new Error('未找到 JSON 数组的匹配结束 ]');
    }

    console.log('[解析] 截取范围: [', firstBracket, ',', lastBracket, ']');

    let jsonArrayStr = cleaned.slice(firstBracket, lastBracket + 1);
    console.log('[解析] 截取后长度:', jsonArrayStr.length);

    const beforeFix = jsonArrayStr;
    jsonArrayStr = jsonArrayStr.replace(/,(\s*[}\]])/g, '$1');
    if (beforeFix !== jsonArrayStr) console.log('[解析] 修复了尾逗号');

    try {
      const parsed = JSON.parse(jsonArrayStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('[解析] 成功，共', parsed.length, '个镜头');
        return parsed;
      }
      throw new Error('解析结果不是有效数组或为空');
    } catch (e) {
      console.log('[解析] parse 仍然失败，尝试逐对象提取...');

      const objects: unknown[] = [];
      let objDepth = 0;
      let objStart = -1;
      let objInString = false;
      let objEsc = false;

      for (let i = 0; i < jsonArrayStr.length; i++) {
        const ch = jsonArrayStr[i];

        if (objEsc) {
          objEsc = false;
          continue;
        }
        if (ch === '\\' && objInString) {
          objEsc = true;
          continue;
        }
        if (ch === '"' && !objEsc) {
          objInString = !objInString;
          continue;
        }
        if (objInString) continue;

        if (ch === '{') {
          if (objDepth === 0) objStart = i;
          objDepth++;
        } else if (ch === '}') {
          objDepth--;
          if (objDepth === 0 && objStart !== -1) {
            try {
              const objStr = jsonArrayStr.slice(objStart, i + 1).replace(/,(\s*[}\]])/g, '$1');
              objects.push(JSON.parse(objStr));
            } catch {
              // 跳过
            }
            objStart = -1;
          }
        }
      }

      console.log('[解析] 逐对象提取结果:', objects.length, '个对象');
      if (objects.length > 0) return objects;

      console.log('[解析] 尝试从后往前恢复被截断的 JSON...');
      try {
        const recovered = recoverTruncatedJson(jsonArrayStr);
        if (recovered.length > 0) {
          console.log('[解析] 恢复成功，从末尾找回', recovered.length, '个对象');
          return recovered;
        }
      } catch (e2) {
        console.log('[解析] 恢复也失败:', e2 instanceof Error ? e2.message : String(e2));
      }

      throw e;
    }
  }

  function buildShotDescription(item: any): string {
    const parts: string[] = [];
    if (item.scene_name) parts.push(`【${item.scene_name}】`);
    if (item.scene_time) parts.push(`${item.scene_time} `);
    if (item.shot_no) parts.push(`镜头${item.shot_no} `);
    if (item.character_performance) parts.push(`角色:${item.character_performance} `);
    if (item.movement) parts.push(`运镜:${item.movement} `);
    if (item.lighting_design) parts.push(`光影:${item.lighting_design} `);
    if (item.atmosphere) parts.push(`氛围:${item.atmosphere} `);
    if (item.color_science) parts.push(`色调:${item.color_science} `);
    if (item.duration) parts.push(`时长:${item.duration}s `);
    if (item.visual_description) parts.push(`画面:${item.visual_description}`);
    if (item.description && !item.visual_description) parts.push(`画面:${item.description}`);
    return parts.join('|');
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{episode.name}</h2>
            <p className="text-sm text-neutral-500 mt-1">
              <span className="text-blue-400">{statusLabels[currentStatus]}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => revertEpisodeStatus(episode.id)}
              disabled={!canGoBack}
              className="px-3 py-1.5 text-sm bg-neutral-700 text-white rounded hover:bg-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← 上一步
            </button>
            <button
              onClick={() => advanceEpisodeStatus(episode.id)}
              disabled={!canGoForward}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下一步 →
            </button>
          </div>
        </div>

        <div className="flex gap-1 mt-4 flex-wrap">
          <TabButton
            active={activeTab === 'outline'}
            onClick={() => setActiveTab('outline')}
            label="大纲"
            hasContent={!!episode.outline}
          />
          <TabButton
            active={activeTab === 'script'}
            onClick={() => setActiveTab('script')}
            label="剧本"
            hasContent={!!episode.script}
          />
          <TabButton
            active={activeTab === 'storyboard'}
            onClick={() => setActiveTab('storyboard')}
            label="分镜"
            hasContent={!!episode.generatedStoryboard}
          />
          <TabButton
            active={activeTab === 'timeline'}
            onClick={() => setActiveTab('timeline')}
            label="时间线"
          />
          <TabButton
            active={activeTab === 'audio'}
            onClick={() => setActiveTab('audio')}
            label="音频"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'outline' && (
          <div className="h-full">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleGenerateOutline}
                disabled={isGenerating || !chapter}
                className="px-3 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isGenerating && currentOperation.includes('大纲') ? currentOperation : '重新生成大纲'}
              </button>
            </div>
            {episode.outline ? (
              <pre className="whitespace-pre-wrap text-sm text-neutral-300 font-mono leading-relaxed">
                {episode.outline}
              </pre>
            ) : (
              <div className="text-center text-neutral-500 py-12">
                <p>暂无大纲</p>
                <p className="text-xs mt-1">点击上方"重新生成大纲"按钮</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'script' && (
          <div className="h-full">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleGenerateScript}
                disabled={isGenerating || !chapter || !episode.outline}
                className="px-3 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {isGenerating && currentOperation.includes('剧本') ? currentOperation : '重新生成剧本'}
              </button>
            </div>
            {episode.script ? (
              <pre className="whitespace-pre-wrap text-sm text-neutral-300 font-mono leading-relaxed">
                {episode.script}
              </pre>
            ) : (
              <div className="text-center text-neutral-500 py-12">
                <p>暂无剧本</p>
                <p className="text-xs mt-1">先生成大纲后再生成剧本</p>
              </div>
            )}
          </div>
        )}
        {activeTab === 'storyboard' && (
          <div className="h-full">
            <div className="flex justify-end mb-2">
              <button
                onClick={handleGenerateStoryboard}
                disabled={isGenerating || !episode.script}
                className="px-3 py-1 text-xs bg-purple-700 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {isGenerating && currentOperation.includes('分镜') ? currentOperation : '重新生成分镜'}
              </button>
            </div>
            <StoryboardView episodeId={episode.id} />
          </div>
        )}
        {activeTab === 'timeline' && <TimelineEditor />}
        {activeTab === 'audio' && <AudioPipeline episodeId={episode.id} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  hasContent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hasContent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-sm rounded flex items-center gap-1 ${
        active
          ? 'bg-neutral-700 text-white'
          : 'text-neutral-500 hover:text-white'
      }`}
    >
      {label}
      {hasContent && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
    </button>
  );
}
