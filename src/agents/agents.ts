import { config } from "configs";
import OpenAI from "openai";
import type { BaseAgent } from "agents/base-agent.ts";
import { CoderAgent } from "agents/coder.ts";
import type { Context } from "types";
import { PromptEngineerAgent } from "agents/prompt-engineer.ts";

export function getAgent(context: Context, client: OpenAI, mode = "coder"): BaseAgent {
  const model = config.model;

  if (mode === "prompter") {
    return new PromptEngineerAgent(context, { model, client });
  }

  // Coder agent by default
  return new CoderAgent(context, { model: config.model, client });
}
