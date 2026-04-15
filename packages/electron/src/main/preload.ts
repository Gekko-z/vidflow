import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getCookies: (domain: string) => ipcRenderer.invoke('get-cookies', domain),
  download: (task: { url: string; saveDir: string }) =>
    ipcRenderer.invoke('download', task),
  openLoginWindow: () => ipcRenderer.invoke('open-login-window'),
  checkLoginStatus: () => ipcRenderer.invoke('check-login-status'),
  onLoginSuccess: (callback: () => void) => {
    ipcRenderer.on('login-success', () => callback());
  },
  onDownloadProgress: (
    callback: (data: {
      filename: string;
      progress: number;
      state: string;
      error?: string;
    }) => void,
  ) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data));
  },
  getCredentialsInfo: () => ipcRenderer.invoke('get-credentials-info'),
});
