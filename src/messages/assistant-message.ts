import type { Message } from "./messages.type";

/**
 * Creates a text-only assistant message
 * @param textResponse The text response to the user
 * @returns A formatted assistant message with only text content
 */
export async function createAssistantTextMessage(textResponse: string): Promise<Message> {
  return {
    role: "assistant",
    content: textResponse,
  };
}

/**
 * Creates an assistant message with tool calls
 * @param textResponse The text response to the user
 * @param reasoning The reasoning behind the response
 * @param nextActions Array of next actions to execute
 * @returns A formatted assistant message with text, reasoning, and tool calls
 */
export async function createAssistantToolCallsMessage(
  textResponse: string,
  reasoning: string,
  nextActions: Array<{
    actionId: string;
    parameters: Record<string, unknown>;
    toolCallId: string;
  }>
): Promise<Message> {
  const content: any[] = [
    {
      type: "text",
      text: textResponse,
    },
    {
      type: "reasoning",
      text: reasoning,
    },
  ];

  // Add one object per nextAction
  nextActions.forEach(action => {
    content.push({
      type: "tool-call",
      toolCallId: action.toolCallId,
      toolName: action.actionId,
      args: action.parameters,
    });
  });

  return {
    role: "assistant",
    content,
  };
}

/**
 * Creates an assistant message based on the response and nextActions
 * @param textResponse The text response to the user
 * @param reasoning The reasoning behind the response
 * @param nextActions Array of next actions to execute (can be empty)
 * @returns A formatted assistant message
 * @deprecated Use createAssistantTextMessage or createAssistantToolCallsMessage instead
 */
export async function createAssistantMessage(
  textResponse: string,
  reasoning: string,
  nextActions: Array<{
    actionId: string;
    parameters: Record<string, unknown>;
    toolCallId: string;
  }>
): Promise<Message> {
  // Case 1: No next actions, just return text response
  if (!nextActions || nextActions.length === 0) {
    return createAssistantTextMessage(textResponse);
  }

  // Case 2: Has next actions, include text, reasoning, and tool calls
  return createAssistantToolCallsMessage(textResponse, reasoning, nextActions);
}
