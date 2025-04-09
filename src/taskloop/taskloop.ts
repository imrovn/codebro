import type { AgentResponse, InferResponseType } from "agents";
import type { TaskLoopParams } from "./taskloop.types.ts";
import { z } from "zod";
import {
  createActionResultMessage,
  createAssistantTextMessage,
  createAssistantToolCallsMessage,
  createSystemMessage,
  createUserMessage,
  type Message,
} from "messages";
import { generateObject } from "ai";
import { planningSchema } from "planning/index.ts";
import { v4 as uuidv4 } from "uuid";

export async function runTaskLoop<
  TResponseFormat extends "text" | z.ZodType<any> = "text",
  TResponse = InferResponseType<TResponseFormat>,
>(taskLoopParams: TaskLoopParams<TResponseFormat>): Promise<AgentResponse<TResponse>> {
  const {
    actions,
    model,
    input,
    maxSteps = 10,
    instructions,
    state = {},
    responseFormat = "text",
    messages: initialMessages = [],
  } = taskLoopParams;
  const modelId = model.modelId;
  const modelProvider = model.provider;

  // Create system message
  const systemMessage = await createSystemMessage(instructions, actions);
  const userMessage = await createUserMessage(input);
  // Initialize messages array with system message
  const messages: Message[] =
    initialMessages.length === 0 ? [systemMessage, userMessage] : [...initialMessages, userMessage];

  try {
    // Log interaction start
    let stepCount = 0;

    // THE "LOOP" IN TASKLOOP
    while (stepCount < maxSteps) {
      stepCount++;
      const stepStartTime = Date.now();

      let nextActions;
      let reasoning = "";
      let textResponse = "";
      let rawInput;
      let object;
      let usage;

      // Normal planning flow
      const planningResult = await generateObject({
        model,
        schema: planningSchema,
        messages,
        mode: "json",
      });
      console.log("plannnnnnnni", planningResult);

      usage = planningResult.usage;
      rawInput = planningResult.request?.body;

      object = planningResult.object;
      nextActions = object.nextActions;
      reasoning = object.response.reasoning;
      textResponse = object.response.textResponse;

      // Log the planning step
      console.log("reasoning", reasoning);

      if (!nextActions || nextActions.length === 0) {
        if (responseFormat === "text") {
          const assistantTextMessage = await createAssistantTextMessage(textResponse);
          messages.push(assistantTextMessage);
        }
        break;
      }

      // Add unique toolCallId to each action
      nextActions.forEach(action => {
        (action as any).toolCallId = `call_${Date.now()}_${uuidv4().substring(0, 8)}`;
      });

      // Add assistant message with reasoning and tool calls
      const assistantMessage = await createAssistantToolCallsMessage(textResponse, reasoning, nextActions as any);
      messages.push(assistantMessage);

      const actionPromises = nextActions.map(async actionItem => {
        const { actionId, parameters, toolCallId } = actionItem as any;
        const action = actions.find(a => a.id === actionId);

        if (!action || action.run == undefined) {
          throw new Error(`Action ${actionId} not found`);
        }

        const actionStartTime = Date.now();
        try {
          // Execute the action and return the result
          const actionResult = await action.run({ parameters }, { toolCallId, messages });
          const actionDuration = Date.now() - actionStartTime;

          // Add tool result message
          const actionResultMessage = await createActionResultMessage(action.id, actionResult, toolCallId);
          messages.push(actionResultMessage);

          // Log the action execution

          console.log(`Finished executing ${action.id}`, {
            type: "action",
            data: {
              durationMs: actionDuration,
            },
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);

          console.log(`Action error: ${errorMessage}`, {
            type: "action",
            data: error,
          });

          // Log the action error
          // logger.logAction({
          //   actionId: action.id,
          //   parameters,
          //   result: "error running action",
          //   durationMs: Date.now() - actionStartTime,
          //   state,
          //   error: error instanceof Error ? error : new Error(String(error)),
          // });

          // Add error tool result message
          const toolResultMessage = await createActionResultMessage(action.id, "error running action", toolCallId);
          messages.push(toolResultMessage);
        }
      });

      await Promise.all(actionPromises);
    }
  } catch (error) {
    console.log(error);
  }

  // Process the final agent response
  const { finalResponse, rawInput } = await processAgentFinalResponse<TResponse>(
    messages,
    responseFormat,
    model,
    modelId
  );

  // Log the final response (no usage available from processAgentFinalResponse)
  // logger.logFinalResponse({
  //   response: finalResponse,
  //   usage: {
  //     promptTokens: usage.promptTokens,
  //     completionTokens: usage.completionTokens,
  //     costCents: usage.costCents,
  //   },
  //   durationMs: Date.now() - responseStartTime,
  //   state: state || {},
  //   rawInput,
  //   rawOutput: finalResponse,
  // });

  // Log interaction complete
  // logger.logInteractionComplete({
  //   response: finalResponse,
  //   durationMs: Date.now() - taskStartTime,
  //   state: state || {},
  //   messages,
  //   totalCostCents,
  //   totalPromptTokens,
  //   totalCompletionTokens,
  // });

  // Return a response with the current state
  return {
    response: finalResponse,
    state: state || {},
    messages,
  };
}

/**
 * Process the agent's final response based on the requested format
 */
export async function processAgentFinalResponse<T>(
  messages: Message[],
  responseFormat: "text" | z.ZodType<T> | undefined,
  model: any,
  modelId: string
): Promise<{
  finalResponse: T;
  rawInput: any;
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
        const { object, request } = await generateObject({
          model,
          schema: responseFormat,
          messages,
          mode: "json",
        });
        finalResponse = object;
        rawInput = request;

        // Add the structured response to the messages array using the helper function
        console.log("final response", finalResponse, JSON.stringify(finalResponse, null, 2));
        const structuredResponseMessage = await createAssistantTextMessage(JSON.stringify(finalResponse, null, 2));
        messages.push(structuredResponseMessage);
      } catch (e) {
        console.warn("Response validation failed:", e);
      }
    }
  }

  return {
    finalResponse: finalResponse as T,
    rawInput,
  };
}
