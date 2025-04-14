import type { Tool } from "tools/tools.types.ts";
import { searchCodeTool } from "tools/search-code.ts";
import { projectStructureTool } from "tools/get-project-structure.ts";
import { readFileTool } from "tools/read-file.ts";
import { writeFileTool } from "tools/write-file.ts";
import { editFileTool } from "tools/edit-file.ts";
import { executeCommandTool } from "tools/exec-command.ts";
import { fetchUrlTool } from "tools/fetch-url.ts";
import { thinkingTool } from "tools/think.ts";
import { architectTool } from "tools/architect.ts";

export * from "./tools.types";

export function getCodeTools(): Tool[] {
  return [
    searchCodeTool,
    projectStructureTool,
    readFileTool,
    writeFileTool,
    editFileTool,
    executeCommandTool,
    fetchUrlTool,
    thinkingTool,
    architectTool,
  ];
}
