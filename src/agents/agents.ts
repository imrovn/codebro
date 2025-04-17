import type { BaseAgent } from "agents/base-agent.ts";
import { CoderAgent } from "agents/coder.ts";
import type { Context } from "types";
import { PromptEngineerAgent } from "agents/prompt-engineer.ts";

export function getAgent(context: Context, mode = "coder"): BaseAgent {
  if (mode === "prompter") {
    return new PromptEngineerAgent(context);
  }

  // Coder agent by default
  return new CoderAgent(context);
}
