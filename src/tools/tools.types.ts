import type { Context } from "types";

/**
 * Tool parameter
 */
export interface ToolParameter {
  name: string;
  type: string;
  description: string;
  required?: boolean;
  default?: any;
}

/**
 * Tool definition
 */
export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  run: (args: Record<string, any>, context: Context) => Promise<any>;
}

/**
 * Tool call from the AI
 */
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallResponse {
  readonly call: ToolCall;
  readonly result: any;
}
