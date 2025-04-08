import { BaseAgent } from "../base/agent.ts";
import { config as defaultConfig } from "configs";
import { getCodeTools } from "tools";
import type { AgentConfig, Context } from "types";

/**
 * Coder Agent - specialized agent for coding tasks
 */
export class CoderAgent extends BaseAgent {
  /**
   * Create a new coder agent
   */
  constructor(context: Context, config: Partial<AgentConfig> = {}) {
    // Default system prompt for the coder agent
    const systemPrompt = `You are codebro, an expert programming assistant that helps users with coding tasks. 
You answer questions about code, help write and refactor code, and provide explanations.
You are knowledgeable about best practices and design patterns.
Your primary goal is to help the user solve their coding problems efficiently and clearly.

When the user asks you to write or modify code:
1. First, understand the task requirements clearly
2. Think step-by-step about the solution
3. If needed, use tools to explore the codebase or check documentation
4. Provide clean, well-documented code that follows best practices
5. Explain your implementation if it's not obvious

You should write code in a clean, modular, and maintainable way. Prefer simple solutions over complex ones.
If you use any libraries or frameworks, make sure to explain why they are appropriate.`;

    // Create the agent with coder tools
    super(context, {
      ...defaultConfig,
      name: "codebro",
      description: "A coding assistant that helps with programming tasks",
      systemPrompt,
      tools: getCodeTools(),
      ...config,
    });
  }
}
