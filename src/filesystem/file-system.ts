import { loadGlobalConfig } from "@configs";
import type { ProjectFile } from "@types";

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Gets relevant files from a directory with limits on depth and exclusions
 * TODO: Get exclude files from .gitignore
 */
export async function getRelevantFiles(
  dirPath: string,
  maxFiles: number,
  excludePaths: string[],
  depth = 0,
  maxDepth = 2
): Promise<ProjectFile[]> {
  if (depth > maxDepth) return []; // Limit recursion depth
  // Load ignoreFiles from config
  const { config } = await loadGlobalConfig();
  const allExclusions = [...excludePaths, ...(config.ignoreFiles || [])];

  const files: ProjectFile[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    // Skip excluded paths
    if (allExclusions.some(exclude => entryPath.includes(exclude))) {
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
        } catch (error: any) {
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
