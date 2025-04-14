import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import * as child_process from "node:child_process";
import * as util from "node:util";
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
            reason: {
              type: "string",
              description: "Reason for executing this tool",
            },
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
    const { reason, query, filePattern = "", caseSensitive } = args;
    console.log("searchCodeTool with query %s because ", query, reason);
    const cwd = context.workingDirectory;

    try {
      // Construct grep command
      let cmd = `grep -r${caseSensitive ? "" : "i"} --include="${filePattern || "*"}" "${query}" .`;

      // Execute the command
      const { stdout, stderr } = await execAsync(cmd, { cwd });

      if (stderr) {
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

      return {
        count: results.length,
        results,
      };
    } catch (error: any) {
      // If grep returns no matches, it will exit with code 1
      if (error.code === 1 && !error.stderr) {
        return { count: 0, results: [] };
      }

      return { error: error.message || "Search failed" };
    }
  },
};
