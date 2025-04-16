import type { Config } from "configs";
import { getOpenRouterClient } from "client/openrouter.ts";
import OpenAI from "openai";
import { getAzureClient } from "client/azure.ts";

export function getClient(config: Config): OpenAI {
  if (config.useLocal) {
    return new OpenAI({ baseURL: config.baseURL, apiKey: "LM STUDIO" });
  } else if (config.useOpenAI) {
    return new OpenAI({ apiKey: config.apiKey });
  } else if (config.useAzure) {
    return getAzureClient(config);
  }

  // Default to OpenRouter if not specified
  return getOpenRouterClient(config);
}
