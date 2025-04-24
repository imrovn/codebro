import * as dotenv from "dotenv";
import type { Config } from "./configs.types";
import process from "node:process";
import type { ClientProvider } from "client";

// Load environment variables
dotenv.config();

// Default configuration
const defaultConfig: Config = {
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

/**
 * Validates the configuration
 */
export function getClientConfig(provider: ClientProvider): { apiKey: string; baseURL: string } {
  switch (provider) {
    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY || "";
      if (!apiKey) {
        throw new Error(
          "Error: API key is not set. Please set OPENAI_API_KEY in your .env file or system environment."
        );
      }
      return {
        baseURL: defaultConfig.baseURL || "",
        apiKey,
      };
    }
    case "localLLM": {
      const apiKey = process.env.OPENAI_API_KEY || "";
      if (!apiKey) {
        throw new Error(
          "Error: API key is not set. Please set OPENAI_API_KEY in your .env file or system environment."
        );
      }

      const baseURL = process.env.OPENAI_API_BASE_URL || "";
      if (!baseURL) {
        throw new Error(
          "Error: API key is not set. Please set AZURE_OPENAI_ENDPOINT in your .env file or system environment."
        );
      }

      return {
        apiKey,
        baseURL,
      };
    }
    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY || "";
      if (!apiKey) {
        throw new Error(
          "Error: API key is not set. Please set OPENROUTER_API_KEY in your .env file or system environment."
        );
      }

      return {
        apiKey,
        baseURL: process.env.OPENROUTER_BASE_URL || "",
      };
    }
    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        throw new Error(
          "Error: API key is not set. Please set GEMINI_API_KEY in your .env file or system environment."
        );
      }

      return {
        apiKey,
        baseURL: process.env.GEMINI_BASE_URL || "",
      };
    }
    default: {
      // Default to Azure
      const apiKey = process.env.AZURE_OPENAI_API_KEY || "";
      if (!apiKey) {
        throw new Error(
          "Error: API key is not set. Please set AZURE_OPENAI_API_KEY in your .env file or system environment."
        );
      }

      const baseURL = process.env.AZURE_OPENAI_BASE_URL || "";
      if (!baseURL) {
        throw new Error(
          "Error: API key is not set. Please set AZURE_OPENAI_BASE_URL in your .env file or system environment."
        );
      }

      return {
        apiKey,
        baseURL,
      };
    }
  }
}
