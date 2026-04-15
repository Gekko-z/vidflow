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
  getCredentialsInfo: () => Promise<{
    isLoggedIn: boolean;
    cookieNames?: string[];
    auth_token_preview?: string;
    ct0_preview?: string;
    cookie_length?: number;
  }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
