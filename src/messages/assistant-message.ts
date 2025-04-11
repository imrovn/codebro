import type { Message } from "./messages.type";

export function createAssistantMessage(content: string): Message {
  return {
    role: "assistant",
    content,
  };
}
