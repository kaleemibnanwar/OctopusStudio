import type React from "react";
import type { ReactNode } from "react";
import { ScanQrCode } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioWebCrawlProps {
  children?: ReactNode;
  node?: any;
}

export const OctopusStudioWebCrawl: React.FC<OctopusStudioWebCrawlProps> = ({
  children,
  node: _node,
}) => {
  return (
    <OctopusStudioCard accentColor="blue">
      <OctopusStudioCardHeader
        icon={<ScanQrCode size={15} />}
        accentColor="blue"
      >
        <OctopusStudioBadge color="blue">Web Crawl</OctopusStudioBadge>
      </OctopusStudioCardHeader>
      {children && (
        <div className="px-3 pb-2 text-sm italic text-muted-foreground">
          {children}
        </div>
      )}
    </OctopusStudioCard>
  );
};
