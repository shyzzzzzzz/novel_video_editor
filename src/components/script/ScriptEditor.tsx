import { useState } from 'react';
import { useScriptStore } from '@/stores/scriptStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { ScriptVersionHistory } from './ScriptVersionHistory';

export function ScriptEditor() {
  const { currentScript, updateScript, saveVersion, createScript } = useScriptStore();
  const { currentEpisodeId } = useWorkspaceStore();
  const [title, setTitle] = useState(currentScript?.title || '新剧本');
  const [content, setContent] = useState(currentScript?.content || '');
  const [showHistory, setShowHistory] = useState(false);

  const handleCreateScript = () => {
    if (!currentEpisodeId) return;
    const script = createScript(currentEpisodeId, title, content);
    // 添加到 episode（简化处理）
    console.log('Created script:', script);
  };

  const handleSave = () => {
    if (!currentScript) return;
    updateScript(currentScript.id, { title, content });
    saveVersion(currentScript.id);
  };

  if (!currentEpisodeId) {
    return (
      <div className="h-full flex items-center justify-center text-neutral-500">
        请先选择一个分集
      </div>
    );
  }

  return (
    <div className="h-full flex">
      {/* 左侧编辑器 */}
      <div className="flex-1 flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-semibold bg-transparent text-white border-b border-transparent hover:border-neutral-700 focus:border-neutral-500 outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-1 text-sm text-neutral-400 hover:text-white"
            >
              历史 {currentScript?.history.length || 0}
            </button>
            {currentScript ? (
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-white text-black rounded hover:bg-neutral-200"
              >
                保存版本
              </button>
            ) : (
              <button
                onClick={handleCreateScript}
                className="px-3 py-1 text-sm bg-white text-black rounded hover:bg-neutral-200"
              >
                创建剧本
              </button>
            )}
          </div>
        </div>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="开始编写你的剧本...

格式示例：
场景 1：内 便利店 夜
角色：阿杰（中年男人，便利店店员）

[阿杰站在空荡荡的便利店柜台后，外面霓虹灯闪烁。他的眼神有些空洞，机械地擦拭着一个杯子。]

阿杰：（独白）又是一个漫长的夜班...
"
          className="flex-1 w-full p-4 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 placeholder-neutral-600 resize-none focus:outline-none focus:border-neutral-600 font-mono text-sm leading-relaxed"
        />

        {currentScript && (
          <div className="mt-2 text-xs text-neutral-600">
            当前版本: v{currentScript.version} | 最后更新:{' '}
            {new Date(currentScript.updatedAt).toLocaleString('zh-CN')}
          </div>
        )}
      </div>

      {/* 右侧：版本历史 */}
      {showHistory && currentScript && (
        <div className="w-80 border-l border-neutral-800 p-4 overflow-auto">
          <ScriptVersionHistory
            history={currentScript.history}
            onRevert={(versionId) => {
              useScriptStore.getState().revertToVersion(currentScript.id, versionId);
              const reverted = useScriptStore.getState().currentScript;
              if (reverted) {
                setTitle(reverted.title);
                setContent(reverted.content);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
