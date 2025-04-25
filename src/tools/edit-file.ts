import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import { dirname, isAbsolute, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { type Hunk, structuredPatch } from "diff";
import { formatSuffix, OraManager } from "utils/ora-manager";
import type { AgentContext } from "agents";

/**
 * Edit file in the project
 */
export const editFileTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "editFile",
        description: `
This tool edits a file by replacing a specific string with new content, preserving the entire original file content.
For moving or renaming files, use the 'executeCommand' tool with 'mv'. For overwriting entire files, use the 'writeFile' tool.

The tool replaces ONE occurrence of oldString with newString in the specified file, ensuring the final file is complete and idiomatic.
If multiple replacements are needed, make separate calls, each uniquely identifying the instance with extensive context.
When making edits:
   - Ensure the edit results in correct, idiomatic code.
   - Do not leave the code in a broken state.
   - Use absolute file paths (starting with /).
   - Preserve all original content except the replaced section.

To create a new file:
   - Use an empty oldString and provide the full content as newString.

Multiple edits to the same file should be batched in a single message with multiple calls to this tool.
`,
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The absolute path to the file to modify (must be absolute, not relative)",
            },
            oldString: {
              type: "string",
              description: "The exact text to replace (must match file contents, including whitespace and indentation)",
            },
            newString: {
              type: "string",
              description: "The new text to insert in place of oldString",
            },
          },
          required: ["path", "oldString", "newString"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: AgentContext): Promise<any> {
    const { path: filePath, oldString, newString } = args;
    const cwd = context.workingDirectory;
    const oraManager = new OraManager();
    try {
      const fullFilePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
      const dir = dirname(fullFilePath);
      const originalFile = existsSync(fullFilePath) ? readFileSync(fullFilePath, "utf8") : "";
      oraManager.startTool(`Editing file...`, formatSuffix(fullFilePath));

      // Validate oldString exists if not creating a new file
      if (oldString && originalFile && !originalFile.includes(oldString)) {
        oraManager.fail(`oldString not found in file: ${oldString}`);
        throw new Error(`oldString not found in file: ${oldString}`);
      }

      oraManager.update("Applying patch...");
      mkdirSync(dir, { recursive: true });
      const { patch, updatedFile } = applyEdit(originalFile, oldString, newString);
      console.log("\npatch: ", patch);
      await writeFile(fullFilePath, updatedFile, { encoding: "utf8", flush: true });

      oraManager.succeed(`File edited successfully. `, formatSuffix(fullFilePath));
      return {
        success: true,
        path: filePath,
        oldString,
        newString,
        message: `File edited successfully`,
        patch,
      };
    } catch (error: any) {
      oraManager.fail("File editing failed due to error: " + +error.message);
      return { error: error.message || "Failed to edit file" };
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
    oldStr.replaceAll("&", AMPERSAND_TOKEN).replaceAll("$", DOLLAR_TOKEN),
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
