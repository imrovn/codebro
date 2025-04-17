#!/usr/bin/env node
import { config, validateConfig } from "configs";
import { gatherContext, makeLocalDirIfNotExists } from "utils";
import * as readline from "node:readline/promises";
import { cliApp } from "./cli.ts";
import process from "process";
import type { BaseAgent } from "agents/base-agent.ts";
import { getClient } from "client";
import { OraManager } from "utils/ora-manager.ts";
import chalk from "chalk";
import { getAgent } from "agents";
import figlet from "figlet";

// Define CLI commands
const COMMANDS = {
  EXIT: ["exit", "quit", "bye"],
};

/**
 * Main entry point for the CLI
 */
export async function main() {
  if (!validateConfig(config)) {
    process.exit(1);
  }
  makeLocalDirIfNotExists();

  const { mode, provider } = cliApp.opts();
  const context = await gatherContext();
  const client = getClient(config, provider);
  const agent = getAgent(context, client, mode);
  printWelcomeMessage(mode, provider, config.model);

  await chatLoop(agent).catch(console.error);
}

function printWelcomeMessage(mode: string, provider: string, model: string) {
  console.log(chalk.yellow(figlet.textSync("Codebro", { horizontalLayout: "full" })));
  console.log(chalk.yellow("------------------------------------------------------"));
  console.log(chalk.yellow(`   Mode: ${mode}     Provider: ${provider}     Model: ${model} `));
  console.log(chalk.yellow("------------------------------------------------------"));
}

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

async function chatLoop(agent: BaseAgent) {
  const oraManager = new OraManager();
  oraManager.start("Setting up...");
  oraManager.succeed("Hi, how can I help you! Type your message (or 'exit' to quit)");
  while (true) {
    const userInput = (await terminal.question(chalk.blue("\nYou: "))).trim();

    if (!userInput) {
      continue;
    }

    if (COMMANDS.EXIT.includes(userInput)) {
      oraManager.succeed("Bye bye !");
      process.exit(0);
    }

    oraManager.start("🤖 Thinking ...");
    try {
      const onStream = config.useStreaming ? (chunk: string) => process.stdout.write(chunk) : undefined;
      const response = await agent.chat(oraManager, userInput, onStream);
      oraManager.succeed(response);
    } catch (error: any) {
      oraManager.fail("Error during get response: " + error.message || "Agent error");
      console.error(error);
    }
  }
}
