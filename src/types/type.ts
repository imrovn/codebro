/**
 * Agent context
 */
export interface Context {
  workingDirectory: string;
  memoryBank?: any;
  files: File[];
  selectedCode?: string;

  [key: string]: any;
}

/**
 * Tool parameter
 */
export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  default?: any;
}

/**
 * Tool definition
 */
export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (args: Record<string, any>, context: Context) => Promise<any>;
}

/**
 * Tool call from the AI
 */
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
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

/**
 * Agent configuration
 */
export interface AgentConfig extends Config {
  name: string;
  description?: string;
  systemPrompt: string;
  memoryBankDir?: string;
  tools?: Tool[];
  model: string;
  temperature?: number;
}

/**
 * Agent response
 */
export interface AgentResponse {
  response: string;
  toolCalls?: ToolCall[];
  toolResults?: any[];
  thoughts?: string;
}

export interface ToolCallResponse {
  readonly call: ToolCall;
  readonly result: any;
}

/**
 * Agent run history
 */
export interface AgentRunHistory {
  messages: Message[];
  toolCalls: ToolCallResponse[];
}

/**
 * Agent state
 */
export interface AgentState {
  history: AgentRunHistory;
  context: Context;
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

export interface Message {
  role: "system" | "user" | "assistant" | "function" | "tool";
  name?: string;
  content: string;
  function_call?: {
    name: string;
    arguments: string;
  };
  arguments?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
  tool_call_id?: string;
}

// AI Service interface
export interface AIService {
  sendCompletion(messages: Message[], model: string): Promise<AIResponse>;

  streamCompletion(messages: Message[], model: string, callback: (chunk: string) => void): Promise<void>;
}
