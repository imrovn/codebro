import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import path from "node:path";
import fs from "node:fs";
import { OraManager } from "utils/ora-manager";

/**
 * Write file to the project
 */
export const writeFileTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "writeFile",
        description: `Write a file to the local filesystem. Overwrites the existing file if there is one. only use this tool if you want to overwrite files

Before using this tool:

1. Use the ReadFile tool to understand the file's contents and context`,
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the file, relative to the project root",
            },
            content: {
              type: "string",
              description: "Content to write to the file",
            },
            createDirs: {
              type: "boolean",
              description: "Whether to create parent directories if they don't exist",
            },
          },
          required: ["path", "content"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    const { path: filePath, content, createDirs = true } = args;
    const oraManager = new OraManager();
    oraManager.start(`Writing file: ${filePath}`);
    const cwd = context.workingDirectory;
    const absolutePath = path.resolve(cwd, filePath);

    try {
      // Create parent directories if they don't exist
      if (createDirs) {
        const dirPath = path.dirname(absolutePath);
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write content to file
      fs.writeFileSync(absolutePath, content, "utf-8");
      oraManager.succeed(`File written successfully: ${filePath}`);
      return {
        success: true,
        path: filePath,
        message: `File written successfully: ${filePath}`,
      };
    } catch (error: any) {
      oraManager.fail(`Failed to write file: ${filePath} (${error.message || error})`);
      return { error: error.message || `Failed to write file: ${filePath}` };
    }
  },
};
