import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options?: { filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:openFile', options || {}),
  readFileBase64: (filePath: string) => ipcRenderer.invoke('fs:readFileBase64', filePath),
  writeFile: (filePath: string, data: string | ArrayBuffer) =>
    ipcRenderer.invoke('fs:writeFile', filePath, data),
  fileExists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
  getAppPath: (name: 'userData' | 'documents' | 'temp') =>
    ipcRenderer.invoke('app:getPath', name),
  platform: process.platform,
});
