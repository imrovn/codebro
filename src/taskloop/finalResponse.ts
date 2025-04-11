import { z } from "zod";
import { generateObject } from "ai";
import { createAssistantTextMessage, type Message } from "../messages";

/**
 * Process the agent's final response based on the requested format
 */
export async function processAgentFinalResponse<T>(
  messages: Message[],
  responseFormat: "text" | z.ZodType<T> | undefined,
  model: any
): Promise<{
  finalResponse: T;
}> {
  let finalResponse: T | "Task completed" = "Task completed";
  let rawInput: any = {};

  // Get the last assistant message text response
  const lastAssistantMessage = messages
    .slice() // Create a copy before reversing
    .reverse()
    .find(msg => msg.role === "assistant" && "content" in msg && typeof msg.content === "string");

  if (lastAssistantMessage && "content" in lastAssistantMessage) {
    finalResponse = lastAssistantMessage.content as T;
  }

  // Format the response based on responseFormat
  if (responseFormat) {
    if (responseFormat === "text") {
      // Already a string, no processing needed
    } else if (responseFormat instanceof z.ZodType) {
      try {
        // Use generateObject with the Zod schema for proper validation
        const { object, usage: genUsage } = await generateObject({
          model,
          schema: responseFormat,
          messages,
          mode: "json",
        });
        finalResponse = object;

        // Add the structured response to the messages array using the helper function
        const structuredResponseMessage = await createAssistantTextMessage(JSON.stringify(finalResponse, null, 2));
        messages.push(structuredResponseMessage);
      } catch (e) {
        console.warn("Response validation failed:", e);
      }
    }
  }

  return {
    finalResponse: finalResponse as T,
  };
}
