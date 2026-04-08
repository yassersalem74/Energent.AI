"use client";

import { useEventStore } from "@/store/eventStore";
import { useEffect } from "react";
import type { Message } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import equal from "fast-deep-equal";
import { Streamdown } from "streamdown";

import { ABORTED, cn } from "@/lib/utils";
import {
  Camera,
  CheckCircle,
  CircleSlash,
  Clock,
  Keyboard,
  KeyRound,
  Loader2,
  MousePointer,
  MousePointerClick,
  ScrollText,
  StopCircle,
} from "lucide-react";

function ToolEventHandler({
  toolInvocation,
}: {
  toolInvocation: any;
}) {
  const addEvent = useEventStore((s) => s.addEvent);
  const updateEvent = useEventStore((s) => s.updateEvent);

  const { toolName, toolCallId, state, args } = toolInvocation;

  const getEventType = () => {
    if (toolName === "bash") {
      return "bash" as const;
    }

    if (toolName !== "computer") {
      return "unknown" as const;
    }

    switch (args?.action) {
      case "left_click":
      case "double_click":
      case "right_click":
      case "mouse_move":
      case "left_click_drag":
        return "click" as const;
      case "type":
        return "type" as const;
      case "screenshot":
        return "screenshot" as const;
      case "scroll":
        return "scroll" as const;
      case "key":
        return "keyboard" as const;
      default:
        return "unknown" as const;
    }
  };

  useEffect(() => {
    if (!toolCallId) return;

    const exists = useEventStore
      .getState()
      .events.some((e) => e.id === toolCallId);

    if (state === "call" && !exists) {
      addEvent({
        id: toolCallId,
        type: toolName,
        timestamp: Date.now(),
        status: "pending",
        payload: args,
      });
    }

    if (state === "result") {
      const currentEvent = useEventStore
        .getState()
        .events.find((event) => event.id === toolCallId);

      updateEvent(toolCallId, {
        status: "success",
        duration: currentEvent ? Date.now() - currentEvent.timestamp : undefined,
      });
    }
  }, [addEvent, args, state, toolCallId, toolName, updateEvent]);

  return null;
}

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
}: {
  message: Message;
  isLoading: boolean;
  status: "error" | "submitted" | "streaming" | "ready";
  isLatestMessage: boolean;
}) => {
  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="group/message mx-auto w-full px-4"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex w-full gap-4 group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            "group-data-[role=user]/message:w-fit"
          )}
        >
          <div className="flex w-full flex-col">
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex w-full flex-row items-start gap-2 pb-4"
                    >
                      <div
                        className={cn(
                          "flex flex-col gap-4 rounded-[24px] border px-4 py-3 shadow-[0_14px_28px_-24px_rgba(0,0,0,0.35)]",
                          message.role === "user"
                            ? "border-zinc-900 bg-zinc-950 text-white"
                            : "border-amber-100 bg-[linear-gradient(135deg,#fffdf7_0%,#fff4dd_100%)] text-zinc-800",
                        )}
                      >
                        <Streamdown>{part.text}</Streamdown>
                      </div>
                    </motion.div>
                  );

                case "tool-invocation": {
                  const { toolName, toolCallId, state, args } =
                    part.toolInvocation;

                  if (toolName === "computer") {
                    const {
                      action,
                      coordinate,
                      text,
                      duration,
                      scroll_amount,
                      scroll_direction,
                    } = args;

                    let actionLabel = "";
                    let actionDetail = "";
                    let ActionIcon: any = null;

                    switch (action) {
                      case "screenshot":
                        actionLabel = "Taking screenshot";
                        ActionIcon = Camera;
                        break;
                      case "left_click":
                        actionLabel = "Left clicking";
                        actionDetail = coordinate
                          ? `at (${coordinate[0]}, ${coordinate[1]})`
                          : "";
                        ActionIcon = MousePointer;
                        break;
                      case "type":
                        actionLabel = "Typing";
                        actionDetail = text ? `"${text}"` : "";
                        ActionIcon = Keyboard;
                        break;
                      default:
                        actionLabel = action;
                        ActionIcon = MousePointer;
                        break;
                    }

                    return (
                      <>
                        <ToolEventHandler
                          toolInvocation={part.toolInvocation}
                        />

                        <motion.div
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          key={`message-${message.id}-part-${i}`}
                          className="mb-3 flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-3 text-sm shadow-sm"
                        >
                          <div className="flex items-center gap-2">
                            {ActionIcon && (
                              <ActionIcon className="w-4 h-4" />
                            )}
                            <span>{actionLabel}</span>
                            {actionDetail && <span>{actionDetail}</span>}
                          </div>

                          <div>
                            {state === "call" ? (
                              <Loader2 className="animate-spin w-4 h-4" />
                            ) : state === "result" ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : null}
                          </div>
                        </motion.div>
                      </>
                    );
                  }

                  return null;
                }

                default:
                  return null;
              }
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.status !== nextProps.status) return false;
    if (prevProps.message.annotations !== nextProps.message.annotations)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts))
      return false;

    return true;
  }
);
