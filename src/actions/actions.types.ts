import type { Tool } from "ai";

export type Action = Omit<Tool, "execute"> & {
  id: string;
  // name: string;
  retries?: number;
  run: Tool["execute"];
};
