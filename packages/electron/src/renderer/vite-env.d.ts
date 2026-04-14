/// <reference types="vite/client" />

interface ElectronAPI {
  getCookies: (domain: string) => Promise<string>;
  download: (task: unknown) => Promise<{ success: boolean; message: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
