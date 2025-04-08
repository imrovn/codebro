import type { AgentConfig, AgentRunConfig } from "agents";
import type { z } from "zod";

export type TaskLoopParams<TResponseFormat = "text" | z.ZodType<any>> = AgentConfig & AgentRunConfig<TResponseFormat>;
