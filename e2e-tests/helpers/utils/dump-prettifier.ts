/**
 * Utility for prettifying server dump data for snapshot comparisons.
 */

import {
  BUILD_SYSTEM_POSTFIX,
  BUILD_SYSTEM_PREFIX,
} from "@/prompts/system_prompt";

export interface PrettifyDumpOptions {
  onlyLastMessage?: boolean;
}

/**
 * Prettifies a dump of messages for snapshot comparison.
 * Normalizes line endings, removes flaky content like package.json,
 * and formats the output for readability.
 */
export function prettifyDump(
  allMessages: {
    role: string;
    content: string | Array<{}>;
  }[],
  { onlyLastMessage = false }: PrettifyDumpOptions = {},
): string {
  const messages = onlyLastMessage ? allMessages.slice(-1) : allMessages;

  return messages
    .map((message) => {
      const content = Array.isArray(message.content)
        ? JSON.stringify(message.content)
            // Normalize attachment paths (dynamic MD5 hashes in .octopusStudio/media)
            .replace(
              /path: [^"]*?[/\\]{1,2}\.octopusStudio[/\\]{1,2}media[/\\]{1,2}[a-f0-9]+\.\w+/g,
              "path: [[ATTACHMENT_PATH]]",
            )
            // Also normalize .octopusStudio/media paths in escaped attribute format
            .replace(
              /[/\\]{1,2}\.octopusStudio[/\\]{1,2}media[/\\]{1,2}[a-f0-9]{6,}\.\w+/g,
              "/.octopusStudio/media/[[ATTACHMENT_HASH]]",
            )
        : message.content
            .replace(BUILD_SYSTEM_PREFIX, "\n${BUILD_SYSTEM_PREFIX}")
            .replace(BUILD_SYSTEM_POSTFIX, "${BUILD_SYSTEM_POSTFIX}")
            // Normalize line endings to always use \n
            .replace(/\r\n/g, "\n")
            // We remove package.json because it's flaky.
            // Depending on whether pnpm install is run, it will be modified,
            // and the contents and timestamp (thus affecting order) will be affected.
            .replace(
              /\n<octopusStudio-file path="package\.json">[\s\S]*?<\/octopusStudio-file>\n/g,
              "",
            );
      return `===\nrole: ${message.role}\nmessage: ${content}`;
    })
    .join("\n\n");
}
