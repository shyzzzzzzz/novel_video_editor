import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import log from 'electron-log';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Configure logging
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('VibeStudio starting...');
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
let mainWindow = null;
function createWindow() {
    log.info('Creating main window...');
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        title: 'VibeStudio',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:1420');
        mainWindow.webContents.openDevTools();
        log.info('Loaded dev server at http://localhost:1420');
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        log.info('Loaded production build');
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// IPC: open file dialog
ipcMain.handle('dialog:openFile', async (_, options) => {
    const { dialog } = await import('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: options.filters,
    });
    return result;
});
// IPC: read file as base64
ipcMain.handle('fs:readFileBase64', async (_, filePath) => {
    const fs = await import('fs/promises');
    const buffer = await fs.readFile(filePath);
    return buffer.toString('base64');
});
// IPC: write file
ipcMain.handle('fs:writeFile', async (_, filePath, data) => {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, data);
    return true;
});
// IPC: check if file exists
ipcMain.handle('fs:exists', async (_, filePath) => {
    const fs = await import('fs');
    return fs.existsSync(filePath);
});
// IPC: get app data path
ipcMain.handle('app:getPath', async (_, name) => {
    return app.getPath(name);
});
app.whenReady().then(() => {
    log.info('App ready, creating window...');
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
app.on('window-all-closed', () => {
    log.info('All windows closed, quitting...');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
