import type { AgentConfig, AgentRunConfig } from "agents";
import { z } from "zod";

export type TaskLoopParams<TResponseFormat = "text" | z.ZodType<any>> = AgentConfig & AgentRunConfig<TResponseFormat>;

export interface ExecutedAction {
  id: string;
  parameters?: Record<string, unknown>;
  result?: unknown;
  status: "success" | "error";
  errorMessage?: string;
}

export interface RunState {
  input: string;

  [key: string]: unknown;
}
