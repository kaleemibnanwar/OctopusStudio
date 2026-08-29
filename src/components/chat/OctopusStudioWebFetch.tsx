import type { FC, ReactNode } from "react";
import { Globe } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioStateIndicator,
} from "./OctopusStudioCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface OctopusStudioWebFetchProps {
  children?: ReactNode;
  node?: {
    properties: {
      state?: CustomTagState;
    };
  };
}

export const OctopusStudioWebFetch: FC<OctopusStudioWebFetchProps> = ({
  children,
  node,
}) => {
  const state = node?.properties?.state as CustomTagState;

  return (
    <OctopusStudioCard state={state} accentColor="blue">
      <OctopusStudioCardHeader icon={<Globe size={15} />} accentColor="blue">
        <OctopusStudioBadge color="blue">Web Fetch</OctopusStudioBadge>
        {state && (
          <OctopusStudioStateIndicator
            state={state}
            pendingLabel="Fetching..."
            finishedLabel="Done"
            abortedLabel="Aborted"
          />
        )}
      </OctopusStudioCardHeader>
      {children && (
        <div className="px-3 pb-2 text-sm italic text-muted-foreground">
          {children}
        </div>
      )}
    </OctopusStudioCard>
  );
};
