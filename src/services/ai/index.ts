import { BaseAIService } from "./base.ts";
import { OpenAIService } from "./openai.ts";
import { OpenRouterService } from "./openrouter.ts";
import type { Config } from "../../types/index.ts";

/**
 * AI Service Factory
 * Creates the appropriate AI service based on configuration
 */
export class AIServiceFactory {
  /**
   * Create an AI service based on the provided configuration
   */
  static createService(config: Config): BaseAIService {
    if (config.useOpenAI) {
      return new OpenAIService(config.apiKey);
    } else if (config.useOpenRouter) {
      return new OpenRouterService(config.apiKey);
    }

    // Default to OpenRouter if not specified
    return new OpenRouterService(config.apiKey);
  }
}

// Re-export types and services
export { BaseAIService } from "./base.ts";
export { OpenAIService } from "./openai.ts";
export { OpenRouterService } from "./openrouter.ts";
