import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { execSync } from "child_process";
import * as path from "path";
import type { McpConfig } from "mcp/mcp.types.ts";
import { version } from "../../package.json";
import type { Tool } from "tools";
import type { AgentContext } from "agents";

/**
 * Options for creating tools from MCP config
 */
export interface CreateActionsFromMcpConfigOptions {
  /** The MCP configuration object */
  config: McpConfig;
  /**
   * Environment variable mappings to apply to all MCPs.
   * Format: { "MCP_VAR_NAME": "value_or_env_var_name" }
   * If the value is an environment variable name, its value will be used.
   * Otherwise, the literal value will be used.
   */
  envMapping?: Record<string, string | undefined>;
  /** IDs of tools to exclude */
  excludedTools?: string[];
  /** IDs of tools to include (if empty, all actions except excluded ones are included) */
  includedTools?: string[];
}

/**
 * Creates tools from an MCP configuration
 */
export async function createToolsFromMcpConfig({
  config = {},
  envMapping: globalEnvMapping = {},
  excludedTools = [],
  includedTools = [],
}: CreateActionsFromMcpConfigOptions): Promise<Tool[]> {
  const actions: Tool[] = [];

  // Get npm prefix to find npx
  const npmPrefix = execSync("npm prefix -g").toString().trim();
  const npxPath = path.join(npmPrefix, "bin", "npx");

  for (const [mcpName, mcpConfig] of Object.entries(config)) {
    console.log(`Setting up MCP: ${mcpName}`);

    // Create MCP client
    const client = new Client(
      {
        name: `Codebro ${mcpName} Client`,
        version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Map environment variables if mappings are provided
    const mappedEnv: Record<string, string> = {};

    // First apply MCP-specific env mapping
    if (mcpConfig.envMapping) {
      for (const [mcpVarName, valueOrEnvVar] of Object.entries(mcpConfig.envMapping)) {
        // Skip undefined values
        if (valueOrEnvVar === undefined) continue;

        // Check if this is an environment variable reference
        if (valueOrEnvVar in process.env) {
          // Use the environment variable value (using nullish coalescing to handle undefined)
          mappedEnv[mcpVarName] = process.env[valueOrEnvVar] ?? "";
        } else {
          // Use the literal value
          mappedEnv[mcpVarName] = valueOrEnvVar;
        }
      }
    }

    // Then apply global env mapping (takes precedence over MCP-specific)
    for (const [mcpVarName, valueOrEnvVar] of Object.entries(globalEnvMapping)) {
      // Skip undefined values
      if (valueOrEnvVar === undefined) continue;

      // Check if this is an environment variable reference
      if (valueOrEnvVar in process.env) {
        // Use the environment variable value (using nullish coalescing to handle undefined)
        mappedEnv[mcpVarName] = process.env[valueOrEnvVar] ?? "";
      } else {
        // Use the literal value
        mappedEnv[mcpVarName] = valueOrEnvVar;
      }
    }

    // Create args array with config
    const args = [...mcpConfig.args];
    if (Object.keys(mappedEnv).length > 0) {
      args.push("--config", JSON.stringify(mappedEnv));
    }

    // Create transport with full npx path
    const transport = new StdioClientTransport({
      command: mcpConfig.command === "npx" ? npxPath : mcpConfig.command,
      args,
      env: {
        // Include any direct environment variables from mappings
        ...mappedEnv,
        // Include the original envMapping for backward compatibility
        ...(mcpConfig.envMapping as Record<string, string>),
        // Include all environment variables
        ...(Object.fromEntries(Object.entries(process.env).filter(([_, v]) => v !== undefined)) as Record<
          string,
          string
        >),
      },
    });

    try {
      // Connect to MCP
      await client.connect(transport);
      const mcpTools = await client.listTools();
      // console.log("Raw mcpTools response:", JSON.stringify(mcpTools, null, 2));

      // Extract mcpTools array from response
      const toolsArray = mcpTools.tools || [];
      const toolNames: string[] = [];

      if (Array.isArray(toolsArray)) {
        for (const tool of toolsArray) {
          const toolId = tool.name;

          // Skip this action if it's in the excludedActions list
          if (excludedTools.includes(toolId)) {
            console.log(`Skipping excluded action: ${toolId}`);
            continue;
          }

          // Skip this action if includedActions is not empty and this action is not in the list
          if (includedTools.length > 0 && !includedTools.includes(toolId)) {
            continue;
          }

          actions.push({
            getDefinition: () => {
              return {
                type: "function" as const,
                function: {
                  name: `${mcpName}-${toolId}`,
                  description: tool.description || `${mcpName} ${toolId} operation`,
                  parameters: tool.inputSchema as {
                    type: "object";
                    properties: Record<string, unknown>;
                    required?: string[];
                    additionalProperties: boolean;
                  },
                },
              };
            },

            run: async (parameters, _: AgentContext) => {
              try {
                const result = await client.callTool({
                  name: tool.name,
                  arguments: parameters,
                });

                // Extract result from MCP response
                if (result?.content) {
                  return result.content;
                }
                return JSON.stringify(result);
              } catch (error) {
                console.error(`Error calling ${mcpName} ${toolId}:`, error);
                throw error;
              }
            },

            isMCPTool: true,
          });

          toolNames.push(toolId);
        }
      }

      console.log(
        `Loaded ${toolNames.length > 0 ? "tools [" + toolNames.join(",") + "]" : "0 tools"} from MCP ${mcpName}`
      );
    } catch (error) {
      console.error(`Error setting up ${mcpName}:`, error);
      throw error;
    }
  }
  return actions;
}
