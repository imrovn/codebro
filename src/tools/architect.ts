import type { Task, Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { Context } from "types";
import { callLlm } from "utils/llm.ts";
import { OraManager } from "utils/ora-manager.ts";
import { v4 as uuidv4 } from "uuid";
import { taskManagerTool } from "tools/task-manager.ts";

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
            prompt: {
              type: "string",
              description: "The technical request or coding task to analyze",
            },
            context: {
              type: "string",
              description:
                "Optional context from previous conversation or system state for example current project technology, project structure, code style and convention",
            },
          },
          required: ["prompt"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    const oraManager = new OraManager();
    const { prompt, context: conversationContext } = args;
    oraManager.startTool("Planning architecture...", `\t ${prompt}`);
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
      const result = await callLlm(
        context,
        systemPrompt,
        conversationContext ? `<context>${conversationContext}</context>\n\n${prompt}` : prompt
      );
      const tasks = parseTasks(result);
      if (tasks.length > 0) {
        for (const task of tasks) {
          await taskManagerTool.run(
            {
              action: "create",
              description: task.description,
              subtasks: task.subtasks,
            },
            context
          );
        }
      }

      oraManager.succeed("Plan generated.", `\n ${result}`);
      return {
        success: true,
        result,
      };
    } catch (error: any) {
      oraManager.fail("Error when planning.");
      return {
        success: false,
        result: `Error when planning: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};

function parseTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const taskSections = content.split(/^Task: /m).slice(1);

  for (const section of taskSections) {
    const lines = section.split("\n");
    if (!lines.length) {
      continue;
    }

    const descriptionMatch = lines[0]?.match(/^(.*) \((task-[^\)]+)\)/);
    if (!descriptionMatch) continue;

    const task: Task = {
      id: descriptionMatch[2] || uuidv4(),
      description: descriptionMatch[1] || "",
      status: "pending",
      subtasks: [],
    };

    // Sub tasks
    for (const line of lines.slice(1)) {
      const subtaskMatch = line.match(/\[([ x])\] (.*) \((subtask-[^\)]+)\)/);
      if (subtaskMatch) {
        task.subtasks!.push({
          id: subtaskMatch[3] || uuidv4(),
          description: subtaskMatch[2] || "",
          status: subtaskMatch[1] === "x" ? "completed" : "pending",
        });
      }
    }

    task.status =
      task.subtasks?.length == task.subtasks?.filter(st => st.status === "completed").length ? "completed" : "pending";
    tasks.push(task);
  }

  return tasks;
}
