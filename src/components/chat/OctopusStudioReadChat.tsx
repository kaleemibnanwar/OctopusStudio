import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import { BookOpen } from "lucide-react";
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

interface OctopusStudioReadChatProps {
  children?: ReactNode;
  node?: {
    properties?: {
      state?: CustomTagState;
      chatId?: string;
      title?: string;
      range?: string;
    };
  };
}

export const OctopusStudioReadChat: React.FC<OctopusStudioReadChatProps> = ({
  children,
  node,
}) => {
  const { t } = useTranslation("chat");
  const [isContentVisible, setIsContentVisible] = useState(false);

  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const aborted = state === "aborted";

  const chatId = node?.properties?.chatId || "";
  const title = node?.properties?.title || "";
  const range = node?.properties?.range || "";

  return (
    <OctopusStudioCard
      state={state}
      accentColor="violet"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
      data-testid="octopus-studio-read-chat"
    >
      <OctopusStudioCardHeader
        icon={<BookOpen size={15} />}
        accentColor="violet"
      >
        <OctopusStudioBadge color="violet">
          {t("readChatTool.badge")}
        </OctopusStudioBadge>
        <span className="font-medium text-sm text-foreground truncate">
          {title || t("readChatTool.chatNumber", { chatId })}
        </span>
        {range && (
          <span className="text-xs text-muted-foreground shrink-0">
            ({t("readChatTool.messagesRange", { range })})
          </span>
        )}
        {inProgress && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel={t("readChatTool.reading")}
          />
        )}
        {aborted && (
          <OctopusStudioStateIndicator
            state="aborted"
            abortedLabel={t("readChatTool.didNotFinish")}
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
