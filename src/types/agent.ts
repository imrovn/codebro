import type { Config, File, Message } from "./index.ts";

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
