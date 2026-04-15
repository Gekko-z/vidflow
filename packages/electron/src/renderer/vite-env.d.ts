/// <reference types="vite/client" />

interface ElectronAPI {
  getCookies: (domain: string) => Promise<string>;
  download: (task: { url: string; saveDir: string }) => Promise<{ success: boolean; message: string }>;
  openLoginWindow: () => Promise<{ success: boolean }>;
  checkLoginStatus: () => Promise<{ isLoggedIn: boolean }>;
  onLoginSuccess: (callback: () => void) => void;
  onDownloadProgress: (
    callback: (data: { filename: string; progress: number; state: string; error?: string }) => void,
  ) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
