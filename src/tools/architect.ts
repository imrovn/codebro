import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import { callLlm } from "utils/llm.ts";

/**
 * Fetch content from a URL
 */
export const architectTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "architect",
        description: `Your go-to tool for any technical or coding task. 
        Analyzes requirements and breaks them down into clear, actionable implementation steps. 
        Use this whenever you need help planning how to implement a feature, solve a technical problem, or structure your code.`,
        parameters: {
          type: "object",
          properties: {
            reason: {
              type: "string",
              description: "Reason for executing this tool",
            },
            prompt: {
              type: "string",
              description: "The technical request or coding task to analyze",
            },
            context: {
              type: "string",
              description: "Optional context from previous conversation or system state",
            },
          },
          required: ["reason", "prompt"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    console.log("Planning...");
    const { reason, path: prompt, context: conversationContext } = args;
    try {
      const systemPrompt = `
      You are an expert software architect. Your role is to analyze technical requirements and produce clear, actionable implementation plans.
These plans will then be carried out by a junior software engineer so you need to be specific and detailed. However do not actually write the code, just explain the plan.

Follow these steps for each request:
1. Carefully analyze requirements to identify core functionality and constraints
2. Define clear technical approach with specific technologies and patterns
3. Break down implementation into concrete, actionable steps at the appropriate level of abstraction

Keep responses focused, specific and actionable. 

IMPORTANT: Do not ask the user if you should implement the changes at the end. Just provide the plan as described above.
IMPORTANT: Do not attempt to write the code or use any string modification tools. Just provide the plan.

The output should be in a plain list, separate by line break (\\n):
For example: 
User query: Create simple terminal snake game 
Output:
Task: Set Up Project Structure
- Create a single Python file snake_game.py
- Import required libraries (curses, random, time)
Task: Initialize Game Environment
- Set up curses screen
- Configure terminal settings
      `;
      return {
        success: true,
        result: await callLlm(
          systemPrompt,
          conversationContext ? `<context>${conversationContext}</context>\n\n${prompt}` : prompt
        ),
      };
    } catch (error: any) {
      return {
        success: false,
        result: `Error when planning: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
