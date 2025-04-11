import * as fs from "node:fs";
import * as path from "node:path";
import * as child_process from "node:child_process";
import * as util from "node:util";
import axios from "axios";
import type { Context } from "types";
import type { Tool } from "./tools.types";

// Promisify exec
const execAsync = util.promisify(child_process.exec);

export function getCodeTools(): Tool[] {
  return [
    searchCodeTool,
    projectStructureTool,
    readFileTool,
    writeFileTool,
    editFileTool,
    executeCommandTool,
    fetchUrlTool,
    webSearchTool,
  ];
}

export function formatToolForPrompt(tool: Tool): string {
  let formattedTool = `
 Tool: ${tool.name}\nDescription: ${tool.description}\nParameters\n:
 `;

  for (const param of tool.parameters) {
    formattedTool += `  - ${param.name} (${param.type}${param.required ? ", required" : ""}): ${param.description}\n`;
  }
  formattedTool += "\n";

  return formattedTool;
}

export function formatToolsForPrompt(tools: Tool[]): string {
  if (!tools || tools.length === 0) {
    return "No tools available.";
  }

  return `Available Actions:\n\n${tools.map(formatToolForPrompt).join("\n")}\n`;
}

/**
 * Search code in the project
 */
const searchCodeTool: Tool = {
  name: "searchCode",
  description: "Search for code patterns in the project files",
  parameters: [
    {
      name: "query",
      type: "string",
      description: "The search query or pattern to look for",
      required: true,
    },
    {
      name: "filePattern",
      type: "string",
      description: "Optional glob pattern to limit search to specific files (e.g., '*.js', 'src/**/*.ts')",
      required: false,
    },
    {
      name: "caseSensitive",
      type: "boolean",
      description: "Whether the search should be case sensitive",
      required: false,
      default: false,
    },
  ],

  async run(args, context: Context): Promise<any> {
    const { query, filePattern, caseSensitive } = args;
    const cwd = context.workingDirectory;

    try {
      // Construct grep command
      let cmd = `grep -r${caseSensitive ? "" : "i"} --include="${filePattern || "*"}" "${query}" .`;

      // Execute the command
      const { stdout, stderr } = await execAsync(cmd, { cwd });

      if (stderr) {
        return { error: stderr };
      }

      // Process and format results
      const results = stdout
        .split("\n")
        .filter(line => line.trim().length > 0)
        .map(line => {
          const [file, ...contentParts] = line.split(":");
          const content = contentParts.join(":").trim();
          return { file, content };
        });

      return {
        count: results.length,
        results,
      };
    } catch (error: any) {
      // If grep returns no matches, it will exit with code 1
      if (error.code === 1 && !error.stderr) {
        return { count: 0, results: [] };
      }

      return { error: error.message || "Search failed" };
    }
  },
};

/**
 * Get project structure
 */
const projectStructureTool: Tool = {
  name: "projectStructure",
  description: "Get the structure of the project directory",
  parameters: [
    {
      name: "directory",
      type: "string",
      description: "The directory to get the structure for. Defaults to current directory.",
      required: false,
    },
    {
      name: "depth",
      type: "number",
      description: "Maximum depth to traverse",
      required: false,
      default: 3,
    },
    {
      name: "exclude",
      type: "string",
      description: "Comma separated list of patterns to exclude (e.g., 'node_modules,dist')",
      required: false,
      default: "node_modules,.git,dist,build",
    },
  ],
  async run(args, context: Context): Promise<any> {
    const { directory = ".", depth = 3, exclude = "node_modules,.git,dist,build" } = args;
    const cwd = context.workingDirectory;
    const targetDir = path.resolve(cwd, directory);
    const excludePatterns = exclude.split(",").map((p: string) => p.trim());

    try {
      // Check if directory exists
      if (!fs.existsSync(targetDir)) {
        return { error: `Directory not found: ${targetDir}` };
      }

      // Get directory structure recursively
      const structure = getDirStructure(targetDir, depth, excludePatterns);
      return { structure };
    } catch (error: any) {
      return {
        error: error.message || "Failed to get project structure",
      };
    }
  },
};

/**
 * Helper function to get directory structure
 */
function getDirStructure(dir: string, maxDepth: number, exclude: string[], currentDepth = 0): any {
  if (currentDepth > maxDepth) {
    return {
      type: "directory",
      name: path.basename(dir),
      note: "max depth reached",
    };
  }

  const items = fs.readdirSync(dir, { withFileTypes: true });
  const result: any[] = [];

  for (const item of items) {
    if (exclude.some(pattern => item.name.includes(pattern))) continue;

    const itemPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      if (currentDepth < maxDepth) {
        const children = getDirStructure(itemPath, maxDepth, exclude, currentDepth + 1);
        result.push({
          type: "directory",
          name: item.name,
          children,
        });
      } else {
        result.push({
          type: "directory",
          name: item.name,
          note: "max depth reached",
        });
      }
    } else {
      result.push({
        type: "file",
        name: item.name,
        extension: path.extname(item.name),
      });
    }
  }

  return result;
}

/**
 * Read file from the project
 */
const readFileTool: Tool = {
  name: "readFile",
  description: "Read contents of a file",
  parameters: [
    {
      name: "path",
      type: "string",
      description: "Path to the file, relative to the project root",
      required: true,
    },
    {
      name: "startLine",
      type: "number",
      description: "Starting line number (1-based indexing)",
      required: false,
    },
    {
      name: "endLine",
      type: "number",
      description: "Ending line number (inclusive)",
      required: false,
    },
  ],
  async run(args, context: Context): Promise<any> {
    const { path: filePath, startLine, endLine } = args;
    const cwd = context.workingDirectory;
    const absolutePath = path.resolve(cwd, filePath);

    try {
      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        return { error: `File not found: ${filePath}` };
      }

      // Read file content
      let content = fs.readFileSync(absolutePath, "utf-8");

      // If line range is specified, extract those lines
      if (startLine !== undefined) {
        const lines = content.split("\n");
        const start = Math.max(0, (startLine as number) - 1);
        const end = endLine !== undefined ? Math.min(lines.length, endLine as number) : lines.length;

        content = lines.slice(start, end).join("\n");

        return {
          content,
          path: filePath,
          startLine,
          endLine: endLine || start + 1,
          totalLines: lines.length,
        };
      }

      return {
        content,
        path: filePath,
        totalLines: content.split("\n").length,
      };
    } catch (error: any) {
      return { error: error.message || "Failed to read file" };
    }
  },
};

/**
 * Write file to the project
 */
const writeFileTool: Tool = {
  name: "writeFile",
  description: "Write content to a file",
  parameters: [
    {
      name: "path",
      type: "string",
      description: "Path to the file, relative to the project root",
      required: true,
    },
    {
      name: "content",
      type: "string",
      description: "Content to write to the file",
      required: true,
    },
    {
      name: "createDirs",
      type: "boolean",
      description: "Whether to create parent directories if they don't exist",
      required: false,
      default: true,
    },
  ],
  async run(args, context: Context): Promise<any> {
    const { path: filePath, content, createDirs = true } = args;
    const cwd = context.workingDirectory;
    const absolutePath = path.resolve(cwd, filePath);

    try {
      // Create parent directories if they don't exist
      if (createDirs) {
        const dirPath = path.dirname(absolutePath);
        fs.mkdirSync(dirPath, { recursive: true });
      }

      // Write content to file
      fs.writeFileSync(absolutePath, content, "utf-8");

      return {
        success: true,
        path: filePath,
        message: `File written successfully`,
      };
    } catch (error: any) {
      return { error: error.message || "Failed to write file" };
    }
  },
};

/**
 * Edit file in the project
 */
const editFileTool: Tool = {
  name: "editFile",
  description: "Edit an existing file by replacing specific lines or applying patches",
  parameters: [
    {
      name: "path",
      type: "string",
      description: "Path to the file, relative to the project root",
      required: true,
    },
    {
      name: "startLine",
      type: "number",
      description: "Starting line number to replace (1-based indexing)",
      required: true,
    },
    {
      name: "endLine",
      type: "number",
      description: "Ending line number to replace (inclusive)",
      required: true,
    },
    {
      name: "newContent",
      type: "string",
      description: "New content to replace the specified lines with",
      required: true,
    },
  ],
  async run(args, context: Context): Promise<any> {
    const { path: filePath, startLine, endLine, newContent } = args;
    const cwd = context.workingDirectory;
    const absolutePath = path.resolve(cwd, filePath);

    try {
      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        return { error: `File not found: ${filePath}` };
      }

      // Read file content
      const content = fs.readFileSync(absolutePath, "utf-8");
      const lines = content.split("\n");

      // Validate line numbers
      if (startLine < 1 || startLine > lines.length) {
        return {
          error: `Invalid startLine: ${startLine}. File has ${lines.length} lines.`,
        };
      }

      if (endLine < startLine || endLine > lines.length) {
        return {
          error: `Invalid endLine: ${endLine}. File has ${lines.length} lines.`,
        };
      }

      // Replace lines
      const start = (startLine as number) - 1;
      const replacedLines = lines.splice(start, (endLine as number) - start + 1, ...newContent.split("\n"));

      // Write the modified content back to the file
      fs.writeFileSync(absolutePath, lines.join("\n"), "utf-8");

      return {
        success: true,
        path: filePath,
        replacedRange: `${startLine}-${endLine}`,
        replacedContent: replacedLines.join("\n"),
        message: `File edited successfully`,
      };
    } catch (error: any) {
      return { error: error.message || "Failed to edit file" };
    }
  },
};

/**
 * Execute command in the project
 */
const executeCommandTool: Tool = {
  name: "executeCommand",
  description: "Execute a shell command in the project directory",
  parameters: [
    {
      name: "command",
      type: "string",
      description: "The command to execute",
      required: true,
    },
    {
      name: "workingDir",
      type: "string",
      description: "Working directory relative to project root. Defaults to project root.",
      required: false,
    },
    {
      name: "timeout",
      type: "number",
      description: "Timeout in milliseconds. Defaults to 30000 (30 seconds).",
      required: false,
      default: 30000,
    },
  ],
  async run(args, context: Context): Promise<any> {
    const { command, workingDir = ".", timeout = 30000 } = args;
    const cwd = path.resolve(context.workingDirectory, workingDir);

    // Security check - don't allow dangerous commands
    if (isForbiddenCommand(command)) {
      return { error: "Command rejected for security reasons" };
    }

    try {
      // Execute the command with timeout
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout,
        shell: "/bin/bash",
      });

      return {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        command,
        workingDir,
      };
    } catch (error: any) {
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

/**
 * Fetch content from a URL
 */
const fetchUrlTool: Tool = {
  name: "fetchUrl",
  description: "Fetch content from a URL",
  parameters: [
    {
      name: "url",
      type: "string",
      description: "The URL to fetch content from",
      required: true,
    },
    {
      name: "method",
      type: "string",
      description: "HTTP method (GET, POST, etc.)",
      required: false,
      default: "GET",
    },
    {
      name: "headers",
      type: "object",
      description: "HTTP headers to include in the request",
      required: false,
    },
    {
      name: "data",
      type: "object",
      description: "Data to send with POST/PUT requests",
      required: false,
    },
  ],
  async run(args, context: Context): Promise<any> {
    const { url, method = "GET", headers = {}, data } = args;

    try {
      const response = await axios({
        url,
        method,
        headers,
        data,
        timeout: 10000, // 10 seconds timeout
        maxContentLength: 1024 * 1024 * 2, // 2MB max
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
        url,
      };
    } catch (error: any) {
      return {
        error: error.message || "Failed to fetch URL",
        status: error.response?.status,
        statusText: error.response?.statusText,
        url,
      };
    }
  },
};

/**
 * Search the web
 */
const webSearchTool: Tool = {
  name: "webSearch",
  description: "Search the web for information",
  parameters: [
    {
      name: "query",
      type: "string",
      description: "The search query",
      required: true,
    },
    {
      name: "numResults",
      type: "number",
      description: "Number of results to return",
      required: false,
      default: 5,
    },
  ],
  async run(args, context: Context): Promise<any> {
    const { query, numResults = 5 } = args;
    // This is a stub/mock implementation since we don't have a real search engine API
    // In a real implementation, you would use a search API like Bing, Google, or a custom service

    return {
      warning: "This is a mock implementation. In production, you should implement a real search API.",
      results: [
        {
          title: `${query} - Search Result 1`,
          url: `https://example.com/result/1?q=${encodeURIComponent(query)}`,
          snippet: `This is a sample search result about ${query}. It doesn't contain real information.`,
        },
        {
          title: `${query} - Search Result 2`,
          url: `https://example.com/result/2?q=${encodeURIComponent(query)}`,
          snippet: `Another sample search result about ${query}. This is not based on real search results.`,
        },
      ],
      query,
      suggestion:
        "To implement real search, consider using the Bing Search API, Google Custom Search API, or similar services.",
    };
  },
};
