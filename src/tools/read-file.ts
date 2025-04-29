import type OpenAI from "openai";

import type { AgentContext } from "@agents";
import type { Tool } from "@tools/tools.types";
import { OraManager } from "@utils/ora-manager";

import fs from "node:fs";
import path from "node:path";

/**
 * Read file from the project
 */
export const readFileTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "readFile",
        description:
          "Reads a file from the local filesystem. The path parameter must be an absolute path, not a relative path. " +
          "By default, it reads up to 250 lines each time. " +
          "You can optionally specify startLine and endLine (especially handy for long files), but it's recommended to read the whole file by not providing these parameters. " +
          "Any lines longer than ${MAX_LINE_LENGTH} characters will be truncated. For image files, the tool will display the image for you.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the file, relative to the project root",
            },
            startLine: {
              type: "number",
              description: "Starting line number (1-based indexing)",
            },
            endLine: {
              type: "number",
              description: "Ending line number (inclusive)",
            },
          },
          required: ["node:path"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: AgentContext): Promise<any> {
    const { path: filePath, startLine, endLine } = args;
    const oraManager = new OraManager();
    oraManager.startTool(`Reading file '${filePath}' from project...`);
    const cwd = context.workingDirectory;
    const absolutePath = path.resolve(cwd, filePath);

    try {
      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        oraManager.fail(`File not found: '${filePath}'`);
        return { error: `File not found: ${filePath}` };
      }

      // Read file content
      let content = fs.readFileSync(absolutePath, "utf-8");

      // If line range is specified, extract those lines
      if (startLine !== undefined) {
        const lines = content.split("\n");
        const start = Math.max(0, (startLine as number) - 1);
        const end = endLine !== undefined ? Math.min(lines.length, endLine as number) : lines.length;

        content = lines.slice(start, end).join("\n");

        oraManager.succeed(`File read successfully: '${filePath}' (lines ${start + 1}-${end})`);
        return {
          content,
          path: filePath,
          startLine,
          endLine: endLine || start + 1,
          totalLines: lines.length,
        };
      }

      oraManager.succeed(`File read successfully: '${filePath}'`);
      return {
        content,
        path: filePath,
        totalLines: content.split("\n").length,
      };
    } catch (error: any) {
      oraManager.fail(`Failed to read file '${filePath}': ${error.message || error}`);
      return { error: error.message || `Failed to read file: ${filePath}` };
    }
  },
};
