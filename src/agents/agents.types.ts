import { z } from "zod";
import type { Action } from "actions";
import type { LanguageModelV1 } from "ai";
import type { Messages } from "messages";

export interface AgentConfig {
  instructions: string;
  model: LanguageModelV1;
  actions: Action[];
  agentId?: string;
}

export interface AgentRunConfig<TResponseFormat = "text" | z.ZodType<any>> {
  input: string;
  maxSteps?: number;
  state?: Record<string, any>;
  isRerun?: boolean;
  actions?: Action[];
  model?: LanguageModelV1;
  responseFormat?: TResponseFormat;
  messages?: Messages;
}

// Helper type to extract the inferred type from a Zod schema
export type InferResponseType<T> = T extends z.ZodType<infer U> ? U : T extends "text" ? string : unknown;

export interface AgentResponse<T = unknown> {
  response: T;
  state: Record<string, unknown>;
  messages: Messages;
}

export type Agent<T extends "text" | z.ZodType<any> = "text"> = <
  TResponseFormat extends T | "text" | z.ZodType<any> = T,
>(
  runConfig: AgentRunConfig<TResponseFormat>
) => Promise<AgentResponse<InferResponseType<TResponseFormat>>>;
