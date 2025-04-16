import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import { dirname, isAbsolute, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { type Hunk, structuredPatch } from "diff";
import { formatSuffix, OraManager } from "utils/ora-manager";

/**
 * Arguments for proposeCodeTool.
 */
export interface ProposeCodeArgs {
  path: string; // Absolute or project-relative path
  oldString: string; // The code to be replaced (can be empty for new file)
  newString: string; // The new code to insert
  codeMarkdownLanguage: string;
  instruction: string;
  targetLintErrorIds?: string[];
}

/**
 * Propose code edits to a file, following the agentic convention.
 * - Only the changed lines are specified, with context.
 * - All edits must be combined in a single call.
 *
 * @param args ProposeCodeArgs
 * @param context Context
 * @returns Patch and proposed new file content
 */
export const proposeCodeTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "proposeCode",
        description: `Propose precise code edits to a file. Use context lines to identify the edit location. 
        Edits must be correct and idiomatic. Do not leave code in a broken state. 
        To create a new file, use an empty oldString and provide the full content as newString.`,
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The absolute or project-relative path to the file to modify",
            },
            oldString: {
              type: "string",
              description: "The exact text to replace (must match file contents, including whitespace and indentation)",
            },
            newString: {
              type: "string",
              description: "The new text to insert in place of oldString",
            },
            codeMarkdownLanguage: {
              type: "string",
              description: "Language identifier (e.g., typescript, python)",
            },
            instruction: {
              type: "string",
              description: "Human-readable summary of the change",
            },
            targetLintErrorIds: {
              type: "array",
              items: { type: "string" },
              description: "Lint error IDs this edit aims to fix (optional)",
            },
          },
          required: ["path", "oldString", "newString", "codeMarkdownLanguage", "instruction"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args: ProposeCodeArgs, context: Context): Promise<any> {
    const { path: filePath, oldString, newString, codeMarkdownLanguage, instruction, targetLintErrorIds } = args;
    const cwd = context.workingDirectory;
    const oraManager = new OraManager();
    oraManager.startTool("Proposing code edit...", formatSuffix(filePath));
    try {
      const fullFilePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
      const dir = dirname(fullFilePath);
      const originalFile = existsSync(fullFilePath) ? readFileSync(fullFilePath, "utf8") : "";
      // Validate oldString exists if not creating a new file
      if (oldString && originalFile && !originalFile.includes(oldString)) {
        oraManager.fail(`oldString not found in file: ${oldString}`);
        throw new Error(`oldString not found in file: ${oldString}`);
      }
      oraManager.update("Computing patch...");
      mkdirSync(dir, { recursive: true });
      const { patch, updatedFile } = applyEdit(originalFile, oldString, newString);
      console.log("result patch", patch);
      oraManager.succeed("Proposed code edit ready.");
      return {
        success: true,
        path: filePath,
        oldString,
        newString,
        codeMarkdownLanguage,
        instruction,
        targetLintErrorIds,
        patch,
        proposedFile: updatedFile,
      };
    } catch (error: any) {
      oraManager.fail("Failed to propose code edit: " + error.message);
      return { error: error.message || "Failed to propose code edit" };
    }
  },
};

export function applyEdit(
  originalFile: string,
  oldString: string,
  newString: string
): { patch: Hunk[]; updatedFile: string } {
  let updatedFile: string;
  if (oldString === "") {
    // Create new file
    updatedFile = newString;
  } else {
    // Edit existing file
    if (!originalFile.includes(oldString)) {
      throw new Error("oldString not found in file");
    }
    updatedFile = originalFile.replace(oldString, newString);
    if (updatedFile === originalFile) {
      throw new Error("No changes applied; oldString matched but replacement failed");
    }
  }
  const patch = getPatch({
    filePath: "file",
    fileContents: originalFile,
    oldStr: originalFile,
    newStr: updatedFile,
  });
  return { patch, updatedFile };
}

const AMPERSAND_TOKEN = "<<:AMPERSAND_TOKEN:>>";
const DOLLAR_TOKEN = "<<:DOLLAR_TOKEN:>>";

export function getPatch({
  filePath,
  fileContents,
  oldStr,
  newStr,
}: {
  filePath: string;
  fileContents: string;
  oldStr: string;
  newStr: string;
}): Hunk[] {
  return structuredPatch(
    filePath,
    filePath,
    fileContents.replaceAll("&", AMPERSAND_TOKEN).replaceAll("$", DOLLAR_TOKEN),
    newStr.replaceAll("&", AMPERSAND_TOKEN).replaceAll("$", DOLLAR_TOKEN),
    undefined,
    undefined,
    { context: 3 }
  )
    .hunks.filter(h => h?.lines?.length > 0)
    .map(h => ({
      ...h,
      lines: h.lines.map(l => l.replaceAll(AMPERSAND_TOKEN, "&").replaceAll(DOLLAR_TOKEN, "$")),
    }));
}

/**
 * Example usage:
 * const result = await proposeCodeTool.run({
 *   path: 'src/foo.ts',
 *   oldString: 'console.log("foo")',
 *   newString: 'console.log("bar")',
 *   codeMarkdownLanguage: 'typescript',
 *   instruction: 'Update log statement',
 * }, { workingDirectory: process.cwd() });
 */
