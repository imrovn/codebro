import type { z } from "zod";
import type { Agent, AgentConfig, AgentRunConfig, InferResponseType } from "./agents.types.ts";
import { runTaskLoop } from "taskloop";

export function createAgent<T extends "text" | z.ZodType<any> = "text">(config: AgentConfig): Agent<T> {
  return async function <TResponseFormat extends T | "text" | z.ZodType<any> = T>(
    runConfig: AgentRunConfig<TResponseFormat>
  ) {
    return runTaskLoop<TResponseFormat, InferResponseType<TResponseFormat>>({
      ...config,
      ...runConfig,
    });
  };
}
