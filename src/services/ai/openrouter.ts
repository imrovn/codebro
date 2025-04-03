import type { AIResponse } from "types/index.ts";
import { BaseAIService } from "./base.ts";
import OpenAI from "openai";
import process from "node:process";

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

  async getResponse(messages: any, model: string, callback?: (chunk: string) => void): Promise<AIResponse> {
    try {
      const isStreaming = callback ? typeof callback === "function" : false;
      let content = "";

      if (!isStreaming) {
        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
        });
        content = response?.choices[0]?.message.content || "";
        return { content, isStreaming };
      }
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        stream: true,
      });
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || "";
        if (deltaContent) {
          content += deltaContent;
          if (callback) {
            callback(deltaContent);
          } else {
            process.stdout.write(deltaContent);
          }
        }

        // Handle tool calls
      }

      return { content, isStreaming };
    } catch (error: any) {
      throw new Error(this.formatErrorMessage(error));
    }
  }
}
