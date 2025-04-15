import OpenAI from "openai";
import type { Context } from "types";
import path from "node:path";
import { promises as fs } from "node:fs";
import { v4 as uuidv4 } from "uuid";
import type { ProjectState, Task, Tool } from "./tools.types";

/**
 * Task Manager Tool: Manages tasks and subtasks, persists state in .codebro/tasks.json
 */
export const taskManagerTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "taskManager",
        description:
          "Manages project tasks, including creation, updates, and retrieval. Persists state in .codebro/tasks.json.",
        parameters: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["create", "update", "get", "list", "delete"],
              description: "Action to perform on tasks",
            },
            taskId: {
              type: "string",
              description: "ID of the task (required for update, get, delete)",
            },
            description: {
              type: "string",
              description: "Task description (required for create)",
            },
            status: {
              type: "string",
              enum: ["pending", "in_progress", "completed", "failed"],
              description: "Task status (for update)",
            },
            subtasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  description: { type: "string" },
                  status: { type: "string", enum: ["pending", "in_progress", "completed", "failed"] },
                },
              },
              description: "Subtasks to create or update",
            },
            dependencies: {
              type: "array",
              items: { type: "string" },
              description: "Task IDs that this task depends on",
            },
            output: {
              type: "string",
              description: "Task output or result (for update)",
            },
          },
          required: ["action"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: Context): Promise<any> {
    const { action, taskId, description, status, subtasks, dependencies, output } = args;
    const statePath = path.join(context.workingDirectory, ".codebro/tasks.json");

    try {
      let state: ProjectState = { tasks: [], lastUpdated: new Date().toISOString() };
      try {
        const stateContent = await fs.readFile(statePath, "utf-8");
        state = JSON.parse(stateContent);
      } catch (error: any) {
        if (error.code !== "ENOENT") return getErrorResponse(error);
      }

      switch (action) {
        case "create": {
          if (!description) return getErrorResponse("Description required for task creation");

          const newTask: Task = {
            id: uuidv4(),
            description,
            status: status || "pending",
            subtasks: subtasks?.map((st: any) => ({
              ...st,
              id: uuidv4(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })),
            dependencies: dependencies || [],
            output: output || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          state.tasks.push(newTask);

          await fs.writeFile(statePath, JSON.stringify(state, null, 2));

          return { success: true, taskId: newTask.id, message: "Task created" };
        }
        case "update": {
          if (!taskId) {
            return getErrorResponse("Task ID required for update");
          }

          let task = state.tasks.find(t => t.id === taskId);
          if (!task) {
            return getErrorResponse("Task not found");
          }

          task = {
            ...task,
            description: description || task.description,
            status: status || task.status,
            subtasks:
              subtasks?.map((st: any) => ({
                ...st,
                id: st.id || uuidv4(),
                createdAt: st.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })) || task.subtasks,
            dependencies: dependencies || task.dependencies,
            output: output !== undefined ? output : task.output,
            updatedAt: new Date().toISOString(),
          };
          state.lastUpdated = new Date().toISOString();

          await fs.writeFile(statePath, JSON.stringify(state, null, 2));

          return { success: true, message: "Task updated" };
        }
        case "get": {
          if (!taskId) {
            return getErrorResponse("Task ID required");
          }

          const task = state.tasks.find(t => t.id === taskId);
          if (!task) {
            return getErrorResponse("Task not found");
          }

          return { success: true, task };
        }
        case "list": {
          return { success: true, tasks: state.tasks };
        }
        case "delete": {
          if (!taskId) {
            return getErrorResponse("Task ID required");
          }

          state.tasks = state.tasks.filter(t => t.id !== taskId);
          state.lastUpdated = new Date().toISOString();

          await fs.writeFile(statePath, JSON.stringify(state, null, 2));

          return { success: true, message: "Task deleted" };
        }
        default:
          return getErrorResponse("invalid action");
      }
    } catch (error: any) {
      return { success: false, error: error.message || "Task management failed" };
    }
  },
};

const getErrorResponse = (message: string): { success: boolean; error: string } => {
  return {
    success: false,
    error: message,
  };
};
