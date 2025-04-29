import chalk from "chalk";
import process from "process";
import { v4 as uuidv4 } from "uuid";

import type { Task, ToolCallResponse } from "@tools";

import fs from "node:fs";

import { version } from "../../package.json";

/**
 * Display help information
 */
export function displayHelp() {
  createAgentLog(`
Codebro - Your AI Coding Assistant

Usage: Entering interactive mode until exit signal found via commands below
> codebro 

Commands:
  exit, quit, bye         Exit the application
  `);
}

export function displayVersion() {
  createAgentLog("Codebro v", version);
}

export function createUserLog(...text: unknown[]) {
  process.stdout.write(chalk.blue(text));
}

export function createErrorLog(...text: unknown[]) {
  process.stdout.write(chalk.red(text));
}

export function createAgentLog(...text: unknown[]) {
  process.stdout.write(chalk.blue(text));
}

export function createCommandResult(command?: ToolCallResponse) {
  if (command && command.call.function.name === "executeCommand") {
    createAgentLog("\n--- Command Execution Result ---");
    const result = command.result;

    if (result.stdout) {
      createAgentLog("\nOutput:");
      createAgentLog(result.stdout);
    }

    if (result.stderr && result.stderr.length > 0) {
      createAgentLog("\nErrors:");
      createAgentLog(result.stderr);
    }

    if (result.error) {
      createAgentLog("\nExecution Error:");
      createAgentLog(result.error);
    }

    createAgentLog("\n--- End of Command Result ---\n");
  }
}

// export function makeLocalDirIfNotExists() {
//   const workingDirectory = process.cwd();
//   const localDir = path.join(workingDirectory, ".codebro");
//   try {
//     if (!fs.existsSync(localDir)) {
//       fs.mkdirSync(localDir);
//     }
//   } catch (err) {
//     console.error(err);
//   }
// }

/**
 * Parse Markdown tasks from .codebro/tasks.md
 */
export function parseMarkdownTasks(content: string): Task[] {
  const tasks: Task[] = [];
  const taskSections = content.split(/^(?:\s.*|.*|\*\*\s.*) Task: /m).slice(1);

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

/**
 * Write tasks to .codebro/tasks.md in Markdown format
 */
export function writeMarkdownTasks(filePath: string, tasks: Task[]): void {
  let content = "# Codebro Tasks\n\n";
  for (const task of tasks) {
    content += `# Task: ${task.description} (${task.id})\n`;
    if (task.subtasks?.length) {
      for (const subtask of task.subtasks) {
        const checkbox = subtask.status === "completed" ? "[x]" : "[ ]";
        content += `  - ${checkbox} ${subtask.description} (${subtask.id})\n`;
      }
    }
    content += "\n";
  }
  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Check if all tasks are completed
 */
export function checkTaskCompletion(tasks: Task[]): { allCompleted: boolean; incompleteTasks: string[] } {
  const incompleteTasks: string[] = [];
  for (const task of tasks) {
    if (task.status !== "completed") {
      incompleteTasks.push(`${task.id}: ${task.description} (${task.status})`);
    }
    if (task.subtasks) {
      for (const subtask of task.subtasks) {
        if (subtask.status !== "completed") {
          incompleteTasks.push(`${subtask.id}: ${subtask.description} (subtask of ${task.id})`);
        }
      }
    }
  }
  return {
    allCompleted: incompleteTasks.length === 0,
    incompleteTasks,
  };
}
