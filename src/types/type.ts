import type { ToolCall } from "tools";

/**
 * Agent context
 */
export interface Context {
  workingDirectory: string;
  memoryBank?: any;
  files?: File[];

  [key: string]: any;
}

export interface Config {
  apiKey: string;
  model: string;
  maxFiles: number;
  excludePaths: string[];
  useStreaming: boolean;
  useOpenRouter: boolean;
  useOpenAI: boolean;
}

// File types and context interfaces
export interface File {
  name: string;
  path: string;
  content: string;
  isDirectory: boolean;
}

// Configuration interface

// Response interfaces
export interface AIResponse {
  content: string;
  toolCalls: ToolCall[];
  isStreaming?: boolean;
}

// Memory Bank interfaces
export interface MemoryBankFile {
  name: string;
  content: string;
  path: string;
  lastUpdated: Date;
}

export interface MemoryBank {
  projectBrief: MemoryBankFile;
  productContext: MemoryBankFile;
  activeContext: MemoryBankFile;
  systemPatterns: MemoryBankFile;
  techContext: MemoryBankFile;
  progress: MemoryBankFile;
  additionalFiles?: MemoryBankFile[];
}
