import type { Message } from "./messages.type";

/**
 * Creates a tool message from an action result
 * @param actionId The ID of the action that was executed
 * @param result The result of the action execution
 * @param toolCallId The ID of the tool call this is responding to
 * @returns A formatted tool message
 */
export async function createActionResultMessage(actionId: string, result: any, toolCallId: string): Promise<Message> {
  return {
    role: "tool",
    content: [
      {
        toolName: actionId,
        type: "tool-result",
        toolCallId,
        result: typeof result === "object" ? JSON.stringify(result) : String(result),
      },
    ],
  };
}
