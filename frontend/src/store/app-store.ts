import { create } from 'zustand';
import { Conversation } from '@/types/chat';
import { UserProfile } from '@/types/auth';
import { SettingsResponse } from '@/types/api';

interface AppState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

  selectedDocumentIds: string[];
  setSelectedDocumentIds: (ids: string[]) => void;
  toggleDocumentId: (id: string) => void;
  clearSelectedDocumentIds: () => void;

  ollamaOnline: boolean;
  ollamaChecked: boolean;
  setOllamaOnline: (online: boolean) => void;

  systemSettings: SettingsResponse | null;
  setSystemSettings: (settings: SettingsResponse) => void;

  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  activeConversationTitle: string | null;
  setActiveConversationTitle: (title: string | null) => void;

  conversations: Conversation[];
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conv: Conversation) => void;
  updateConversationTitleInStore: (id: string, title: string) => void;
  removeConversationFromStore: (id: string) => void;

  // Authentication State
  user: UserProfile | null;
  token: string | null;
  authChecked: boolean;
  isAuthModalOpen: boolean;
  setUser: (user: UserProfile | null) => void;
  setToken: (token: string | null) => void;
  setAuthChecked: (checked: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  sidebarWidth: 260,
  setSidebarWidth: (width) => set({ sidebarWidth: width }),

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

  systemSettings: null,
  setSystemSettings: (systemSettings) => set({ systemSettings }),

  activeConversationId: null,
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  activeConversationTitle: null,
  setActiveConversationTitle: (title) => set({ activeConversationTitle: title }),

  conversations: [],
  setConversations: (conversations) => set({ conversations }),
  addConversation: (conv) =>
    set((state) => ({
      conversations: [conv, ...state.conversations.filter((c) => c.id !== conv.id)],
    })),
  updateConversationTitleInStore: (id, title) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
      activeConversationTitle:
        state.activeConversationId === id ? title : state.activeConversationTitle,
    })),
  removeConversationFromStore: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      activeConversationId:
        state.activeConversationId === id ? null : state.activeConversationId,
      activeConversationTitle:
        state.activeConversationId === id ? null : state.activeConversationTitle,
    })),

  // Auth Store
  user: null,
  token: null,
  authChecked: false,
  isAuthModalOpen: false,
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('documind_token', token);
      else localStorage.removeItem('documind_token');
    }
    set({ token });
  },
  setAuthChecked: (authChecked) => set({ authChecked }),
  setIsAuthModalOpen: (isAuthModalOpen) => set({ isAuthModalOpen }),
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('documind_token');
    }
    set({
      user: null,
      token: null,
      conversations: [],
      selectedDocumentIds: [],
      activeConversationId: null,
      activeConversationTitle: null,
    });
  },
}));
