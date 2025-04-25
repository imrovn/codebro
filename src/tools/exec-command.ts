import type { Tool } from "tools/tools.types.ts";
import type OpenAI from "openai";
import type { AgentContext } from "agents";
import path from "node:path";
import * as child_process from "node:child_process";
import * as util from "node:util";
import { OraManager } from "utils/ora-manager";
import chalk from "chalk";

// Promisify exec
const execAsync = util.promisify(child_process.exec);
/**
 * Execute command in the project
 */
export const executeCommandTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "executeCommand",
        description: "Execute a shell command in the project directory",
        parameters: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The command to execute",
            },
            workingDir: {
              type: "string",
              description: "Working directory relative to project root. Defaults to project root.",
            },
            timeout: {
              type: "number",
              description: "Timeout in milliseconds. Defaults to 30000 (30 seconds).",
            },
          },
          required: ["command"],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: AgentContext): Promise<any> {
    const oraManager = new OraManager();
    const { command, workingDir = ".", timeout = 10000 } = args;
    const cwd = path.resolve(context.workingDirectory, workingDir);
    oraManager.startTool("Executing command...", chalk.dim("\t " + command));

    // Security check - don't allow dangerous commands
    if (isForbiddenCommand(command)) {
      oraManager.fail("Command rejected for security reasons");
      return { error: "Command rejected for security reasons" };
    }

    try {
      oraManager.update("Running shell command...");
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        shell: "/bin/bash",
      });

      oraManager.succeed("Command executed.");
      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command,
        workingDir,
      };
    } catch (error: any) {
      oraManager.fail("Command execution failed: " + error.message);
      return {
        error: error.message || "Command execution failed",
        stderr: error.stderr,
        stdout: error.stdout,
        command,
      };
    }
  },
};

/**
 * Check if a command is forbidden for security reasons
 */
function isForbiddenCommand(command: string): boolean {
  // List of dangerous patterns to block
  const forbiddenPatterns = [
    /rm\s+(-r[f]?|--recursive)\s+\//, // rm -rf /
    /^\s*rm\s+.*\/\s+/, // removing root directories
    />\s*\/dev\/[hs]d[a-z]/, // writing to disk devices
    /mkfs/, // formatting file systems
    /dd\s+.*of=\/dev\/[hs]d[a-z]/, // writing raw to disk
    /wget.+\|\s*sh/, // piping web content to shell
    /curl.+\|\s*sh/, // piping web content to shell
  ];

  // Check against forbidden patterns
  return forbiddenPatterns.some(pattern => pattern.test(command));
}
