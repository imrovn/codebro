import type { ClientProvider } from "client";
import process from "node:process";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

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
        baseURL: "",
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
