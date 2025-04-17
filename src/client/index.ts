import type { Config } from "configs";
import { getOpenRouterClient } from "client/openrouter.ts";
import OpenAI from "openai";
import { getAzureClient } from "client/azure.ts";

type ClientProvider = "azure" | "openai" | "openrouter" | "localLLM";

export function getClient(config: Config, provider: ClientProvider): OpenAI {
  const { apiKey, baseURL } = config;

  switch (provider) {
    case "openai":
      return new OpenAI({ apiKey });
    case "localLLM":
      return new OpenAI({ baseURL, apiKey: "Local LLM" });
    case "openrouter":
      return getOpenRouterClient(config);
    default:
      return getAzureClient(config);
  }
}
