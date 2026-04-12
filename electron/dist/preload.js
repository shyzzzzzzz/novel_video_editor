import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    openFileDialog: (options) => ipcRenderer.invoke('dialog:openFile', options || {}),
    readFileBase64: (filePath) => ipcRenderer.invoke('fs:readFileBase64', filePath),
    writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
    fileExists: (filePath) => ipcRenderer.invoke('fs:exists', filePath),
    getAppPath: (name) => ipcRenderer.invoke('app:getPath', name),
    platform: process.platform,
});
