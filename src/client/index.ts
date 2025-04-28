import type { Config } from "configs";
import OpenAI, { AzureOpenAI } from "openai";

export type ClientProvider = "azure" | "openai" | "openrouter" | "localLM" | "gemini";

export function getClient(config: Config): OpenAI {
  const { apiKey, baseURL, provider } = config;

  switch (provider) {
    case "openai":
      return new OpenAI({ apiKey });
    case "localLM":
      return new OpenAI({ baseURL, apiKey: "Local LLM" });
    case "openrouter":
      return getOpenRouterClient(config);
    case "gemini":
      return getGeminiClient(config);
    default:
      return getAzureClient(config);
  }
}

export function getOpenRouterClient({ apiKey, baseURL }: Config): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: baseURL || "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/rovndev/codebro",
      "X-Title": "Codebro",
    },
  });
}

export function getAzureClient({ apiKey, model: deployment, baseURL: endpoint }: Config): OpenAI {
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2025-03-01-preview";
  const options = { apiKey, deployment, apiVersion, endpoint };

  return new AzureOpenAI(options);
}

export function getGeminiClient({ apiKey }: Config): OpenAI {
  const baseURL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/openai/";
  return new OpenAI({
    apiKey,
    baseURL,
  });
}
