#!/usr/bin/env node
import * as readline from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { askYesNoQuestion } from "./utils/index.ts";
import { getRelevantFiles } from "./services/filesystem/index.ts";
import type { Context } from "./types/index.ts";
import { getClipboardContent } from "./services/clipboard/index.ts";
import { config, validateConfig } from "./config/index.ts";
import { type BaseAgent, createAgent } from "./agents/index.ts";

// Define CLI commands
const COMMANDS = {
  VERSION: "version",
  EXIT: ["exit", "quit", "bye"],
  CLEAR: "/clear",
  HELP: "/help",
};

/**
 * Main entry point for the CLI
 */
async function main() {
  if (!validateConfig(config)) {
    process.exit(1);
  }
  // Parse command line arguments
  const args = process.argv.slice(2);
  const initialCommand = args.join(" ");

  // Create the coder agent
  const agent = createAgent("coder");

  if (initialCommand) {
    // Handle special commands for the initial execution
    switch (initialCommand.toLowerCase()) {
      case COMMANDS.HELP:
        displayHelp();
        return;
      case COMMANDS.VERSION:
        displayVersion();
        return;
      default:
        // Process normal user query
        // await processQuery(agent, initialCommand);
        await startInteractiveMode(agent);
        return;
    }
  } else {
    // No command provided, start in interactive mode
    console.log("Welcome to Codebro! Type your coding questions or '/help' for available commands.");
    await startInteractiveMode(agent);
  }
}

/**
 * Start interactive CLI mode
 */
async function startInteractiveMode(agent: BaseAgent) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "codebro> ",
  });

  console.log("\nInteractive mode started. Type 'exit' to quit, '/help' for commands, '/clear' to clear history.\n");
  rl.prompt();

  rl.on("line", async input => {
    const command = input.trim();

    if (!command) {
      rl.prompt();
      return;
    }

    // Handle special commands
    if (COMMANDS.EXIT.includes(command.toLowerCase())) {
      console.log("Goodbye!");
      rl.close();
      process.exit(0);
    }
    switch (command.toLowerCase()) {
      case COMMANDS.HELP:
        displayHelp();
        return;
      case COMMANDS.CLEAR:
        // agent.clearHistory();
        console.log("Conversation history cleared.");
        return;

      case COMMANDS.VERSION:
        displayVersion();
        return;
      default:
        await processQuery(agent, command);
        return;
    }

    rl.prompt();
  }).on("close", () => {
    console.log("Goodbye!");
    process.exit(0);
  });
}

/**
 * Gather context from the current environment
 */
async function gatherContext(command: string): Promise<Context> {
  const currentDirectory = process.cwd();
  const files = await getRelevantFiles(currentDirectory, config.maxFiles, config.excludePaths);
  const selectedCode = await getClipboardContent();

  return {
    currentDirectory,
    files,
    selectedCode,
    command,
    useStreaming: config.useStreaming,
  };
}

/**
 * Process a user query
 */
async function processQuery(agent: BaseAgent, command: string) {
  try {
    const response = await agent.run(command);

    // Check the agent's history for command execution results
    const history = agent.getHistory?.();
    if (history && history.toolCalls && history.toolCalls.length > 0) {
      // Find the last executeCommand tool call
      const lastCommandCall = [...history.toolCalls].reverse().find(tc => tc.call.function.name === "executeCommand");

      if (lastCommandCall) {
        console.log("\n--- Command Execution Result ---");
        const result = lastCommandCall.result;

        if (result.stdout) {
          console.log("\nOutput:");
          console.log(result.stdout);
        }

        if (result.stderr && result.stderr.length > 0) {
          console.log("\nErrors:");
          console.log(result.stderr);
        }

        if (result.error) {
          console.log("\nExecution Error:");
          console.log(result.error);
        }

        console.log("\n--- End of Command Result ---\n");
      }
    }

    // Display the agent's response
    console.log(response.response);
  } catch (error: any) {
    console.error("Error:", error);
  }
}

/**
 * Handle actions after receiving AI response
 */
async function handleResponseActions(response: string): Promise<void> {
  const shouldApply = await askYesNoQuestion("Apply this code to current file?");

  if (shouldApply) {
    // Here you would implement code to apply changes to current file
    console.log("Code applied!");
  } else {
    console.log("No changes applied.");
  }
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`
Codebro - Your AI Coding Assistant

Usage:
  codebro "your question or request"
  codebro [command]

Commands:
  /help                   Display this help message
  /clear                  Clear conversation history
  version                 Display version information
  exit, quit, bye         Exit the application

Examples:
  codebro "create a function to sort an array"
  codebro "explain what this code does: console.log('hello world')"
  codebro "refactor this function to be more efficient"
  `);
}

/**
 * Display version information
 */
function displayVersion() {
  // Read version from package.json using ES modules
  try {
    // Get the directory name using ES modules pattern
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Read and parse package.json
    const packageJsonPath = path.resolve(__dirname, "../package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    console.log(`Codebro v${packageJson.version}`);
  } catch (error: any) {
    console.log("Codebro v0.0.1"); // Fallback version
  }
}

// Run the program
main();
