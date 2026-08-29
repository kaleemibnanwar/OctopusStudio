import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Zap } from "lucide-react";
import { CodeHighlight } from "./CodeHighlight";
import { CustomTagState } from "./stateTypes";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioDescription,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioEditProps {
  children?: ReactNode;
  node?: any;
  path?: string;
  description?: string;
}

export const OctopusStudioEdit: React.FC<OctopusStudioEditProps> = ({
  children,
  node,
  path: pathProp,
  description: descriptionProp,
}) => {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const path = pathProp || node?.properties?.path || "";
  const description = descriptionProp || node?.properties?.description || "";
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const aborted = state === "aborted";

  const fileName = path ? path.split("/").pop() : "";

  return (
    <OctopusStudioCard
      state={state}
      accentColor="sky"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
    >
      <OctopusStudioCardHeader icon={<Zap size={15} />} accentColor="sky">
        <div className="min-w-0 truncate">
          {fileName && (
            <span className="font-medium text-sm text-foreground truncate block">
              {fileName}
            </span>
          )}
          {path && (
            <span className="text-[11px] text-muted-foreground truncate block">
              {path}
            </span>
          )}
        </div>
        {inProgress && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel="Editing..."
          />
        )}
        {aborted && (
          <OctopusStudioStateIndicator
            state="aborted"
            abortedLabel="Did not finish"
          />
        )}
        <div className="ml-auto flex items-center gap-1">
          <OctopusStudioBadge color="sky">Turbo Edit</OctopusStudioBadge>
          <OctopusStudioExpandIcon isExpanded={isContentVisible} />
        </div>
      </OctopusStudioCardHeader>
      {description && (
        <OctopusStudioDescription>
          <span className={!isContentVisible ? "line-clamp-2" : undefined}>
            <span className="font-medium">Summary: </span>
            {description}
          </span>
        </OctopusStudioDescription>
      )}
      <OctopusStudioCardContent isExpanded={isContentVisible}>
        <div
          className="text-xs cursor-text"
          onClick={(e) => e.stopPropagation()}
        >
          <CodeHighlight className="language-typescript">
            {children}
          </CodeHighlight>
        </div>
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
};
