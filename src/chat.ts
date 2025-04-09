#!/usr/bin/env node
import { config, validateConfig } from "configs";
import { type Agent, createAgent } from "agents";
import { displayHelp, gatherContext } from "utils";
import * as readline from "node:readline";
import { program } from "./cli.ts";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

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

  const context = await gatherContext();
  // const agent = createAgent(context, "coder");

  const openRouter = createOpenRouter({
    apiKey: config.apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": "https://github.com/rovn208/codebro",
      "X-Title": "Codebro CLI",
    },
  });

  const agent = createAgent({
    instructions: `You are codebro, an expert programming assistant that helps users with coding tasks. 
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
If you use any libraries or frameworks, make sure to explain why they are appropriate.`,
    actions: [],
    model: openRouter(config.model),
  });

  if (options.help) {
    displayHelp();
  } else {
    await interactiveMode(agent).catch(console.error);
  }
}

const terminal = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function interactiveMode(agent: Agent) {
  console.log("Setting up...");
  // const mcpActions = await createActionsFromMcpConfig({
  //   config: mcpConfig,
  //   envMapping: {
  //     githubPersonalAccessToken: process.env.GITHUB_TOKEN,
  //   },
  //   // excludedActions: ["smithery_ai_github_get_issue"],
  //   includedActions: [
  //     "smithery_ai_github_create_or_update_file",
  //     "smithery_ai_github_create_repository",
  //   ],
  // });

  console.log("\n🤖 Ready! Type your message (or 'exit' to quit)\n");
  //
  // const agent = createAgent({
  //   instructions: `You are a GitHub assistant that can help with repository management.
  //   Use the available GitHub actions to help users with their requests.`,
  //   actions: [...mcpActions],
  //   model: openai("gpt-4o-mini"),
  // });
  //
  let messageHistory: any[] = [];

  function getInput() {
    rl.question("> ", async input => {
      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      try {
        const { messages, response } = await agent({
          input,
          messages: messageHistory,
        });

        // Update message history
        messageHistory = messages;

        // Show any tool calls

        console.log(`Assistant: ${response}\n`);
      } catch (error) {
        console.error("\nError:", error, "\n");
      }
      ``;
      getInput();
    });
  }

  getInput();
}

// Handle clean exit
rl.on("close", () => {
  console.log("\nGoodbye!");
  process.exit(0);
});

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
