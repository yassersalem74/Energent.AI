import { ArrowUp, Sparkles, Square } from "lucide-react";
import { Input as ShadcnInput } from "./ui/input";

interface InputProps {
  input: string;
  handleInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isInitializing: boolean;
  isLoading: boolean;
  status: string;
  stop: () => void;
}

export const Input = ({
  input,
  handleInputChange,
  isInitializing,
  isLoading,
  status,
  stop,
}: InputProps) => {
  return (
    <div className="rounded-[28px] border border-black/10 bg-[linear-gradient(135deg,#fffdf8_0%,#fff5df_100%)] p-2 shadow-[0_18px_36px_-28px_rgba(0,0,0,0.45)]">
      <div className="rounded-[22px] border border-white/80 bg-white/90 p-3 shadow-inner">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Prompt Deck
          </div>
          <div className="text-xs text-zinc-400">
            {isInitializing
              ? "Preparing desktop"
              : isLoading
              ? "Agent responding"
              : "Ready"}
          </div>
        </div>

        <div className="relative">
          <ShadcnInput
            className="h-16 w-full rounded-2xl border-zinc-200 bg-zinc-50/80 pr-16 pl-4 text-[15px] shadow-none placeholder:text-zinc-400 focus-visible:border-amber-300 focus-visible:ring-amber-200/70"
            value={input}
            autoFocus
            placeholder={"Tell me what to do..."}
            onChange={handleInputChange}
            disabled={isLoading || isInitializing}
          />
          {status === "streaming" || status === "submitted" ? (
            <button
              type="button"
              onClick={stop}
              className="cursor-pointer absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Stop generation"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading || !input.trim() || isInitializing}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-zinc-950 text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-xs text-zinc-500">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
            Sessions persist locally
          </span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1">
            Footer shows runtime activity
          </span>
        </div>
      </div>
    </div>
  );
};
