import * as readline from "readline";
import type { Agent } from "./agents.types";
import { z } from "zod";

interface CliChatOptions {
  /**
   * Custom input prompt (the text shown before user input)
   * @default "> "
   */
  inputPrompt?: string;

  /**
   * Command to exit the chat
   * @default "exit"
   */
  exitCommand?: string;

  /**
   * Custom function to format the agent's response
   * @default (response) => console.log(`Assistant: ${response}\n`)
   */
  formatResponse?: (response: string) => void;

  /**
   * Custom error handler
   * @default (error) => console.error("\nError:", error, "\n")
   */
  onError?: (error: unknown) => void;
}

/**
 * Starts a CLI chat session with the provided agent
 * @param agent The SpinAI agent to chat with
 * @param options Configuration options for the CLI chat
 */
export function startCliChat<T extends "text" | z.ZodType<any> = "text">(
  agent: Agent<T>,
  options: CliChatOptions = {}
): void {
  const {
    inputPrompt = "> ",
    exitCommand = "exit",
    formatResponse = response => console.log(`Assistant: ${response}\n`),
    onError = error => console.error("\nError:", error, "\n"),
  } = options;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🤖 Chat started. Type your messages or type '" + exitCommand + "' to quit.\n");

  let messageHistory: any[] = [];

  function getInput() {
    rl.question(inputPrompt, async input => {
      if (input.toLowerCase() === exitCommand.toLowerCase()) {
        rl.close();
        return;
      }

      try {
        const { messages, response } = await agent({
          input,
          messages: messageHistory,
        });

        // Update message history
        messageHistory = messages;

        // Display the response
        formatResponse(response);
      } catch (error) {
        onError(error);
      }

      getInput();
    });
  }

  getInput();

  // Handle clean exit
  rl.on("close", () => {
    console.log("\nChat ended. Goodbye!");
    process.exit(0);
  });
}
