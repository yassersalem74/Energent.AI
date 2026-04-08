import { create } from "zustand";

interface ChatSession {
  id: string;
  title: string;
}

interface ChatStore {
  sessions: ChatSession[];
  currentSessionId: string | null;

  createSession: () => void;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  sessions: [],
  currentSessionId: null,

  createSession: () =>
    set((state) => {
      const id = crypto.randomUUID();
      return {
        sessions: [...state.sessions, { id, title: "New Chat" }],
        currentSessionId: id,
      };
    }),

  switchSession: (id) => set({ currentSessionId: id }),

  deleteSession: (id) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      currentSessionId:
        state.currentSessionId === id ? null : state.currentSessionId,
    })),
}));