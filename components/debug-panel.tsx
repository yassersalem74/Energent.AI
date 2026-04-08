"use client";

import { useEventStore } from "@/store/eventStore";

export default function DebugPanel() {
  const events = useEventStore((s) => s.events);

  const countsByType = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countsByStatus = events.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const summary = {
    total: events.length,
    byType: countsByType,
    byStatus: countsByStatus,
  };

  const agentStatus =
    events.some((e) => e.status === "pending")
      ? "working..."
      : events.length === 0
      ? "idle"
      : "done";

  return (
    <div className="p-3 text-xs bg-black text-green-400 h-60 overflow-auto">
      <div>🧠 Agent Status: {agentStatus}</div>

      <div className="mt-2">
        <strong>🔢 Summary:</strong>
        <pre>{JSON.stringify(summary, null, 2)}</pre>
      </div>

      <div className="mt-2">
        <strong>📊 Counts:</strong>
        <pre>{JSON.stringify(countsByType, null, 2)}</pre>
      </div>

      <div className="mt-2">
        <strong>📜 Events:</strong>
        <pre>
          {events.length > 0
            ? JSON.stringify(events, null, 2)
            : "No tool events yet. In current fallback mode, the chat is returning text only, so no tool-invocation events are emitted."}
        </pre>
      </div>
    </div>
  );
}
