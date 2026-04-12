import { useState, useEffect } from 'react';
import { useSyncStore } from '@/stores/syncStore';
import { useNovelStore } from '@/stores/novelStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { Novel } from '@/types';

interface Props {
  onMessage?: (msg: string, type: 'info' | 'success' | 'error') => void;
}

export function SyncPanel({ onMessage }: Props) {
  const { config, lastSyncedAt, isSyncing, syncError, setConfig, loadConfig, clearConfig, push, pull } =
    useSyncStore();
  const { currentNovel } = useNovelStore();
  const { characters, items, locations, plotLines } = useKnowledgeStore();
  const { workspace } = useWorkspaceStore();

  const [localPat, setLocalPat] = useState('');
  const [localGistId, setLocalGistId] = useState('');
  const [localFilename, setLocalFilename] = useState('vibestudio-workspace.json');
  const [showPat, setShowPat] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
    setLocalPat(config.pat);
    setLocalGistId(config.gistId);
    setLocalFilename(config.filename);
  }, []);

  useEffect(() => {
    setLocalPat(config.pat);
    setLocalGistId(config.gistId);
    setLocalFilename(config.filename);
  }, [config]);

  const handleSave = () => {
    setConfig({ pat: localPat, gistId: localGistId, filename: localFilename });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onMessage?.('配置已保存', 'success');
  };

  const buildSyncPayload = () => ({
    workspaceName: workspace?.name || '我的工作区',
    novels: currentNovel
      ? [
          {
            ...currentNovel,
            chapters: currentNovel.chapters,
          },
        ]
      : [],
    knowledge: {
      characters,
      items,
      locations,
      plotLines,
    },
  });

  const handlePush = async () => {
    try {
      const payload = buildSyncPayload();
      const { gistUrl } = await push(payload);
      onMessage?.(`已推送至 Gist ✓  ${gistUrl}`, 'success');
    } catch (e) {
      onMessage?.(syncError || '推送失败', 'error');
    }
  };

  const handlePull = async () => {
    try {
      const data = await pull();
      if (!data) {
        onMessage?.('Gist 中暂无数据或文件不存在', 'info');
        return;
      }

      const remoteNovels: Novel[] = (data as any).novels || [];
      const remoteKnowledge = (data as any).knowledge || {};

      // --- Merge novels (last-write-wins at novel level) ---
      if (remoteNovels.length > 0) {
        const remoteNovel = remoteNovels[0]; // single-novel model
        const local = currentNovel;
        if (!local || new Date(remoteNovel.updatedAt) > new Date(local.updatedAt)) {
          useNovelStore.getState().loadNovel(remoteNovel);
        }
      }

      // --- Merge knowledge (last-write-wins per entry) ---
      const existingKnowledge = { characters, items, locations, plotLines };

      const mergedCharacters = [...existingKnowledge.characters];
      for (const remoteChar of remoteKnowledge.characters || []) {
        const idx = mergedCharacters.findIndex((c) => c.id === remoteChar.id);
        if (idx === -1) {
          mergedCharacters.push(remoteChar);
        } else if (new Date(remoteChar.updatedAt) > new Date(mergedCharacters[idx].updatedAt)) {
          mergedCharacters[idx] = remoteChar;
        }
      }

      const mergedItems = [...existingKnowledge.items];
      for (const remoteItem of remoteKnowledge.items || []) {
        const idx = mergedItems.findIndex((i) => i.id === remoteItem.id);
        if (idx === -1) {
          mergedItems.push(remoteItem);
        } else if (new Date(remoteItem.updatedAt) > new Date(mergedItems[idx].updatedAt)) {
          mergedItems[idx] = remoteItem;
        }
      }

      const mergedLocations = [...existingKnowledge.locations];
      for (const remoteLoc of remoteKnowledge.locations || []) {
        const idx = mergedLocations.findIndex((l) => l.id === remoteLoc.id);
        if (idx === -1) {
          mergedLocations.push(remoteLoc);
        } else if (new Date(remoteLoc.updatedAt) > new Date(mergedLocations[idx].updatedAt)) {
          mergedLocations[idx] = remoteLoc;
        }
      }

      const mergedPlotLines = [...existingKnowledge.plotLines];
      for (const remotePl of remoteKnowledge.plotLines || []) {
        const idx = mergedPlotLines.findIndex((p) => p.id === remotePl.id);
        if (idx === -1) {
          mergedPlotLines.push(remotePl);
        } else if (new Date(remotePl.updatedAt) > new Date(mergedPlotLines[idx].updatedAt)) {
          mergedPlotLines[idx] = remotePl;
        }
      }

      // Apply merged knowledge to store (replace entirely with merged state)
      useKnowledgeStore.setState({
        characters: mergedCharacters,
        items: mergedItems,
        locations: mergedLocations,
        plotLines: mergedPlotLines,
      });

      onMessage?.(
        `已从 Gist 拉取并合并 ✓  (${mergedCharacters.length} 角色 / ${mergedItems.length} 物品)`,
        'success'
      );
    } catch (e) {
      onMessage?.(syncError || '拉取失败', 'error');
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '从未同步';
    return new Date(iso).toLocaleString('zh-CN');
  };

  return (
    <div className="space-y-5">
      {/* GitHub Token */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-white">GitHub Personal Access Token</label>
          <button
            onClick={() => setShowPat((v) => !v)}
            className="text-xs text-neutral-500 hover:text-white"
          >
            {showPat ? '隐藏' : '显示'}
          </button>
        </div>
        <div className="relative">
          <input
            type={showPat ? 'text' : 'password'}
            value={localPat}
            onChange={(e) => setLocalPat(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            className="w-full px-4 py-2.5 pr-10 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
          />
        </div>
        <p className="text-xs text-neutral-500 mt-1.5">
          需要 gist 作用域。在 GitHub → Settings → Developer settings → Personal access tokens 生成。
        </p>
      </div>

      {/* Gist ID */}
      <div>
        <label className="text-sm font-medium text-white block mb-1.5">Gist ID</label>
        <input
          type="text"
          value={localGistId}
          onChange={(e) => setLocalGistId(e.target.value)}
          placeholder="8a5cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
        />
        <p className="text-xs text-neutral-500 mt-1.5">
          Gist URL 中的 ID。例如 gist.github.com/<span className="text-neutral-300">8a5cxxxx</span>
        </p>
      </div>

      {/* Filename */}
      <div>
        <label className="text-sm font-medium text-white block mb-1.5">文件名</label>
        <input
          type="text"
          value={localFilename}
          onChange={(e) => setLocalFilename(e.target.value)}
          placeholder="vibestudio-workspace.json"
          className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-700 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
        />
      </div>

      {/* Save config */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm bg-neutral-700 text-white rounded-lg hover:bg-neutral-600"
        >
          保存配置
        </button>
        {saved && <span className="text-sm text-green-400">✓</span>}
      </div>

      {/* Sync status */}
      <div className="flex items-center justify-between py-3 border-t border-neutral-800">
        <div>
          <p className="text-sm text-neutral-400">
            上次同步：<span className="text-white">{formatDate(lastSyncedAt)}</span>
          </p>
          {syncError && <p className="text-xs text-red-400 mt-0.5">{syncError}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePull}
            disabled={isSyncing || !config.pat || !config.gistId}
            className="px-4 py-2 text-sm border border-neutral-600 text-neutral-300 rounded-lg hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSyncing ? '同步中...' : '↓ 拉取'}
          </button>
          <button
            onClick={handlePush}
            disabled={isSyncing || !config.pat || !config.gistId}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSyncing ? '同步中...' : '↑ 推送'}
          </button>
        </div>
      </div>

      {/* Help */}
      <div className="bg-neutral-800/50 rounded-lg p-3">
        <p className="text-xs text-neutral-500 leading-relaxed">
          <span className="text-neutral-400 font-medium">使用方法：</span>
          <br />
          1. 在 GitHub 创建一个新的 <span className="text-white">Secret Gist</span>（不要选 Public）
          <br />
          2. 复制 Gist URL 中的 ID，填入上方「Gist ID」
          <br />
          3. 保存配置后，点击「推送」上传本地数据到 Gist
          <br />
          4. 在另一台设备上配置相同的 Gist ID，点击「拉取」同步数据
          <br />
          5. 冲突时采用「最后写入胜出」策略
        </p>
      </div>

      {/* Danger zone */}
      {config.pat && (
        <div className="pt-3 border-t border-neutral-800">
          <button
            onClick={() => {
              clearConfig();
              setLocalPat('');
              setLocalGistId('');
              setLocalFilename('vibestudio-workspace.json');
              onMessage?.('配置已清除', 'info');
            }}
            className="text-xs text-neutral-600 hover:text-red-400"
          >
            清除同步配置
          </button>
        </div>
      )}
    </div>
  );
}
