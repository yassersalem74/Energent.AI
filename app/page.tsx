"use client";

import DebugPanel from "@/components/debug-panel";
import { AISDKLogo } from "@/components/icons";
import { Input } from "@/components/input";
import { PreviewMessage } from "@/components/message";
import { DeployButton, ProjectInfo } from "@/components/project-info";
import { PromptSuggestions } from "@/components/prompt-suggestions";
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { getDesktopURL } from "@/lib/sandbox/utils";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import { ABORTED, cn } from "@/lib/utils";
import { Message } from "ai";
import { useChat } from "@ai-sdk/react";
import {
  LayoutPanelTop,
  MessageSquareText,
  Monitor,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useChatStore } from "@/store/chatStore";
import { useEventStore } from "@/store/eventStore";

const FALLBACK_PREFIX = "Sandbox tools are running in fallback mode.";
const ANTHROPIC_BILLING_PATTERNS = [
  /credit balance is too low/i,
  /plans\s*&\s*billing/i,
  /purchase credits/i,
  /anthropic api/i,
];

const isAnthropicBillingError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return ANTHROPIC_BILLING_PATTERNS.some((pattern) => pattern.test(message));
};

const createBillingFallbackMessage = (): Message => {
  const toolCallId = crypto.randomUUID();

  return {
    id: `demo-${crypto.randomUUID()}`,
    role: "assistant",
    createdAt: new Date(),
    content:
      "Anthropic credits are unavailable right now, so the dashboard is showing a local demo run instead.",
    parts: [
      {
        type: "text",
        text:
          "Anthropic credits are unavailable right now, so the dashboard is showing a local demo run instead.",
      },
      {
        type: "tool-invocation",
        toolInvocation: {
          state: "call",
          step: 0,
          toolCallId,
          toolName: "computer",
          args: {
            action: "type",
            text: "youtube.com",
          },
        },
      },
      {
        type: "tool-invocation",
        toolInvocation: {
          state: "result",
          step: 0,
          toolCallId,
          toolName: "computer",
          args: {
            action: "type",
            text: "youtube.com",
          },
          result: {
            type: "text",
            text: "Navigation completed in demo mode.",
          },
        },
      },
    ],
  };
};

function SessionsNav({
  sessions,
  currentSessionId,
  onCreate,
  onSwitch,
  onDelete,
}: {
  sessions: { id: string; title: string; messages: unknown[] }[];
  currentSessionId: string | null;
  onCreate: () => void;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="border-b border-zinc-200 bg-[linear-gradient(135deg,#fff7ed_0%,#ffedd5_38%,#fde68a_100%)] px-4 py-4">
      <div className="rounded-2xl border border-black/10 bg-white/70 p-3 shadow-[0_12px_30px_-18px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Sessions
            </div>
            <div className="mt-1 text-sm font-medium text-zinc-800">
              Jump between chat threads like tabs
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={onCreate}
            className="rounded-full bg-zinc-950 px-3 text-white hover:bg-zinc-800"
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>

        <div className="-mx-1 mt-4 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2 px-1">
            {sessions.map((session) => {
              const isActive = session.id === currentSessionId;

              return (
                <div
                  key={session.id}
                  className={cn(
                    "group flex min-w-[170px] max-w-[220px] items-center gap-2 rounded-2xl border px-3 py-2 transition-all duration-200",
                    isActive
                      ? "border-zinc-950 bg-zinc-950 text-white shadow-[0_12px_20px_-16px_rgba(0,0,0,0.7)]"
                      : "border-white/80 bg-white/85 text-zinc-700 hover:border-orange-300 hover:bg-white",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSwitch(session.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                        isActive
                          ? "bg-white/12 text-white"
                          : "bg-orange-100 text-orange-700",
                      )}
                    >
                      <MessageSquareText className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {session.title}
                      </div>
                      <div
                        className={cn(
                          "truncate text-xs",
                          isActive ? "text-white/65" : "text-zinc-500",
                        )}
                      >
                        {session.messages.length} messages
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(session.id)}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                      isActive
                        ? "border-white/15 bg-red-500/18 text-red-200 hover:bg-red-500/28"
                        : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
                    )}
                    aria-label={`Delete ${session.title}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopPanel({
  isInitializing,
  streamUrl,
  desktopError,
  onRefresh,
  compact = false,
}: {
  isInitializing: boolean;
  streamUrl: string | null;
  desktopError: string | null;
  onRefresh: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-[radial-gradient(circle_at_top,#1f2937_0%,#0f172a_38%,#020617_100%)]",
        compact ? "rounded-[28px]" : "h-full",
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.1),transparent_30%)]" />

      <div className={cn("relative flex flex-col", compact ? "" : "h-full")}>
        <div
          className={cn(
            "flex items-center justify-between border-b border-white/10 text-white",
            compact ? "px-4 py-3" : "px-5 py-4",
          )}
        >
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
              <Monitor className="h-3.5 w-3.5" />
              Desktop Stage
            </div>
            <div className="mt-1 text-sm text-white/80">
              Visual workspace for browser automation
            </div>
          </div>

          <Button
            onClick={onRefresh}
            className={cn(
              "rounded-full border border-white/10 bg-white/10 text-white backdrop-blur hover:bg-white/15",
              compact ? "h-9 px-3 text-xs" : "",
            )}
            disabled={isInitializing}
          >
            {isInitializing ? "Creating..." : "New desktop"}
          </Button>
        </div>

        <div className={cn("relative", compact ? "p-3" : "flex-1 p-4")}>
          {streamUrl ? (
            <div
              className={cn(
                "overflow-hidden rounded-[28px] border border-white/10 bg-black/40 p-2 shadow-[0_30px_60px_-36px_rgba(0,0,0,0.85)] backdrop-blur",
                compact ? "aspect-[16/10] w-full" : "h-full",
              )}
            >
              <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-white/10 bg-black">
                <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs text-white/45">
                    Live preview
                  </span>
                </div>
                <iframe
                  src={streamUrl}
                  className="h-full w-full"
                  allow="autoplay"
                />
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "flex items-center justify-center",
                compact ? "py-3" : "h-full",
              )}
            >
              <div
                className={cn(
                  "rounded-[32px] border border-white/10 bg-white/6 text-center text-white shadow-[0_30px_60px_-36px_rgba(0,0,0,0.8)] backdrop-blur",
                  compact
                    ? "max-w-md px-5 py-6"
                    : "max-w-lg px-8 py-10",
                )}
              >
                <div
                  className={cn(
                    "mx-auto flex items-center justify-center rounded-2xl bg-amber-300/12 text-amber-200",
                    compact ? "h-14 w-14" : "h-16 w-16",
                  )}
                >
                  <Monitor className="h-8 w-8" />
                </div>
                <div
                  className={cn(
                    "font-semibold",
                    compact ? "mt-4 text-xl" : "mt-5 text-2xl",
                  )}
                >
                  {isInitializing
                    ? "Initializing desktop..."
                    : "Desktop unavailable"}
                </div>
                <p
                  className={cn(
                    "text-white/70",
                    compact ? "mt-2 text-sm leading-6" : "mt-3 text-sm leading-7",
                  )}
                >
                  {desktopError ??
                    "The remote desktop is not connected yet. Once available, it will appear here with a live browser preview."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ChatWorkspace({
  messages,
  isLoading,
  status,
  containerRef,
  endRef,
  input,
  handleInputChange,
  handleSubmit,
  isInitializing,
  stop,
}: {
  messages: Parameters<typeof PreviewMessage>[0]["message"][];
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  containerRef: ReturnType<typeof useScrollToBottom>[0];
  endRef: ReturnType<typeof useScrollToBottom>[1];
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event?: { preventDefault?: () => void }) => void;
  isInitializing: boolean;
  stop: () => void;
}) {
  return (
    <div className="min-h-0 flex-1 px-4 py-4">
      <div className="flex h-full flex-col overflow-hidden rounded-[34px] border border-black/10 bg-white/65 shadow-[0_30px_60px_-40px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="border-b border-zinc-200/80 bg-[linear-gradient(135deg,#fff8e8_0%,#fff2d2_100%)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                <LayoutPanelTop className="h-3.5 w-3.5 text-amber-500" />
                Conversation Stage
              </div>
              <div className="mt-1 text-sm text-zinc-700">
                Requests, responses, and agent context in one focused flow
              </div>
            </div>
            <div className="rounded-full bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white">
              {messages.length} messages
            </div>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#fffdfa_0%,#fff8eb_100%)] px-4 py-5"
          ref={containerRef}
        >
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            {messages.length === 0 ? <ProjectInfo /> : null}
            {messages.map((message, i) => (
              <PreviewMessage
                message={message}
                key={message.id}
                isLoading={isLoading}
                status={status}
                isLatestMessage={i === messages.length - 1}
              />
            ))}
            <div ref={endRef} className="pb-2" />
          </div>
        </div>

        <div className="border-t border-zinc-200 bg-[linear-gradient(180deg,#fff6e6_0%,#fffaf2_100%)] px-4 py-4">
          <form onSubmit={handleSubmit} className="mx-auto w-full max-w-4xl">
            <Input
              handleInputChange={handleInputChange}
              input={input}
              isInitializing={isInitializing}
              isLoading={isLoading}
              status={status}
              stop={stop}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [desktopContainerRef, desktopEndRef] = useScrollToBottom();
  const [mobileContainerRef, mobileEndRef] = useScrollToBottom();

  const [isInitializing, setIsInitializing] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [desktopError, setDesktopError] = useState<string | null>(null);
  const addEvent = useEventStore((s) => s.addEvent);
  const sessions = useChatStore((s) => s.sessions);
  const currentSessionId = useChatStore((s) => s.currentSessionId);
  const ensureSession = useChatStore((s) => s.ensureSession);
  const createSession = useChatStore((s) => s.createSession);
  const switchSession = useChatStore((s) => s.switchSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const updateSessionMessages = useChatStore((s) => s.updateSessionMessages);
  const activeSession =
    sessions.find((session) => session.id === currentSessionId) ?? null;
  const lastSyncedSessionIdRef = useRef<string | null>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop: stopGeneration,
    append,
    setMessages,
  } = useChat({
    api: "/api/chat",
    id: currentSessionId ?? undefined,
    body: {
      sandboxId,
      sessionId: currentSessionId,
    },
    maxSteps: 30,
    onError: (error) => {
      console.error(error);

      if (isAnthropicBillingError(error)) {
        setMessages((prev) => {
          const lastMessage = prev.at(-1);

          if (lastMessage?.id.startsWith("demo-")) {
            return prev;
          }

          return [...prev, createBillingFallbackMessage()];
        });

        toast.warning("Anthropic credits unavailable", {
          description: "Showing a local demo tool run so the dashboard stays usable.",
          richColors: true,
          position: "top-center",
        });
        return;
      }

      toast.error("There was an error", {
        description: "Please try again later.",
        richColors: true,
        position: "top-center",
      });
    },
  });

  const stop = () => {
    stopGeneration();

    const lastMessage = messages.at(-1);
    const lastMessageLastPart = lastMessage?.parts.at(-1);
    if (
      lastMessage?.role === "assistant" &&
      lastMessageLastPart?.type === "tool-invocation"
    ) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          ...lastMessage,
          parts: [
            ...lastMessage.parts.slice(0, -1),
            {
              ...lastMessageLastPart,
              toolInvocation: {
                ...lastMessageLastPart.toolInvocation,
                state: "result",
                result: ABORTED,
              },
            },
          ],
        },
      ]);
    }
  };

  const isLoading = status !== "ready";

  useEffect(() => {
    ensureSession();
  }, [ensureSession]);

  useEffect(() => {
    if (!currentSessionId || !activeSession) {
      return;
    }

    if (lastSyncedSessionIdRef.current === currentSessionId) {
      return;
    }

    setMessages(activeSession.messages);
    lastSyncedSessionIdRef.current = currentSessionId;
  }, [activeSession, currentSessionId, setMessages]);

  useEffect(() => {
    if (!currentSessionId) {
      return;
    }

    updateSessionMessages(currentSessionId, messages);
  }, [currentSessionId, messages, updateSessionMessages]);

  const refreshDesktop = async () => {
    try {
      setIsInitializing(true);
      const { streamUrl, id, error } = await getDesktopURL(
        sandboxId || undefined,
      );
      setDesktopError(error);
      setStreamUrl(streamUrl);
      setSandboxId(id);
    } catch (err) {
      console.error("Failed to refresh desktop:", err);
      setStreamUrl(null);
      setDesktopError(
        err instanceof Error ? err.message : "Failed to refresh desktop",
      );
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (!sandboxId) return;

    const killDesktop = () => {
      if (!sandboxId) return;

      navigator.sendBeacon(
        `/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}`,
      );
    };

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS || isSafari) {
      window.addEventListener("pagehide", killDesktop);

      return () => {
        window.removeEventListener("pagehide", killDesktop);
        killDesktop();
      };
    }

    window.addEventListener("beforeunload", killDesktop);

    return () => {
      window.removeEventListener("beforeunload", killDesktop);
      killDesktop();
    };
  }, [sandboxId]);

  const handleCreateSession = () => {
    const sessionId = createSession();
    lastSyncedSessionIdRef.current = null;
    setMessages([]);
    switchSession(sessionId);
  };

  const handleSwitchSession = (sessionId: string) => {
    if (sessionId === currentSessionId) {
      return;
    }

    lastSyncedSessionIdRef.current = null;
    switchSession(sessionId);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (sessions.length === 1) {
      const newSessionId = createSession();
      deleteSession(sessionId);
      lastSyncedSessionIdRef.current = null;
      setMessages([]);
      switchSession(newSessionId);
      return;
    }

    deleteSession(sessionId);
    lastSyncedSessionIdRef.current = null;
  };

  useEffect(() => {
    const lastMessage = messages.at(-1);

    if (lastMessage?.role !== "assistant") {
      return;
    }

    const fallbackText = lastMessage.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim();

    if (!fallbackText?.startsWith(FALLBACK_PREFIX)) {
      return;
    }

    addEvent({
      id: `fallback-${lastMessage.id}`,
      type: "unknown",
      timestamp: Date.now(),
      status: "success",
      payload: {
        mode: "fallback",
        text: fallbackText,
      },
    });
  }, [addEvent, messages]);

  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);

        const { streamUrl, id, error } = await getDesktopURL(
          sandboxId ?? undefined,
        );

        setDesktopError(error);
        setStreamUrl(streamUrl);
        setSandboxId(id);
      } catch (err) {
        console.error("Failed to initialize desktop:", err);
        setStreamUrl(null);
        setDesktopError(
          err instanceof Error ? err.message : "Failed to initialize desktop",
        );
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [sandboxId]);

  return (
    <div className="relative flex min-h-dvh bg-[linear-gradient(180deg,#fffaf2_0%,#fff6ea_45%,#fff9f4_100%)] xl:h-dvh">
      <div className="hidden w-full xl:block">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel
            defaultSize={40}
            minSize={30}
            className="flex flex-col border-r border-zinc-200/70 bg-[linear-gradient(180deg,#fffefb_0%,#fff8ee_100%)]"
          >
            <div className="border-b border-zinc-200/80 bg-white/80 px-4 py-4 backdrop-blur">
              <div className="flex items-center justify-between">
                <AISDKLogo />
                <DeployButton />
              </div>
            </div>

            <SessionsNav
              sessions={sessions}
              currentSessionId={currentSessionId}
              onCreate={handleCreateSession}
              onSwitch={handleSwitchSession}
              onDelete={handleDeleteSession}
            />

            <ChatWorkspace
              messages={messages}
              isLoading={isLoading}
              status={status}
              containerRef={desktopContainerRef}
              endRef={desktopEndRef}
              input={input}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
              isInitializing={isInitializing}
              stop={stop}
            />

            <div className="h-[320px] shrink-0 border-t border-zinc-200/80 xl:h-[300px]">
              <DebugPanel />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={60} minSize={40} className="relative">
            <DesktopPanel
              isInitializing={isInitializing}
              streamUrl={streamUrl}
              desktopError={desktopError}
              onRefresh={refreshDesktop}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="flex min-h-dvh w-full flex-col overflow-y-auto xl:hidden">
        <div className="border-b border-zinc-200/80 bg-white/80 px-4 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <AISDKLogo />
            <DeployButton />
          </div>
        </div>

        <SessionsNav
          sessions={sessions}
          currentSessionId={currentSessionId}
          onCreate={handleCreateSession}
          onSwitch={handleSwitchSession}
          onDelete={handleDeleteSession}
        />

        <ChatWorkspace
          messages={messages}
          isLoading={isLoading}
          status={status}
          containerRef={mobileContainerRef}
          endRef={mobileEndRef}
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isInitializing={isInitializing}
          stop={stop}
        />

        {messages.length === 0 && (
          <PromptSuggestions
            disabled={isInitializing}
            submitPrompt={(prompt: string) =>
              append({ role: "user", content: prompt })
            }
          />
        )}

        <div className="border-t border-zinc-200/80 bg-[linear-gradient(180deg,#fffdf8_0%,#fff4df_100%)] px-4 py-4">
          <DesktopPanel
            isInitializing={isInitializing}
            streamUrl={streamUrl}
            desktopError={desktopError}
            onRefresh={refreshDesktop}
            compact
          />
        </div>

        <div className="h-[320px] shrink-0 border-t border-zinc-200/80">
          <DebugPanel />
        </div>
      </div>
    </div>
  );
}
