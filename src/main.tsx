import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useWorkspaceStore } from './stores/workspaceStore';
import { useNovelStore } from './stores/novelStore';
import { useKnowledgeStore } from './stores/knowledgeStore';
import { useProductionStore } from './stores/productionStore';
import { useStoryboardStore } from './stores/storyboardStore';
import { useAudioStore } from './stores/audioStore';
import { useTimelineStore } from './stores/timelineStore';
import { useReviewStore } from './stores/reviewStore';
import { useSettingsStore } from './stores/settingsStore';

async function loadPersistedStores() {
  await Promise.all([
    useWorkspaceStore.getState().load(),
    useNovelStore.getState().load(),
    useKnowledgeStore.getState().load(),
    useProductionStore.getState().load(),
    useStoryboardStore.getState().load(),
    useAudioStore.getState().load(),
    useTimelineStore.getState().load(),
    useReviewStore.getState().load(),
    useSettingsStore.getState().load(),
  ]);
}

// 启动时加载持久化数据
loadPersistedStores();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
