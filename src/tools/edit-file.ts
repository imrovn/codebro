import chalk from "chalk";
import type OpenAI from "openai";

import type { AgentContext } from "@agents";
import { getPatch } from "@tools/propose-code.ts";
import type { Tool } from "@tools/tools.types.ts";
import { formatSuffix, OraManager } from "@utils/ora-manager";

import fs from "node:fs";
import path from "node:path";

/**
 * Edit a file in the project by replacing a searchString with newString
 * and display the diff of changes made.
 */
export const editFileTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "editFile",
        description: `Edits a file by replacing a specified searchString with newString. Displays a diff of the changes made to show added and removed lines. Overwrites the existing file if it exists.

Usage Instructions:
- Purpose: Use to make precise code or content changes in a file, such as fixing bugs, updating configurations, or modifying logic.
- Parameters:
  - path: Provide a project-relative or absolute path to the target file.
  - searchString: Specify the exact string to replace (must match file contents, including whitespace and indentation). Use an empty string to overwrite the entire file.
  - newString: Provide the new content to insert in place of searchString.
- Output:
  - Returns success status, file path, and a formatted diff showing changes (added lines in green, removed lines in red).
  - The diff includes line numbers and context for clarity, similar to git diff.
- Best Practices:
  - Use \`readFile\` first to verify the file’s contents and ensure searchString matches.
  - Validate the path using \`getProjectStructure\` to align with project conventions.
  - Combine with \`proposeCode\` for complex edits requiring planning.
- Example:
  - Query: Edit src/api.ts to replace "getUsers()" with "fetchUsers()"
  - Result: Updates the file and shows a diff with removed (-getUsers()) and added (+fetchUsers()) lines.
`,
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Path to the file, relative to the project root or absolute",
            },
            searchString: {
              type: "string",
              description:
                "The exact string to replace (must match file contents, including whitespace). Empty string to overwrite entire file.",
            },
            newString: {
              type: "string",
              description: "The new string to insert in place of searchString",
            },
            createDirs: {
              type: "boolean",
              description: "Whether to create parent directories if they don't exist",
              default: true,
            },
          },
          required: ["node:path", "searchString", "newString"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: AgentContext): Promise<any> {
    const { path: filePath, searchString, newString, createDirs = true } = args;
    const oraManager = new OraManager();
    oraManager.startTool(`Editing file: ${filePath}`, formatSuffix(filePath));
    const cwd = context.workingDirectory;
    const absolutePath = path.resolve(cwd, filePath);

    try {
      // Read original file content or initialize empty if it doesn't exist
      const originalContent = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf-8") : "";

      // Validate searchString exists if not overwriting entire file
      if (searchString && originalContent && !originalContent.includes(searchString)) {
        oraManager.fail(`searchString not found in file: ${searchString}`);
        return {
          success: false,
          error: `searchString not found in file: ${searchString}`,
        };
      }

      // Create parent directories if they don't exist
      if (createDirs) {
        const dirPath = path.dirname(absolutePath);
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Apply the edit
      const updatedContent = searchString ? originalContent.replace(searchString, newString) : newString;

      // Compute the diff
      const diffHunks = getPatch({
        filePath,
        fileContents: originalContent,
        oldStr: originalContent,
        newStr: updatedContent,
      });

      // Format the diff for display
      const formattedDiff = formatDiff(diffHunks);

      // Write the updated content to the file
      fs.writeFileSync(absolutePath, updatedContent, "utf-8");

      oraManager.succeed(`File edited successfully: ${filePath}\n Content changed: ${formattedDiff}\n`);
      return {
        success: true,
        path: filePath,
        message: `File edited successfully: ${filePath}`,
        diff: formattedDiff, // Include formatted diff in output
      };
    } catch (error: any) {
      oraManager.fail(`Failed to edit file: ${filePath} (${error.message || error})`);
      return {
        success: false,
        error: error.message || `Failed to edit file: ${filePath}`,
      };
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
