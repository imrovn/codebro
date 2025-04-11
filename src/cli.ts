import { createAgent, startCliChat } from "agents";
import { createAzure } from "@ai-sdk/azure";
import * as process from "node:process";

async function main() {
  const azure = createAzure({
    resourceName: "mgm-datascience-openai-sweden", // Azure resource name
    apiKey: process.env.CODE_BRO_API_KEY,
  });
  const agent = createAgent({
    instructions: `You are codebro, an expert programming assistant that helps users with coding tasks. 
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
If you use any libraries or frameworks, make sure to explain why they are appropriate.`,
    actions: [],
    model: azure(process.env.CODE_BRO_MODEL || "gpt-4o"),
  });

  startCliChat(agent, {
    inputPrompt: "You: ",
  });
}

main().catch(console.error);
