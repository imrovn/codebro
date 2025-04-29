#! /usr/bin/node
import { Command, Option, type OptionValues } from "commander";
import { config } from "dotenv";

import { main } from "@chat";
import { loadGlobalConfig, printConfigMessage } from "@configs";

import * as process from "node:process";

import { version } from "../package.json";

config();

export const cliApp = new Command();
const viewCommand = new Command()
  .command("config")
  .description("Manage Codebro configuration")
  .option("--view", "View current configuration")
  .action(async options => {
    // TODO: handle more options e.g. update MCP config path, handle view by default

    const globalConfig = await loadGlobalConfig();
    printConfigMessage(globalConfig);

    process.exit(0);
  });

cliApp
  .name("codebro")
  .description("AI-powered code editing, project analysis tool and more !!!")
  .version(version)
  .action(async () => {
    try {
      await main();
    } catch (error) {
      console.error("Error: ", error);
      process.exit(1);
    }
  })
  .addOption(
    new Option("-m, --mode <mode>", "Assistant mode, currently support: coder, prompter")
      .default("coder", "Coder assistant mode")
      .choices(["coder", "prompter"])
  )
  .addOption(
    new Option("-p, --provider <provider>", "LLM Provider")
      .default("azure", "Azure OpenAI")
      .choices(["azure", "openai", "openrouter", "gemini", "localLM"])
  )
  .addCommand(viewCommand);

cliApp.parse(process.argv);
export const options: OptionValues = cliApp.opts();
