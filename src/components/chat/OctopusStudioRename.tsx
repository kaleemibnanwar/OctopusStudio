import type React from "react";
import type { ReactNode } from "react";
import { FileEdit } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioFilePath,
  OctopusStudioDescription,
} from "./OctopusStudioCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface OctopusStudioRenameProps {
  children?: ReactNode;
  node?: any;
  from?: string;
  to?: string;
}

export const OctopusStudioRename: React.FC<OctopusStudioRenameProps> = ({
  children,
  node,
  from: fromProp,
  to: toProp,
}) => {
  const from = fromProp || node?.properties?.from || "";
  const to = toProp || node?.properties?.to || "";
  const state = node?.properties?.state as CustomTagState;

  const fromFileName = from ? from.split("/").pop() : "";
  const toFileName = to ? to.split("/").pop() : "";

  const displayTitle =
    fromFileName && toFileName
      ? `${fromFileName} → ${toFileName}`
      : fromFileName || toFileName || "";

  return (
    <OctopusStudioCard accentColor="amber" state={state}>
      <OctopusStudioCardHeader
        icon={<FileEdit size={15} />}
        accentColor="amber"
      >
        {displayTitle && (
          <span className="font-medium text-sm text-foreground truncate">
            {displayTitle}
          </span>
        )}
        <OctopusStudioBadge color="amber">Rename</OctopusStudioBadge>
      </OctopusStudioCardHeader>
      {from && <OctopusStudioFilePath path={`From: ${from}`} />}
      {to && <OctopusStudioFilePath path={`To: ${to}`} />}
      {children && (
        <OctopusStudioDescription>{children}</OctopusStudioDescription>
      )}
    </OctopusStudioCard>
  );
};
