import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import * as child_process from "node:child_process";
import * as util from "node:util";
import { OraManager } from "utils/ora-manager";
// Promisify exec
const execAsync = util.promisify(child_process.exec);
/**
 * Search code in the project
 */
export const searchCodeTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "searchCode",
        description: "Search for code patterns in the project files",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query or pattern to look for",
            },
            filePattern: {
              type: "string",
              description: "Optional glob pattern to limit search to specific files (e.g., '*.js', 'src/**/*.ts')",
            },
            caseSensitive: {
              type: "boolean",
              description: "Whether the search should be case sensitive",
            },
          },
          required: ["query", "reason"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    const { query, filePattern = "", caseSensitive } = args;
    const oraManager = new OraManager();
    oraManager.start(
      `Searching for '${query}' in ${filePattern || "all files"} (case ${caseSensitive ? "sensitive" : "insensitive"})...`
    );
    const cwd = context.workingDirectory;

    try {
      // Construct grep command
      let cmd = `grep -r${caseSensitive ? "" : "i"} --include="${filePattern || "*"}" "${query}" .`;

      // Execute the command
      const { stdout, stderr } = await execAsync(cmd, { cwd });

      if (stderr) {
        oraManager.fail(`Search failed: ${stderr}`);
        return { error: stderr };
      }

      // Process and format results
      const results = stdout
        .split("\n")
        .filter(line => line.trim().length > 0)
        .map(line => {
          const [file, ...contentParts] = line.split(":");
          const content = contentParts.join(":").trim();
          return { file, content };
        });

      if (results.length === 0) {
        oraManager.succeed(`No matches found for '${query}' in ${filePattern || "all files"}.`);
      } else {
        oraManager.succeed(
          `Search completed: Found ${results.length} match${results.length === 1 ? "" : "es"} for '${query}' in ${filePattern || "all files"}.`
        );
      }
      return {
        count: results.length,
        results,
      };
    } catch (error: any) {
      // If grep returns no matches, it will exit with code 1
      if (error.code === 1 && !error.stderr) {
        oraManager.succeed(`No matches found for '${query}' in ${filePattern || "all files"}.`);
        return { count: 0, results: [] };
      }

      return { error: error.message || "Search failed" };
    }
  },
};
