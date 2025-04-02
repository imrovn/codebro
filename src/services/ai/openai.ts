import OpenAI from "openai";
import { BaseAIService } from "./base.ts";
import type { AIResponse, Message } from "types/index.ts";

/**
 * OpenAI service implementation
 * Uses the official OpenAI SDK with streaming support
 */
export class OpenAIService extends BaseAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    super(apiKey);
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  /**
   * Send a completion request to OpenAI
   */
  async sendCompletion(messages: Message[], model: string): Promise<AIResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
      });

      return {
        content: response?.choices[0]?.message.content || "",
        isStreaming: false,
      };
    } catch (error) {
      throw new Error(this.formatErrorMessage(error));
    }
  }

  /**
   * Stream a completion request to OpenAI
   */
  async streamCompletion(messages: Message[], model: string, callback: (chunk: string) => void): Promise<void> {
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
    } catch (error) {
      throw new Error(this.formatErrorMessage(error));
    }
  }
}
