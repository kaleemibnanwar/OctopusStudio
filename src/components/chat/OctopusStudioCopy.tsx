import type React from "react";
import type { ReactNode } from "react";
import { Copy } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioFilePath,
  OctopusStudioDescription,
  OctopusStudioStateIndicator,
} from "./OctopusStudioCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface OctopusStudioCopyProps {
  children?: ReactNode;
  node?: any;
}

export const OctopusStudioCopy: React.FC<OctopusStudioCopyProps> = ({
  children,
  node,
}) => {
  const from = node?.properties?.from || "";
  const to = node?.properties?.to || "";
  const description = node?.properties?.description || "";
  const state = node?.properties?.state as CustomTagState;

  const toFileName = to ? to.split("/").pop() : "";
  // Hide the "From" line for temp attachment paths (absolute paths) since they
  // show cryptic hash filenames that mean nothing to the user.
  const isTempAttachment =
    /^(\/|[A-Za-z]:\\)/.test(from) || from.includes(".octopusStudio/media/");

  return (
    <OctopusStudioCard accentColor="teal" state={state}>
      <OctopusStudioCardHeader icon={<Copy size={15} />} accentColor="teal">
        {toFileName && (
          <span className="font-medium text-sm text-foreground truncate">
            {toFileName}
          </span>
        )}
        <OctopusStudioBadge color="teal">Copy</OctopusStudioBadge>
        <span className="ml-auto">
          {state === "pending" && (
            <OctopusStudioStateIndicator
              state="pending"
              pendingLabel="Copying..."
            />
          )}
          {state === "aborted" && (
            <OctopusStudioStateIndicator
              state="aborted"
              abortedLabel="Did not finish"
            />
          )}
          {state === "finished" && (
            <OctopusStudioStateIndicator
              state="finished"
              finishedLabel="Copied"
            />
          )}
        </span>
      </OctopusStudioCardHeader>
      {from && !isTempAttachment && (
        <OctopusStudioFilePath path={`From: ${from}`} />
      )}
      {to && <OctopusStudioFilePath path={`To: ${to}`} />}
      {description && (
        <OctopusStudioDescription>{description}</OctopusStudioDescription>
      )}
      {children && (
        <OctopusStudioDescription>{children}</OctopusStudioDescription>
      )}
    </OctopusStudioCard>
  );
};
