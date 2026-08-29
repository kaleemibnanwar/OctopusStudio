import type React from "react";
import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioFilePath,
  OctopusStudioDescription,
} from "./OctopusStudioCardPrimitives";
import { CustomTagState } from "./stateTypes";

interface OctopusStudioDeleteProps {
  children?: ReactNode;
  node?: any;
  path?: string;
}

export const OctopusStudioDelete: React.FC<OctopusStudioDeleteProps> = ({
  children,
  node,
  path: pathProp,
}) => {
  const path = pathProp || node?.properties?.path || "";
  const state = node?.properties?.state as CustomTagState;
  const fileName = path ? path.split("/").pop() : "";

  return (
    <OctopusStudioCard accentColor="red" state={state}>
      <OctopusStudioCardHeader icon={<Trash2 size={15} />} accentColor="red">
        {fileName && (
          <span className="font-medium text-sm text-foreground truncate">
            {fileName}
          </span>
        )}
        <OctopusStudioBadge color="red">Delete</OctopusStudioBadge>
      </OctopusStudioCardHeader>
      <OctopusStudioFilePath path={path} />
      {children && (
        <OctopusStudioDescription>{children}</OctopusStudioDescription>
      )}
    </OctopusStudioCard>
  );
};
