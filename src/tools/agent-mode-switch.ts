import type OpenAI from "openai";

import type { AgentContext } from "@agents/agents.types";
import type { Tool } from "@tools/tools.types";
import { OraManager } from "@utils/ora-manager";

/**
 * Switch agent mode with a defined plan and execute it.
 */
export const agentModeSwitchTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "agentModeSwitch",
        description: `Switches the agent mode (EXECUTE or PLAN) with a structured plan. 
        Use this to change the agent's operational mode, ensuring clear requirements and adherence to a plan.
        EXECUTE mode focuses on direct task execution, while PLAN mode emphasizes planning and task breakdown.`,
        parameters: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              enum: ["EXECUTE", "PLAN"],
              description: "The target mode (EXECUTE or PLAN)",
            },
            purpose: {
              type: "string",
              description: "The purpose of switching modes (e.g., 'to plan a complex feature implementation')",
            },
            context: {
              type: "string",
              description:
                "Optional context for the mode switch (e.g., 'working on a TypeScript project with src/configs')",
            },
          },
          required: ["mode", "purpose"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: AgentContext): Promise<any> {
    const oraManager = new OraManager();
    const { mode, purpose, context: modeContext = "" } = args;
    oraManager.startTool(`Switching agent mode to '${mode}' for: ${purpose}`);

    // Validate mode
    if (!["EXECUTE", "PLAN"].includes(mode)) {
      oraManager.fail(`Invalid mode '${mode}'. Must be EXECUTE or PLAN.`);
      return { success: false, error: `Invalid mode '${mode}'` };
    }

    oraManager.succeed(`Switched agent mode to '${mode}' for: ${purpose}`);
    return {
      success: true,
      mode,
      message: `Agent mode switched to '${mode}' as planned with additional context ${modeContext}`,
    };
  },
};
