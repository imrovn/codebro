#!/usr/bin/env node
import { config, validateConfig } from "configs";
import { displayHelp, gatherContext, makeLocalDirIfNotExists } from "utils";
import * as readline from "node:readline/promises";
import { program } from "./cli.ts";
import process from "process";
import { CoderAgent } from "agents/coder/agent.ts";
import type { BaseAgent } from "agents/base/agent.ts";
import { getClient } from "client";
import { OraManager } from "utils/ora-manager.ts";

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
  await makeLocalDirIfNotExists();
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
  const oraManager = new OraManager();
  oraManager.start("Setting up...");
  oraManager.succeed("Ready! Type your message (or 'exit' to quit)");
  while (true) {
    const userInput = (await terminal.question("You: ")).trim();

    if (!userInput) {
      continue;
    }

    if (COMMANDS.EXIT.includes(userInput)) {
      oraManager.succeed("Bye bye !");
      process.exit(0);
    }

    oraManager.start("🤖 Thinking ...\n");
    try {
      const onStream = config.useStreaming ? (chunk: string) => process.stdout.write(chunk) : undefined;
      const response = await agent.chat(userInput, onStream);
      oraManager.succeed("Agent responded.");
      console.log(response + "\n");
    } catch (error: any) {
      oraManager.fail(error.message || "Agent error");
      console.error(error);
    }
  }
}
