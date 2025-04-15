import OpenAI from "openai";
import type { Context } from "types";
import path from "node:path";
import { promises as fs } from "node:fs";
import { v4 as uuidv4 } from "uuid";
import type { Task, Tool } from "./tools.types";
import { createErrorLog, parseMarkdownTasks, writeMarkdownTasks } from "utils";
import { OraManager } from "utils/ora-manager";

/**
 * Task Manager Tool: Manages tasks and subtasks, persists state in .codebro/tasks.json
 */
export const taskManagerTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "taskManager",
        description: `Manages project tasks, including creation, updates, and retrieval. Persists state in .codebro/tasks.md.
1. When adding new tasks, please provide tasks and subtasks based on the plan of architectTool for example:
        Result from architectTool: 
Task: Set Up Project Structure
- Create a single Python file snake_game.py
- Import required libraries (curses, random, time)
Task: Initialize Game Environment
- Set up curses screen
- Configure terminal settings

Then each create action should be:
{ "action": "create", "description": "Set Up Project Structure", "subtasks":[{"description":"Create a single Python file snake_game.py", "status": "pending"}, {"description":"Import required libraries (curses, random, time)", "status": "pending"}]  }

Create multiple actions if possible.
2. Updating task
Only update sub tasks if that task's status is changed, otherwise keep it as it is, do not remove them to keep track all tasks.
3. Deleting tasks
Only delete tasks when user ask, otherwise keep track the progress.
        `,
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
    const oraManager = new OraManager();
    const { action, taskId, description, status, subtasks } = args;
    const tasksPath = path.join(context.workingDirectory, ".codebro/tasks.md");
    oraManager.start(`Task Manager: ${action} action in progress...`);
    // (Removed duplicate destructure and tasksPath declaration)
    try {
      oraManager.update("Reading tasks...");
      let tasks: Task[] = [];
      try {
        const tasksContent = await fs.readFile(tasksPath, "utf-8");
        tasks = parseMarkdownTasks(tasksContent);
      } catch (error: any) {
        if (error.code !== "ENOENT") {
          oraManager.fail("Failed to read tasks file.");
          return createErrorLog(error);
        }
      }

      switch (action) {
        case "create": {
          if (!description) {
            oraManager.fail("Description required for task creation");
            return getErrorResponse("Description required for task creation");
          }
          oraManager.update("Creating new task...");
          const newTask: Task = {
            id: `task-${uuidv4()}`,
            description,
            status: status || "pending",
            subtasks: subtasks?.map((st: any) => ({
              id: `subtask-${uuidv4()}`,
              description: st.description,
              status: st.status || "pending",
            })),
          };
          tasks.push(newTask);
          await writeMarkdownTasks(tasksPath, tasks);
          oraManager.succeed("Task created successfully!");
          return { success: true, taskId: newTask.id, message: "Task created" };
        }
        case "update": {
          if (!taskId) {
            oraManager.fail("Task ID required for update");
            return getErrorResponse("Task ID required for update");
          }
          oraManager.update("Updating task...");
          const taskIndex = tasks.findIndex(t => t.id === taskId);
          if (taskIndex === -1) {
            oraManager.fail("Task not found");
            return getErrorResponse("Task not found");
          }
          const task = tasks[taskIndex];
          if (!task) {
            oraManager.fail("Task not found");
            return getErrorResponse("Task not found");
          }
          task.description = description || task.description;
          task.status = status || task.status;
          task.subtasks =
            subtasks?.map((st: any) => ({
              id: st.id || `subtask-${uuidv4()}`,
              description: st.description,
              status: st.status || "pending",
            })) || task.subtasks;
          tasks[taskIndex] = task;
          await writeMarkdownTasks(tasksPath, tasks);
          oraManager.succeed("Task updated successfully!");
          return { success: true, message: "Task updated" };
        }
        case "get": {
          if (!taskId) {
            oraManager.fail("Task ID required");
            return getErrorResponse("Task ID required");
          }
          oraManager.update("Getting task...");
          const task = tasks.find(t => t.id === taskId);
          if (!task) {
            oraManager.fail("Task not found");
            return getErrorResponse("Task not found");
          }
          oraManager.succeed("Task retrieved.");
          return { success: true, task };
        }
        case "list": {
          oraManager.succeed("Tasks listed.");
          return { success: true, tasks };
        }
        case "delete": {
          if (!taskId) {
            oraManager.fail("Task ID required");
            return getErrorResponse("Task ID required");
          }
          oraManager.update("Deleting task...");
          tasks = tasks.filter(t => t.id !== taskId);
          await writeMarkdownTasks(tasksPath, tasks);
          oraManager.succeed("Task deleted successfully!");
          return { success: true, message: "Task deleted" };
        }
        default:
          oraManager.fail("Invalid action");
          return getErrorResponse("Invalid action");
      }
    } catch (error: any) {
      oraManager.fail(error.message || "Task management failed");
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
