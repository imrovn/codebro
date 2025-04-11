import type { Message } from "./messages.type";

/**
 * Creates a user message with optional selected code
 */
export function createUserMessage(message: string): Message {
  return {
    role: "user",
    content: message,
  };
}
