import type { Tool } from "./tools.types.ts";
import type OpenAI from "openai";
import axios from "axios";
import * as cheerio from "cheerio";
import { convert } from "html-to-text";
import { OraManager } from "utils/ora-manager";
import chalk from "chalk";
import type { AgentContext } from "agents";

/**
 * Fetch content from a URL
 */
export const fetchUrlTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "fetchUrl",
        description: `Fetches content from a specified URL and extracts relevant text to avoid context overload. Returns clean, readable content or an error message if the fetch fails.

Usage Instructions:
- Purpose: Use to retrieve specific web content (e.g., documentation, tutorials) for tasks or prompt optimization.
- URL Selection:
  - Prefer URLs from webSearch results, prioritizing reputable sources (e.g., official docs, trusted blogs).
  - Ensure the URL is valid and accessible (starts with http:// or https://).
- Content Management:
  - Content is truncated to maxContentLength (default: 10,000 characters) to prevent token overload.
  - Only main content (e.g., article, main, or paragraph text) is extracted, excluding boilerplate (e.g., headers, footers, ads).
  - Use maxContentLength to balance detail and context size (e.g., 5,000 for short snippets, 20,000 for detailed pages).
- Timeout:
  - Default is 5 seconds to avoid hanging on slow websites. Adjust timeout for unreliable networks.
- Best Practices:
  - Combine with webSearch to fetch content from top 1–3 URLs (as instructed in agent system prompts).
  - Use with writeFile to save content for later use (e.g., "Fetch content and save to notes.md").
  - If content is too large or fetch fails, rely on webSearch snippets or try another URL.
- Example:
  - Query: "Fetch content from https://reactjs.org/docs/hooks-intro.html" → Returns extracted Hooks documentation text, truncated to 10,000 characters.`,
        parameters: {
          type: "object",
          properties: {
            url: {
              type: "string",
              description: "The URL to fetch content from",
            },
            maxContentLength: {
              type: "number",
              description: "Maximum length of content to return in characters (default: 10000)",
              default: 10000,
            },
            timeout: {
              type: "number",
              description: "Request timeout in milliseconds (default: 5000)",
              default: 5000,
            },
          },
          required: ["url"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: AgentContext): Promise<any> {
    const { url, maxContentLength = 10000, timeout = 5000 } = args;
    const oraManager = new OraManager();
    oraManager.startTool(`Fetching content from ${url}...`, chalk.dim(`[url=${url}]`));

    try {
      // Validate URL
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        oraManager.fail("Invalid URL: Must start with http:// or https://");
        return { success: false, error: "Invalid URL" };
      }

      // Fetch content with timeout
      const response = await axios.get(url, {
        timeout,
        headers: { "User-Agent": "Codebro/latest" },
      });

      // Parse HTML with cheerio
      const $ = cheerio.load(response.data);

      // Try to extract main content (prioritize <article>, <main>, or <p> tags)
      let content = "";
      const article = $("article").html();
      const main = $("main").html();
      const paragraphs = $("p").toArray();

      if (article) {
        content = article;
      } else if (main) {
        content = main;
      } else if (paragraphs.length > 0) {
        content = paragraphs.map((p: any) => $(p).html()).join("\n");
      } else {
        content = $("body").html() || "";
      }

      // Convert HTML to clean text
      const textContent = convert(content, {
        wordwrap: false,
        selectors: [
          { selector: "a", options: { ignoreHref: true } },
          { selector: "img", format: "skip" },
          { selector: "script", format: "skip" },
          { selector: "style", format: "skip" },
          { selector: "nav", format: "skip" },
          { selector: "header", format: "skip" },
          { selector: "footer", format: "skip" },
        ],
      });

      // Clean and truncate content
      const cleanedContent = textContent
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
      if (!cleanedContent) {
        oraManager.fail("No relevant content found on the page.");
        return { success: false, error: "No relevant content found" };
      }

      const finalContent =
        cleanedContent.length > maxContentLength
          ? cleanedContent.substring(0, maxContentLength) + "..."
          : cleanedContent;

      if (cleanedContent.length > maxContentLength) {
        oraManager.update("Content truncated to maxContentLength to avoid context overload.");
      }

      oraManager.succeed(`Content fetched successfully from ${url}.`, chalk.dim(`[${finalContent.length} characters]`));
      return {
        success: true,
        url,
        content: finalContent,
        message: `Content fetched and truncated to ${finalContent.length} characters`,
      };
    } catch (error: any) {
      const errorMessage = error.message || "Failed to fetch content";
      oraManager.fail(`Fetch failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  },
};
