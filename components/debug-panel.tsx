"use client";

import { useEventStore } from "@/store/eventStore";
import { Activity, CheckCircle2, Clock3, Gauge, Sparkles } from "lucide-react";

const statusTone = {
  idle: "bg-zinc-100 text-zinc-700 border-zinc-200",
  "working...": "bg-amber-100 text-amber-800 border-amber-200",
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
} as const;

export default function DebugPanel() {
  const events = useEventStore((s) => s.events);

  const countsByType = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countsByStatus = events.reduce((acc, event) => {
    acc[event.status] = (acc[event.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const agentStatus =
    events.some((event) => event.status === "pending")
      ? "working..."
      : events.length === 0
      ? "idle"
      : "done";

  const topTypes = Object.entries(countsByType).sort((a, b) => b[1] - a[1]);

  return (
    <div className="h-full overflow-hidden bg-[linear-gradient(180deg,#fffaf0_0%,#fff2d8_100%)] p-3 sm:p-4">
      <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-black/10 bg-white/80 shadow-[0_18px_50px_-30px_rgba(0,0,0,0.45)] backdrop-blur">
        <div className="border-b border-zinc-200/80 bg-[radial-gradient(circle_at_top_left,#fde68a,transparent_35%),linear-gradient(135deg,#1f2937_0%,#111827_65%,#0f172a_100%)] px-4 py-4 text-white sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/65">
                <Sparkles className="h-3.5 w-3.5" />
                Agent Pulse
              </div>
              <div className="mt-2 text-lg font-semibold sm:text-xl">
                Runtime activity at a glance
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium ${
                statusTone[agentStatus]
              }`}
            >
              <Activity className="h-4 w-4" />
              {agentStatus}
            </div>
          </div>
        </div>

        <div className="grid shrink-0 gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              <Gauge className="h-4 w-4" />
              Total Events
            </div>
            <div className="mt-3 text-3xl font-semibold text-zinc-900">
              {events.length}
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              Logged actions across this chat state
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Success
            </div>
            <div className="mt-3 text-3xl font-semibold text-emerald-900">
              {countsByStatus.success ?? 0}
            </div>
            <div className="mt-1 text-sm text-emerald-700/80">
              Completed events in the current run
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              <Clock3 className="h-4 w-4" />
              Pending
            </div>
            <div className="mt-3 text-3xl font-semibold text-amber-900">
              {countsByStatus.pending ?? 0}
            </div>
            <div className="mt-1 text-sm text-amber-700/80">
              Events still waiting to finish
            </div>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 border-t border-zinc-200/80 bg-white/70 p-4 lg:grid-cols-[0.9fr_1.4fr] lg:p-5">
          <div className="min-h-0">
            <div className="flex h-full min-h-0 flex-col rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Type Breakdown
              </div>

              <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
                {topTypes.length > 0 ? (
                  topTypes.map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
                    >
                      <span className="font-medium capitalize text-zinc-700">
                        {type}
                      </span>
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                        {count}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-300 bg-white/80 px-3 py-4 text-sm text-zinc-500">
                    No event types yet. Fallback-only replies will start filling
                    this once events are emitted.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-2xl border border-zinc-200 bg-zinc-950 text-zinc-100">
            <div className="shrink-0 border-b border-white/10 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Event Feed
              </div>
              <div className="mt-1 text-sm text-zinc-300">
                Latest activity snapshots from the agent loop
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-4">
              {events.length > 0 ? (
                [...events].reverse().map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-medium capitalize text-white">
                        {event.type}
                      </div>
                      <div className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-zinc-300">
                        {event.status}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-zinc-400">
                      {event.duration != null
                        ? `${event.duration} ms`
                        : "No duration yet"}
                    </div>

                    <pre className="mt-3 overflow-x-auto rounded-xl bg-black/30 p-3 text-[11px] leading-5 text-emerald-300">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-zinc-400">
                  No events yet. Once the agent emits actions, they will appear
                  here in a readable feed.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
