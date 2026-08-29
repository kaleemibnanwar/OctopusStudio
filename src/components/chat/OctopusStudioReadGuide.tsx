import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomTagState } from "./stateTypes";
import { BookOpen } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioReadGuideProps {
  node: {
    properties: {
      name?: string;
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function OctopusStudioReadGuide({
  node,
  children,
}: OctopusStudioReadGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation("chat");
  const { name, state } = node.properties;
  const isLoading = state === "pending";
  const isAborted = state === "aborted";

  return (
    <OctopusStudioCard
      state={state}
      accentColor="indigo"
      isExpanded={isExpanded}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <OctopusStudioCardHeader
        icon={<BookOpen size={15} />}
        accentColor="indigo"
      >
        <OctopusStudioBadge color="indigo">{t("guide")}</OctopusStudioBadge>
        {name && (
          <span className="text-sm text-foreground truncate">{name}</span>
        )}
        {isLoading && <OctopusStudioStateIndicator state="pending" />}
        {isAborted && <OctopusStudioStateIndicator state="aborted" />}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={isExpanded} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioCardContent isExpanded={isExpanded}>
        {children && (
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto bg-muted/20 rounded-lg">
            {children}
          </div>
        )}
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
}
