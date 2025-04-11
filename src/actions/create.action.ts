import type { Action } from "./actions.types";

export function createAction(config: Action): Action {
  return {
    id: config.id,
    description: config.description,
    parameters: config.parameters,
    run: config.run,
    dependsOn: config.dependsOn || [],
    retries: config.retries || 2,
  };
}
