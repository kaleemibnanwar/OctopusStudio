import { Tool, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { xai } from "@ai-sdk/xai";
import { google } from "@ai-sdk/google";
import { vertex } from "@ai-sdk/google-vertex";

/**
 * Returns provider-native web search tools for the given built-in provider.
 *
 * These are server-side tools implemented by the model providers themselves
 * (no local web search code required). Each tool is exposed to the model under
 * a stable key while carrying its provider-specific internal id.
 */
export function getNativeWebSearchTools(
  builtinProviderId: string | undefined,
): ToolSet | undefined {
  switch (builtinProviderId) {
    case "openai":
      return {
        web_search_preview: openai.tools.webSearchPreview({
          searchContextSize: "high",
        }) as Tool,
      };
    case "anthropic":
      return {
        web_search: anthropic.tools.webSearch_20260209() as Tool,
      };
    case "xai":
      return {
        web_search: xai.tools.webSearch() as Tool,
      };
    case "google":
      // The Gemini API returns tool calls named `google_search`, so the tool
      // MUST be registered under that key for the SDK to match them.
      return {
        google_search: google.tools.googleSearch({}) as Tool,
      };
    case "vertex":
      // Vertex AI supports Enterprise Web Search (Gemini API does not); its
      // tool calls come back named `enterprise_web_search`.
      return {
        enterprise_web_search: vertex.tools.enterpriseWebSearch({}) as Tool,
      };
    default:
      return undefined;
  }
}
