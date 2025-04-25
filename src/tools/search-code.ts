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
        description: `Searches the codebase for specific patterns or keywords using ripgrep (rg), returning matching lines with context. Use this tool to efficiently analyze and explore the project’s structure, conventions, and purpose by searching for relevant code, comments, or configurations.

Usage Instructions:
- Purpose: Use to locate code, configurations, or comments that reveal the project’s purpose, tech stack, coding conventions, or specific functionality (e.g., API endpoints, React components, database schemas).
- Query Tips:
  - Craft precise queries to target specific elements (e.g., "useState" for React hooks, "express.Router" for Express routes, or "TODO" for development notes).
  - Use regex patterns for advanced searches (e.g., "\\bclass\\b.*Controller" for controller classes).
  - Include file extensions or patterns to narrow scope (e.g., "*.ts" for TypeScript files, "package.json" for dependencies).
  - Search for comments or documentation (e.g., "//\\s*TODO" or "@desc" to understand intent or pending tasks).
- Context Analysis:
  - Before searching, use \`getProjectStructure\` to understand the codebase layout and identify relevant directories or files (e.g., \`src/api\` for backend logic).
  - Combine with \`readFile\` to inspect full file contents of search results for deeper context (e.g., after finding a match in \`src/api.ts\`, read the file to understand its role).
  - Use results to infer project purpose, such as identifying frameworks (e.g., search for "ReactDOM" to confirm React usage) or patterns (e.g., "async function" for async operations).
- Max Results:
  - Default is 10; max is 50. Adjust \`maxResults\` based on query specificity (e.g., use 5 for targeted searches like "useEffect", 20 for broader searches like "function").
  - If results are truncated, refine the query or use file patterns to focus on relevant files.
- Output:
  - Returns a list of matches with file paths, line numbers, and snippets, formatted for easy reading.
  - Use the \`results\` array programmatically (e.g., pass to \`writeFile\` to save findings or \`taskManager\` to create follow-up tasks).
- Best Practices:
  - Start with broad searches to understand the project (e.g., "import" to map dependencies, "interface" to find TypeScript types).
  - Narrow searches based on initial findings (e.g., after finding React imports, search "useState" in \`*.tsx\` files).
  - Combine with \`webSearch\` or \`fetchUrl\` for external context if internal code lacks clarity (e.g., search for a library’s usage then fetch its documentation).
  - Use results to align with project conventions (e.g., match existing code style or naming conventions before proposing edits).
- Example:
  - Query: "Search for 'express.Router' in *.ts" → Returns Express route definitions to understand API structure.
  - Query: "Search for '//\\s*TODO' in src/*" → Identifies pending tasks or developer notes to infer project goals.
  - Follow-up: Use \`readFile\` on matched files to analyze full context, then \`proposeCode\` to address TODOs.
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
