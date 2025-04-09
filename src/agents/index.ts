export * from "./agents.types";
export * from "./agents";

// /**
//  * Factory function to create an agent based on type
//  */
// export function createAgent(context: Context, type: string, options: any = {}) {
//   switch (type.toLowerCase()) {
//     case "coder":
//       return new CoderAgent(context, {
//         apiKey: options.apiKey || config.apiKey,
//         model: options.model || config.model,
//         ...options,
//       });
//     default:
//       throw new Error(`Unknown agent type: ${type}`);
//   }
// }

// // Export agent types
// export { CoderAgent } from "./coder/agent.ts";
// export { BaseAgent } from "./base/agent.ts";
