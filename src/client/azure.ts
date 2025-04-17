import type { Config } from "configs";
import OpenAI, { AzureOpenAI } from "openai";

export function getAzureClient(config: Config): OpenAI {
  const apiVersion = "2025-03-01-preview";
  const { apiKey, model, baseURL } = config;
  const options = { apiKey, deployment: model, apiVersion, endpoint: baseURL };

  return new AzureOpenAI(options);
}
