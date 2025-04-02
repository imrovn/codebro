import type { Config, Message } from "./index.ts";

/**
 * Tool function context
 */
export interface ToolContext {
  workingDirectory: string;
  memoryBank?: any;
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
  execute: (args: Record<string, any>, context: ToolContext) => Promise<any>;
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

/**
 * Agent run history
 */
export interface AgentRunHistory {
  messages: Message[];
  toolCalls: {
    call: ToolCall;
    result: any;
  }[];
}

/**
 * Agent state
 */
export interface AgentState {
  history: AgentRunHistory;
  context: ToolContext;
}
