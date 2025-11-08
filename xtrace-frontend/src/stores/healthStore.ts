import { create } from 'zustand';

type HealthStatus = 'pending' | 'online' | 'offline';

interface HealthState {
  status: HealthStatus;
  setStatus: (status: HealthStatus) => void;
}

export const useHealthStore = create<HealthState>((set) => ({
  status: 'pending', // Start as 'pending'
  setStatus: (status) => set({ status: status }),
}));