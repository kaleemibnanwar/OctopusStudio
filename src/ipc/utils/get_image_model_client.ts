import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI as createGoogle } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateImage, generateText } from "ai";
import type { ImageModel, LanguageModel } from "ai";
import type { FetchFunction } from "@ai-sdk/provider-utils";
import type { LargeLanguageModel, UserSettings } from "../../lib/schemas";
import { getLanguageModelProviders } from "../shared/language_model_helpers";
import { getEnvVar } from "./read_env";
import { getTestFetchOption } from "./test_fetch_override";
import { getProviderApiKeyForRequest } from "./get_model_client";
import { getLmStudioBaseUrl } from "./lm_studio_utils";
import { getOpenRouterAppAttributionHeaders } from "./openrouter_attribution";
import {
  OctopusStudioError,
  OctopusStudioErrorKind,
  isOctopusStudioError,
} from "@/errors/octopus_studio_error";
import log from "electron-log";

const logger = log.scope("get_image_model_client");

export interface ImageModelClientResult {
  /** Dedicated image-generation endpoint (OpenAI-style `/images/generations`). */
  imageModel: ImageModel;
  /**
   * The same provider's regular chat/completions model. Some gateways for
   * Gemini image-output models (e.g. "nano banana") don't implement a
   * separate images endpoint at all — they only return generated images as
   * inline multimodal content from the normal chat completions call. This
   * lets callers fall back to that path when the dedicated endpoint fails.
   */
  chatModel: LanguageModel;
  providerDisplayName: string;
}

/**
 * Resolve AI SDK model clients for the user's configured image-generation
 * model (`settings.selectedImageModel`). Unlike `getModelClient`, this never
 * routes through the OctopusStudio Pro engine — it always talks directly to the
 * provider the user configured, so it works the same whether that provider
 * is a cloud API or a local/proxied OpenAI-compatible server.
 */
export async function getImageModelClient(
  model: LargeLanguageModel,
  settings: UserSettings,
): Promise<ImageModelClientResult> {
  const allProviders = await getLanguageModelProviders();
  const providerConfig = allProviders.find((p) => p.id === model.provider);

  if (!providerConfig) {
    throw new OctopusStudioError(
      `Configuration not found for provider: ${model.provider}`,
      OctopusStudioErrorKind.NotFound,
    );
  }

  const providerDisplayName = providerConfig.name ?? providerConfig.id;
  const apiKey = getProviderApiKeyForRequest(
    settings.providerSettings?.[model.provider]?.apiKey?.value ||
      (providerConfig.envVarName
        ? getEnvVar(providerConfig.envVarName)
        : undefined),
    providerDisplayName,
  );
  const fetchOption: { fetch?: FetchFunction } = getTestFetchOption();

  switch (providerConfig.id) {
    case "openai": {
      const provider = createOpenAI({ apiKey, ...fetchOption });
      return {
        imageModel: provider.image(model.name),
        chatModel: provider(model.name),
        providerDisplayName,
      };
    }
    case "google": {
      const provider = createGoogle({ apiKey, ...fetchOption });
      return {
        imageModel: provider.image(model.name),
        chatModel: provider(model.name),
        providerDisplayName,
      };
    }
    case "openrouter": {
      const provider = createOpenAICompatible({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey,
        headers: getOpenRouterAppAttributionHeaders(),
        ...fetchOption,
      });
      return {
        imageModel: provider.imageModel(model.name),
        chatModel: provider(model.name),
        providerDisplayName,
      };
    }
    case "lmstudio": {
      const baseURL = providerConfig.apiBaseUrl || getLmStudioBaseUrl() + "/v1";
      const provider = createOpenAICompatible({
        name: "lmstudio",
        baseURL,
        ...fetchOption,
      });
      return {
        imageModel: provider.imageModel(model.name),
        chatModel: provider(model.name),
        providerDisplayName,
      };
    }
    case "minimax": {
      const provider = createOpenAICompatible({
        name: "minimax",
        baseURL: "https://api.minimax.io/v1",
        apiKey,
        ...fetchOption,
      });
      return {
        imageModel: provider.imageModel(model.name),
        chatModel: provider(model.name),
        providerDisplayName,
      };
    }
    default: {
      if (providerConfig.type === "custom") {
        if (!providerConfig.apiBaseUrl) {
          throw new OctopusStudioError(
            `Custom provider ${model.provider} is missing the API Base URL.`,
            OctopusStudioErrorKind.Validation,
          );
        }
        // Assume custom providers are OpenAI compatible for now (matches
        // getRegularModelClient's assumption for chat models). This is the
        // path used by locally-proxied Gemini/ChatGPT-compatible servers.
        const provider = createOpenAICompatible({
          name: providerConfig.id,
          baseURL: providerConfig.apiBaseUrl,
          apiKey,
          ...fetchOption,
        });
        return {
          imageModel: provider.imageModel(model.name),
          chatModel: provider(model.name),
          providerDisplayName,
        };
      }
      throw new OctopusStudioError(
        `Provider "${providerDisplayName}" does not support image generation. ` +
          `Use a custom OpenAI-compatible provider, OpenAI, or Google instead.`,
        OctopusStudioErrorKind.Validation,
      );
    }
  }
}

/**
 * Generate one image using the user's configured image model, trying the
 * dedicated OpenAI-style images endpoint first and falling back to a normal
 * chat-completions call if that fails. The fallback matters because a lot of
 * proxies for Gemini image-output models ("nano banana" and similar) only
 * return generated images as inline multimodal content on the regular chat
 * completions response — they never implement a separate `/images/generations`
 * route at all, so calling it returns a gateway/route error rather than a
 * clean "unsupported" response.
 */
export async function generateImageWithFallback(
  model: LargeLanguageModel,
  settings: UserSettings,
  prompt: string,
  options: { abortSignal?: AbortSignal } = {},
): Promise<{ base64: string }> {
  const { imageModel, chatModel } = await getImageModelClient(model, settings);

  try {
    const result = await generateImage({
      model: imageModel,
      prompt,
      abortSignal: options.abortSignal,
    });
    const image = result.images[0];
    if (image) {
      return { base64: image.base64 };
    }
  } catch (imageEndpointError) {
    logger.warn(
      `Dedicated image endpoint failed for ${model.provider}/${model.name}, falling back to chat completions: ${
        imageEndpointError instanceof Error
          ? imageEndpointError.message
          : String(imageEndpointError)
      }`,
    );
  }

  try {
    const result = await generateText({
      model: chatModel,
      prompt,
      abortSignal: options.abortSignal,
      // Google's own API (and gateways that pass this through) uses this key
      // to ask a multimodal model to return image output alongside/instead of
      // text. Providers that ignore unknown providerOptions are unaffected.
      providerOptions: {
        google: { responseModalities: ["TEXT", "IMAGE"] },
      },
    });
    const imageFile = result.files.find((file) =>
      file.mediaType?.startsWith("image/"),
    );
    if (imageFile) {
      return { base64: imageFile.base64 };
    }
    throw new OctopusStudioError(
      `${model.provider}/${model.name} did not return an image from either the images endpoint or chat completions. ` +
        `Make sure the selected model actually supports image generation/output.`,
      OctopusStudioErrorKind.External,
    );
  } catch (chatCompletionError) {
    if (isOctopusStudioError(chatCompletionError)) {
      throw chatCompletionError;
    }
    throw new OctopusStudioError(
      `Image generation failed for ${model.provider}/${model.name}: ${
        chatCompletionError instanceof Error
          ? chatCompletionError.message
          : String(chatCompletionError)
      }`,
      OctopusStudioErrorKind.External,
      { cause: chatCompletionError },
    );
  }
}
