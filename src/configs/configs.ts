import * as dotenv from "dotenv";
import type { Config, GlobalConfig } from "./configs.types";
import process from "node:process";
import type { ClientProvider } from "client";
import { getClientConfig } from "configs/client.ts";
import chalk from "chalk";
import figlet from "figlet";

// Load environment variables
dotenv.config();

// Default configuration
export const defaultConfig: Config = {
  apiKey: "",
  model: process.env.CODEBRO_MODEL || "gpt-4o",
  baseURL: "",
  provider: "azure",
  maxFiles: 50,
  useStreaming: Boolean(process.env.USE_STREAMING || true),
  excludePaths: [
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    "public",
    "static",
    ".eslintignore",
    ".gitignore",
    ".prettierrc",
    ".prettierignore",
    ".gradle",
    ".idea",
  ],
};

/**
 * Creates a configuration object with custom overrides
 */
export function createConfig(provider: ClientProvider, overrides: Partial<Config> = {}): Config {
  const { apiKey, baseURL } = getClientConfig(provider);

  return {
    ...defaultConfig,
    apiKey,
    baseURL,
    provider,
    ...overrides,
  };
}

export function printConfigMessage({ config, configDir, additionalPrompts }: GlobalConfig) {
  console.log(chalk.yellow(figlet.textSync("Codebro", { horizontalLayout: "full" })));
  console.log(chalk.blue("Directory:"), configDir, "\n");
  console.log(chalk.blue("Config:\n"), JSON.stringify(config, null, 2), "\n");
  console.log(chalk.blue("Additional Prompts:\n"), additionalPrompts);
}
