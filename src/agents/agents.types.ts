import type OpenAI from "openai";

import type { GlobalConfig } from "@configs";
import type { Message } from "@messages";
import type { Tool, ToolCallResponse } from "@tools";
import type { ProjectFile } from "@types";

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
  context: AgentContext;
}

export interface AgentConfig {
  name: string;
  tools: Tool[];
  mode?: AgentMode;
  systemPrompt?: string;
  plannerPrompt?: string;
  description?: string;
  memoryBankDir?: string;
  temperature?: number;
}

// Response interfaces
export interface AIResponse {
  content: string;
  toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[];
  isStreaming?: boolean;
}

export type AgentMode = "PLAN" | "EXECUTE";

/**
 * Agent context
 */
export interface AgentContext extends GlobalConfig {
  model: string;
  workingDirectory: string;
  client: OpenAI;
  memoryBank?: any;
  files?: ProjectFile[];
  memory?: {
    conversations: Array<{ role: string; content: string; timestamp: string }>;
    lastUpdated: string;
  };
  mcpTools?: Tool[];

  [key: string]: any;
}
