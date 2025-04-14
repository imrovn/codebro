import type { Tool } from "./tools.types";
import { thinkingTool } from "./think";
import { searchCodeTool } from "./search-code";
import { projectStructureTool } from "./get-project-structure";
import { writeFileTool } from "./write-file";
import { editFileTool } from "./edit-file";
import { executeCommandTool } from "./exec-command";
import { fetchUrlTool } from "./fetch-url";
import { readFileTool } from "./read-file";

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
  ];
}
