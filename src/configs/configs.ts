import * as dotenv from "dotenv";
import type { Config } from "./configs.types";

// Load environment variables
dotenv.config();

// Default configuration
const defaultConfig: Config = {
  apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "",
  model: process.env.AI_MODEL || "deepseek-coder/deepseek-coder-33b-instruct",
  maxFiles: 10,
  useStreaming: Boolean(process.env.USE_STREAMING || false),
  excludePaths: ["node_modules", ".git", "dist", "build"],
  useOpenRouter: Boolean(process.env.USE_OPENROUTER || true),
  useAzure: Boolean(process.env.USE_AZURE || false),
  useOpenAI: Boolean(process.env.USE_OPENAI || false),
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
  if (!config.apiKey) {
    console.error("Error: API key is not set. Please set OPENROUTER_API_KEY or OPENAI_API_KEY in your .env file.");
    return false;
  }

  if (config.useOpenAI && config.useOpenRouter && config.useAzure) {
    console.warn("Warning: Both OpenAI, OpenRouter and Azure are enabled. Defaulting to OpenRouter.");
  }

  return true;
}
