import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";

/**
 * A node in a chat project's read-only file tree. `path` is the path relative
 * to the project root (forward-slash separated) and is what the read-file
 * contract consumes. Directory nodes carry no `size`.
 */
export const ChatProjectFileNodeSchema = z.object({
  name: z.string(),
  /** Relative path from the project root, e.g. "docs/guide.md". */
  path: z.string(),
  type: z.enum(["file", "dir"]),
  size: z.number().int().nonnegative().optional(),
  /** True for files whose content should be rendered as Markdown. */
  isMarkdown: z.boolean().optional(),
});

export type ChatProjectFileNode = z.infer<typeof ChatProjectFileNodeSchema>;

export const ReadChatProjectFileParamsSchema = z.object({
  projectId: z.number(),
  /** Path relative to the project root, e.g. "docs/guide.md". */
  path: z.string().min(1),
});

export const ReadChatProjectFileResultSchema = z.object({
  content: z.string(),
  isMarkdown: z.boolean(),
});

export const WriteChatProjectFileParamsSchema = z.object({
  projectId: z.number(),
  /** Path relative to the project root, e.g. "docs/guide.md". */
  path: z.string().min(1),
  content: z.string(),
});

export const PickDirectoryResultSchema = z.object({
  /** Selected directory, or null when canceled or nothing chosen. */
  path: z.string().nullable(),
  canceled: z.boolean(),
});

export const SetChatProjectDirectoryParamsSchema = z.object({
  projectId: z.number(),
  /** Null clears the custom directory (falls back to the internal root). */
  directory: z.string().nullable(),
});

export const chatProjectContracts = {
  listFiles: defineContract({
    channel: "chat-project:list-files",
    input: z.number(),
    output: z.array(ChatProjectFileNodeSchema),
  }),
  pickDirectory: defineContract({
    channel: "chat-project:pick-directory",
    input: z.void(),
    output: PickDirectoryResultSchema,
  }),
  setDirectory: defineContract({
    channel: "chat-project:set-directory",
    input: SetChatProjectDirectoryParamsSchema,
    output: z.void(),
  }),
  readFile: defineContract({
    channel: "chat-project:read-file",
    input: ReadChatProjectFileParamsSchema,
    output: ReadChatProjectFileResultSchema,
  }),
  writeFile: defineContract({
    channel: "chat-project:write-file",
    input: WriteChatProjectFileParamsSchema,
    output: ReadChatProjectFileResultSchema,
  }),
};

export const chatProjectClient = createClient(chatProjectContracts);
