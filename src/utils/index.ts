import chalk from "chalk";
import { version } from "../../package.json";
import type { Context, Message, ToolCallResponse } from "types";
import { getRelevantFiles } from "services/filesystem";
import { getClipboardContent } from "services/clipboard";
import { config } from "configs";
import process from "process";

/**
 * Creates a user message with optional selected code
 */
export function createUserMessage(message: string): Message {
  return {
    role: "user",
    content: message,
  };
}

export function createAssistantMessage(content: string): Message {
  return {
    role: "assistant",
    content,
  };
}

/**
 * Display help information
 */
export function displayHelp() {
  createAgentLog(`
Codebro - Your AI Coding Assistant

Usage: Entering interactive mode until exit signal found via commands below
> codebro 

Commands:
  /help                   Display this help message
  /clear                  Clear conversation history
  version                 Display version information
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

/**
 * Gather context from the current environment
 */
export async function gatherContext(): Promise<Context> {
  const workingDirectory = process.cwd();
  const files = await getRelevantFiles(workingDirectory, config.maxFiles, config.excludePaths);
  const selectedCode = await getClipboardContent();

  return {
    workingDirectory,
    files,
    selectedCode,
    useStreaming: config.useStreaming,
  };
}
