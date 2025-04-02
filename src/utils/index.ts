import * as readline from "node:readline";
import type { Context, Message } from "../types/index.ts";

/**
 * Creates a system message incorporating memory bank information if available
 */
export function createSystemMessage(context: Context): Message {
  let content = `You are codebro, an AI assistant for programming tasks. 
You help users write code, fix bugs, and improve their codebase.
Current directory: ${context.currentDirectory}
${context.files.length > 0 ? "The following files are in the project:" : "No files found in the project"}
${context.files.map(file => `- ${file.path}`).join("\n")}`;

  return {
    role: "system",
    content,
  };
}

/**
 * Creates a user message with optional selected code
 */
export function createUserMessageWithContext(context: Context): Message {
  return {
    role: "user",
    content: `${context.command}${
      context.selectedCode ? `\n\nSelected code:\n\`\`\`\n${context.selectedCode}\n\`\`\`` : ""
    }`,
  };
}

export function createUserMessage(content: string): Message {
  return {
    role: "user",
    content,
  };
}

export function createAssistantMessage(content: string): Message {
  return {
    role: "assistant",
    content,
  };
}

/**
 * Creates a readline interface for user input/output
 */
export function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Ask a yes/no question and wait for user response
 */
export async function askYesNoQuestion(question: string): Promise<boolean> {
  const rl = createReadlineInterface();

  return new Promise(resolve => {
    rl.question(`${question} (y/n): `, answer => {
      const normalized = answer.toLowerCase().trim();
      rl.close();
      resolve(normalized === "y" || normalized === "yes");
    });
  });
}

/**
 * Displays AI response to console with formatting
 */
export function displayResponse(response: string, appName: string = "codebro"): void {
  console.log(`\n===== ${appName} Response =====\n`);
  console.log(response);
  console.log("\n===============================\n");
}
