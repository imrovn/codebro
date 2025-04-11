import type { Message } from "../messages/messages.type";

/**
 * Creates a system message with instructions and available actions
 * @returns A formatted system message
 * @param input
 */
export async function createUserMessage(input: string): Promise<Message> {
  return {
    role: "user",
    content: `${input}`,
  };
}
