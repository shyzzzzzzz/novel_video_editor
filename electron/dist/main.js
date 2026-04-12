// electron/main.ts
import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import log from "electron-log";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
log.transports.file.level = "info";
log.transports.console.level = "debug";
log.info("VibeStudio starting...");
function validatePath(filePath) {
  const normalized = path.normalize(filePath);
  const allowedRoots = [app.getPath("userData"), app.getPath("documents"), app.getPath("temp")];
  const isAllowed = allowedRoots.some((root) => normalized.startsWith(root));
  if (!isAllowed) {
    throw new Error(`Access denied: path outside allowed directories`);
  }
  return normalized;
}
var isDev = process.env.NODE_ENV !== "production" && !app.isPackaged;
var mainWindow = null;
function createWindow() {
  log.info("Creating main window...");
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: "VibeStudio",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  if (isDev) {
    mainWindow.loadURL("http://localhost:1420");
    log.info("Loaded dev server at http://localhost:1420");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    log.info("Loaded production build");
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
ipcMain.handle("dialog:openFile", async (_, options) => {
  try {
    const { dialog } = await import("electron");
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      throw new Error("No focused window");
    }
    const result = await dialog.showOpenDialog(win, {
      properties: ["openFile"],
      filters: options?.filters
    });
    return result;
  } catch (err) {
    log.error("dialog:openFile error:", err);
    throw err;
  }
});
ipcMain.handle("fs:readFileBase64", async (_, filePath) => {
  try {
    const safePath = validatePath(filePath);
    const fs = await import("fs/promises");
    const buffer = await fs.readFile(safePath);
    return buffer.toString("base64");
  } catch (err) {
    log.error("fs:readFileBase64 error:", err);
    throw err;
  }
});
ipcMain.handle("fs:writeFile", async (_, filePath, data) => {
  try {
    const safePath = validatePath(filePath);
    const fs = await import("fs/promises");
    await fs.writeFile(safePath, data);
    return true;
  } catch (err) {
    log.error("fs:writeFile error:", err);
    throw err;
  }
});
ipcMain.handle("fs:exists", async (_, filePath) => {
  try {
    const safePath = validatePath(filePath);
    const fs = await import("fs");
    return fs.existsSync(safePath);
  } catch (err) {
    log.error("fs:exists error:", err);
    throw err;
  }
});
ipcMain.handle("app:getPath", async (_, name) => {
  return app.getPath(name);
});
app.whenReady().then(() => {
  log.info("App ready, creating window...");
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  log.info("All windows closed, quitting...");
  if (process.platform !== "darwin") {
    app.quit();
  }
});
