import type React from "react";
import type { ReactNode } from "react";
import { useState } from "react";

import { ipc } from "@/ipc/types";

import { Package } from "lucide-react";
import { CodeHighlight } from "./CodeHighlight";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";
import { getNpmPackagePageUrl } from "./npmPackageUrl";

interface OctopusStudioAddDependencyProps {
  children?: ReactNode;
  node?: any;
  packages?: string;
}

export const OctopusStudioAddDependency: React.FC<
  OctopusStudioAddDependencyProps
> = ({ children, node }) => {
  const packages = node?.properties?.packages
    ? node.properties.packages.split(" ").filter(Boolean)
    : [];
  const [isContentVisible, setIsContentVisible] = useState(false);
  const hasChildren = !!children;

  return (
    <OctopusStudioCard
      accentColor="blue"
      isExpanded={isContentVisible}
      onClick={
        hasChildren ? () => setIsContentVisible(!isContentVisible) : undefined
      }
    >
      <OctopusStudioCardHeader icon={<Package size={15} />} accentColor="blue">
        <OctopusStudioBadge color="blue">Add Packages</OctopusStudioBadge>
        {hasChildren && (
          <div className="ml-auto">
            <OctopusStudioExpandIcon isExpanded={isContentVisible} />
          </div>
        )}
      </OctopusStudioCardHeader>
      {packages.length > 0 && (
        <div className="px-3 pb-2">
          <div className="text-sm text-foreground mb-1">
            Do you want to install these packages?
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {packages.map((p: string) => (
              <span
                className="cursor-pointer text-sm px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 ring-1 ring-inset ring-blue-200 dark:ring-blue-800 transition-colors"
                key={p}
                onClick={(e) => {
                  e.stopPropagation();
                  ipc.system.openExternalUrl(getNpmPackagePageUrl(p));
                }}
              >
                {p}
              </span>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Make sure these packages are what you want.
          </div>
        </div>
      )}
      <OctopusStudioCardContent isExpanded={isContentVisible}>
        {hasChildren && (
          <div className="text-xs">
            <CodeHighlight className="language-shell">{children}</CodeHighlight>
          </div>
        )}
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
};
