import type React from "react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Search, ArrowLeftRight } from "lucide-react";
import { CodeHighlight } from "./CodeHighlight";
import { CustomTagState } from "./stateTypes";
const parseSearchReplaceBlocks = (c: string) => [] as any[];
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioFilePath,
  OctopusStudioDescription,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";

interface OctopusStudioSearchReplaceProps {
  children?: ReactNode;
  node?: any;
  path?: string;
  description?: string;
}

export const OctopusStudioSearchReplace: React.FC<
  OctopusStudioSearchReplaceProps
> = ({ children, node, path: pathProp, description: descriptionProp }) => {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const path = pathProp || node?.properties?.path || "";
  const description = descriptionProp || node?.properties?.description || "";
  const state = node?.properties?.state as CustomTagState;
  const inProgress = state === "pending";
  const aborted = state === "aborted";

  const blocks = useMemo(
    () => parseSearchReplaceBlocks(String(children ?? "")),
    [children],
  );

  const fileName = path ? path.split("/").pop() : "";

  return (
    <OctopusStudioCard
      state={state}
      accentColor="violet"
      isExpanded={isContentVisible}
      onClick={() => setIsContentVisible(!isContentVisible)}
      data-testid="octopus-studio-search-replace"
    >
      <OctopusStudioCardHeader icon={<Search size={15} />} accentColor="violet">
        <OctopusStudioBadge color="violet">Search & Replace</OctopusStudioBadge>
        {fileName && (
          <span className="font-medium text-sm text-foreground truncate">
            {fileName}
          </span>
        )}
        {inProgress && (
          <OctopusStudioStateIndicator
            state="pending"
            pendingLabel="Applying changes..."
          />
        )}
        {aborted && (
          <OctopusStudioStateIndicator
            state="aborted"
            abortedLabel="Did not finish"
          />
        )}
        <div className="ml-auto">
          <OctopusStudioExpandIcon isExpanded={isContentVisible} />
        </div>
      </OctopusStudioCardHeader>
      <OctopusStudioFilePath path={path} />
      {description && (
        <OctopusStudioDescription>
          <span className="font-medium">Summary: </span>
          {description}
        </OctopusStudioDescription>
      )}
      <OctopusStudioCardContent isExpanded={isContentVisible}>
        <div
          className="text-xs cursor-text"
          onClick={(e) => e.stopPropagation()}
        >
          {blocks.length === 0 ? (
            <CodeHighlight className="language-typescript">
              {children}
            </CodeHighlight>
          ) : (
            <div className="space-y-2">
              {blocks.map((b, i) => (
                <div
                  key={i}
                  className="border border-border/60 rounded-lg overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 text-[11px]">
                    <ArrowLeftRight
                      size={13}
                      className="text-muted-foreground"
                    />
                    <span className="font-medium text-muted-foreground">
                      Change {i + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                    <div className="p-3 border-t border-border/40 md:border-r">
                      <div className="text-[11px] mb-1 text-muted-foreground font-medium">
                        Search
                      </div>
                      <CodeHighlight className="language-typescript">
                        {b.searchContent}
                      </CodeHighlight>
                    </div>
                    <div className="p-3 border-t border-border/40">
                      <div className="text-[11px] mb-1 text-muted-foreground font-medium">
                        Replace
                      </div>
                      <CodeHighlight className="language-typescript">
                        {b.replaceContent}
                      </CodeHighlight>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </OctopusStudioCardContent>
    </OctopusStudioCard>
  );
};
