import type { AIResponse } from "types";
import { BaseAIService } from "./base.ts";
import process from "node:process";
import OpenAI from "openai";
import { END_TOOL, START_TOOL } from "agents";

const startToolIndex = "```json";
const endToolIndex = "```";

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
      let content = "";
      const isStreaming = callback ? typeof callback === "function" : false;

      if (!isStreaming) {
        const response = await this.client.chat.completions.create({
          model,
          messages,
          temperature: 0.7,
        });
        content = response?.choices[0]?.message.content || "";
        return { content, isStreaming };
      }

      const print = (content: string, isPrintable: boolean) => {
        if (isPrintable) {
          if (callback) {
            callback(content);
          } else {
            process.stdout.write(content);
          }
        }
      };
      let isFirstChunk = true;
      let isPrintable = true;
      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        stream: true,
      });
      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || "";
        if (deltaContent) {
          // Handle first chunk
          if (isFirstChunk) {
            print("Assistant: ", isPrintable);
            isFirstChunk = false;
          }

          if (deltaContent.indexOf(START_TOOL) > 0 || deltaContent.indexOf(END_TOOL) > 0) {
            // isPrintable = deltaContent.indexOf(START_TOOL) > 0;
            // slice delta response until START_TOOL and after END_TOOL
            process.stdout.write("\n deltacontent: " + deltaContent);
          }

          content += deltaContent;
          print(deltaContent, isPrintable);
        }

        // Handle tool calls
      }

      return { content, isStreaming };
    } catch (error: any) {
      throw new Error(this.formatErrorMessage(error));
    }
  }
}
