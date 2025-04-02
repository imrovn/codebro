import axios from "axios";
import { AIResponse, Message } from "../../types/index.ts";
import { BaseAIService } from "./base.ts";
import { Buffer } from "node:buffer";

/**
 * OpenRouter service implementation
 */
export class OpenRouterService extends BaseAIService {
  private baseUrl: string;
  private projectUrl: string;
  private appName: string;

  constructor(apiKey: string, projectUrl = "https://github.com/user/codebro", appName = "Codebro CLI") {
    super(apiKey);
    this.baseUrl = "https://openrouter.ai/api/v1";
    this.projectUrl = projectUrl;
    this.appName = appName;
  }

  /**
   * Send a completion request to OpenRouter
   */
  async sendCompletion(messages: Message[], model: string): Promise<AIResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature: 0.7,
        },
        {
          headers: this.getHeaders(),
        }
      );

      return {
        content: response.data.choices[0].message.content,
        isStreaming: false,
      };
    } catch (error) {
      throw new Error(this.formatErrorMessage(error));
    }
  }

  /**
   * Stream a completion request to OpenRouter
   * Note: OpenRouter supports streaming through the same API endpoint
   * with the stream parameter set to true
   */
  async streamCompletion(messages: Message[], model: string, callback: (chunk: string) => void): Promise<void> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature: 0.7,
          stream: true,
        },
        {
          headers: this.getHeaders(),
          responseType: "stream",
        }
      );

      const stream = response.data;

      stream.on("data", (chunk: Buffer) => {
        const lines = chunk
          .toString()
          .split("\n")
          .filter(line => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.substring(6);
            if (data === "[DONE]") return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                callback(content);
              }
            } catch (e) {
              // Ignore parsing errors in stream
            }
          }
        }
      });

      return new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("error", reject);
      });
    } catch (error) {
      throw new Error(this.formatErrorMessage(error));
    }
  }

  /**
   * Get headers for OpenRouter API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": this.projectUrl,
      "X-Title": this.appName,
    };
  }
}
