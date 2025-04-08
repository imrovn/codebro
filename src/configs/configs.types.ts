export interface Config {
  apiKey: string;
  model: string;
  maxFiles: number;
  excludePaths: string[];
  useStreaming: boolean;
  useOpenRouter: boolean;
  useAzure: boolean;
  useOpenAI: boolean;
}
