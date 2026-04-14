import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getCookies: (domain: string) => ipcRenderer.invoke('get-cookies', domain),
  download: (task: unknown) => ipcRenderer.invoke('download', task),
});
