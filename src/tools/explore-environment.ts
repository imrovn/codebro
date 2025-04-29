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

interface ProjectEnvironmentReport {
  projectConfig: {
    packageJson?: { name: string; version: string; scripts: Record<string, string>; engines?: Record<string, string> };
    buildGradle?: { tasks: string[] };
    pomXml?: { groupId: string; artifactId: string; version: string; javaVersion?: string };
    pyprojectToml?: { projectName: string; pythonVersion?: string };
    cargoToml?: { packageName: string; rustVersion?: string };
    gemfile?: { rubyVersion?: string };
    dockerfile?: { baseImage?: string };
    gitRepo?: boolean;
    typescript?: boolean;
    nvmrc?: { nodeVersion: string };
    pythonVersion?: { version: string };
    [key: string]: boolean | object | undefined;
  };
  packageManagers: {
    npm?: { version: string; scripts?: string[] };
    yarn?: { version: string };
    pnpm?: { version: string };
    bun?: { version: string };
    gradle?: { version: string; tasks?: string[] };
    maven?: { version: string; goals?: string[] };
    pip?: { version: string };
    poetry?: { version: string };
    cargo?: { version: string };
    bundler?: { version: string };
  };
  runtimes: {
    node?: { version: string };
    java?: { version: string };
    python?: { version: string };
    rust?: { version: string };
    ruby?: { version: string };
  };
}

/**
 * Explore the development environment of the current project
 */
export const exploreProjectEnvironmentTool: Tool = {
  getDefinition(): OpenAI.Chat.ChatCompletionTool {
    return {
      type: "function" as const,
      function: {
        name: "exploreProjectEnvironment",
        description: `Analyzes the development environment of the current project, focusing on project-specific configurations, package managers, build tools, and runtime versions. Returns a detailed report to align tasks with the project's setup.

Usage Instructions:
- Purpose: Use to understand the project's development environment, including configuration files, dependencies, and required tools, before planning or executing tasks.
- Parameters:
  - workingDir: Specify the project directory (relative to project root or absolute). Defaults to project root.
  - includeFiles: List additional project-specific configuration files to check (e.g., ['docker-compose.yml', 'requirements.txt']).
- Output:
  - Returns a JSON object with:
    - projectConfig: Details from configuration files (package.json, build.gradle, pom.xml, pyproject.toml, Cargo.toml, Gemfile, Dockerfile, .nvmrc, .python-version, etc.).
    - packageManagers: Project-relevant package managers/build tools with versions and available scripts/tasks/goals.
    - runtimes: Runtime versions specified or inferred from project files (Node.js, Java, Python, Rust, Ruby).
- Best Practices:
  - Run in the project root to detect all relevant configuration files accurately.
  - Use before executeCommandTool to ensure commands align with project-specific tools (e.g., use 'mvn' for Maven projects).
  - Combine with readFileTool to inspect configuration files listed in the report (e.g., build.gradle for Gradle tasks).
  - Use with plannerTool to create implementation plans tailored to the project's tech stack and configurations.
  - Specify additional configuration files in includeFiles for non-standard project setups (e.g., custom build scripts).
- Example:
  - Query: "Explore the project environment in ./my-project with ['docker-compose.yml']"
  - Result: Returns a report showing a package.json with Node.js 18, a pom.xml with Java 17, Maven 3.8, npm scripts, and a Dockerfile with a Java base image.
`,
        parameters: {
          type: "object",
          properties: {
            workingDir: {
              type: "string",
              description: "Project directory relative to project root. Defaults to project root.",
            },
            includeFiles: {
              type: "array",
              items: { type: "string" },
              description:
                "Additional configuration files to check (e.g., ['docker-compose.yml', 'requirements.txt']).",
              default: [],
            },
          },
          required: [],
          additionalProperties: false,
        },
      },
    };
  },

  async run(args, context: AgentContext): Promise<any> {
    const oraManager = new OraManager();
    const { workingDir = ".", includeFiles = [] } = args;
    const cwd = path.resolve(context.workingDirectory, workingDir);
    oraManager.startTool("Exploring project environment...", chalk.dim(`\t ${cwd}`));

    try {
      const report: ProjectEnvironmentReport = {
        projectConfig: {},
        packageManagers: {},
        runtimes: {},
      };

      // Analyze project configuration
      oraManager.update("Analyzing project configuration...");
      report.projectConfig = await analyzeProjectConfig(cwd, includeFiles);

      // Check package managers and build tools relevant to the project
      oraManager.update("Checking package managers and build tools...");
      report.packageManagers = await detectPackageManagers(cwd, report.projectConfig);

      // Detect runtime versions
      oraManager.update("Detecting runtime versions...");
      report.runtimes = await detectRuntimes(cwd, report.projectConfig);

      oraManager.succeed("Project environment exploration completed.");
      return {
        success: true,
        report,
        workingDir: cwd,
      };
    } catch (error: any) {
      oraManager.fail("Project environment exploration failed: " + error.message);
      return {
        success: false,
        error: error.message || "Project environment exploration failed",
        workingDir: cwd,
      };
    }
  },
};

/**
 * Analyze project configuration
 */
async function analyzeProjectConfig(
  cwd: string,
  includeFiles: string[]
): Promise<ProjectEnvironmentReport["projectConfig"]> {
  const projectConfig: ProjectEnvironmentReport["projectConfig"] = {};

  // Check package.json
  const packageJsonPath = path.join(cwd, "package.json");
  try {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(content);
    projectConfig.packageJson = {
      name: packageJson.name || "unknown",
      version: packageJson.version || "unknown",
      scripts: packageJson.scripts || {},
      engines: packageJson.engines || {},
    };
  } catch {
    // package.json not found or invalid, skip
  }

  // Check build.gradle
  const buildGradlePath = path.join(cwd, "build.gradle");
  try {
    await fs.access(buildGradlePath);
    const tasks = await getGradleTasks(cwd);
    projectConfig.buildGradle = { tasks };
  } catch {
    // build.gradle not found, skip
  }

  // Check pom.xml
  const pomXmlPath = path.join(cwd, "pom.xml");
  try {
    const content = await fs.readFile(pomXmlPath, "utf-8");
    const pomMatch = content.match(
      /<groupId>(.*?)<\/groupId>\s*<artifactId>(.*?)<\/artifactId>\s*<version>(.*?)<\/version>/s
    );
    const javaVersionMatch = content.match(/<maven.compiler.source>(.*?)<\/maven.compiler.source>/);
    projectConfig.pomXml = {
      groupId: pomMatch?.[1] || "unknown",
      artifactId: pomMatch?.[2] || "unknown",
      version: pomMatch?.[3] || "unknown",
      javaVersion: javaVersionMatch?.[1] || undefined,
    };
  } catch {
    // pom.xml not found, skip
  }

  // Check pyproject.toml
  const pyprojectTomlPath = path.join(cwd, "pyproject.toml");
  try {
    const content = await fs.readFile(pyprojectTomlPath, "utf-8");
    const nameMatch = content.match(/name\s*=\s*"(.*?)"/);
    const pythonVersionMatch = content.match(/requires-python\s*=\s*"(.*?)"/);
    projectConfig.pyprojectToml = {
      projectName: nameMatch?.[1] || "unknown",
      pythonVersion: pythonVersionMatch?.[1] || undefined,
    };
  } catch {
    // pyproject.toml not found, skip
  }

  // Check Cargo.toml
  const cargoTomlPath = path.join(cwd, "Cargo.toml");
  try {
    const content = await fs.readFile(cargoTomlPath, "utf-8");
    const nameMatch = content.match(/name\s*=\s*"(.*?)"/);
    const rustVersionMatch = content.match(/rust-version\s*=\s*"(.*?)"/);
    projectConfig.cargoToml = {
      packageName: nameMatch?.[1] || "unknown",
      rustVersion: rustVersionMatch?.[1] || undefined,
    };
  } catch {
    // Cargo.toml not found, skip
  }

  // Check Gemfile
  const gemfilePath = path.join(cwd, "Gemfile");
  try {
    const content = await fs.readFile(gemfilePath, "utf-8");
    const rubyVersionMatch = content.match(/ruby\s*['"](.*?)['"]/);
    projectConfig.gemfile = {
      rubyVersion: rubyVersionMatch?.[1] || undefined,
    };
  } catch {
    // Gemfile not found, skip
  }

  // Check Dockerfile
  const dockerfilePath = path.join(cwd, "Dockerfile");
  try {
    const content = await fs.readFile(dockerfilePath, "utf-8");
    const baseImageMatch = content.match(/FROM\s+(.+)/);
    projectConfig.dockerfile = {
      baseImage: baseImageMatch?.[1]?.trim() || undefined,
    };
  } catch {
    // Dockerfile not found, skip
  }

  // Check git repository
  const gitPath = path.join(cwd, ".git");
  projectConfig.gitRepo = await fs
    .access(gitPath)
    .then(() => true)
    .catch(() => false);

  // Check TypeScript configuration
  const tsConfigPath = path.join(cwd, "tsconfig.json");
  projectConfig.typescript = await fs
    .access(tsConfigPath)
    .then(() => true)
    .catch(() => false);

  // Check .nvmrc
  const nvmrcPath = path.join(cwd, ".nvmrc");
  try {
    const content = await fs.readFile(nvmrcPath, "utf-8");
    projectConfig.nvmrc = { nodeVersion: content.trim() };
  } catch {
    // .nvmrc not found, skip
  }

  // Check .python-version
  const pythonVersionPath = path.join(cwd, ".python-version");
  try {
    const content = await fs.readFile(pythonVersionPath, "utf-8");
    projectConfig.pythonVersion = { version: content.trim() };
  } catch {
    // .python-version not found, skip
  }

  // Check additional files
  for (const file of includeFiles) {
    const filePath = path.join(cwd, file);
    try {
      await fs.access(filePath);
      projectConfig[file] = true;
    } catch {
      projectConfig[file] = false;
    }
  }

  return projectConfig;
}

/**
 * Detect package managers and build tools relevant to the project
 */
async function detectPackageManagers(
  cwd: string,
  projectConfig: ProjectEnvironmentReport["projectConfig"]
): Promise<ProjectEnvironmentReport["packageManagers"]> {
  const packageManagers: ProjectEnvironmentReport["packageManagers"] = {};
  const managers = [
    { name: "npm", cmd: "npm --version", condition: !!projectConfig.packageJson },
    { name: "yarn", cmd: "yarn --version", condition: !!projectConfig.packageJson },
    { name: "pnpm", cmd: "pnpm --version", condition: !!projectConfig.packageJson },
    { name: "bun", cmd: "bun --version", condition: !!projectConfig.packageJson },
    { name: "gradle", cmd: "gradle --version", condition: !!projectConfig.buildGradle },
    { name: "maven", cmd: "mvn --version", condition: !!projectConfig.pomXml },
    { name: "pip", cmd: "pip --version", condition: !!projectConfig.pyprojectToml },
    { name: "poetry", cmd: "poetry --version", condition: !!projectConfig.pyprojectToml },
    { name: "cargo", cmd: "cargo --version", condition: !!projectConfig.cargoToml },
    { name: "bundler", cmd: "bundle --version", condition: !!projectConfig.gemfile },
  ];

  for (const { name, cmd, condition } of managers) {
    if (!condition) continue;
    try {
      const { stdout } = await execAsync(cmd, { cwd, shell: getPlatformShell() });
      const manager: {
        version: string;
        scripts?: string[];
        tasks?: string[];
        goals?: string[];
      } = { version: stdout.trim() };
      if (name === "npm" && projectConfig.packageJson?.scripts) {
        manager.scripts = Object.keys(projectConfig.packageJson.scripts);
      } else if (name === "gradle" && projectConfig.buildGradle?.tasks) {
        manager.tasks = projectConfig.buildGradle.tasks;
      } else if (name === "maven") {
        manager.goals = await getMavenGoals(cwd);
      }
      packageManagers[name as keyof ProjectEnvironmentReport["packageManagers"]] = manager;
    } catch {
      // Package manager not found, skip
    }
  }
  return packageManagers;
}

/**
 * Detect runtime versions specified or inferred from project
 */
async function detectRuntimes(
  cwd: string,
  projectConfig: ProjectEnvironmentReport["projectConfig"]
): Promise<ProjectEnvironmentReport["runtimes"]> {
  const runtimes: ProjectEnvironmentReport["runtimes"] = {};

  // Node.js version
  if (projectConfig.nvmrc || projectConfig.packageJson?.engines?.node) {
    runtimes.node = {
      version: projectConfig.nvmrc?.nodeVersion || projectConfig.packageJson?.engines?.node || "unknown",
    };
  } else if (projectConfig.packageJson) {
    try {
      const { stdout } = await execAsync("node --version", { cwd, shell: getPlatformShell() });
      runtimes.node = { version: stdout.trim() };
    } catch {
      // Node not found, skip
    }
  }

  // Java version
  if (projectConfig.pomXml?.javaVersion) {
    runtimes.java = { version: projectConfig.pomXml.javaVersion };
  } else if (projectConfig.buildGradle || projectConfig.pomXml) {
    try {
      const { stdout } = await execAsync("java --version", { cwd, shell: getPlatformShell() });
      runtimes.java = { version: stdout.trim().split("\n")[0] || "" };
    } catch {
      // Java not found, skip
    }
  }

  // Python version
  if (projectConfig.pyprojectToml?.pythonVersion || projectConfig.pythonVersion) {
    runtimes.python = {
      version: projectConfig.pyprojectToml?.pythonVersion || projectConfig.pythonVersion?.version || "unknown",
    };
  } else if (projectConfig.pyprojectToml) {
    try {
      const { stdout } = await execAsync("python --version", { cwd, shell: getPlatformShell() });
      runtimes.python = { version: stdout.trim() };
    } catch {
      // Python not found, skip
    }
  }

  // Rust version
  if (projectConfig.cargoToml?.rustVersion) {
    runtimes.rust = { version: projectConfig.cargoToml.rustVersion };
  } else if (projectConfig.cargoToml) {
    try {
      const { stdout } = await execAsync("rustc --version", { cwd, shell: getPlatformShell() });
      runtimes.rust = { version: stdout.trim() };
    } catch {
      // Rust not found, skip
    }
  }

  // Ruby version
  if (projectConfig.gemfile?.rubyVersion) {
    runtimes.ruby = { version: projectConfig.gemfile.rubyVersion };
  } else if (projectConfig.gemfile) {
    try {
      const { stdout } = await execAsync("ruby --version", { cwd, shell: getPlatformShell() });
      runtimes.ruby = { version: stdout.trim() };
    } catch {
      // Ruby not found, skip
    }
  }

  return runtimes;
}

/**
 * Get Gradle tasks
 */
async function getGradleTasks(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync("gradle tasks --all", { cwd, shell: getPlatformShell() });
    return stdout
      .split("\n")
      .filter(line => line.match(/^\w+\s+-/))
      .map(line => line.split(" - ")[0]?.trim() || "");
  } catch {
    return [];
  }
}

/**
 * Get Maven goals
 */
async function getMavenGoals(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync("mvn help:describe", { cwd, shell: getPlatformShell() });
    return stdout
      .split("\n")
      .filter(line => line.match(/^\w+:/))
      .map(line => line.trim());
  } catch {
    return [];
  }
}

/**
 * Get appropriate shell for the current platform
 */
function getPlatformShell(): string {
  const platform = os.platform();
  return platform === "win32" ? process.env.COMSPEC || "cmd.exe" : "/bin/sh";
}
