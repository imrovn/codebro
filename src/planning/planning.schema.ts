import z from "zod";

export const planningSchema = z.object({
  response: z
    .object({
      textResponse: z.string().describe("The text response to the user"),
      reasoning: z.string().describe("The reasoning behind the response"),
      parametersReasoning: z
        .string()
        .describe("The reasoning behind the parameters you chose to pass in."),
    })
    .describe("The response object containing text and reasoning"),
  nextActions: z
    .array(
      z.object({
        actionId: z.string().describe("The ID of the action to run"),
        parameters: z
          .record(z.unknown())
          .default({})
          .describe(
            "The parameters, at minimum the required parameters, to run with the action."
          ),
      })
    )
    .default([])
    .describe(
      `The next tools to execute. IMPORTANT:
- Return ONE action when its result is needed for subsequent actions
- Return multiple actions ONLY when they can run independently
- Return empty array when the user's request is complete`
    ),
});
