import chalk from "chalk";
import { search } from "duck-duck-scrape";
import OpenAI from "openai";

import type { AgentContext } from "@agents";
import type { Tool } from "@tools/tools.types";
import { OraManager } from "@utils/ora-manager";

export const webSearchTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "webSearch",
        description: `Performs a web search using either DuckDuckGo or Brave Search to fetch real-time information. Returns a list of results with titles, URLs, and snippets.

Usage Instructions:
- Purpose: Use to retrieve current web information (e.g., tutorials, documentation, news) for coding tasks or research.
- Query Tips:
  - Write clear, specific queries (e.g., "TypeScript async await best practices" instead of "TypeScript").
  - Use keywords or phrases as you would in a search engine.
- Max Results:
  - Default is 10; max is 50. Set maxResults to balance detail and response time.
  - Results are truncated if exceeding maxResults, with a note indicating additional results.
- Output:
  - Results are formatted as a numbered list with title (bold blue), URL (cyan), and snippet (white).
  - Use the returned results array for programmatic tasks (e.g., pass to writeFile or taskManager).
- Best Practices:
  - Analyze relevant context of current project before doing search.
  - Combine with readFile or writeFile to save results (e.g., "Search for Node.js tips and save to notes.md").
  - use fetchUrl tool go get the actual responsive and summary/validate response before go to the final answer. 
  - Avoid overly broad queries to prevent irrelevant results.
- Example:
  - Query: "Search for React hooks tutorial" → Returns top tutorials with titles, URLs, and snippets.
  then using fetchURL tool to get the actual response.
`,
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to execute",
            },

            maxResults: {
              type: "number",
              description: "Maximum number of results to return (default: 3, max: 10)",
              default: 3,
            },
          },
          required: ["query"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, _: AgentContext): Promise<any> {
    const { query, maxResults = 10 } = args;
    const oraManager = new OraManager();
    oraManager.startTool(
      `Searching the web for '${query}' ...`,
      chalk.dim(`[query=${query},  maxResults=${maxResults}]`)
    );

    try {
      const results = await duckDuckGoSearch(query, maxResults);
      // const formattedResults = formatSearchResults(results, maxResults);
      const message = `Web search completed: Found ${results.length} results for '${query}' `;
      oraManager.succeed(message);

      return {
        success: true,
        query,
        count: results.length,
        results: results.slice(0, maxResults),
      };
    } catch (error: any) {
      oraManager.fail(`Web search failed: ${error.message}`);
      return { success: false, error: error.message || "Web search failed" };
    }
  },
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/**
 * DuckDuckGo search implementation (using duck-duck-scrape)
 */
async function duckDuckGoSearch(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    const response = await search(query, { safeSearch: 0 }); // safeSearch: 0 for moderate results
    return response.results.slice(0, maxResults).map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.description,
    }));
  } catch (error: any) {
    throw new Error(`DuckDuckGo search failed: ${error.message}`);
  }
}

function formatSearchResults(results: SearchResult[], maxResults: number): string {
  if (!results.length) {
    return chalk.yellow("No results found.");
  }

  const maxTitleLength = 60; // Truncate long titles for alignment
  const maxSnippetLength = 120; // Truncate snippets for readability
  let output = "\n";

  results.slice(0, maxResults).forEach((result, index) => {
    const title =
      result.title.length > maxTitleLength ? result.title.substring(0, maxTitleLength - 3) + "..." : result.title;
    const snippet =
      result.snippet.length > maxSnippetLength
        ? result.snippet.substring(0, maxSnippetLength - 3) + "..."
        : result.snippet;

    output += chalk.green(`${index + 1}. `) + chalk.bold.blue(title) + "\n";
    output += chalk.cyan(`   URL: ${result.url}`) + "\n";
    output += chalk.white(`   ${snippet}`) + "\n\n";
  });

  if (results.length > maxResults) {
    output += chalk.yellow(`...and ${results.length - maxResults} more results (limited to ${maxResults}).\n`);
  }

  return output;
}
