import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import { OraManager } from "utils/ora-manager";
import { isAbsolute } from "path";
import { spawnSync } from "child_process";
import { rgPath } from "@vscode/ripgrep";
import chalk from "chalk";
import type { AgentContext } from "agents";
// Promisify exec
const MAX_RESULTS = 100;
/**
 * Search code in the project
 */
export const searchCodeTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "searchCode",
        description: `
         Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (eg. "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}")
- Returns matching file paths sorted by modification time
- Use this tool when you need to find files containing specific patterns
`,
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query or pattern to look for.",
            },
            path: {
              type: "string",
              description: "The directory to search in. Defaults to the current working directory.",
            },
            filePattern: {
              type: "string",
              description: "Optional glob pattern to limit search to specific files (e.g., '*.js', 'src/**/*.ts')",
            },
          },
          required: ["query", "reason"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: AgentContext): Promise<any> {
    const { query, path, filePattern = "" } = args;
    const oraManager = new OraManager();
    oraManager.startTool(
      `Searching for '${query}' in ${filePattern || "all files"}...`,
      chalk.dim(`${query} with pattern ${filePattern}`)
    );
    const absolutePath = path && isAbsolute(path) ? path : context.workingDirectory;
    let result = "";

    try {
      const rgArgs = ["-li", query];
      if (filePattern) {
        rgArgs.push("--glob", filePattern);
      }

      const rgResults = spawnSync(rgPath, rgArgs, { cwd: absolutePath, timeout: 10000 });
      const results = rgResults.stdout?.toString().split("\n") || [];

      if (results.length === 0) {
        oraManager.succeed(`No matches found for '${query}' in ${filePattern || "all files"}.`);
      } else {
        result += `Found ${results.length} file${results.length === 1 ? "" : "s"}\n${results.slice(0, MAX_RESULTS).join("\n")}`;
        if (results.length > MAX_RESULTS) {
          result += "\n(Results are truncated. Consider using a more specific path or pattern.)";
        }

        oraManager.succeed(
          `Search completed: Found ${results.length} match${results.length === 1 ? "" : "es"} for '${query}' in ${filePattern || "all files"}.`
        );
      }

      return {
        count: results.length,
        results,
      };
    } catch (error: any) {
      // If rg returns no matches, it will exit with code 1
      if (error.code === 1 && !error.stderr) {
        oraManager.succeed(`No matches found for '${query}' in ${filePattern || "all files"}.`);
        return { count: 0, results: [] };
      }
      oraManager.fail(`Search failed: ${error.message}`);
      return { error: error.message || "Search failed" };
    }
  },
};
