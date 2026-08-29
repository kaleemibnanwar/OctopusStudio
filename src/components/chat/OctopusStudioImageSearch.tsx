import type React from "react";
import { useState, type ReactNode } from "react";
import { Eye, ImageIcon } from "lucide-react";
import { CustomTagState } from "./stateTypes";
import {
  OctopusStudioCard,
  OctopusStudioCardHeader,
  OctopusStudioBadge,
  OctopusStudioExpandIcon,
  OctopusStudioStateIndicator,
  OctopusStudioCardContent,
} from "./OctopusStudioCardPrimitives";
import { ImageLightbox } from "./ImageLightbox";

interface ImageSearchResult {
  url: string;
  title: string;
  author: string;
  width?: number;
  height?: number;
  sourceUrl?: string;
  license?: string;
  provider: string;
}

interface OctopusStudioImageSearchNode {
  properties: {
    query: string;
    state: CustomTagState;
  };
}

interface OctopusStudioImageSearchProps {
  children?: ReactNode;
  node?: OctopusStudioImageSearchNode;
}

const IMAGE_URL_RE =
  /https?:\/\/[^\s"'<>()]+\.(?:jpe?g|png|webp|gif|avif|svg)(?:[?#][^\s"'<>()]*)?/gi;

/**
 * Parse the tag content into image results. The tool emits a JSON array, but
 * older/markdown responses (or model text with bare image URLs) are also
 * understood so image previews never regress to raw text.
 */
function parseResults(content: string): ImageSearchResult[] {
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (r): r is ImageSearchResult =>
          r && typeof r === "object" && typeof r.url === "string" && !!r.url,
      );
    }
  } catch {
    // Fall through to URL extraction.
  }

  const urls = new Set<string>();
  // Markdown image syntax: ![alt](url)
  for (const m of content.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
    urls.add(m[1]);
  }
  // Bare image URLs.
  for (const m of content.matchAll(IMAGE_URL_RE)) {
    urls.add(m[0]);
  }

  return [...urls].map((url) => ({
    url,
    title: "",
    author: "",
    provider: "",
  }));
}

export const OctopusStudioImageSearch: React.FC<
  OctopusStudioImageSearchProps
> = ({ children, node }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const query = node?.properties?.query ?? "";
  const state = node?.properties?.state;
  const inProgress = state === "pending";
  const aborted = state === "aborted";

  const content = typeof children === "string" ? children : "";
  const results = parseResults(content);
  const activeResult =
    lightboxIndex !== null ? results[lightboxIndex] : undefined;

  return (
    <>
      <OctopusStudioCard
        state={state}
        accentColor="violet"
        isExpanded={isExpanded}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <OctopusStudioCardHeader
          icon={<ImageIcon size={15} />}
          accentColor="violet"
        >
          <OctopusStudioBadge color="violet">Image Search</OctopusStudioBadge>
          {!isExpanded && query && (
            <span className="text-sm text-muted-foreground italic truncate">
              {query}
            </span>
          )}
          {inProgress && (
            <OctopusStudioStateIndicator
              state="pending"
              pendingLabel="Searching..."
            />
          )}
          {aborted && (
            <OctopusStudioStateIndicator
              state="aborted"
              abortedLabel="Did not finish"
            />
          )}
          <div className="ml-auto flex items-center gap-1">
            <OctopusStudioExpandIcon isExpanded={isExpanded} />
          </div>
        </OctopusStudioCardHeader>
        <OctopusStudioCardContent isExpanded={isExpanded}>
          {results.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {results.map((r, i) => (
                  <button
                    key={`${r.url}-${i}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxIndex(i);
                    }}
                    className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted cursor-pointer"
                    title={`${r.title || "Image"}${r.author ? ` by ${r.author}` : ""}`}
                    aria-label={`View image: ${r.title || r.url}`}
                  >
                    <img
                      src={r.url}
                      alt={r.title || "Search result"}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                    {(r.title || r.author) && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left">
                        <div className="truncate text-xs font-medium text-white">
                          {r.title || r.author}
                        </div>
                        {r.author && r.title && (
                          <div className="truncate text-[10px] text-white/70">
                            {r.author}
                          </div>
                        )}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <Eye
                        size={20}
                        className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {results.length} result{results.length === 1 ? "" : "s"}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              {content || "No images found."}
            </div>
          )}
        </OctopusStudioCardContent>
      </OctopusStudioCard>
      {activeResult && (
        <ImageLightbox
          imageUrl={activeResult.url}
          alt={activeResult.title || activeResult.author || "Search result"}
          onClose={() => setLightboxIndex(null)}
          onError={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
