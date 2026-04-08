import { create } from "zustand";

export type EventStatus = "pending" | "success" | "error";

export type EventType =
  | "computer"
  | "click"
  | "type"
  | "navigate"
  | "screenshot"
  | "bash"
  | "scroll"
  | "keyboard"
  | "unknown";

export interface AgentEvent {
  id: string;
  type: EventType;
  timestamp: number;
  status: EventStatus;
  payload: unknown;
  duration?: number;
}

interface EventStore {
  events: AgentEvent[];

  addEvent: (event: AgentEvent) => void;
  updateEvent: (id: string, updates: Partial<AgentEvent>) => void;
  clearEvents: () => void;

  getCounts: () => Record<string, number>;
  getAgentStatus: () => string;
}

export const useEventStore = create<EventStore>((set, get) => ({
  events: [],

  addEvent: (event) =>
    set((state) => {
      const exists = state.events.some((e) => e.id === event.id);
      if (exists) return state;

      return {
        events: [...state.events, event],
      };
    }),

  updateEvent: (id, updates) =>
    set((state) => ({
      events: state.events.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  clearEvents: () => set({ events: [] }),

  getCounts: () => {
    const events = get().events;
    const counts: Record<string, number> = {};

    events.forEach((e) => {
      counts[e.type] = (counts[e.type] || 0) + 1;
    });

    return counts;
  },

  getAgentStatus: () => {
    const events = get().events;

    if (events.some((e) => e.status === "pending")) {
      return "working...";
    }

    if (events.length === 0) return "idle";

    return "done";
  },
}));
