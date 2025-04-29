import type { AgentContext } from "@agents/agents.types.ts";
import { getClient } from "@client";
import { type Config, loadGlobalConfig } from "@configs";
import { createToolsFromMcpConfig } from "@mcp";

/**
 * Gather context from the current environment
 */
export async function gatherContext(config: Config): Promise<AgentContext> {
  const globalConfig = await loadGlobalConfig();
  const workingDirectory = process.cwd();
  const mcpTools = await createToolsFromMcpConfig({ config: globalConfig.config.mcpServers });

  return {
    ...config,
    ...globalConfig,
    client: getClient(config),
    workingDirectory,
    mcpTools,
  };
}
