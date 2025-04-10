import type { Message } from "./messages.type";

/**
 * Creates a system message with instructions and available actions
 * @param instructions The system instructions
 * @param actions The available actions
 * @returns A formatted system message
 */
export async function createSystemMessage(instructions: string): Promise<Message> {
  return {
    role: "system",
    content: instructions,
  };
}
