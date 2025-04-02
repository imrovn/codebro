// File types and context interfaces
export interface File {
  name: string;
  path: string;
  content: string;
  isDirectory: boolean;
}

export interface Context {
  currentDirectory: string;
  files: File[];
  useStreaming: boolean;
  command: string;
  selectedCode?: string;
}

// Configuration interface
export interface Config {
  apiKey: string;
  model: string;
  maxFiles: number;
  excludePaths: string[];
  useStreaming: boolean;
  useOpenRouter: boolean;
  useOpenAI: boolean;
}

// Response interfaces
export interface AIResponse {
  content: string;
  isStreaming?: boolean;
}

// Memory Bank interfaces
export interface MemoryBankFile {
  name: string;
  content: string;
  path: string;
  lastUpdated: Date;
}

export interface MemoryBank {
  projectBrief: MemoryBankFile;
  productContext: MemoryBankFile;
  activeContext: MemoryBankFile;
  systemPatterns: MemoryBankFile;
  techContext: MemoryBankFile;
  progress: MemoryBankFile;
  additionalFiles?: MemoryBankFile[];
}

// AI Message interfaces based on OpenAI's ChatCompletionMessageParam
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
  // function_call?: {
  //   name: string;
  //   arguments: string;
  // };
  // arguments?: string;
  // tool_calls?: {
  //   id: string;
  //   type: "function";
  //   function: {
  //     name: string;
  //     arguments: string;
  //   };
  // }[];
  // tool_call_id?: string;
}

// AI Service interface
export interface AIService {
  sendCompletion(messages: Message[], model: string): Promise<AIResponse>;
  streamCompletion(messages: Message[], model: string, callback: (chunk: string) => void): Promise<void>;
}
