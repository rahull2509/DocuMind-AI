import { create } from 'zustand';

interface AppState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  selectedDocumentIds: string[];
  setSelectedDocumentIds: (ids: string[]) => void;
  toggleDocumentId: (id: string) => void;
  clearSelectedDocumentIds: () => void;

  ollamaOnline: boolean;
  ollamaChecked: boolean;
  setOllamaOnline: (online: boolean) => void;

  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  selectedDocumentIds: [],
  setSelectedDocumentIds: (ids) => set({ selectedDocumentIds: ids }),
  toggleDocumentId: (id) =>
    set((state) => {
      const exists = state.selectedDocumentIds.includes(id);
      return {
        selectedDocumentIds: exists
          ? state.selectedDocumentIds.filter((d) => d !== id)
          : [...state.selectedDocumentIds, id],
      };
    }),
  clearSelectedDocumentIds: () => set({ selectedDocumentIds: [] }),

  ollamaOnline: false,
  ollamaChecked: false,
  setOllamaOnline: (online) => set({ ollamaOnline: online, ollamaChecked: true }),

  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
}));
