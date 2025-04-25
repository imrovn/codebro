import type { AgentContext } from "./agents.types";
import type { BaseAgent } from "./base-agent";
import { CoderAgent } from "./coder";
import { PromptEngineerAgent } from "./prompt-engineer";

export function getAgent(context: AgentContext, mode = "coder"): BaseAgent {
  if (mode === "prompter") {
    return new PromptEngineerAgent(context);
  }

  // Coder agent by default
  return new CoderAgent(context);
}
