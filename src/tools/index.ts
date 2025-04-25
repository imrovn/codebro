import type { Tool } from "tools/tools.types.ts";
import { searchCodeTool } from "tools/search-code.ts";
import { projectStructureTool } from "tools/get-project-structure.ts";
import { readFileTool } from "tools/read-file.ts";
import { writeFileTool } from "tools/write-file.ts";
import { editFileTool } from "tools/edit-file.ts";
import { executeCommandTool } from "tools/exec-command.ts";
import { fetchUrlTool } from "tools/fetch-url.ts";
import { thinkingTool } from "tools/think.ts";
import { agentModeSwitchTool } from "tools/agent-mode-switch.ts";
import { plannerTool } from "tools/planner.ts";

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
    agentModeSwitchTool,
    plannerTool,
    // taskManagerTool,
    // proposeCodeTool,
  ];
}

export function getPrompterTools(): Tool[] {
  return [readFileTool, writeFileTool, fetchUrlTool, thinkingTool];
  // return [readFileTool, writeFileTool, fetchUrlTool, thinkingTool, plannerTool];
}

export function removeRedundantTools(tools: Tool[], excludeTools: string[] = []) {
  const toolNames = new Set();
  return tools.filter((tool: Tool) => {
    const toolName = tool.getDefinition().function.name;
    return !excludeTools.includes(toolName) && !toolNames.has(toolName) && toolNames.add(toolName);
  });
}

export function formatToolForPrompt(tool: Tool): string {
  const toolFunction = tool.getDefinition().function;
  let formattedTool = "";
  const parameters = (toolFunction?.parameters?.properties || {}) as Record<string, any>;
  const properties: string[] = Object.keys(parameters || {});
  const required = (toolFunction?.parameters?.required || []) as string[];
  if (properties.length > 0) {
    formattedTool += `Tool: ${toolFunction.name}\nDescription: ${toolFunction.description}\nParameters:\n `;
    for (const property of properties) {
      formattedTool += ` - ${property} (${parameters[property]?.type || ""}${required.includes(property) ? ", required" : ""}): ${parameters[property]?.description || ""}\n`;
    }
    formattedTool += "\n";
  }

  return formattedTool;
}

export function formatToolsForPrompt(tools: Tool[]): string {
  if (!tools || tools.length === 0) {
    return "No tools available.";
  }

  return `Available tools that could be chose:\n\n${tools.map(formatToolForPrompt).join("\n")}\n`;
}
