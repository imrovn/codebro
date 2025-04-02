import type { AIResponse, Message } from "types/index.ts";

/**
 * Base abstract class for AI services
 *
 */
export abstract class BaseAIService {
  protected apiKey: string;

  protected constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Send a completion request to the AI provider
   */
  abstract sendCompletion(messages: Message[], model: string): Promise<AIResponse>;

  /**
   * Stream a completion request to the AI provider
   */
  abstract streamCompletion(messages: Message[], model: string, callback: (chunk: string) => void): Promise<void>;

  /**
   * Format error message from provider response
   */
  protected formatErrorMessage(error: any): string {
    if (error.response) {
      return `API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`;
    }
    return `Error: ${error.message || "Unknown error"}`;
  }
}
