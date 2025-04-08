import type { Action } from "./actions.types.ts";

export function createAction(config: Action): Action {
  return {
    id: config.id,
    description: config.description,
    parameters: config.parameters,
    run: config.run,
    retries: config.retries || 2,
  };
}

export function formatActionForPrompt(action: Action): string {
  let formattedAction = `Action ID: ${action.id}\nDescription: ${action.description}\n`;

  if (action.parameters) {
    formattedAction += `Parameters (pass these in from context or user input):\n${JSON.stringify(action.parameters, null, 2)}\n`;
  }

  return formattedAction;
}

export function formatActionsForPrompt(actions: Action[]): string {
  if (!actions || actions.length === 0) {
    return "No actions available.";
  }

  return `Available Actions:\n\n${actions.map(formatActionForPrompt).join("\n")}`;
}
