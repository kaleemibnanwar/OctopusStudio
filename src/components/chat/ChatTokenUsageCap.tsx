import { Info } from "lucide-react";

interface ChatTokenUsageCapProps {
  totalTokens?: number | null;
}

/**
 * Quiet "cap" row fused to the top of the chat composer, showing the total
 * number of AI API tokens actually used by this chat. The composer drops its
 * top corners while this is visible.
 */
export function ChatTokenUsageCap({ totalTokens }: ChatTokenUsageCapProps) {
  if (!totalTokens) {
    return null;
  }

  return (
    <div
      data-testid="chat-token-usage-cap"
      className="flex items-center gap-2 rounded-t-2xl border-t border-l border-r border-border bg-muted/30 py-1.5 pl-3 pr-3 text-[13px] animate-in fade-in-0 slide-in-from-bottom-1 duration-200 motion-reduce:animate-none"
    >
      <span className="flex flex-1 min-w-0 items-center gap-1.5 text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span>AI tokens used: {totalTokens.toLocaleString()}</span>
      </span>
    </div>
  );
}
