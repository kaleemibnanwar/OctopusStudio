import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import { MessagesSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CodeHighlight } from "./CodeHighlight";
import { CustomTagState } from "./stateTypes";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioSearchChatsProps {
  children?: ReactNode;
  node?: {
    properties?: {
      state?: CustomTagState;
      query?: string;
      indexStatus?: string;
      resultCount?: string;
    };
  };
}

export const OctopusStudioSearchChats: React.FC<
  OctopusStudioSearchChatsProps
> = ({ children, node }) => {
  const { t } = useTranslation("chat");
  const [isContentVisible, setIsContentVisible] = useState(false);

  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const aborted = state === "aborted";

  const query = node?.properties?.query || "";
  const indexStatus = node?.properties?.indexStatus || "";
  const resultCount = node?.properties?.resultCount;

  return (
    <OctopusStudioCard
      state={state}
      accentColor="violet"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
      data-testid="octopus-studio-search-chats"
    >
      <OctopusStudioCardHeader
        icon={<MessagesSquare size={15} />}
        accentColor="violet"
      >
        <OctopusStudioBadge color="violet">
          {t("searchChatsTool.badge")}
        </OctopusStudioBadge>
        <span className="font-medium text-sm text-foreground truncate">
          {`"${query}"`}
        </span>
        {resultCount !== undefined && !inProgress && (
          <span className="text-xs text-muted-foreground shrink-0">
            ({t("searchChatsTool.chatCount", { count: Number(resultCount) })})
          </span>
        )}
        {indexStatus === "indexing" && (
          <span className="text-xs text-muted-foreground shrink-0">
            {t("searchChatsTool.stillIndexing")}
          </span>
        )}
        {inProgress && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel={t("searchChatsTool.searching")}
          />
        )}
        {aborted && (
          <OctopusStudioStateIndicator
            state="aborted"
            abortedLabel={t("searchChatsTool.didNotFinish")}
          />
        )}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={isContentVisible} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioCardContent isExpanded={isContentVisible}>
        <div className="text-xs" onClick={(e) => e.stopPropagation()}>
          <CodeHighlight className="language-log">{children}</CodeHighlight>
        </div>
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
};
