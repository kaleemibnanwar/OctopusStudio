import React, { useDeferredValue, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { OctopusStudioWrite } from "./OctopusStudioWrite";
import { OctopusStudioRename } from "./OctopusStudioRename";
import { OctopusStudioCopy } from "./OctopusStudioCopy";
import { OctopusStudioDelete } from "./OctopusStudioDelete";
import { OctopusStudioAddDependency } from "./OctopusStudioAddDependency";
import { OctopusStudioExecuteSql } from "./OctopusStudioExecuteSql";
import { OctopusStudioLogs } from "./OctopusStudioLogs";
import { OctopusStudioGrep } from "./OctopusStudioGrep";
import { OctopusStudioSearchChats } from "./OctopusStudioSearchChats";
import { OctopusStudioReadChat } from "./OctopusStudioReadChat";
import { OctopusStudioExploreCode } from "./OctopusStudioExploreCode";
import { OctopusStudioExploreChatHistory } from "./OctopusStudioExploreChatHistory";
import { OctopusStudioAddIntegration } from "./OctopusStudioAddIntegration";
import { OctopusStudioEnableNitro } from "./OctopusStudioEnableNitro";
import { OctopusStudioEdit } from "./OctopusStudioEdit";
import { OctopusStudioSearchReplace } from "./OctopusStudioSearchReplace";
import { OctopusStudioCodebaseContext } from "./OctopusStudioCodebaseContext";
import { OctopusStudioThink } from "./OctopusStudioThink";
import { CodeHighlight } from "./CodeHighlight";
import { useAtomValue } from "jotai";
import { selectedChatIdAtom } from "@/atoms/chatAtoms";
import {
  useChatStreamPreview,
  useChatStreamState,
} from "@/hooks/useChatStream";
import { isStreamActive } from "@/chat_stream/transition";
import { CustomTagState } from "./stateTypes";
import { OctopusStudioOutput } from "./OctopusStudioOutput";
import { OctopusStudioProblemSummary } from "./OctopusStudioProblemSummary";
import { OctopusStudioSecurityFinding } from "./OctopusStudioSecurityFinding";
import { ipc } from "@/ipc/types";
import { OctopusStudioMcpToolCall } from "./OctopusStudioMcpToolCall";
import { OctopusStudioMcpToolResult } from "./OctopusStudioMcpToolResult";
import {
  buildMcpPairing,
  EMPTY_MCP_PAIRING,
  type McpPairing,
  type CustomTagBlock,
} from "./mcpPairing";
import { OctopusStudioMcpToolSearch } from "./OctopusStudioMcpToolSearch";
import { OctopusStudioMcpToolSchema } from "./OctopusStudioMcpToolSchema";
import { OctopusStudioWebSearchResult } from "./OctopusStudioWebSearchResult";
import { OctopusStudioWebSearch } from "./OctopusStudioWebSearch";
import { OctopusStudioWebCrawl } from "./OctopusStudioWebCrawl";
import { OctopusStudioWebFetch } from "./OctopusStudioWebFetch";
import { OctopusStudioImageGeneration } from "./OctopusStudioImageGeneration";
import { OctopusStudioImageSearch } from "./OctopusStudioImageSearch";
import { OctopusStudioCodeSearchResult } from "./OctopusStudioCodeSearchResult";
import { OctopusStudioCodeSearch } from "./OctopusStudioCodeSearch";
import { OctopusStudioRead } from "./OctopusStudioRead";
import { OctopusStudioListFiles } from "./OctopusStudioListFiles";
import { OctopusStudioDatabaseSchema } from "./OctopusStudioDatabaseSchema";
import { OctopusStudioDbTableSchema } from "./OctopusStudioDbTableSchema";
import { OctopusStudioSupabaseProjectInfo } from "./OctopusStudioSupabaseProjectInfo";
import { OctopusStudioNeonProjectInfo } from "./OctopusStudioNeonProjectInfo";
import { OctopusStudioStatus } from "./OctopusStudioStatus";
import { OctopusStudioCompaction } from "./OctopusStudioCompaction";
import { OctopusStudioWritePlan } from "./OctopusStudioWritePlan";
import { OctopusStudioExitPlan } from "./OctopusStudioExitPlan";
import { OctopusStudioQuestionnaire } from "./OctopusStudioQuestionnaire";
import { OctopusStudioStepLimit } from "./OctopusStudioStepLimit";
import { OctopusStudioAppBlueprintCard } from "./OctopusStudioAppBlueprintCard";
import { OctopusStudioTestAssertionsCard } from "./OctopusStudioTestAssertionsCard";
import { OctopusStudioReadGuide } from "./OctopusStudioReadGuide";
import { OctopusStudioScript } from "./OctopusStudioScript";
import { OctopusStudioGit } from "./OctopusStudioGit";
import { mapActionToButton } from "./ChatInput";
import { SuggestedAction } from "@/lib/schemas";
import { FixAllErrorsButton } from "./FixAllErrorsButton";
import {
  advanceParser,
  type Block,
  getOpenBlock,
  initialParserState,
  parseFullMessage,
  type ParserState,
} from "@/lib/streamingMessageParser";

interface OctopusStudioMarkdownParserProps {
  content: string;
  messageId?: number;
  showStreamingPreview?: boolean;
}

const customLink = ({
  node: _node,
  ...props
}: {
  node?: any;
  [key: string]: any;
}) => (
  <a
    {...props}
    onClick={(e) => {
      const url = props.href;
      if (url) {
        e.preventDefault();
        ipc.system.openExternalUrl(url);
      }
    }}
  />
);

export const VanillaMarkdownParser = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code: CodeHighlight,
        a: customLink,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

/**
 * Custom component to parse markdown content with OctopusStudio-specific tags.
 *
 * The block list is sourced from a component-local incremental parser. Completed
 * blocks keep referential identity across streaming chunks, so React.memo can
 * skip prior blocks and leave only the open trailing block to re-render.
 */
export const OctopusStudioMarkdownParser: React.FC<
  OctopusStudioMarkdownParserProps
> = ({ content, messageId, showStreamingPreview = false }) => {
  const chatId = useAtomValue(selectedChatIdAtom);
  const streamState = useChatStreamState(chatId ?? undefined) ?? {
    type: "idle",
  };
  const isStreaming = isStreamActive(streamState);
  const deferredContent = useDeferredValue(content);
  const contentToParse = isStreaming ? deferredContent : content;

  // Component-local parser cache. Closed-block refs stay stable across chunks
  // so MemoClosedBlocks can skip its subtree; only the open trailing block
  // changes shape per chunk. On prefix-mismatch (full-message replace, etc.)
  // we restart from initialParserState — same correctness as a one-shot parse.
  //
  // Note: we write to parserCacheRef inside useMemo. React docs flag this as
  // a side effect during render; in practice the cache is purely advisory and
  // advanceParser is deterministic on (state, content), so the worst case
  // (StrictMode dev double-render, discarded concurrent render) is a wasted
  // re-parse, not a correctness issue.
  const parserCacheRef = useRef<{
    messageId?: number;
    content: string;
    state: ParserState;
  } | null>(null);

  const parserState = useMemo(() => {
    const cached = parserCacheRef.current;
    if (
      cached &&
      cached.messageId === messageId &&
      contentToParse.startsWith(cached.content)
    ) {
      const state = advanceParser(cached.state, contentToParse);
      parserCacheRef.current = { messageId, content: contentToParse, state };
      return state;
    }
    const state = advanceParser(initialParserState(), contentToParse);
    parserCacheRef.current = { messageId, content: contentToParse, state };
    return state;
  }, [messageId, contentToParse]);

  const closedBlocks = parserState.blocks;
  const openBlock = getOpenBlock(parserState);

  // Pair MCP tool-call blocks with their tool-result blocks by call-id so the
  // renderer can collapse the two into one card. Keyed on `closedBlocks`, which
  // only changes when a block closes (not per streamed token), so the scan
  // stays off the streaming hot path.
  const mcpPairing = useMemo(
    () => buildMcpPairing(closedBlocks),
    [closedBlocks],
  );

  // The button is hidden while streaming, so avoid scanning the block list on
  // every chunk. Do the full scan only for settled content.
  const { errorMessages, errorCount, lastErrorIndex } = useMemo(() => {
    if (isStreaming) {
      return EMPTY_ERROR_SCAN;
    }
    const errors: string[] = [];
    let lastIndex = -1;
    closedBlocks.forEach((block, index) => {
      if (
        block.kind === "custom-tag" &&
        block.tag === "octopus-studio-output" &&
        block.attributes.type === "error"
      ) {
        const msg = block.attributes.message?.trim();
        if (msg) {
          errors.push(msg);
          lastIndex = index;
        }
      }
    });
    return {
      errorMessages: errors,
      errorCount: errors.length,
      lastErrorIndex: lastIndex,
    };
  }, [closedBlocks, isStreaming]);

  const showFixAll =
    errorCount > 1 && !isStreaming && chatId !== null && chatId !== undefined;

  return (
    <>
      <MemoClosedBlocks
        blocks={closedBlocks}
        lastErrorIndex={lastErrorIndex}
        errorMessages={errorMessages}
        showFixAll={showFixAll}
        chatId={chatId ?? null}
        resultByCallId={mcpPairing.resultByCallId}
        callIds={mcpPairing.callIds}
        isStreaming={isStreaming}
      />
      {openBlock ? renderOpenBlock(openBlock, isStreaming, mcpPairing) : null}
      {showStreamingPreview && chatId !== null && chatId !== undefined && (
        <StreamingPreviewBlocks chatId={chatId} isStreaming={isStreaming} />
      )}
    </>
  );
};

// Stable ref for the "nothing to scan" return path so MemoClosedBlocks's
// memo doesn't invalidate every render during streaming.
const EMPTY_ERROR_SCAN: {
  errorMessages: string[];
  errorCount: number;
  lastErrorIndex: number;
} = { errorMessages: [], errorCount: 0, lastErrorIndex: -1 };

function StreamingPreviewBlocks({
  chatId,
  isStreaming,
}: {
  chatId: number;
  isStreaming: boolean;
}) {
  const previewXml = useChatStreamPreview(chatId);
  const previewBlocks = useMemo<Block[] | null>(() => {
    if (!previewXml) return null;
    return parseFullMessage(previewXml).blocks;
  }, [previewXml]);

  const previewPairing = useMemo(
    () => (previewBlocks ? buildMcpPairing(previewBlocks) : EMPTY_MCP_PAIRING),
    [previewBlocks],
  );

  if (!previewBlocks) return null;

  return (
    <>
      {previewBlocks.map((block) => (
        <React.Fragment key={`preview-${block.id}`}>
          {renderOpenBlock(block, isStreaming, previewPairing)}
        </React.Fragment>
      ))}
    </>
  );
}

function renderBlock(block: Block, isStreaming: boolean): React.ReactNode {
  if (block.kind === "markdown") {
    return block.content ? <MemoMarkdown content={block.content} /> : null;
  }
  return <MemoBlockCustomTag block={block} isStreaming={isStreaming} />;
}

// Render the trailing open block, accounting for MCP pairing: an open
// tool-call shows as a pending card; an open tool-result whose call already
// has a card is hidden (the call card will absorb it once it closes).
function renderOpenBlock(
  block: Block,
  isStreaming: boolean,
  pairing: McpPairing,
): React.ReactNode {
  if (block.kind === "custom-tag") {
    const callId = block.attributes["call-id"];
    if (callId && block.tag === "octopus-studio-mcp-tool-call") {
      return (
        <MemoMcpToolPair
          callBlock={block}
          resultBlock={pairing.resultByCallId.get(callId)}
          isStreaming={isStreaming}
        />
      );
    }
    if (
      callId &&
      block.tag === "octopus-studio-mcp-tool-result" &&
      pairing.callIds.has(callId)
    ) {
      return null;
    }
  }
  return renderBlock(block, isStreaming);
}

// Render a closed block, collapsing MCP call/result pairs into one card and
// hiding the standalone result block that the call card now renders.
function renderClosedBlock(
  block: Block,
  {
    resultByCallId,
    callIds,
    isStreaming,
  }: {
    resultByCallId: Map<string, CustomTagBlock>;
    callIds: Set<string>;
    isStreaming: boolean;
  },
): React.ReactNode {
  if (block.kind === "custom-tag") {
    const callId = block.attributes["call-id"];
    if (callId && block.tag === "octopus-studio-mcp-tool-call") {
      return (
        <MemoMcpToolPair
          callBlock={block}
          resultBlock={resultByCallId.get(callId)}
          isStreaming={isStreaming}
        />
      );
    }
    // Hide the standalone result only when its call is on screen to absorb it;
    // an unmatched result still renders on its own.
    if (
      callId &&
      block.tag === "octopus-studio-mcp-tool-result" &&
      callIds.has(callId)
    ) {
      return null;
    }
  }
  return renderBlock(block, false);
}

// One card for an MCP tool call + its result. Memoizes on both block refs;
// once the result is present the card is "finished" regardless of streaming,
// so isStreaming is only compared while still waiting for a result.
const MemoMcpToolPair = React.memo(
  function MemoMcpToolPair({
    callBlock,
    resultBlock,
    isStreaming,
  }: {
    callBlock: CustomTagBlock;
    resultBlock: CustomTagBlock | undefined;
    isStreaming: boolean;
  }) {
    const isError = resultBlock?.attributes["is-error"] === "true";
    const state: CustomTagState = !resultBlock
      ? isStreaming
        ? "pending"
        : "aborted"
      : isError
        ? "aborted"
        : "finished";
    return (
      <OctopusStudioMcpToolCall
        node={{
          properties: {
            serverName: callBlock.attributes.server || "",
            toolName: callBlock.attributes.tool || "",
            autoApprovedReason:
              callBlock.attributes["auto-approved-reason"] || "",
          },
        }}
        resultContent={resultBlock?.content}
        state={state}
        isError={isError}
      >
        {callBlock.content}
      </OctopusStudioMcpToolCall>
    );
  },
  (prev, next) =>
    prev.callBlock === next.callBlock &&
    prev.resultBlock === next.resultBlock &&
    (next.resultBlock != null || prev.isStreaming === next.isStreaming),
);

// Memoized wrapper for closed blocks. Memo hits when blocks ref + error
// props are unchanged, so the closed-block subtree is skipped per chunk.
// Closed children also memo on `prev.block === next.block` and skip their
// subtrees on commit chunks.
const MemoClosedBlocks = React.memo(function MemoClosedBlocks({
  blocks,
  lastErrorIndex,
  errorMessages,
  showFixAll,
  chatId,
  resultByCallId,
  callIds,
  isStreaming,
}: {
  blocks: Block[];
  lastErrorIndex: number;
  errorMessages: string[];
  showFixAll: boolean;
  chatId: number | null;
  resultByCallId: Map<string, CustomTagBlock>;
  callIds: Set<string>;
  isStreaming: boolean;
}) {
  // Hoisted once per render rather than allocated per block in the map.
  const mcpCtx = { resultByCallId, callIds, isStreaming };
  return (
    <>
      {blocks.map((block, index) => (
        <React.Fragment key={block.id}>
          {renderClosedBlock(block, mcpCtx)}
          {showFixAll &&
            index === lastErrorIndex &&
            chatId !== null &&
            chatId !== undefined && (
              <div className="mt-3 w-full flex">
                <FixAllErrorsButton
                  errorMessages={errorMessages}
                  chatId={chatId}
                />
              </div>
            )}
        </React.Fragment>
      ))}
    </>
  );
});

// Module-level constants so MemoMarkdown never gets fresh refs for these
// props, which would defeat ReactMarkdown's internal prop-equality checks.
const REMARK_PLUGINS = [remarkGfm];
const MARKDOWN_COMPONENTS = { code: CodeHighlight, a: customLink };

// Memoized markdown piece. Without this, ReactMarkdown re-parses every
// completed segment's text into an AST on every streaming chunk.
const MemoMarkdown = React.memo(function MemoMarkdown({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={REMARK_PLUGINS}
      components={MARKDOWN_COMPONENTS}
    >
      {content}
    </ReactMarkdown>
  );
});

// Memoized custom-tag block. The incremental parser preserves the Block
// reference for any completed (closed) tag across streaming patches, so
// referential equality on `block` is sufficient — completed blocks
// short-circuit and skip renderCustomTag entirely.
const MemoBlockCustomTag = React.memo(
  function MemoBlockCustomTag({
    block,
    isStreaming,
  }: {
    block: CustomTagBlock;
    isStreaming: boolean;
  }) {
    return <>{renderCustomTag(block, { isStreaming })}</>;
  },
  (prev, next) =>
    prev.block === next.block &&
    // Completed tags ignore isStreaming (getState returns "finished"
    // regardless), so skip the check to avoid one-time re-renders of every
    // completed tag when streaming ends.
    (prev.block.inProgress === false || prev.isStreaming === next.isStreaming),
);

function getState({
  isStreaming,
  inProgress,
  explicitState,
}: {
  isStreaming?: boolean;
  inProgress?: boolean;
  explicitState?: string;
}): CustomTagState {
  if (
    explicitState === "aborted" ||
    explicitState === "error" ||
    explicitState === "finished" ||
    explicitState === "warning"
  ) {
    return explicitState;
  }
  if (explicitState === "in-progress" || explicitState === "pending") {
    return "pending";
  }
  if (!inProgress) {
    return "finished";
  }
  return isStreaming ? "pending" : "aborted";
}

/**
 * Render a custom tag based on its type
 */
function renderCustomTag(
  block: CustomTagBlock,
  { isStreaming }: { isStreaming: boolean },
): React.ReactNode {
  const { tag, attributes, content, inProgress } = block;

  switch (tag) {
    case "octopus-studio-read":
      return (
        <OctopusStudioRead
          node={{
            properties: {
              path: attributes.path || "",
              startLine: attributes.start_line || "",
              endLine: attributes.end_line || "",
              appName: attributes.app_name || "",
            },
          }}
        >
          {content}
        </OctopusStudioRead>
      );
    case "octopus-studio-git":
      return (
        <OctopusStudioGit
          node={{
            properties: {
              ...attributes,
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioGit>
      );
    case "octopus-studio-web-search":
      return (
        <OctopusStudioWebSearch
          node={{
            properties: {
              query: attributes.query || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioWebSearch>
      );
    case "octopus-studio-search-chats":
      return (
        <OctopusStudioSearchChats
          node={{
            properties: {
              query: attributes.query || "",
              indexStatus: attributes["index-status"] || "",
              resultCount: attributes["result-count"],
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state as CustomTagState,
              }),
            },
          }}
        >
          {content}
        </OctopusStudioSearchChats>
      );
    case "octopus-studio-read-chat":
      return (
        <OctopusStudioReadChat
          node={{
            properties: {
              chatId: attributes["chat-id"] || "",
              title: attributes.title || "",
              range: attributes.range || "",
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state as CustomTagState,
              }),
            },
          }}
        >
          {content}
        </OctopusStudioReadChat>
      );
    case "octopus-studio-web-crawl":
      return (
        <OctopusStudioWebCrawl
          node={{
            properties: {},
          }}
        >
          {content}
        </OctopusStudioWebCrawl>
      );
    case "octopus-studio-web-fetch":
      return (
        <OctopusStudioWebFetch
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioWebFetch>
      );
    case "octopus-studio-code-search":
      return (
        <OctopusStudioCodeSearch
          node={{
            properties: {
              query: attributes.query || "",
              state: getState({ isStreaming, inProgress }),
              appName: attributes.app_name || "",
            },
          }}
        >
          {content}
        </OctopusStudioCodeSearch>
      );
    case "octopus-studio-code-search-result":
      return (
        <OctopusStudioCodeSearchResult
          node={{
            properties: {},
          }}
        >
          {content}
        </OctopusStudioCodeSearchResult>
      );
    case "octopus-studio-web-search-result":
      return (
        <OctopusStudioWebSearchResult
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioWebSearchResult>
      );
    case "octopus-studio-image-search":
      return (
        <OctopusStudioImageSearch
          node={{
            properties: {
              query: attributes.query || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioImageSearch>
      );
    case "think":
      return (
        <OctopusStudioThink
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioThink>
      );
    // "octopus-studio-generate-test" is legacy: no longer emitted, but historical chats
    // still contain it. Both tags carry a path/description and a file body, so
    // the old test cards render as plain file-write cards instead of raw markup.
    case "octopus-studio-generate-test":
    case "octopus-studio-write":
      return (
        <OctopusStudioWrite
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioWrite>
      );

    case "octopus-studio-rename":
      return (
        <OctopusStudioRename
          node={{
            properties: {
              from: attributes.from || "",
              to: attributes.to || "",
            },
          }}
        >
          {content}
        </OctopusStudioRename>
      );

    case "octopus-studio-copy":
      return (
        <OctopusStudioCopy
          node={{
            properties: {
              from: attributes.from || "",
              to: attributes.to || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioCopy>
      );

    case "octopus-studio-delete":
      return (
        <OctopusStudioDelete
          node={{
            properties: {
              path: attributes.path || "",
            },
          }}
        >
          {content}
        </OctopusStudioDelete>
      );

    case "octopus-studio-add-dependency":
      return (
        <OctopusStudioAddDependency
          node={{
            properties: {
              packages: attributes.packages || "",
            },
          }}
        >
          {content}
        </OctopusStudioAddDependency>
      );

    case "octopus-studio-execute-sql":
      return (
        <OctopusStudioExecuteSql
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              description: attributes.description || "",
            },
          }}
        >
          {content}
        </OctopusStudioExecuteSql>
      );

    case "octopus-studio-read-logs":
      return (
        <OctopusStudioLogs
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              time: attributes.time || "",
              type: attributes.type || "",
              level: attributes.level || "",
              count: attributes.count || "",
            },
          }}
        >
          {content}
        </OctopusStudioLogs>
      );

    case "octopus-studio-grep":
      return (
        <OctopusStudioGrep
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              query: attributes.query || "",
              include: attributes.include || "",
              exclude: attributes.exclude || "",
              "case-sensitive": attributes["case-sensitive"] || "",
              count: attributes.count || "",
              total: attributes.total || "",
              truncated: attributes.truncated || "",
              appName: attributes.app_name || "",
            },
          }}
        >
          {content}
        </OctopusStudioGrep>
      );

    case "octopus-studio-explore-chat-history":
      return (
        <OctopusStudioExploreChatHistory
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              query: attributes.query || "",
              chats: attributes.chats || "",
              evidence: attributes.evidence || "",
              outcome: attributes.outcome || "",
            },
          }}
        >
          {content}
        </OctopusStudioExploreChatHistory>
      );

    case "octopus-studio-explore-code":
      return (
        <OctopusStudioExploreCode
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
              query: attributes.query || "",
              appName: attributes.app_name || "",
              files: attributes.files || "",
              symbols: attributes.symbols || "",
              indexMs: attributes.index_ms || "",
              searchMs: attributes.search_ms || "",
              truncated: attributes.truncated || "",
            },
          }}
        >
          {content}
        </OctopusStudioExploreCode>
      );

    case "octopus-studio-add-integration":
      return (
        <OctopusStudioAddIntegration
          provider={
            attributes.provider === "neon" || attributes.provider === "supabase"
              ? attributes.provider
              : undefined
          }
        >
          {content}
        </OctopusStudioAddIntegration>
      );

    case "octopus-studio-enable-nitro":
      return (
        <OctopusStudioEnableNitro
          state={getState({ isStreaming, inProgress })}
        />
      );

    case "octopus-studio-edit":
      return (
        <OctopusStudioEdit
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioEdit>
      );

    case "octopus-studio-search-replace":
      return (
        <OctopusStudioSearchReplace
          node={{
            properties: {
              path: attributes.path || "",
              description: attributes.description || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioSearchReplace>
      );

    case "octopus-studio-codebase-context":
      return (
        <OctopusStudioCodebaseContext
          node={{
            properties: {
              files: attributes.files || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioCodebaseContext>
      );

    case "octopus-studio-mcp-tool-search":
      return (
        <OctopusStudioMcpToolSearch
          node={{
            properties: {
              query: attributes.query || "",
              server: attributes.server || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioMcpToolSearch>
      );

    case "octopus-studio-mcp-tool-schema":
      return (
        <OctopusStudioMcpToolSchema
          node={{
            properties: {
              tools: attributes.tools || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioMcpToolSchema>
      );
    case "octopus-studio-mcp-tool-call":
      return (
        <OctopusStudioMcpToolCall
          node={{
            properties: {
              serverName: attributes.server || "",
              toolName: attributes.tool || "",
              autoApprovedReason: attributes["auto-approved-reason"] || "",
            },
          }}
        >
          {content}
        </OctopusStudioMcpToolCall>
      );

    case "octopus-studio-mcp-tool-result":
      return (
        <OctopusStudioMcpToolResult
          node={{
            properties: {
              serverName: attributes.server || "",
              toolName: attributes.tool || "",
            },
          }}
        >
          {content}
        </OctopusStudioMcpToolResult>
      );

    case "octopus-studio-output":
      return (
        <OctopusStudioOutput
          type={attributes.type as "warning" | "error"}
          message={attributes.message}
        >
          {content}
        </OctopusStudioOutput>
      );

    case "octopus-studio-script":
      return (
        <OctopusStudioScript
          node={{
            properties: {
              description: attributes.description || "",
              truncated: attributes.truncated || "",
              executionMs: attributes["execution-ms"] || "",
              fullOutputPath: attributes["full-output-path"] || "",
            },
          }}
        >
          {content}
        </OctopusStudioScript>
      );

    case "octopus-studio-problem-report":
      return (
        <OctopusStudioProblemSummary summary={attributes.summary}>
          {content}
        </OctopusStudioProblemSummary>
      );

    case "octopus-studio-security-finding":
      return (
        <OctopusStudioSecurityFinding
          title={attributes.title}
          level={attributes.level}
        >
          {content}
        </OctopusStudioSecurityFinding>
      );

    case "octopus-studio-chat-summary":
      // Don't render anything for octopus-studio-chat-summary
      return null;

    case "octopus-studio-command":
      if (attributes.type) {
        const action = {
          id: attributes.type,
        } as SuggestedAction;
        return <>{mapActionToButton(action)}</>;
      }
      return null;

    case "octopus-studio-list-files":
      return (
        <OctopusStudioListFiles
          node={{
            properties: {
              directory: attributes.directory || "",
              recursive: attributes.recursive || "",
              include_ignored:
                attributes.include_ignored || attributes.include_hidden || "",
              state: getState({ isStreaming, inProgress }),
              appName: attributes.app_name || "",
            },
          }}
        >
          {content}
        </OctopusStudioListFiles>
      );

    case "octopus-studio-database-schema":
      return (
        <OctopusStudioDatabaseSchema
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioDatabaseSchema>
      );

    case "octopus-studio-db-table-schema":
    // Backward compat: old messages used provider-specific tags
    case "octopus-studio-supabase-table-schema":
    case "octopus-studio-neon-table-schema":
      return (
        <OctopusStudioDbTableSchema
          provider={
            tag === "octopus-studio-supabase-table-schema"
              ? "Supabase"
              : tag === "octopus-studio-neon-table-schema"
                ? "Neon"
                : (attributes.provider as string) || ""
          }
          node={{
            properties: {
              table: attributes.table || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioDbTableSchema>
      );

    case "octopus-studio-supabase-project-info":
      return (
        <OctopusStudioSupabaseProjectInfo
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioSupabaseProjectInfo>
      );

    case "octopus-studio-neon-project-info":
      return (
        <OctopusStudioNeonProjectInfo
          node={{
            properties: {
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioNeonProjectInfo>
      );

    case "octopus-studio-read-guide":
      return (
        <OctopusStudioReadGuide
          node={{
            properties: {
              name: attributes.name || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioReadGuide>
      );

    case "octopus-studio-image-generation":
      return (
        <OctopusStudioImageGeneration
          node={{
            properties: {
              prompt: attributes.prompt || "",
              path: attributes.path || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioImageGeneration>
      );

    case "octopus-studio-status":
      return (
        <OctopusStudioStatus
          node={{
            properties: {
              title: attributes.title || "Processing...",
              state: getState({
                isStreaming,
                inProgress,
                explicitState: attributes.state,
              }),
            },
          }}
        >
          {content}
        </OctopusStudioStatus>
      );

    case "octopus-studio-compaction":
      return (
        <OctopusStudioCompaction
          node={{
            properties: {
              title: attributes.title || "Compacting conversation",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioCompaction>
      );

    case "octopus-studio-write-plan":
      return (
        <OctopusStudioWritePlan
          node={{
            properties: {
              title: attributes.title || "Implementation Plan",
              summary: attributes.summary,
              complete: attributes.complete,
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioWritePlan>
      );

    case "octopus-studio-exit-plan":
      return (
        <OctopusStudioExitPlan
          node={{
            properties: {
              notes: attributes.notes,
            },
          }}
        />
      );

    case "octopus-studio-questionnaire":
      return <OctopusStudioQuestionnaire>{content}</OctopusStudioQuestionnaire>;

    case "octopus-studio-step-limit":
      return (
        <OctopusStudioStepLimit
          node={{
            properties: {
              steps: attributes.steps,
              limit: attributes.limit,
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioStepLimit>
      );

    case "octopus-studio-app-blueprint":
      return (
        <OctopusStudioAppBlueprintCard
          node={{
            properties: {
              "app-name": attributes["app-name"] || "",
              template: attributes.template || "react",
              theme: attributes.theme || "default",
              "design-direction": attributes["design-direction"] || "",
              "primary-color": attributes["primary-color"] || "",
              complete: attributes.complete,
              state: getState({ isStreaming, inProgress }),
            },
          }}
        />
      );

    case "octopus-studio-test-assertions":
      return (
        <OctopusStudioTestAssertionsCard
          node={{
            properties: {
              "proposal-id": attributes["proposal-id"] || "",
              "request-id": attributes["request-id"] || "",
              status: attributes.status || "proposed",
              "spec-path": attributes["spec-path"] || "",
              state: getState({ isStreaming, inProgress }),
            },
          }}
        >
          {content}
        </OctopusStudioTestAssertionsCard>
      );

    default:
      return null;
  }
}
