import type { ProjectState } from "tools";
import type OpenAI from "openai";

/**
 * Agent context
 */
export interface Context {
  model: string;
  workingDirectory: string;
  client: OpenAI;
  memoryBank?: any;
  files?: File[];
  projectState?: ProjectState;
  memory?: {
    conversations: Array<{ role: string; content: string; timestamp: string }>;
    lastUpdated: string;
  };

  [key: string]: any;
}

export interface File {
  name: string;
  path: string;
  content: string;
  isDirectory: boolean;
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
