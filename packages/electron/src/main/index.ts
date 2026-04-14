import { app, BrowserWindow, session } from 'electron';
import * as path from 'node:path';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  // In development, load from Vite dev server
  // In production, load built files
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Get cookies for a specific domain from the Electron session.
 * This replaces browser_cookie3 in f2.
 */
export async function getCookiesForDomain(domain: string): Promise<string> {
  const cookies = await session.defaultSession.cookies.get({ domain });
  return cookies.map((c) => `${c.name}=${c.value}`).join('; ');
}

/**
 * Handle IPC calls from the renderer process.
 */
import { ipcMain } from 'electron';

ipcMain.handle('get-cookies', async (_event, domain: string) => {
  try {
    return await getCookiesForDomain(domain);
  } catch (error) {
    return '';
  }
});

ipcMain.handle('download', async (_event, task: unknown) => {
  // TODO: Wire up @vidflow/core downloader
  console.log('Download task:', task);
  return { success: false, message: 'Not implemented yet' };
});
