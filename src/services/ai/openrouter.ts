import type { AIResponse } from "types/index.ts";
import { BaseAIService } from "./base.ts";
import OpenAI from "openai";

/**
 * OpenRouter service implementation
 */
export class OpenRouterService extends BaseAIService {
  private readonly client: OpenAI;

  constructor(apiKey: string, projectUrl = "https://github.com/rovn208/codebro", appName = "Codebro CLI") {
    super(apiKey);
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": projectUrl,
        "X-Title": appName,
      },
    });
  }

  /**
   * Send a completion request to OpenRouter
   */
  async sendCompletion(messages: any, model: string): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
      });

      return {
        content: response.choices[0]?.message.content || "",
        isStreaming: false,
      };
    } catch (error: any) {
      throw new Error(this.formatErrorMessage(error));
    }
  }

  /**
   * Stream a completion request to OpenRouter
   * Note: OpenRouter supports streaming through the same API endpoint
   * with the stream parameter set to true
   */
  async streamCompletion(messages: any, model: string, callback: (chunk: string) => void): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        stream: true,
      });
      let accumulatedContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          accumulatedContent += content;
          callback(content);
        }
      }
    } catch (error: any) {
      throw new Error(this.formatErrorMessage(error));
    }
  }
}
