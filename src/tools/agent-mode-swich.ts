import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import { OraManager } from "utils/ora-manager.ts";

/**
 * Agent mode switching tool
 */
export const agentModeSwitchTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "agentModeSwitch",
        description: `Your tool to switch agent mode between NORMAL and PLAN.`,
        parameters: {
          type: "object",
          properties: {
            mode: {
              type: "string",
              description: "The target mode, option could be either NORMAL or PLAN",
            },
          },
          required: ["mode"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    const oraManager = new OraManager();
    const { mode } = args;
    oraManager.startTool("Agent mode switching...");
    oraManager.succeed(`Agent mode switched to ${mode}.`);

    return {
      success: true,
      mode,
    };
  },
};
