import React, { useState } from "react";
import { CustomTagState } from "./stateTypes";
import { FolderOpen } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioListFilesProps {
  node: {
    properties: {
      directory?: string;
      recursive?: string;
      include_ignored?: string;
      state?: CustomTagState;
      appName?: string;
    };
  };
  children: React.ReactNode;
}

export function OctopusStudioListFiles({
  node,
  children,
}: OctopusStudioListFilesProps) {
  const { directory, recursive, include_ignored, state, appName } =
    node.properties;
  const isLoading = state === "pending";
  const isRecursive = recursive === "true";
  const isIncludeIgnored = include_ignored === "true";
  const content = typeof children === "string" ? children : "";
  const [isExpanded, setIsExpanded] = useState(false);

  const title = directory ? directory : "List Files";

  return (
    <OctopusStudioCard
      state={state}
      accentColor="slate"
      isExpanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
      data-testid="octopus-studio-list-files"
    >
      <OctopusStudioCardHeader
        icon={<FolderOpen size={15} />}
        accentColor="slate"
      >
        <span className="font-medium text-sm text-foreground truncate">
          {title}
        </span>
        {appName && (
          <OctopusStudioBadge color="sky">{appName}</OctopusStudioBadge>
        )}
        {isRecursive && (
          <OctopusStudioBadge color="slate">recursive</OctopusStudioBadge>
        )}
        {isIncludeIgnored && (
          <OctopusStudioBadge color="slate">include ignored</OctopusStudioBadge>
        )}
        {isLoading && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel="Listing..."
          />
        )}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={isExpanded} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioCardContent isExpanded={isExpanded}>
        {content && (
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-muted/20 rounded-lg">
            {content}
          </div>
        )}
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
}
