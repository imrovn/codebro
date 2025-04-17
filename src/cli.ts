#!/usr/bin/env node

import { Command, Option, type OptionValues } from "commander";
import { config } from "dotenv";
import { version } from "../package.json";
import * as process from "node:process";
import { main } from "chat.ts";

config();

export const cliApp = new Command();

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
      .choices(["azure", "openai", "openrouter", "localLM"])
  );

cliApp.parse(process.argv);
export const options: OptionValues = cliApp.opts();
