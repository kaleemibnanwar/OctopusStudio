import type React from "react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CodeHighlight } from "./CodeHighlight";
import { CustomTagState } from "./stateTypes";
import {
  OctopusStudioBadge,
  OctopusStudioCard,
  OctopusStudioCardContent,
  OctopusStudioCardHeader,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioExploreChatHistoryProps {
  children?: ReactNode;
  node?: {
    properties?: {
      state?: CustomTagState;
      query?: string;
      chats?: string;
      evidence?: string;
      outcome?: string;
    };
  };
}

export const OctopusStudioExploreChatHistory: React.FC<
  OctopusStudioExploreChatHistoryProps
> = ({ children, node }) => {
  const { t } = useTranslation("chat");
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const outcome = node?.properties?.outcome || "";
  // Complete high-signal results collapse; anything partial or empty stays
  // expanded so degraded recall is visible.
  const [isContentVisible, setIsContentVisible] = useState(
    inProgress || outcome !== "complete",
  );

  useEffect(() => {
    if (!inProgress && outcome === "complete") {
      setIsContentVisible(false);
    }
  }, [inProgress, outcome]);
  const aborted = state === "aborted";
  const errored = state === "error";
  const query = node?.properties?.query || "";
  const chats = node?.properties?.chats || "";
  const evidence = node?.properties?.evidence || "";

  const resultSummary =
    chats || evidence
      ? `${t("exploreChatHistory.chatCount", { count: Number(chats || 0) })} · ${t("exploreChatHistory.evidenceCount", { count: Number(evidence || 0) })}`
      : "";

  return (
    <OctopusStudioCard
      state={state}
      accentColor="purple"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
      data-testid="octopus-studio-explore-chat-history"
    >
      <OctopusStudioCardHeader
        icon={<History size={15} />}
        accentColor="purple"
      >
        <OctopusStudioBadge color="purple">
          {t("exploreChatHistory.badge")}
        </OctopusStudioBadge>
        <span className="font-medium text-sm text-foreground truncate">
          {query ? `"${query}"` : t("exploreChatHistory.title")}
        </span>
        {resultSummary && (
          <span className="text-xs text-muted-foreground shrink-0">
            ({resultSummary})
          </span>
        )}
        {!inProgress && outcome === "no_match" && (
          <span className="text-xs text-muted-foreground shrink-0">
            {t("exploreChatHistory.noRelevantHistory")}
          </span>
        )}
        {!inProgress && outcome === "partial" && (
          <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
            {t("exploreChatHistory.partial")}
          </span>
        )}
        {inProgress && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel={t("exploreChatHistory.exploring")}
          />
        )}
        {aborted && (
          <OctopusStudioStateIndicator
            state="aborted"
            abortedLabel={t("exploreChatHistory.didNotFinish")}
          />
        )}
        {errored && (
          <OctopusStudioStateIndicator
            state="error"
            errorLabel={t("exploreChatHistory.failed")}
          />
        )}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={isContentVisible} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioCardContent isExpanded={isContentVisible}>
        <div className="text-xs" onClick={(e) => e.stopPropagation()}>
          <CodeHighlight className="language-markdown">
            {children}
          </CodeHighlight>
        </div>
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
};
