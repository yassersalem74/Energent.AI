import type { Message } from "ai";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

interface ChatStore {
  sessions: ChatSession[];
  currentSessionId: string | null;

  createSession: () => string;
  ensureSession: () => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  updateSessionMessages: (id: string, messages: Message[]) => void;
  updateSessionTitle: (id: string, title: string) => void;
}

const createEmptySession = (): ChatSession => {
  const id = crypto.randomUUID();

  return {
    id,
    title: "New Chat",
    messages: [],
    createdAt: Date.now(),
  };
};

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      createSession: () => {
        const session = createEmptySession();

        set((state) => ({
          sessions: [session, ...state.sessions],
          currentSessionId: session.id,
        }));

        return session.id;
      },

      ensureSession: () => {
        const { sessions, currentSessionId, createSession } = get();

        if (currentSessionId && sessions.some((session) => session.id === currentSessionId)) {
          return currentSessionId;
        }

        if (sessions.length > 0) {
          const firstSessionId = sessions[0].id;
          set({ currentSessionId: firstSessionId });
          return firstSessionId;
        }

        return createSession();
      },

      switchSession: (id) => set({ currentSessionId: id }),

      deleteSession: (id) =>
        set((state) => {
          const sessions = state.sessions.filter((session) => session.id !== id);

          return {
            sessions,
            currentSessionId:
              state.currentSessionId === id
                ? sessions[0]?.id ?? null
                : state.currentSessionId,
          };
        }),

      updateSessionMessages: (id, messages) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id
              ? {
                  ...session,
                  messages,
                  title:
                    session.title === "New Chat" && messages[0]?.role === "user"
                      ? messages[0].parts
                          ?.filter((part) => part.type === "text")
                          .map((part) => part.text)
                          .join(" ")
                          .slice(0, 40) || session.title
                      : session.title,
                }
              : session,
          ),
        })),

      updateSessionTitle: (id, title) =>
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === id ? { ...session, title } : session,
          ),
        })),
    }),
    {
      name: "chat-sessions",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
    },
  ),
);
