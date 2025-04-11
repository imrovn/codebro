import { type Config } from "configs";
import OpenAI from "openai";

export function getOpenRouterClient(config: Config): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/rovn208/codebro",
      "X-Title": "Codebro",
    },
  });
}
