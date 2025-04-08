export interface Action {
  id: string;
  description: string;
  parameters?: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  run: (params: { parameters?: Record<string, unknown> }) => Promise<any>;
  dependsOn?: string[];
  retries?: number;
}
