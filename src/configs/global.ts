import type { McpConfig } from "@mcp/mcp.types.ts";

import { existsSync } from "node:fs";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import type { CodebroConfig, GlobalConfig } from "./configs.types";

export const CONFIG_FOLDER_NAME = "com.github.rovndev.codebro";
export const CONFIG_FILE_NAME = "config.json";
export const CONFIG_RULE_FILE_NAME = ".codebrorules";

/**
 * Determines the user configuration directory based on the platform.
 */
export function getConfigDir(): string {
  const homedir = os.homedir();
  const platform = os.platform();

  if (platform === "darwin") {
    return path.join(homedir, "Library", "Application Support", CONFIG_FOLDER_NAME);
  } else if (platform === "win32") {
    const appData = process.env.APPDATA || path.join(homedir, "AppData", "Roaming");
    return path.join(appData, CONFIG_FOLDER_NAME);
  } else {
    return path.join(homedir, ".config", CONFIG_FOLDER_NAME);
  }
}

/**
 * Ensures the configuration directory exists, creating it if necessary.
 */
async function ensureConfigDir(): Promise<string> {
  const configDir = getConfigDir();
  try {
    await fs.mkdir(configDir, { recursive: true });
    return configDir;
  } catch (error: any) {
    throw new Error(`Failed to create config directory ${configDir}: ${error.message}`);
  }
}

/**
 * Initializes default configuration files if they don't exist.
 */
export async function initializeConfigFiles(): Promise<void> {
  const configDir = await ensureConfigDir();
  const configPath = path.join(configDir, CONFIG_FILE_NAME);
  const rulesPath = path.join(configDir, CONFIG_RULE_FILE_NAME);

  // Default config.json
  const defaultConfig: CodebroConfig = {
    mcpServers: {},
    mcpServersPath: "",
    ignoreFiles: ["**/dist/**", "**/node_modules/**", "**/build/**"],
    excludeTools: [],
  };

  // Default .codebrorules (additional system prompts)
  const defaultRules = `# Codebro Additional System Prompts `;

  try {
    if (!existsSync(configPath)) {
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf-8");
    }
    if (!existsSync(rulesPath)) {
      await fs.writeFile(rulesPath, defaultRules, "utf-8");
    }
  } catch (error: any) {
    throw new Error(`Failed to initialize config files: ${error.message}`);
  }
}

/**
 * Loads the configuration from user config directory.
 */
export async function loadGlobalConfig(): Promise<GlobalConfig> {
  const configDir = await ensureConfigDir();
  const configPath = path.join(configDir, CONFIG_FILE_NAME);
  const rulesPath = path.join(configDir, CONFIG_RULE_FILE_NAME);

  let config: CodebroConfig = {
    mcpServers: {},
    mcpServersPath: "",
    ignoreFiles: [],
    excludeTools: [],
  };
  let additionalPrompts = "";
  let mcpConfig: McpConfig = {};

  try {
    // Load config.json
    if (existsSync(configPath)) {
      const configContent = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(configContent);
    } else {
      await initializeConfigFiles();
      const configContent = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(configContent);
    }

    // Load MCP config
    if (config.mcpServersPath && existsSync(config.mcpServersPath)) {
      try {
        const mcpModule = await import(`file://${config.mcpServersPath}`);
        const mcpJSON = mcpModule.default || {};
        mcpConfig = mcpJSON.mcpServers || {};
      } catch (error: any) {
        console.warn(
          `Failed to load MCP config from ${config.mcpServersPath}: ${error.message}, falling back to mcpServers`
        );
        mcpConfig = config.mcpServers || {};
      }
    } else {
      mcpConfig = config.mcpServers || {};
    }

    // Load additional system prompts
    if (existsSync(rulesPath)) {
      additionalPrompts = await fs.readFile(rulesPath, "utf-8");
    } else {
      await initializeConfigFiles();
      additionalPrompts = await fs.readFile(rulesPath, "utf-8");
    }

    config.mcpServers = mcpConfig;

    return { additionalPrompts, config, configDir };
  } catch (error: any) {
    throw new Error(`Failed to load configuration: ${error.message}`);
  }
}
