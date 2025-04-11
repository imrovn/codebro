import type { TaskLoopParams } from "taskloop";

import { z, ZodObject } from "zod";

export interface Action<Schema extends ZodObject<any> | Record<string, unknown> = Record<string, unknown>> {
  id: string;
  description: string;
  parameters?: Schema;
  run: (params: {
    context: TaskLoopParams;
    parameters: Schema extends ZodObject<any> ? z.infer<Schema> : Record<string, unknown>;
  }) => Promise<any>;
  dependsOn?: string[];
  retries?: number;
}
