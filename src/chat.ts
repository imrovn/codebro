#!/usr/bin/env node
import { config, validateConfig } from "configs";
import { createAgentLog, displayHelp, gatherContext } from "utils";
import * as readline from "node:readline/promises";
import { program } from "./cli.ts";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { streamText, type StreamTextResult } from "ai";
import { getCodeTools } from "tools";
import type { Tool, ToolCall } from "types";
import type { Message, Messages } from "messages";
import process from "process";
import { CoderAgent } from "agents/coder/agent.ts";
import type { BaseAgent } from "agents/base/agent.ts";

// Define CLI commands
const COMMANDS = {
  VERSION: "version",
  EXIT: ["exit", "quit", "bye"],
  CLEAR: "/clear",
  HELP: "/help",
};

/**
 * Main entry point for the CLI
 */
export async function main() {
  const options = program.opts();
  if (!validateConfig(config)) {
    process.exit(1);
  }
  // const openRouter = createOpenRouter({
  //   apiKey: config.apiKey,
  //   // baseURL: "https://openrouter.ai/api/v1",
  //   headers: {
  //     "HTTP-Referer": "https://github.com/rovndev/codebro",
  //     "X-Title": "Codebro CLI",
  //   },
  // });
  // const model = openRouter(config.model);
  const context = await gatherContext();
  const coderAgent = new CoderAgent(context, { model: config.model });

  if (options.help) {
    displayHelp();
  } else {
    await chatLoop(coderAgent).catch(console.error);
  }
}

const test = async () => {
  const openRouter = createOpenRouter({
    apiKey: config.apiKey,
    // baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": "https://github.com/rovn208/codebro",
      "X-Title": "Codebro CLI",
    },
  });
  const messsages: Messages = [];
  messsages.push({
    role: "system",
    content: getSystemMessage(),
  });
  messsages.push({ role: "user", content: "who are you" });

  const stream = await processStream(streamText({
    model: openRouter(config.model),
    messages: messsages,
    temperature: 0.5,
  }));
  console.log("\n\nfinal", stream.responseText, stream.toolCalls);
};

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

const messages: any[] = [];
const systemMessage = getSystemMessage();

async function chatLoop(agent: BaseAgent) {
  console.log("Setting up...");
  console.log("\n🤖 Ready! Type your message (or 'exit' to quit)\n");
  while (true) {
    const userInput = await terminal.question("You: ");
    if (userInput.toLowerCase() == "exit") {
      break;
    }
    process.stdout.write("\n received input: " + userInput);

    createAgentLog("\nThinking ...");

    const onStream = config.useStreaming ? (chunk: string) => process.stdout.write(chunk) : undefined;
    const response = await agent.chat(userInput, onStream);
    if (!config.useStreaming) {
      process.stdout.write(response.response + "\n");
    }

    // const textInFirstResponse = responseText.length > 0;
    // if (textInFirstResponse) {
    //   messages.push({ "role": "assistant", "content": responseText });
    // }
    //
    // if (toolCalls.length > 0) {
    //   const toolMessages = await handleToolCalls(toolCalls);
    //   if (toolMessages.length) {
    //     messages.push(...toolMessages);
    //   }
    // }
    //
    // // get final response
    // const { responseText: finalResponse } = await processStream(streamText({
    //   model,
    //   messages,
    //   tools: getToolList(),
    //   temperature: 0.5,
    // }));
    //
    // if (finalResponse.length > 0) {
    //   process.stdout.write(finalResponse);
    //   messages.push({ "role": "assistant", "content": finalResponse });
    // }
  }

}


async function processStream(stream: StreamTextResult<any, any>): Promise<{
  responseText: string,
  toolCalls: ToolCall[]
}> {
  let fullResponse = "";
  let firstChunk = true;

  for await (const delta of stream.textStream) {
    if (firstChunk) {
      firstChunk = false;
      process.stdout.write("Assisstant: ");
    }
    process.stdout.write(delta);
    fullResponse += delta;
  }

  const toolCalls = parseTools(fullResponse);

  return { responseText: fullResponse, toolCalls };
}

function findTool(name: string): Tool | undefined {
  return getCodeTools().find(tool => tool.name === name);
}

async function handleToolCalls(toolCalls: ToolCall[]): Promise<Message[]> {
  const messages: Messages = [];
  for (const toolCall of toolCalls) {
    const tool = findTool(toolCall.function.name);

    if (tool) {
      try {
        // Parse arguments from JSON string
        const args = JSON.parse(toolCall.function.arguments);

        // Execute the tool
        const result = await tool.run(args, { workingDirectory: "./" });

        // // Add tool call and result to history
        // this.state.history.toolCalls.push({
        //   call: toolCall,
        //   result,
        // });
        messages.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: toolCall.id,
              toolName: tool.name,
              result: JSON.stringify(result),

            }],
        });
      } catch (error: any) {
        process.stdout.write("Error handle tool calls:", error);
        // throw new Error(`Failed to handle tool calls: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }
  return messages;
}


function parseTools(fullResponse: string): ToolCall[] {
  return [];
}

function getSystemMessage(): string {
  let systemPrompt = `
  You are codebro, an expert programming assistant that helps users with coding tasks. 
You answer questions about code, help write and refactor code, and provide explanations.
You are knowledgeable about best practices and design patterns.
Your primary goal is to help the user solve their coding problems efficiently and clearly.

When the user asks you to write or modify code:
1. First, understand the task requirements clearly
2. Think step-by-step about the solution
3. If needed, use tools to explore the codebase or check documentation
4. Provide clean, well-documented code that follows best practices
5. Explain your implementation if it's not obvious

You should write code in a clean, modular, and maintainable way. Prefer simple solutions over complex ones.
If you use any libraries or frameworks, make sure to explain why they are appropriate.
  `;
  // Add tool definitions if available
  const tools = getCodeTools();
  if (tools && tools.length > 0) {
    systemPrompt += "\n\nYou have access to the following tools:\n\n";

    for (const tool of tools) {
      systemPrompt += `Tool: ${tool.name}\n`;
      systemPrompt += `Description: ${tool.description}\n`;
      systemPrompt += "Parameters:\n";

      for (const param of tool.parameters) {
        systemPrompt += `  - ${param.name} (${param.type}${
          param.required ? ", required" : ""
        }): ${param.description}\n`;
      }

      systemPrompt += "\n";
    }

    systemPrompt += "\nTo use a tool, respond with a JSON object in the following format inside a code block:\n";
    systemPrompt +=
      "```json\n{\n  \"name\": \"tool_name\",\n  \"arguments\": {\n    \"param1\": \"value1\",\n    \"param2\": \"value2\"\n  }\n}\n```\n\n";
    systemPrompt += "After getting the tool result, analyze it and respond with your final answer.";
  }
  return systemPrompt;
}

/**
 * Start interactive CLI mode
 */
// async function startInteractiveMode(agent: BaseAgent) {
//   // while (true) {
//   //   const userInput = await terminal.question("You: ");
//   //   const result = streamText({
//   //     model: openai("gpt-4o"),
//   //     messages,
//   //     maxSteps: 5,
//   //     onStepFinish: step => {
//   //       console.log(JSON.stringify(step, null, 2));
//   //     },
//   //   });
//   // }
//
//   // const rl = readline.createInterface({
//   //   input: process.stdin,
//   //   output: process.stdout,
//   //   terminal: true,
//   //   prompt: "> ",
//   // });
//   createAgentLog("Welcome to brocode - Your AI Code Assistant!");
//   console.log(
//     chalk.gray("Interactive mode started. Type 'exit' to quit, '/help' for commands, '/clear' to clear history.\n")
//   );
//   rl.prompt();
//
//   rl.on("line", async input => {
//     const command = input.trim().toLowerCase();
//
//     if (!command) {
//       rl.prompt();
//       return;
//     }
//
//     if (COMMANDS.EXIT.includes(command)) {
//       rl.close();
//       process.exit(0);
//     }
//
//     switch (command) {
//       case COMMANDS.HELP:
//         displayHelp();
//         return;
//       case COMMANDS.CLEAR:
//         agent.clearHistory();
//         createAgentLog("\nConversation history cleared.");
//         rl.prompt();
//         return;
//       case COMMANDS.VERSION:
//         displayVersion();
//         rl.prompt();
//         return;
//       default:
//     }
//
//     createAgentLog("\nThinking ...");
//     const onStream = config.useStreaming ? (chunk: string) => rl.write(chunk) : undefined;
//     const response = await agent.chat(command, onStream);
//
//     // const history = agent.getHistory();
//     // if (history && history.toolCalls && history.toolCalls.length > 0) {
//     //   const lastCommand = [...history.toolCalls].reverse().find(tc => tc.call.function.name === "executeCommand");
//     //   createCommandResult(lastCommand);
//     // }
//
//     console.log(response.response, "\n");
//     rl.prompt();
//   }).on("close", () => {
//     createAgentLog("\nGoodbye!");
//     process.exit(0);
//   });
// }
