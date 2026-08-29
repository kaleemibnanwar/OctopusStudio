import React, { useMemo, useState } from "react";
import { CheckCircle } from "lucide-react";
import { CodeHighlight } from "./CodeHighlight";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioMcpToolResultProps {
  node?: any;
  children?: React.ReactNode;
}

export const OctopusStudioMcpToolResult: React.FC<
  OctopusStudioMcpToolResultProps
> = ({ node, children }) => {
  const serverName: string = node?.properties?.serverName || "";
  const toolName: string = node?.properties?.toolName || "";
  const [expanded, setExpanded] = useState(false);

  const raw = typeof children === "string" ? children : String(children ?? "");

  const prettyJson = useMemo(() => {
    if (!expanded) return "";
    try {
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      console.error("Error parsing JSON for octopus-studio-mcp-tool-result", e);
      return raw;
    }
  }, [expanded, raw]);

  return (
    <OctopusStudioCard
      accentColor="emerald"
      isExpanded={expanded}
      onClick={() => setExpanded((v) => !v)}
    >
      <OctopusStudioCardHeader
        icon={<CheckCircle size={15} />}
        accentColor="emerald"
      >
        <OctopusStudioBadge color="emerald">Tool Result</OctopusStudioBadge>
        {serverName && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-200 dark:ring-emerald-800">
            {serverName}
          </span>
        )}
        {toolName && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground ring-1 ring-inset ring-border">
            {toolName}
          </span>
        )}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={expanded} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioCardContent isExpanded={expanded}>
        <CodeHighlight className="language-json">{prettyJson}</CodeHighlight>
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
};
