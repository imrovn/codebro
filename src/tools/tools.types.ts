import type { Context } from "types";
import OpenAI from "openai";

/**
 * Tool definition
 */
export interface Tool {
  getDefinition(): OpenAI.Chat.ChatCompletionTool;

  run(args: Record<string, any>, context: Context): Promise<any>;
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

export interface Task {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  subtasks?: Array<{ id: string; description: string; status: "pending" | "completed" }>;
}

export interface ProjectState {
  tasks: Task[];
}
