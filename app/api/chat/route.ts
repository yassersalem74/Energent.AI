import { anthropic } from "@ai-sdk/anthropic";
import { bashTool, computerTool } from "@/lib/sandbox/tool";
import { getSandboxUnavailableReason } from "@/lib/sandbox/runtime";
import { killDesktop } from "@/lib/sandbox/utils";
import { prunedMessages } from "@/lib/utils";
import { streamText, UIMessage } from "ai";
import { MockLanguageModelV1, simulateReadableStream } from "ai/test";

export const maxDuration = 300;

const createDevFallbackModel = (reason: string) =>
  new MockLanguageModelV1({
    provider: "mock",
    modelId: "dev-fallback",
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          {
            type: "response-metadata",
            id: crypto.randomUUID(),
            modelId: "dev-fallback",
          },
          {
            type: "text-delta",
            textDelta: `Sandbox tools are running in fallback mode. ${reason} `,
          },
          {
            type: "text-delta",
            textDelta:
              "Chat still works, but browser and bash actions are disabled until the sandbox env is configured.",
          },
          {
            type: "finish",
            finishReason: "stop",
            usage: { promptTokens: 0, completionTokens: 0 },
          },
        ],
        chunkDelayInMs: null,
      }),
      rawCall: { rawPrompt: [], rawSettings: {} },
      rawResponse: { headers: {} },
      request: { body: "" },
    }),
  });

export async function POST(req: Request) {
  const { messages, sandboxId }: { messages: UIMessage[]; sandboxId?: string } =
    await req.json();

  try {
    const sandboxReason = getSandboxUnavailableReason();
    const useFallback =
      process.env.NODE_ENV === "development" &&
      (!process.env.ANTHROPIC_API_KEY || !sandboxId || sandboxReason);

    const result = streamText(
      useFallback
        ? {
            model: createDevFallbackModel(
              sandboxReason ??
                "Desktop actions require an initialized sandbox session.",
            ),
            messages: prunedMessages(messages),
          }
        : {
            model: anthropic("claude-sonnet-4-5-20250929"),
            system:
              "You are a helpful assistant with access to a computer. " +
              "Use the computer tool to help the user with their requests. " +
              "Use the bash tool to execute commands on the computer. " +
              "Always prefer the bash tool where it is viable for the task.",
            messages: prunedMessages(messages),
            tools: {
              computer: computerTool(sandboxId!),
              bash: bashTool(sandboxId),
            },
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
    );

    return result.toDataStreamResponse({
      getErrorMessage(error) {
        console.error("STREAM ERROR:", error);
        return error instanceof Error ? error.message : "Unknown error occurred";
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);

    if (sandboxId) {
      await killDesktop(sandboxId);
    }

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Internal Server Error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
