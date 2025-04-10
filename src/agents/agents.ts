// import type { z } from "zod";
// import type { Agent, AgentConfig, AgentRunConfig } from "./agents.types.ts";
// import { runTaskLoop } from "taskloop";
//
// export function createAgent<T extends "text" | z.ZodType<any> = "text">(config: AgentConfig): Agent {
//   return async function (runConfig: AgentRunConfig) {
//     return runTaskLoop({
//       ...config,
//       ...runConfig,
//     });
//   };
// }
export const START_TOOL = "<@TOOL_CALL>"
export const END_TOOL = "</@TOOL_CALL>"
