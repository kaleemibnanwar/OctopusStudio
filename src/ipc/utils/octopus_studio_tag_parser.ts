import { normalizePath } from "../../../shared/normalizePath";
import { unescapeXmlAttr, unescapeXmlContent } from "../../../shared/xmlEscape";
import log from "electron-log";
import { SqlQuery } from "../../lib/schemas";

const logger = log.scope("octopus_studio_tag_parser");

interface OctopusStudioFileTag {
  path: string;
  content: string;
  description?: string;
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parse `<tagName path="..." description="...">content</tagName>` occurrences
 * into file tags. Used for `<octopus-studio-write>`: a `path`/`description` plus a body
 * with optional surrounding markdown fences.
 */
function parseOctopusStudioFileTags(
  fullResponse: string,
  tagName: string,
): OctopusStudioFileTag[] {
  const escapedTagName = escapeRegexLiteral(tagName);
  const tagRegex = new RegExp(
    `<${escapedTagName}([^>]*)>([\\s\\S]*?)</${escapedTagName}>`,
    "gi",
  );
  const pathRegex = /path="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;

  let match;
  const tags: OctopusStudioFileTag[] = [];

  while ((match = tagRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1];
    let content = unescapeXmlContent(match[2].trim());

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = unescapeXmlAttr(pathMatch[1]);
      const description = descriptionMatch?.[1]
        ? unescapeXmlAttr(descriptionMatch[1])
        : undefined;

      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift();
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();
      }
      content = contentLines.join("\n");

      tags.push({ path: normalizePath(path), content, description });
    } else {
      logger.warn(
        `Found <${tagName}> tag without a valid 'path' attribute:`,
        match[0],
      );
    }
  }
  return tags;
}

export function getOctopusStudioWriteTags(
  fullResponse: string,
): OctopusStudioFileTag[] {
  return parseOctopusStudioFileTags(fullResponse, "octopus-studio-write");
}

export function getOctopusStudioRenameTags(fullResponse: string): {
  from: string;
  to: string;
}[] {
  const octopusStudioRenameRegex =
    /<octopus-studio-rename from="([^"]+)" to="([^"]+)"[^>]*>([\s\S]*?)<\/octopus-studio-rename>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  while ((match = octopusStudioRenameRegex.exec(fullResponse)) !== null) {
    tags.push({
      from: normalizePath(unescapeXmlAttr(match[1])),
      to: normalizePath(unescapeXmlAttr(match[2])),
    });
  }
  return tags;
}

export function getOctopusStudioCopyTags(fullResponse: string): {
  from: string;
  to: string;
  description?: string;
}[] {
  const octopusStudioCopyRegex =
    /<octopus-studio-copy([^>]*?)(?:>([\s\S]*?)<\/octopus-studio-copy>|\/>)/gi;
  const fromRegex = /from="([^"]+)"/;
  const toRegex = /to="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;

  let match;
  const tags: { from: string; to: string; description?: string }[] = [];

  while ((match = octopusStudioCopyRegex.exec(fullResponse)) !== null) {
    const attrs = match[1];
    const fromMatch = fromRegex.exec(attrs);
    const toMatch = toRegex.exec(attrs);
    const descriptionMatch = descriptionRegex.exec(attrs);

    if (fromMatch?.[1] && toMatch?.[1]) {
      tags.push({
        from: normalizePath(unescapeXmlAttr(fromMatch[1])),
        to: normalizePath(unescapeXmlAttr(toMatch[1])),
        description: descriptionMatch?.[1]
          ? unescapeXmlAttr(descriptionMatch[1])
          : undefined,
      });
    } else {
      logger.warn(
        "Found <octopus-studio-copy> tag without valid 'from' or 'to' attributes:",
        match[0],
      );
    }
  }
  return tags;
}

export function getOctopusStudioDeleteTags(fullResponse: string): string[] {
  const octopusStudioDeleteRegex =
    /<octopus-studio-delete path="([^"]+)"[^>]*>([\s\S]*?)<\/octopus-studio-delete>/g;
  let match;
  const paths: string[] = [];
  while ((match = octopusStudioDeleteRegex.exec(fullResponse)) !== null) {
    paths.push(normalizePath(unescapeXmlAttr(match[1])));
  }
  return paths;
}

export function getOctopusStudioAddDependencyTags(
  fullResponse: string,
): string[] {
  const octopusStudioAddDependencyRegex =
    /<octopus-studio-add-dependency packages="([^"]+)">[^<]*<\/octopus-studio-add-dependency>/g;
  let match;
  const packages: string[] = [];
  while (
    (match = octopusStudioAddDependencyRegex.exec(fullResponse)) !== null
  ) {
    packages.push(...unescapeXmlAttr(match[1]).trim().split(/\s+/));
  }
  return packages;
}

export function getOctopusStudioChatSummaryTag(
  fullResponse: string,
): string | null {
  const octopusStudioChatSummaryRegex =
    /<octopus-studio-chat-summary>([\s\S]*?)<\/octopus-studio-chat-summary>/g;
  const match = octopusStudioChatSummaryRegex.exec(fullResponse);
  if (match && match[1]) {
    return unescapeXmlContent(match[1].trim());
  }
  return null;
}

export function getOctopusStudioExecuteSqlTags(
  fullResponse: string,
): SqlQuery[] {
  const octopusStudioExecuteSqlRegex =
    /<octopus-studio-execute-sql([^>]*)>([\s\S]*?)<\/octopus-studio-execute-sql>/g;
  const descriptionRegex = /description="([^"]+)"/;
  let match;
  const queries: { content: string; description?: string }[] = [];

  while ((match = octopusStudioExecuteSqlRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1] || "";
    let content = unescapeXmlContent(match[2].trim());
    const descriptionMatch = descriptionRegex.exec(attributesString);
    const description = descriptionMatch?.[1]
      ? unescapeXmlAttr(descriptionMatch[1])
      : undefined;

    // Handle markdown code blocks if present
    const contentLines = content.split("\n");
    if (contentLines[0]?.startsWith("```")) {
      contentLines.shift();
    }
    if (contentLines[contentLines.length - 1]?.startsWith("```")) {
      contentLines.pop();
    }
    content = contentLines.join("\n");

    queries.push({ content, description });
  }

  return queries;
}

export function getOctopusStudioCommandTags(fullResponse: string): string[] {
  const octopusStudioCommandRegex =
    /<octopus-studio-command type="([^"]+)"[^>]*><\/octopus-studio-command>/g;
  let match;
  const commands: string[] = [];

  while ((match = octopusStudioCommandRegex.exec(fullResponse)) !== null) {
    commands.push(unescapeXmlAttr(match[1]));
  }

  return commands;
}

export function getOctopusStudioSearchReplaceTags(fullResponse: string): {
  path: string;
  content: string;
  description?: string;
}[] {
  const octopusStudioSearchReplaceRegex =
    /<octopus-studio-search-replace([^>]*)>([\s\S]*?)<\/octopus-studio-search-replace>/gi;
  const pathRegex = /path="([^"]+)"/;
  const descriptionRegex = /description="([^"]+)"/;

  let match;
  const tags: { path: string; content: string; description?: string }[] = [];

  while (
    (match = octopusStudioSearchReplaceRegex.exec(fullResponse)) !== null
  ) {
    const attributesString = match[1] || "";
    let content = unescapeXmlContent(match[2].trim());

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = unescapeXmlAttr(pathMatch[1]);
      const description = descriptionMatch?.[1]
        ? unescapeXmlAttr(descriptionMatch[1])
        : undefined;

      // Handle markdown code fences if present
      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift();
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();
      }
      content = contentLines.join("\n");

      tags.push({ path: normalizePath(path), content, description });
    } else {
      logger.warn(
        "Found <octopus-studio-search-replace> tag without a valid 'path' attribute:",
        match[0],
      );
    }
  }
  return tags;
}
