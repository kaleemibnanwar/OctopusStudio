import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import { FileText } from "lucide-react";
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

interface OctopusStudioLogsProps {
  children?: ReactNode;
  node?: any;
}

export const OctopusStudioLogs: React.FC<OctopusStudioLogsProps> = ({
  children,
  node,
}) => {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const aborted = state === "aborted";

  const logCount = node?.properties?.count || "";
  const hasResults = !!logCount;

  const logType = node?.properties?.type || "all";
  const logLevel = node?.properties?.level || "all";
  const filters: string[] = [];
  if (logType !== "all") filters.push(`type: ${logType}`);
  if (logLevel !== "all") filters.push(`level: ${logLevel}`);
  const filterDesc = filters.length > 0 ? ` (${filters.join(", ")})` : "";

  const displayText = `Reading ${hasResults ? `${logCount} ` : ""}logs${filterDesc}`;

  return (
    <OctopusStudioCard
      state={state}
      accentColor="slate"
      isExpanded={isContentVisible}
      onClick={() => setIsContentVisible(!isContentVisible)}
    >
      <OctopusStudioCardHeader
        icon={<FileText size={15} />}
        accentColor="slate"
      >
        <OctopusStudioBadge color="slate">LOGS</OctopusStudioBadge>
        <span className="font-medium text-sm text-foreground truncate">
          {displayText}
        </span>
        {inProgress && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel="Reading..."
          />
        )}
        {aborted && (
          <OctopusStudioStateIndicator
            state="aborted"
            abortedLabel="Did not finish"
          />
        )}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={isContentVisible} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioCardContent isExpanded={isContentVisible}>
        <div className="text-xs">
          <CodeHighlight className="language-log">{children}</CodeHighlight>
        </div>
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
};
