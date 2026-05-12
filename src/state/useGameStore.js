import { create } from "zustand";

const initialState = {
  phase: 0,
  fragments: [],
  items: [],
  branch: null,
  timeline: [],
};

export const useGameStore = create((set, get) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  addFragment: (fragment) =>
    set((state) => ({
      fragments: state.fragments.includes(fragment)
        ? state.fragments
        : [...state.fragments, fragment],
    })),
  addItem: (item) =>
    set((state) => ({
      items: state.items.includes(item) ? state.items : [...state.items, item],
    })),
  setBranch: (branch) => set({ branch }),
  logEvent: (event) =>
    set((state) => ({
      timeline: [...state.timeline, { ...event, ts: Date.now() }],
    })),
  resetGame: () => set({ ...initialState }),
}));
