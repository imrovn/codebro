#!/usr/bin/env node
import { config, validateConfig } from "configs";
import { createAgentLog, displayHelp, gatherContext } from "utils";
import * as readline from "node:readline/promises";
import { program } from "./cli.ts";
import process from "process";
import { CoderAgent } from "agents/coder/agent.ts";
import type { BaseAgent } from "agents/base/agent.ts";
import { getClient } from "client";

// Define CLI commands
const COMMANDS = {
  EXIT: ["exit", "quit", "bye"],
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
  const client = getClient(config);
  const coderAgent = new CoderAgent(context, { model: config.model, client });

  if (options.help) {
    displayHelp();
  } else {
    await chatLoop(coderAgent).catch(console.error);
  }
}

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

async function chatLoop(agent: BaseAgent) {
  console.log("Setting up...");
  console.log("\n🤖 Ready! Type your message (or 'exit' to quit)\n");
  while (true) {
    const userInput = (await terminal.question("You: ")).trim();
    if (COMMANDS.EXIT.includes(userInput)) {
      createAgentLog("Bye bye !\n");
      process.exit(0);
    }

    createAgentLog("\nThinking ...\n");

    const onStream = config.useStreaming ? (chunk: string) => process.stdout.write(chunk) : undefined;
    const response = await agent.chat(userInput, onStream);
    if (!config.useStreaming) {
      process.stdout.write(response.response + "\n");
    }
  }
}
