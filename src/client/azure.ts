import type { Config } from "configs";
import OpenAI, { AzureOpenAI } from "openai";

export function getAzureClient(config: Config): OpenAI {
  const apiVersion = "2025-03-01-preview";
  const options = { apiKey: config.apiKey, deployment: config.model, apiVersion, endpoint: config.baseURL };

  return new AzureOpenAI(options);
}
