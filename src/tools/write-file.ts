// Import getPatch for diff
import chalk from "chalk";
import type OpenAI from "openai";

import type { AgentContext } from "@agents";
import { getPatch } from "@tools/propose-code";
import type { Tool } from "@tools/tools.types";
import { OraManager } from "@utils/ora-manager";

import fs from "node:fs";
import path from "node:path";

// For formatting diff output

/**
 * Write file to the project and display the diff of changes made.
 */
export const writeFileTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "writeFile",
        description: `Writes content to a file in the local filesystem, overwriting the existing file if it exists. Displays a diff of the changes made to show added and removed lines.

Usage Instructions:
- Purpose: Use to create new files or overwrite existing ones with new content, such as generating code, configurations, or documentation.
- Parameters:
  - path: Provide a project-relative or absolute path to the target file.
  - content: Specify the full content to write to the file.
  - createDirs: Set to true to create parent directories if they don't exist (default: true).
- Output:
  - Returns success status, file path, and a formatted diff showing changes (added lines in green, removed lines in red).
  - The diff includes line numbers and context for clarity, similar to git diff.
  - If the file is new, the diff shows all lines as additions.
- Best Practices:
  - Use \`readFile\` first to check existing content and avoid unintended overwrites.
  - Validate the path using \`getProjectStructure\` to align with project conventions.
  - Combine with \`searchCode\` to find related files or \`proposeCode\` for planning complex changes.
  - Ensure content matches project code style (e.g., TypeScript conventions, Prettier formatting).
- Example:
  - Query: Write "export const config = {};" to src/config.ts
  - Result: Creates/overwrites src/config.ts and shows a diff of changes (e.g., added lines for new files or modified lines for existing ones).
`,
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
              default: true,
            },
          },
          required: ["node:path", "content"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: AgentContext, signal?: AbortSignal): Promise<any> {
    const { path: filePath, content, createDirs = true } = args;
    const oraManager = new OraManager();
    oraManager.startTool(`Writing file: ${filePath}`);

    const cwd = context.workingDirectory;
    const absolutePath = path.resolve(cwd, filePath);

    try {
      // Read original file content (if it exists)
      const originalContent = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf-8") : "";

      // Create parent directories if they don't exist
      if (createDirs) {
        const dirPath = path.dirname(absolutePath);
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Compute the diff
      const diffHunks = getPatch({
        filePath,
        fileContents: originalContent,
        oldStr: originalContent,
        newStr: content,
      });

      // Format the diff for display
      const formattedDiff = formatDiff(diffHunks);

      // Write content to file
      fs.writeFileSync(absolutePath, content, "utf-8");

      oraManager.succeed(
        `File written successfully
Content changed:
${formattedDiff}\n`,
        chalk.dim(`\t ${filePath}`)
      );
      return {
        success: true,
        path: filePath,
        message: `File written successfully: ${filePath}`,
        diff: formattedDiff, // Include formatted diff in output
      };
    } catch (error: any) {
      oraManager.fail(`Failed to write file: ${filePath} (${error.message || error})`);
      return { success: false, error: error.message || `Failed to write file: ${filePath}` };
    }
  },
};

/**
 * Format diff hunks for CLI display using chalk
 */
function formatDiff(hunks: Array<{ oldStart: number; newStart: number; lines: string[] }>): string {
  if (!hunks.length) {
    return chalk.yellow("No changes detected.");
  }

  let output = "\n";
  for (const hunk of hunks) {
    output += chalk.cyan(`@@ -${hunk.oldStart},${hunk.lines.length} +${hunk.newStart},${hunk.lines.length} @@\n`);
    for (const line of hunk.lines) {
      if (line.startsWith("+")) {
        output += chalk.green(line) + "\n";
      } else if (line.startsWith("-")) {
        output += chalk.red(line) + "\n";
      } else {
        output += chalk.white(line) + "\n";
      }
    }
  }
  return output.trim();
}
