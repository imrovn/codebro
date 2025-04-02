#!/usr/bin/env node
import * as readline from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { askYesNoQuestion, createSystemMessage, createUserMessage, displayResponse } from "utils/index.js";
import { getRelevantFiles } from "services/filesystem/index.ts";
import type { Context } from "types/index.ts";
import { getClipboardContent } from "services/clipboard/index.ts";
import { config } from "config/index.ts";
import { AIServiceFactory } from "services/ai/index.js";

// Define CLI commands
const COMMANDS = {
  HELP: "help",
  VERSION: "version",
  EXIT: ["exit", "quit", "bye"],
  CLEAR: "/clear",
  HELP_SHORT: "/help",
};

/**
 * Main entry point for the CLI
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const initialCommand = args.join(" ");

  if (initialCommand) {
    // Handle special commands for the initial execution
    switch (initialCommand.toLowerCase()) {
      case COMMANDS.HELP:
      case COMMANDS.HELP_SHORT:
        displayHelp();
        return;
      case COMMANDS.VERSION:
        displayVersion();
        return;
      default:
        // Process normal user query
        // await processQuery(agent, initialCommand);
        await startInteractiveMode();
        return;
    }
  } else {
    // No command provided, start in interactive mode
    console.log("Welcome to Codebro! Type your coding questions or '/help' for available commands.");
    await startInteractiveMode();
  }
}

/**
 * Start interactive CLI mode
 */
async function startInteractiveMode() {
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
      case COMMANDS.HELP_SHORT:
        displayHelp();
        break;
      case COMMANDS.CLEAR:
        // agent.clearHistory();
        console.log("Conversation history cleared.");
        break;

      case COMMANDS.VERSION:
        displayVersion();
        break;
      default:
        // Process normal user query
        await processCommand(command);
        break;
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
async function processCommand(command: string) {
  try {
    const context = await gatherContext(command);
    // Create messages
    const systemMessage = createSystemMessage(context);
    const userMessage = createUserMessage(context);
    const messages = [systemMessage, userMessage];
    console.log("Processing your request...");
    // Create AI service
    const aiService = AIServiceFactory.createService(config);

    try {
      if (context.useStreaming) {
        console.log("\n===== Streaming Response =====\n");

        let responseText = "";
        await aiService.streamCompletion(messages, config.model, chunk => {
          process.stdout.write(chunk);
          responseText += chunk;
        });

        console.log("\n\n===============================\n");

        // Ask if the user wants to apply the code
        await handleResponseActions(responseText);
      } else {
        // Send normal request
        const response = await aiService.sendCompletion(messages, config.model);

        // Display the response
        displayResponse(response.content);

        // Ask if the user wants to apply the code
        await handleResponseActions(response.content);
      }
    } catch (error) {
      console.error("Error communicating with AI service:", error);
    }
  } catch (error) {
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
  } catch (error) {
    console.log("Codebro v0.0.1"); // Fallback version
  }
}

// Run the program
main();
