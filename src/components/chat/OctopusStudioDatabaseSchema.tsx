import React from "react";
import { CustomTagState } from "./stateTypes";
import { Database } from "lucide-react";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioStateIndicator,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioDatabaseSchemaProps {
  node: {
    properties: {
      state?: CustomTagState;
    };
  };
  children: React.ReactNode;
}

export function OctopusStudioDatabaseSchema({
  node,
  children,
}: OctopusStudioDatabaseSchemaProps) {
  const { state } = node.properties;
  const isLoading = state === "pending";
  const content = typeof children === "string" ? children : "";

  return (
    <OctopusStudioCard state={state} accentColor="teal">
      <OctopusStudioCardHeader icon={<Database size={15} />} accentColor="teal">
        <OctopusStudioBadge color="teal">Database Schema</OctopusStudioBadge>
        {isLoading && <OctopusStudioStateIndicator state="pending" />}
      </OctopusStudioCardHeader>
      {content && (
        <div className="px-3 pb-3">
          <div className="p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-muted/20 rounded-lg">
            {content}
          </div>
        </div>
      )}
    </OctopusStudioCard>
  );
}
