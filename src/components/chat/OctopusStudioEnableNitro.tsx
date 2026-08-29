import React from "react";
import { Server } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioStateIndicator,
} from "./OctopusStudioCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface OctopusStudioEnableNitroProps {
  state?: CustomTagState;
}

export const OctopusStudioEnableNitro: React.FC<
  OctopusStudioEnableNitroProps
> = ({ state }) => {
  const isPending = state === "pending";
  const isAborted = state === "aborted";
  const headline = isPending
    ? "Adding Nitro server layer"
    : isAborted
      ? "Nitro server layer setup aborted"
      : "Added Nitro server layer";
  return (
    <OctopusStudioCard accentColor="emerald" state={state}>
      <OctopusStudioCardHeader
        icon={<Server size={15} />}
        accentColor="emerald"
      >
        <OctopusStudioBadge color="emerald">Server layer</OctopusStudioBadge>
        <span className="text-sm font-medium text-foreground">{headline}</span>
        {state && (
          <OctopusStudioStateIndicator
            state={state}
            abortedLabel="Did not finish"
          />
        )}
      </OctopusStudioCardHeader>
      {!isPending && !isAborted && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground leading-snug">
            API routes can now live under{" "}
            <code className="font-mono text-[11px] px-1 py-0.5 rounded bg-muted">
              server/routes/api/
            </code>
          </p>
        </div>
      )}
    </OctopusStudioCard>
  );
};
