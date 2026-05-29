import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useAppStore = create(
  persist(
    (set) => ({
      prijmy: [],
      vydaje: [],
      filtryPrijem: { kategorie: 'vse-prijem', mesic: 'vse-mesic' },
      filtrVydaj: { kategorie: 'vse', mesic: 'vse-mesic' },
      budget: 10000,

      addPrijem: (data) =>
        set((state) => ({
          prijmy: [
            ...state.prijmy,
            {
              id: generateId(),
              ...data,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removePrijem: (id) =>
        set((state) => ({
          prijmy: state.prijmy.filter((p) => p.id !== id),
        })),

      addVydaj: (data) =>
        set((state) => ({
          vydaje: [
            ...state.vydaje,
            {
              id: generateId(),
              ...data,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removeVydaj: (id) =>
        set((state) => ({
          vydaje: state.vydaje.filter((v) => v.id !== id),
        })),

      setFiltrPrijem: (filtry) =>
        set((state) => ({
          filtryPrijem: { ...state.filtryPrijem, ...filtry },
        })),

      setFiltrVydaj: (filtry) =>
        set((state) => ({
          filtrVydaj: { ...state.filtrVydaj, ...filtry },
        })),

      setBudget: (amount) => set({ budget: amount }),

      clearAll: () => set({ prijmy: [], vydaje: [] }),
    }),
    {
      name: 'evidence-vydaju-store',
    }
  )
);
