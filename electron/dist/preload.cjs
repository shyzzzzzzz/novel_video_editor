"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  openFileDialog: (options) => import_electron.ipcRenderer.invoke("dialog:openFile", options || {}),
  readFileBase64: (filePath) => import_electron.ipcRenderer.invoke("fs:readFileBase64", filePath),
  writeFile: (filePath, data) => import_electron.ipcRenderer.invoke("fs:writeFile", filePath, data),
  fileExists: (filePath) => import_electron.ipcRenderer.invoke("fs:exists", filePath),
  getAppPath: (name) => import_electron.ipcRenderer.invoke("app:getPath", name),
  platform: process.platform
});
