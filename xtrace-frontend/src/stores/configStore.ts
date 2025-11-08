import { create } from 'zustand';

interface ConfigState {
  /**
   * Base URL for the backend API
   * @default 'http://localhost:8080'
   */
  backendBaseUrl: string;
  
  /**
   * Client-side request timeout in milliseconds
   * @default 20000 (20s)
   */
  requestTimeout: number;

  // Actions
  setBackendBaseUrl: (url: string) => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  // Defaults from the plan
  backendBaseUrl: 'http://localhost:8080',
  requestTimeout: 20000, 

  // --- ACTIONS ---
  setBackendBaseUrl: (url) => set({ backendBaseUrl: url }),
}));