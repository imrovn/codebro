import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import path from "node:path";
import fs from "node:fs";

/**
 * Get project structure
 */
export const projectStructureTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "projectStructure",
        description: "Get the structure of the project directory",
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for executing this tool",
            },
            directory: {
              type: "string",
              description: "The directory to get the structure for. Defaults to current directory.",
            },
            depth: {
              type: "number",
              description: "Maximum depth to traverse",
            },
            exclude: {
              type: "string",
              description: "Comma separated list of patterns to exclude (e.g., 'node_modules,dist')",
            },
          },
          required: ["reason"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    const { reason = "", directory = "", depth = 3, exclude = "node_modules,.git,dist,build" } = args;
    console.log("projectStructureTool", reason);
    const cwd = context.workingDirectory;
    const targetDir = path.resolve(cwd, directory);
    const excludePatterns = exclude.split(",").map((p: string) => p.trim());

    try {
      // Check if directory exists
      if (!fs.existsSync(targetDir)) {
        return { error: `Directory not found: ${targetDir}` };
      }

      // Get directory structure recursively
      const structure = getDirStructure(targetDir, depth, excludePatterns);
      return { structure };
    } catch (error: any) {
      return {
        error: error.message || "Failed to get project structure",
      };
    }
  },
};

/**
 * Helper function to get directory structure
 */
function getDirStructure(dir: string, maxDepth: number, exclude: string[], currentDepth = 0): any {
  if (currentDepth > maxDepth) {
    return {
      type: "directory",
      name: path.basename(dir),
      note: "max depth reached",
    };
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });
  const result: any[] = [];

  for (const item of items) {
    if (exclude.some(pattern => item.name.includes(pattern))) continue;

    const itemPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (currentDepth < maxDepth) {
        const children = getDirStructure(itemPath, maxDepth, exclude, currentDepth + 1);
        result.push({
          type: "directory",
          name: item.name,
          children,
        });
      } else {
        result.push({
          type: "directory",
          name: item.name,
          note: "max depth reached",
        });
      }
    } else {
      result.push({
        type: "file",
        name: item.name,
        extension: path.extname(item.name),
      });
    }
  }

  return result;
}
