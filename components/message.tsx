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

/* ✅ الحل الصح: component منفصل للهاندل */
function ToolEventHandler({
  toolInvocation,
}: {
  toolInvocation: any;
}) {
  const addEvent = useEventStore((s) => s.addEvent);
  const updateEvent = useEventStore((s) => s.updateEvent);

  const { toolName, toolCallId, state, args } = toolInvocation;

  useEffect(() => {
    if (!toolCallId) return;

    const exists = useEventStore
      .getState()
      .events.some((e) => e.id === toolCallId);

    if (state === "call" && !exists) {
      addEvent({
        id: toolCallId,
        type: toolName === "bash" ? "bash" : "unknown",
        timestamp: Date.now(),
        status: "pending",
        payload: args,
      });
    }

    if (state === "result") {
      updateEvent(toolCallId, {
        status: "success",
        duration: Date.now(),
      });
    }
  }, [toolCallId, state]);

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
        className="w-full mx-auto px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            "group-data-[role=user]/message:w-fit"
          )}
        >
          <div className="flex flex-col w-full">
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex flex-row gap-2 items-start w-full pb-4"
                    >
                      <div
                        className={cn("flex flex-col gap-4", {
                          "bg-secondary text-secondary-foreground px-3 py-2 rounded-xl":
                            message.role === "user",
                        })}
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
                        {/* ✅ هنا الربط الصح */}
                        <ToolEventHandler
                          toolInvocation={part.toolInvocation}
                        />

                        <motion.div
                          initial={{ y: 5, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          key={`message-${message.id}-part-${i}`}
                          className="flex flex-col gap-2 p-2 mb-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-md border"
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