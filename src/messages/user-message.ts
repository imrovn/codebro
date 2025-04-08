import type { Message } from "./messages.type";

/**
 * Creates a system message with instructions and available actions
 * @param instructions The system instructions
 * @param actions The available actions
 * @returns A formatted system message
 */
export async function createUserMessage(input: string): Promise<Message> {
  return {
    role: "user",
    content: `${input}`,
  };
}
