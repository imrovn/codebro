import type { ClientProvider } from "client";
import type { McpConfig } from "mcp";

export interface Config {
  apiKey: string;
  model: string;
  provider: ClientProvider;
  maxFiles: number;
  excludePaths: string[];
  useStreaming: boolean;
  baseURL?: string;
}

export interface CodebroConfig {
  mcpServers: McpConfig;
  mcpServersPath?: string;
  ignoreFiles: string[];
  excludeTools: string[];
}

export interface GlobalConfig {
  additionalPrompts: string;
  config: CodebroConfig;
  configDir: string;
}
