import { type Config, loadGlobalConfig } from "configs";
import type { AgentContext } from "agents/agents.types.ts";
import { getRelevantFiles } from "filesystem";
import { createToolsFromMcpConfig } from "mcp";
import { getClient } from "client";

/**
 * Gather context from the current environment
 */
export async function gatherContext(config: Config): Promise<AgentContext> {
  const { maxFiles, excludePaths } = config;
  const globalConfig = await loadGlobalConfig();
  const workingDirectory = process.cwd();
  const files = await getRelevantFiles(workingDirectory, maxFiles, excludePaths);
  const mcpTools = await createToolsFromMcpConfig({ config: globalConfig.config.mcpServers });

  return {
    ...config,
    ...globalConfig,
    client: getClient(config),
    workingDirectory,
    files,
    mcpTools,
  };
}
