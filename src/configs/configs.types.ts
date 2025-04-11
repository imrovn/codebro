export interface Config {
  apiKey: string;
  model: string;
  baseURL?: string;
  maxFiles: number;
  excludePaths: string[];
  useStreaming: boolean;
  useOpenRouter: boolean;
  useAzure: boolean;
  useOpenAI: boolean;
}
