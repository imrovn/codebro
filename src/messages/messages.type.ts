export interface Message {
  role: "system" | "user" | "assistant" | "function" | "tool";
  name?: string;
  content?: string | string[];
  function_call?: {
    name: string;
    arguments: string;
  };
  arguments?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }[];
  tool_call_id?: string;
}
