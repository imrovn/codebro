import { v4 as uuidv4 } from "uuid";
import type { AgentResponse, InferResponseType } from "agents";
import type { TaskLoopParams } from "./taskloop.types";
import { planningSchema } from "planning";
import { generateObject } from "ai";
// @ts-ignore
import {
  createActionResultMessage,
  createAssistantTextMessage,
  createAssistantToolCallsMessage,
  createSystemMessage,
  createUserMessage,
  type Message,
} from "messages";
import { z } from "zod";
import { processAgentFinalResponse } from "./finalResponse";

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

  // Create system message
  const systemMessage = await createSystemMessage(instructions, actions);
  const userMessage = await createUserMessage(input);
  // Initialize messages array with system message
  const messages: Message[] =
    initialMessages.length === 0 ? [systemMessage, userMessage] : [...initialMessages, userMessage];

  try {
    let stepCount = 0;

    // THE "LOOP" IN TASKLOOP
    while (stepCount < maxSteps) {
      stepCount++;
      const stepStartTime = Date.now();

      let nextActions;
      let reasoning = "";
      let textResponse = "";
      let object;

      // Normal planning flow
      const planningResult = await generateObject({
        model,
        schema: planningSchema,
        messages,
        mode: "json",
      });

      object = planningResult.object;
      nextActions = object.nextActions;
      reasoning = object.response.reasoning;
      textResponse = object.response.textResponse;

      console.log(reasoning);

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

        if (!action) {
          throw new Error(`Action ${actionId} not found`);
        }

        try {
          // Execute the action and return the result
          const actionResult = await action.run({
            context: taskLoopParams,
            parameters,
          });

          // Add tool result message
          const actionResultMessage = await createActionResultMessage(action.id, actionResult, toolCallId);
          messages.push(actionResultMessage);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log("error when calling tool", errorMessage);

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
  const { finalResponse } = await processAgentFinalResponse<TResponse>(messages, responseFormat, model);

  // Return a response with the current state
  return {
    response: finalResponse,
    state: state || {},
    messages,
  };
}
