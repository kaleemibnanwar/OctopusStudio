import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomTagState } from "./stateTypes";
import { Database } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioDbProjectInfoProps {
  provider: string;
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function OctopusStudioDbProjectInfo({
  provider,
  node,
  children,
}: OctopusStudioDbProjectInfoProps) {
  const { t } = useTranslation("home");
  const [isContentVisible, setIsContentVisible] = useState(false);
  const { state } = node.properties;
  const isLoading = state === "pending";
  const isAborted = state === "aborted";
  const content = typeof children === "string" ? children : "";

  return (
    <OctopusStudioCard
      state={state}
      accentColor="teal"
      isExpanded={isContentVisible}
      onClick={() => setIsContentVisible(!isContentVisible)}
    >
      <OctopusStudioCardHeader icon={<Database size={15} />} accentColor="teal">
        <OctopusStudioBadge color="teal">
          {t("integrations.db.projectInfo", { provider })}
        </OctopusStudioBadge>
        {isLoading && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel={t("integrations.db.fetching")}
          />
        )}
        {isAborted && (
          <OctopusStudioStateIndicator
            state="aborted"
            abortedLabel={t("integrations.db.didNotFinish")}
          />
        )}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={isContentVisible} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioCardContent isExpanded={isContentVisible}>
        {content && (
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto bg-muted/20 rounded-lg">
            {content}
          </div>
        )}
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
}
