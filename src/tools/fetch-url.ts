import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import axios from "axios";
import { OraManager } from "utils/ora-manager";

/**
 * Fetch content from a URL
 */
export const fetchUrlTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "fetchUrl",
        description: "Fetch content from a URL",
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to fetch content from",
            },
            method: {
              type: "string",
              description: "HTTP method (GET, POST, etc.)",
            },
            headers: {
              type: "object",
              description: "HTTP headers to include in the request",
            },
            data: {
              type: "object",
              description: "Data to send with POST/PUT requests",
            },
          },
          required: ["url"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    const oraManager = new OraManager();
    const { url, method = "GET", headers = {}, data } = args;
    oraManager.startTool("Fetching URL...", `\t ${url}`);
    try {
      const response = await axios({
        url,
        method,
        headers,
        data,
        timeout: 10000, // 10 seconds timeout
        maxContentLength: 1024 * 1024 * 2, // 2MB max
      });
      oraManager.succeed("URL fetched successfully.");
      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        url,
      };
    } catch (error: any) {
      oraManager.fail(error.message || "Failed to fetch URL");
      return {
        error: error.message || "Failed to fetch URL",
        status: error.response?.status,
        statusText: error.response?.statusText,
        url,
      };
    }
  },
};
