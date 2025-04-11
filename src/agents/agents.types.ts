import type { Message } from "messages";
import type { Context } from "types";
import type { Tool, ToolCallResponse } from "tools";
import type OpenAI from "openai";

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

/**
 * Agent response
 */
export interface AgentResponse {
  response: string;
}

export interface AgentConfig {
  client: OpenAI;
  model: string;
  name: string;
  systemPrompt?: string;
  description?: string;
  memoryBankDir?: string;
  tools?: Tool[];
  temperature?: number;
}
