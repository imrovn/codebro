import * as dotenv from "dotenv";
import type { Config } from "./configs.types";
import process from "node:process";

// Load environment variables
dotenv.config();

// Default configuration
const defaultConfig: Config = {
  apiKey: process.env.CODE_BRO_API_KEY || "",
  model: process.env.CODE_BRO_MODEL || "deepseek-coder/deepseek-coder-33b-instruct",
  baseURL: process.env.CODE_BRO_BASE_URL || "",
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
  useOpenRouter: Boolean(process.env.USE_OPENROUTER || false),
  useAzure: Boolean(process.env.USE_AZURE || false),
  useOpenAI: Boolean(process.env.USE_OPENAI || false),
  useLocal: Boolean(process.env.USE_LOCAL || false),
};

/**
 * Creates a configuration object with custom overrides
 */
export function createConfig(overrides: Partial<Config> = {}): Config {
  return {
    ...defaultConfig,
    ...overrides,
  };
}

/**
 * Validates the configuration
 */
export function validateConfig(config: Config): boolean {
  if (config.useLocal && config.baseURL) {
    return true;
  }

  if (!config.apiKey) {
    console.error("Error: API key is not set. Please set CODE_BRO_API_KEY in your .env file.");
    return false;
  }

  if (!config.model) {
    console.error("Error: Model name is not set. Please set CODE_BRO_MODEL in your .env file.");
    return false;
  }

  if (config.useOpenAI && config.useOpenRouter && config.useAzure) {
    console.warn("Warning: Both OpenAI, OpenRouter and Azure are enabled. Defaulting to OpenRouter.");
  }

  return true;
}

export const config = createConfig();
