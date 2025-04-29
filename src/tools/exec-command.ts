import chalk from "chalk";
import type OpenAI from "openai";

import type { AgentContext } from "@agents";
import type { Tool } from "@tools/tools.types";
import { OraManager } from "@utils/ora-manager";

import * as child_process from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as util from "node:util";

const execAsync = util.promisify(child_process.exec);

interface ProjectEnvironment {
  packageJson?: { scripts?: Record<string, string> };
  hasYarn?: boolean;
  hasPnpm?: boolean;
  hasBun?: boolean;
}

/**
 * Execute command in the project
 */
export const executeCommandTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "executeCommand",
        description: `Executes a shell command in the project directory, ensuring compatibility with the project's development environment. Validates commands against project configuration and security policies before execution.

        Usage Instructions:
    - Purpose: Use to run project-specific commands (e.g., build scripts, tests, or dependency installations) in the project’s context.
    - Parameters:
    - command: The shell command to execute (e.g., 'npm run build', 'mvn package', 'python manage.py runserver').
    - workingDir: Project directory (relative to project root or absolute). Defaults to project root.
    - timeout: Timeout in milliseconds (default: 30000). Increase for long-running commands (e.g., builds).
    - Output:
    - Returns a JSON object with:
    - stdout: Command output.
    - stderr: Error output (if any).
    - command: The executed command.
    - workingDir: The directory where the command was run.
    - error: Error message (if execution failed).
    - Best Practices:
      - Use exploreProjectEnvironmentTool first to verify available package managers (e.g., npm, maven) and scripts/tasks/goals.
    - Check project configuration with readFileTool (e.g., package.json, pom.xml) to ensure the command aligns with project setup.
    - Prefer project-specific scripts (e.g., 'npm run build' over 'node build.js') for consistency.
                                                                                       - Specify workingDir for commands requiring a specific subdirectory (e.g., './frontend' for front-end builds).
    - Set appropriate timeouts for long-running commands (e.g., 60000 for Maven builds).
    - Avoid dangerous commands (e.g., 'rm -rf *'); they are blocked by security checks.
    - Handle errors by inspecting stderr and suggesting fixes with plannerTool.
    - Examples:
    - Query: "Execute 'npm run start' in ./frontend"
    - Command: { command: 'npm run start', workingDir: './frontend' }
    - Result: Runs the start script in the frontend directory, returning stdout/stderr.
    - Query: "Run 'mvn clean install' with a 60-second timeout"
    - Command: { command: 'mvn clean install', timeout: 60000 }
    - Security Notes:
      - Commands are validated against forbidden patterns (e.g., 'rm -rf /', 'curl | sh').
    - Commands are checked against project environment (e.g., npm scripts must exist in package.json).
    - Use project-specific tools to minimize security risks.`,
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
    const { command, workingDir = ".", timeout = 30000 } = args;
    const cwd = path.resolve(context.workingDirectory, workingDir);

    try {
      // Check project environment
      const environment = await checkProjectEnvironment(cwd);

      // Validate command against environment
      const validationError = validateCommand(command, environment);
      if (validationError) {
        oraManager.fail(validationError);
        return { error: validationError };
      }

      // Security check
      if (isForbiddenCommand(command)) {
        oraManager.fail("Command rejected for security reasons");
        return { error: "Command rejected for security reasons" };
      }

      // Determine appropriate shell
      const shell = getPlatformShell();

      oraManager.startTool("Executing command...", chalk.dim("\t " + command));
      oraManager.update("Running shell command...");

      const execOptions: child_process.ExecOptions = {
        cwd,
        timeout,
        shell,
        windowsHide: true,
      };

      const { stdout, stderr } = await execAsync(command, execOptions);

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
        stderr: error.stderr?.trim() || "",
        stdout: error.stdout?.trim() || "",
        command,
      };
    }
  },
};

/**
 * Get appropriate shell for the current platform
 */
function getPlatformShell(): string {
  const platform = os.platform();
  if (platform === "win32") {
    return process.env.COMSPEC || "cmd.exe";
  }
  return "/bin/sh";
}

/**
 * Check project environment and available tools
 */
async function checkProjectEnvironment(cwd: string): Promise<ProjectEnvironment> {
  const environment: ProjectEnvironment = {};

  try {
    // Check for package.json
    const packageJsonPath = path.join(cwd, "package.json");
    if (
      await fs
        .access(packageJsonPath)
        .then(() => true)
        .catch(() => false)
    ) {
      const packageJsonContent = await fs.readFile(packageJsonPath, "utf-8");
      environment.packageJson = JSON.parse(packageJsonContent);
    }

    // Check for package managers
    environment.hasYarn = await checkCommandExists("yarn", cwd);
    environment.hasPnpm = await checkCommandExists("pnpm", cwd);
    environment.hasBun = await checkCommandExists("bun", cwd);
  } catch (error) {
    // Non-critical error, continue with partial environment info
    console.warn("Environment check partial failure:", error);
  }

  return environment;
}

/**
 * Check if a command exists in the environment
 */
async function checkCommandExists(command: string, cwd: string): Promise<boolean> {
  try {
    const shell = getPlatformShell();
    const checkCmd = os.platform() === "win32" ? `where ${command}` : `command -v ${command}`;
    await execAsync(checkCmd, { cwd, shell });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate command against project environment
 */
function validateCommand(command: string, environment: ProjectEnvironment): string | null {
  const cmdParts = command.trim().split(/\s+/);
  const mainCommand = cmdParts[0]?.toLowerCase();

  // Check npm/yarn/pnpm commands
  if (mainCommand && ["npm", "yarn", "pnpm", "bun"].includes(mainCommand)) {
    if (mainCommand === "yarn" && !environment.hasYarn) {
      return "Yarn is not available in this environment";
    }
    if (mainCommand === "pnpm" && !environment.hasPnpm) {
      return "pnpm is not available in this environment";
    }
    if (mainCommand === "bun" && !environment.hasBun) {
      return "Bun is not available in this environment";
    }

    // Validate npm scripts if running a script
    if (mainCommand === "npm" && cmdParts[1] === "run" && cmdParts[2]) {
      const scriptName = cmdParts[2];
      if (!environment.packageJson?.scripts?.[scriptName]) {
        return `NPM script '${scriptName}' not found in package.json`;
      }
    }
  }

  return null;
}

/**
 * Check if a command is forbidden for security reasons
 */
function isForbiddenCommand(command: string): boolean {
  const forbiddenPatterns = [
    // File system destructive commands
    /rm\s+(-r[f]?|--recursive)\s+[\.\/*]/, // rm -rf / or ./*
    /rm\s+-.*\s+\/$/, // removing root directories
    />\s*\/dev\/[hs]d[a-z]/, // writing to disk devices
    /mkfs/, // formatting file systems
    /dd\s+.*of=\/dev\/[hs]d[a-z]/, // writing raw to disk

    // Network to shell piping
    /wget\s+.*\|\s*sh/, // piping web content to shell
    /curl\s+.*\|\s*sh/, // piping web content to shell

    // Windows-specific dangerous commands
    /format\s+[a-z]:/i, // format drive
    /del\s+.*\\*\*/i, // delete all files
    /rd\s+\/s\s+\/q/i, // remove directory silently
  ];

  return forbiddenPatterns.some(pattern => pattern.test(command));
}
