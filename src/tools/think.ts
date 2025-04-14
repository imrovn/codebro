import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";

/**
 * Thinking Tool: Simulates reflection or reasoning by waiting and then responding with a summary.
 */
export const thinkingTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "thinkingTool",
        description: `
        Use the tool to think about something. It will not obtain new information or make any changes to the repository, but just log the thought. Use it when complex reasoning or brainstorming is needed. 

Common use cases:
1. When exploring a repository and discovering the source of a bug, call this tool to brainstorm several unique ways of fixing the bug, and assess which change(s) are likely to be simplest and most effective
2. After receiving test results, use this tool to brainstorm ways to fix failing tests
3. When planning a complex refactoring, use this tool to outline different approaches and their tradeoffs
4. When designing a new feature, use this tool to think through architecture decisions and implementation details
5. When debugging a complex issue, use this tool to organize your thoughts and hypotheses

The tool simply logs your thought process for better transparency and does not execute any code or make changes.`,
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for initiating the thinking tool",
            },
            delayInMs: {
              type: "number",
              description: "Time in milliseconds to simulate thinking",
            },
          },
          required: ["reason", "delayInMs"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    const { reason, delayInMs } = args;
    console.log("thinkingTool", reason);

    try {
      await new Promise(resolve => setTimeout(resolve, delayInMs));

      return {
        success: true,
        message: "Thinking completed successfully!",
        delay: delayInMs,
        reason: reason,
      };
    } catch (error: any) {
      return { error: error.message || "Thinking tool failed" };
    }
  },
};
