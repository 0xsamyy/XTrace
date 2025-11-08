import { create } from 'zustand';

interface NavState {
  history: string[];
  push: (addr: string) => void;
  back: () => string | null;
  home: () => string | null;
  jumpTo: (addr: string) => string | null;
  clearTo: (addr: string) => void;
}

export const useNavigationStore = create<NavState>((set, get) => ({
  history: [],
  push: (addr) => {
    const h = get().history;
    if (h[h.length - 1] !== addr) set({ history: [...h, addr] });
  },
  back: () => {
    const h = get().history;
    if (h.length <= 1) return null;
    const nh = h.slice(0, -1);
    set({ history: nh });
    return nh[nh.length - 1];
  },
  home: () => {
    const h = get().history;
    if (h.length === 0) return null;
    const first = h[0];
    set({ history: [first] });
    return first;
  },
  jumpTo: (addr) => {
    const h = get().history;
    const idx = h.indexOf(addr);
    if (idx === -1) return null;
    const nh = h.slice(0, idx + 1);
    set({ history: nh });
    return addr;
  },
  clearTo: (addr) => set({ history: [addr] }),
}));