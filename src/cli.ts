#!/usr/bin/env node

import { Command, type OptionValues } from "commander";
import { config } from "dotenv";
import { version } from "../package.json";
import * as process from "node:process";
import { main } from "chat.ts";

// Load environment variables
config();

export const program = new Command();

program
  .name("codebro")
  .description("AI-powered code editing and project analysis tool")
  .version(version)
  .option("-h, --help", "Display help message")
  .action(async () => {
    try {
      await main();
    } catch (error) {
      console.error("Error: ", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
export const options: OptionValues = program.opts();
