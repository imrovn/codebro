#!/usr/bin/env node
import * as readline from "node:readline";
import { config, validateConfig } from "config";
import { type BaseAgent, createAgent } from "agents";
import { createAgentLog, createCommandResult, displayHelp, displayVersion, gatherContext } from "utils";
import { program } from "cli.ts";
import chalk from "chalk";

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
export async function main() {
  const options = program.opts();
  if (!validateConfig(config)) {
    process.exit(1);
  }

  const context = await gatherContext();
  const agent = createAgent(context, "coder");

  if (options.help) {
    displayHelp();
  } else {
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
    prompt: "> ",
  });
  createAgentLog("Welcome to brocode - Your AI Code Assistant!");
  console.log(
    chalk.gray("Interactive mode started. Type 'exit' to quit, '/help' for commands, '/clear' to clear history.\n")
  );
  rl.prompt();

  rl.on("line", async input => {
    const command = input.trim().toLowerCase();

    if (!command) {
      rl.prompt();
      return;
    }

    if (COMMANDS.EXIT.includes(command)) {
      rl.close();
      process.exit(0);
    }

    switch (command) {
      case COMMANDS.HELP:
        displayHelp();
        return;
      case COMMANDS.CLEAR:
        agent.clearHistory();
        createAgentLog("\nConversation history cleared.");
        rl.prompt();
        return;
      case COMMANDS.VERSION:
        displayVersion();
        rl.prompt();
        return;
      default:
    }

    createAgentLog("\nThinking ...");
    const onStream = config.useStreaming ? (chunk: string) => rl.write(chunk) : undefined;
    const response = await agent.chat(command, onStream);

    const history = agent.getHistory();
    if (history && history.toolCalls && history.toolCalls.length > 0) {
      const lastCommand = [...history.toolCalls].reverse().find(tc => tc.call.function.name === "executeCommand");
      createCommandResult(lastCommand);
    }

    console.log(response.response, "\n");
    rl.prompt();
  }).on("close", () => {
    createAgentLog("\nGoodbye!");
    process.exit(0);
  });
}
