"use client";

import { useEventStore } from "@/store/eventStore";

export default function DebugPanel() {
  // ✅ خد events بس من store
  const events = useEventStore((s) => s.events);

  // ✅ احسب derived state هنا مش جوه store
  const counts = events.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const status =
    events.some((e) => e.status === "pending")
      ? "working..."
      : events.length === 0
      ? "idle"
      : "done";

  return (
    <div className="p-3 text-xs bg-black text-green-400 h-60 overflow-auto">
      <div>🧠 Agent Status: {status}</div>

      <div className="mt-2">
        <strong>📊 Counts:</strong>
        <pre>{JSON.stringify(counts, null, 2)}</pre>
      </div>

      <div className="mt-2">
        <strong>📜 Events:</strong>
        <pre>{JSON.stringify(events, null, 2)}</pre>
      </div>
    </div>
  );
}