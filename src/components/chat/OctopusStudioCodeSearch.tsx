import type React from "react";
import { useState, type ReactNode } from "react";
import { FileCode } from "lucide-react";
import { CustomTagState } from "./stateTypes";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioCodeSearchProps {
  children?: ReactNode;
  node?: {
    properties?: { query?: string; state?: CustomTagState; appName?: string };
  };
}

export const OctopusStudioCodeSearch: React.FC<
  OctopusStudioCodeSearchProps
> = ({ children, node }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const query =
    node?.properties?.query || (typeof children === "string" ? children : "");
  const state = node?.properties?.state as CustomTagState;
  const appName = node?.properties?.appName || "";
  const inProgress = state === "pending";

  return (
    <OctopusStudioCard
      state={state}
      accentColor="indigo"
      onClick={() => setIsExpanded(!isExpanded)}
      isExpanded={isExpanded}
    >
      <OctopusStudioCardHeader
        icon={<FileCode size={15} />}
        accentColor="indigo"
      >
        <OctopusStudioBadge color="indigo">Code Search</OctopusStudioBadge>
        {appName && (
          <OctopusStudioBadge color="sky">{appName}</OctopusStudioBadge>
        )}
        {!isExpanded && query && (
          <span className="text-sm text-muted-foreground italic truncate">
            {query}
          </span>
        )}
        {inProgress && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel="Searching..."
          />
        )}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={isExpanded} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioCardContent isExpanded={isExpanded}>
        <div className="text-sm text-muted-foreground space-y-2">
          {query && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Query:
              </span>
              <div className="italic mt-0.5 text-foreground">{query}</div>
            </div>
          )}
          {children && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                Results:
              </span>
              <div className="mt-0.5 whitespace-pre-wrap font-mono text-xs text-foreground">
                {children}
              </div>
            </div>
          )}
        </div>
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
};
