import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import { dirname, isAbsolute, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { type Hunk, structuredPatch } from "diff";

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
This is a tool for editing files. 
For moving or renaming files, you should generally use the Bash tool with the 'mv' command instead. 
For larger edits, use the Write tool to overwrite files.
        
The tool will replace ONE occurrence of oldString with newString in the specified file.
If you need to change multiple instances: Make separate calls to this tool for each instance, Each call must uniquely identify its specific instance using extensive context
When making edits:
   - Ensure the edit results in idiomatic, correct code
   - Do not leave the code in a broken state
   - Always use absolute file paths (starting with /)

If you want to create a new file, use:
   - A new file path, including dir name if needed
   - An empty oldString
   - The new file's contents as newString

Remember: when making multiple file edits in a row to the same file, you should prefer to send all edits in a single message with multiple calls to this tool, rather than multiple messages with a single call each.
`,
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for executing this tool",
            },
            path: {
              type: "string",
              description: "The absolute path to the file to modify (must be absolute, not relative)",
            },
            oldString: {
              type: "number",
              description:
                "The text to replace (must be unique within the file, and must match the file contents exactly, including all whitespace and indentation)",
            },
            newString: {
              type: "number",
              description: "The edited text to replace the oldString",
            },
          },
          required: ["reason", "path", "oldString", "newString"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    const { reason, path: filePath, oldString, newString } = args;
    const cwd = context.workingDirectory;

    try {
      const fullFilePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);
      const dir = dirname(fullFilePath);
      const originalFile = existsSync(fullFilePath) ? readFileSync(fullFilePath, "utf8") : "";
      console.log("editFileTool", reason);

      mkdirSync(dir, { recursive: true });
      const { patch, updatedFile } = applyEdit(cwd, filePath, oldString, newString);
      console.log("editFileTool", "updatedFile", updatedFile);
      await writeFile(fullFilePath, updatedFile, { encoding: "utf8", flush: true });

      return {
        success: true,
        path: filePath,
        oldString,
        newString,
        message: `File edited successfully`,
      };
    } catch (error: any) {
      return { error: error.message || "Failed to edit file" };
    }
  },
};

export function applyEdit(
  cwd: string,
  filePath: string,
  oldString: string,
  newString: string
): { patch: Hunk[]; updatedFile: string } {
  const fullFilePath = isAbsolute(filePath) ? filePath : resolve(cwd, filePath);

  let originalFile;
  let updatedFile;
  if (oldString === "") {
    // Create new file
    originalFile = "";
    updatedFile = newString;
  } else {
    // Edit existing file
    originalFile = readFileSync(fullFilePath, "utf-8");
    if (newString === "") {
      if (!oldString.endsWith("\n") && originalFile.includes(oldString + "\n")) {
        updatedFile = originalFile.replace(oldString + "\n", () => newString);
      } else {
        updatedFile = originalFile.replace(oldString, () => newString);
      }
    } else {
      updatedFile = originalFile.replace(oldString, () => newString);
    }
    if (updatedFile === originalFile) {
      throw new Error("Original and edited file match exactly. Failed to apply edit.");
    }
  }

  const patch = getPatch({
    filePath: filePath,
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
    fileContents
      .replaceAll("&", AMPERSAND_TOKEN)
      .replaceAll("$", DOLLAR_TOKEN)
      .replace(
        oldStr.replaceAll("&", AMPERSAND_TOKEN).replaceAll("$", DOLLAR_TOKEN),
        newStr.replaceAll("&", AMPERSAND_TOKEN).replaceAll("$", DOLLAR_TOKEN)
      ),
    undefined,
    undefined,
    { context: 3 }
  )
    .hunks.filter(_ => _?.lines?.length > 0)
    .map(_ => ({
      ..._,
      lines: _.lines.map(_ => _.replaceAll(AMPERSAND_TOKEN, "&").replaceAll(DOLLAR_TOKEN, "$")),
    }));
}
