import * as fs from "node:fs";
import * as path from "node:path";
import type { File } from "types/index.ts";

/**
 * Gets relevant files from a directory with limits on depth and exclusions
 */
export async function getRelevantFiles(
  dirPath: string,
  maxFiles: number,
  excludePaths: string[],
  depth = 0
): Promise<File[]> {
  if (depth > 2) return []; // Limit recursion depth

  const files: File[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    // Skip excluded paths
    if (excludePaths.some(exclude => entryPath.includes(exclude))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push({
        name: entry.name,
        path: entryPath,
        content: "[DIRECTORY]",
        isDirectory: true,
      });

      // Recursively get files from subdirectories
      const subFiles = await getRelevantFiles(entryPath, maxFiles, excludePaths, depth + 1);
      files.push(...subFiles);
    } else {
      // Only include text files and limit to maxFiles
      if (files.length < maxFiles && isTextFile(entry.name)) {
        try {
          const content = fs.readFileSync(entryPath, "utf-8");
          files.push({
            name: entry.name,
            path: entryPath,
            content,
            isDirectory: false,
          });
        } catch (error) {
          console.warn(`Could not read file ${entryPath}`);
        }
      }
    }
  }

  return files;
}

/**
 * Check if a file is a text file based on extension
 */
export function isTextFile(filename: string): boolean {
  const textExtensions = [
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".html",
    ".css",
    ".scss",
    ".sass",
    ".json",
    ".md",
    ".txt",
    ".yaml",
    ".yml",
    ".py",
    ".rb",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".php",
    ".go",
    ".rs",
  ];
  const ext = path.extname(filename).toLowerCase();
  return textExtensions.includes(ext);
}

/**
 * Creates a directory if it doesn't exist
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Reads a file from disk
 */
export function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (error) {
    return "";
  }
}

/**
 * Writes content to a file
 */
export function writeFile(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  ensureDirectoryExists(dir);
  fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Checks if a file exists
 */
export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}
