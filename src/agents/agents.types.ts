import type { Action } from "actions";
import type { LanguageModelV1 } from "ai";
import type { Messages } from "messages";

export interface AgentRunConfig {
  input: string;
  maxSteps?: number;
  state?: Record<string, any>;
  isRerun?: boolean;
  actions?: Action[];
  model?: LanguageModelV1;
  messages?: Messages;
}

export interface AgentConfig {
  instructions: string;
  model: LanguageModelV1;
  actions: Action[];
}

export interface AgentResponse {
  response: string;
  state: Record<string, unknown>;
  messages: Messages;
}

export type Agent = (runConfig: AgentRunConfig) => Promise<AgentResponse>;
