import React, { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { VanillaMarkdownParser } from "./OctopusStudioMarkdownParser";
import { CustomTagState } from "./stateTypes";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioWebSearchResultProps {
  node?: any;
  children?: React.ReactNode;
}

export const OctopusStudioWebSearchResult: React.FC<
  OctopusStudioWebSearchResultProps
> = ({ children, node }) => {
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const [isExpanded, setIsExpanded] = useState(inProgress);

  useEffect(() => {
    if (!inProgress && isExpanded) {
      setIsExpanded(false);
    }
  }, [inProgress]);

  return (
    <OctopusStudioCard
      state={state}
      accentColor="blue"
      onClick={() => setIsExpanded(!isExpanded)}
      isExpanded={isExpanded}
    >
      <OctopusStudioCardHeader icon={<Globe size={15} />} accentColor="blue">
        <OctopusStudioBadge color="blue">Web Search Result</OctopusStudioBadge>
        {inProgress && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel="Loading..."
          />
        )}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={isExpanded} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioCardContent isExpanded={isExpanded}>
        <div className="text-sm text-muted-foreground">
          {typeof children === "string" ? (
            <VanillaMarkdownParser content={children} />
          ) : (
            children
          )}
        </div>
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
};
