import type { ClientProvider } from "client";

export interface Config {
  apiKey: string;
  model: string;
  provider: ClientProvider;
  baseURL?: string;
  maxFiles: number;
  excludePaths: string[];
  useStreaming: boolean;
}
