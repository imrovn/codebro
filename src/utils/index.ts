import chalk from "chalk";
import { version } from "../../package.json";
import type { Context } from "types";
import { getRelevantFiles } from "filesystem";
import { config } from "configs";
import process from "process";
import type { ToolCallResponse } from "tools";
import fs from "node:fs";
import path from "node:path";

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

/**
 * Gather context from the current environment
 */
export async function gatherContext(): Promise<Context> {
  const workingDirectory = process.cwd();
  const files = await getRelevantFiles(workingDirectory, config.maxFiles, config.excludePaths);

  return {
    workingDirectory,
    files,
    useStreaming: config.useStreaming,
  };
}

export async function makeLocalDirIfNotExists() {
  const workingDirectory = process.cwd();
  const localDir = path.join(workingDirectory, ".codebro");
  try {
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir);
    }
  } catch (err) {
    console.error(err);
  }
}
