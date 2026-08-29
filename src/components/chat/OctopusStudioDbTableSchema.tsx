import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { CustomTagState } from "./stateTypes";
import { Table2 } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioDbTableSchemaProps {
  provider: string;
  node: {
    properties: {
      table?: string;
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function OctopusStudioDbTableSchema({
  provider,
  node,
  children,
}: OctopusStudioDbTableSchemaProps) {
  const { t } = useTranslation("home");
  const [isContentVisible, setIsContentVisible] = useState(false);
  const { table, state } = node.properties;
  const isLoading = state === "pending";
  const isAborted = state === "aborted";
  const content = typeof children === "string" ? children : "";

  return (
    <OctopusStudioCard
      state={state}
      accentColor="teal"
      onClick={() => setIsContentVisible(!isContentVisible)}
      isExpanded={isContentVisible}
    >
      <OctopusStudioCardHeader icon={<Table2 size={15} />} accentColor="teal">
        <OctopusStudioBadge color="teal">
          {table
            ? t("integrations.db.tableSchema")
            : t("integrations.db.tableSchemaProvider", { provider })}
        </OctopusStudioBadge>
        {table && (
          <span className="font-medium text-sm text-foreground truncate">
            {table}
          </span>
        )}
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
